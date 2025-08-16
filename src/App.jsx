import React, { useState, useEffect } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import AddScreen from "./screens/AddScreen.jsx";
import EditScreen from "./screens/EditScreen.jsx";
import ListScreen from "./screens/ListScreen.jsx";
import { openDB } from "idb";

let directoryHandle = null; // session folder handle

// -------------------- IndexedDB helpers --------------------
async function getDB() {
  // bump version to 2 to ensure upgrade runs if store missing
  return await openDB("flashcards", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    },
  });
}

async function saveDirectoryHandle(handle) {
  const db = await getDB();
  await db.put("handles", handle, "directory");
}

async function getSavedDirectoryHandle() {
  const db = await getDB();
  const handle = await db.get("handles", "directory");
  if (handle) {
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return handle;
    const request = await handle.requestPermission({ mode: "readwrite" });
    if (request === "granted") return handle;
  }
  return null;
}

// -------------------- Folder picker --------------------
async function pickDirectory() {
  if (!window.showDirectoryPicker) {
    alert("Your browser does not support the File System Access API.");
    return null;
  }
  directoryHandle = await window.showDirectoryPicker();
  await saveDirectoryHandle(directoryHandle);
  return directoryHandle;
}

// -------------------- Load cards --------------------
async function loadCardsFromDirectory() {
  if (!directoryHandle) return [];

  const loadedCards = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "directory") {
      const cardFolder = entry;
      try {
        const cardFile = await cardFolder.getFileHandle("card.json");
        const text = await (await cardFile.getFile()).text();
        const cardData = JSON.parse(text);

        // convert relative file paths to Object URLs
        cardData.images = await Promise.all(
          cardData.images.map(async (name) => {
            const f = await cardFolder.getFileHandle(name);
            return URL.createObjectURL(await f.getFile());
          })
        );
        if (cardData.audio) {
          const f = await cardFolder.getFileHandle(cardData.audio);
          cardData.audio = URL.createObjectURL(await f.getFile());
        }

        cardData.folderName = cardFolder.name;
        loadedCards.push(cardData);
      } catch (e) {
        console.warn("Skipping folder", cardFolder.name, e);
      }
    }
  }
  loadedCards.sort((a, b) => a.folderName.localeCompare(b.folderName));
  return loadedCards;
}

// -------------------- App Component --------------------
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState("review");
  const [editingCardId, setEditingCardId] = useState(null);
  const [cards, setCards] = useState([]);
  const [folderReady, setFolderReady] = useState(false);

  useEffect(() => {
    (async () => {
      directoryHandle = await getSavedDirectoryHandle();
      if (directoryHandle) {
        const loaded = await loadCardsFromDirectory();
        setCards(loaded);
        setFolderReady(true);
      }
    })();
  }, []);

  const navigate = (target, id = null) => {
    setMenuOpen(false);
    setEditingCardId(id);
    setScreen(target);
  };

  // -------------------- Add Card --------------------
  const handleAddCard = async (newCard, files) => {
    if (!directoryHandle) return;

    const cardFolder = await directoryHandle.getDirectoryHandle(
      `card-${cards.length}`,
      { create: true }
    );

    const imagePaths = [];
    for (const imgFile of files.images || []) {
      const imgHandle = await cardFolder.getFileHandle(imgFile.name, { create: true });
      const writable = await imgHandle.createWritable();
      await writable.write(await imgFile.arrayBuffer());
      await writable.close();
      imagePaths.push(imgFile.name);
    }

    let audioPath = null;
    if (files.audio) {
      const audioHandle = await cardFolder.getFileHandle(files.audio.name, { create: true });
      const writable = await audioHandle.createWritable();
      await writable.write(await files.audio.arrayBuffer());
      await writable.close();
      audioPath = files.audio.name;
    }

    const cardData = {
      word: newCard.word,
      images: imagePaths,
      audio: audioPath,
      folderName: cardFolder.name,
    };

    const cardFile = await cardFolder.getFileHandle("card.json", { create: true });
    const writable = await cardFile.createWritable();
    await writable.write(JSON.stringify(cardData));
    await writable.close();

    // convert media to Object URLs for immediate use
    cardData.images = cardData.images.map(
      (name) => URL.createObjectURL(files.images.find((f) => f.name === name))
    );
    if (cardData.audio) cardData.audio = URL.createObjectURL(files.audio);

    setCards((prev) => [...prev, cardData]);
  };

  // -------------------- Edit/Save Card --------------------
  const handleSaveCard = async (updatedCard, files) => {
    if (!directoryHandle) return;
    if (!updatedCard.folderName) return;

    const cardFolder = await directoryHandle.getDirectoryHandle(updatedCard.folderName, { create: true });

    const imagePaths = [];
    for (const imgFile of files.images || []) {
      const imgHandle = await cardFolder.getFileHandle(imgFile.name, { create: true });
      const writable = await imgHandle.createWritable();
      await writable.write(await imgFile.arrayBuffer());
      await writable.close();
      imagePaths.push(imgFile.name);
    }

    let audioPath = updatedCard.audio ? updatedCard.audio.name : null;
    if (files.audio) {
      const audioHandle = await cardFolder.getFileHandle(files.audio.name, { create: true });
      const writable = await audioHandle.createWritable();
      await writable.write(await files.audio.arrayBuffer());
      await writable.close();
      audioPath = files.audio.name;
    }

    const cardData = {
      word: updatedCard.word,
      images: imagePaths,
      audio: audioPath,
      folderName: updatedCard.folderName,
    };

    const cardFile = await cardFolder.getFileHandle("card.json", { create: true });
    const writable = await cardFile.createWritable();
    await writable.write(JSON.stringify(cardData));
    await writable.close();

    cardData.images = cardData.images.map(
      (name) => URL.createObjectURL(files.images.find((f) => f.name === name))
    );
    if (files.audio) cardData.audio = URL.createObjectURL(files.audio);

    setCards((prev) =>
      prev.map((c) => (c.folderName === updatedCard.folderName ? cardData : c))
    );
  };

  // -------------------- Render --------------------
  if (!folderReady) {
    return (
      <div style={{ padding: "1rem" }}>
        <p>No folder selected. Please choose a folder to store your flashcards:</p>
        <button
          onClick={async () => {
            const handle = await pickDirectory();
            if (handle) {
              const loaded = await loadCardsFromDirectory();
              setCards(loaded);
              setFolderReady(true);
            }
          }}
        >
          Select Folder
        </button>
      </div>
    );
  }

  let content;
  if (screen === "review") {
    content = <ReviewScreen cards={cards} />;
  } else if (screen === "add") {
    content = (
      <AddScreen
        onAddCard={handleAddCard}
        onDone={() => navigate("cards")}
      />
    );
  } else if (screen === "edit") {
    const cardToEdit = cards[editingCardId] || null;
    content = (
      <EditScreen
        card={cardToEdit}
        onSave={async (updatedCard, files) => {
          await handleSaveCard(updatedCard, files);
          navigate("cards");
        }}
        onCancel={() => navigate("cards")}
      />
    );
  } else if (screen === "cards") {
    content = <ListScreen cards={cards} onEdit={(id) => navigate("edit", id)} />;
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          background: "#333",
          color: "#fff",
          padding: "0.5rem 1rem"
        }}
      >
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{ marginRight: "1rem", cursor: "pointer" }}
        >
          ☰
        </button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Flashcards</h1>
      </header>

      {menuOpen && (
        <nav
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "200px",
            height: "100%",
            background: "#555",
            color: "#fff",
            padding: "1rem",
            zIndex: 10
          }}
        >
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <button
                onClick={() => navigate("review")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Review
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("cards")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Card List
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("add")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Add Card
              </button>
            </li>
          </ul>
        </nav>
      )}

      <main style={{ flex: 1, overflowY: "auto" }}>{content}</main>
    </div>
  );
}

export default App;
