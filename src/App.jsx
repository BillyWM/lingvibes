import React, { useState, useEffect } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import CardsScreen from "./screens/CardsScreen.jsx";
import OptionsScreen from "./screens/OptionsScreen.jsx";
import StudyScreen from "./screens/StudyScreen.jsx";
import { openDB } from "idb";
import "./App.scss";

let directoryHandle = null;

// ----- IndexedDB helpers -----
async function getDB() {
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
  return await db.get("handles", "directory"); // just return; permission is checked at startup
}

// ----- Folder picker -----
async function pickDirectory() {
  // must be called from a user gesture
  const handle = await window.showDirectoryPicker();
  await saveDirectoryHandle(handle);
  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch {}
  }
  directoryHandle = handle;
  return handle;
}

// ----- Load cards -----
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

// ===== Save pronunciation recording into the card's folder =====
async function savePronunciation(folderName, blob, ext = "webm") {
  if (!directoryHandle || !folderName || !blob) return;

  const cardFolder = await directoryHandle.getDirectoryHandle(folderName, { create: true });
  const practiceFolder = await cardFolder.getDirectoryHandle("practice", { create: true });

  const stamp = new Date();
  const yyyy = String(stamp.getFullYear());
  const mm = String(stamp.getMonth() + 1).padStart(2, "0");
  const dd = String(stamp.getDate()).padStart(2, "0");
  const hh = String(stamp.getHours()).padStart(2, "0");
  const min = String(stamp.getMinutes()).padStart(2, "0");
  const ss = String(stamp.getSeconds()).padStart(2, "0");

  const filename = `practice-${yyyy}${mm}${dd}-${hh}${min}${ss}.${ext}`;

  const fileHandle = await practiceFolder.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

// -------------------- App Component --------------------
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState("review");
  const [editingCardId, setEditingCardId] = useState(null);
  const [cards, setCards] = useState([]);
  const [folderReady, setFolderReady] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [restorableHandle, setRestorableHandle] = useState(null);

  // Options (persisted in localStorage)
  const [options, setOptions] = useState(() => {
    const stored = localStorage.getItem("options");
    return stored ? JSON.parse(stored) : { micEnabled: false };
  });

  useEffect(() => {
    localStorage.setItem("options", JSON.stringify(options));
  }, [options]);

  // Restore saved handle on startup and check permission
  useEffect(() => {
    (async () => {
      const saved = await getSavedDirectoryHandle();
      if (!saved) return;

      const perm = await saved.queryPermission({ mode: "readwrite" });
      if (perm === "granted") {
        directoryHandle = saved;
        const loaded = await loadCardsFromDirectory();
        setCards(loaded);
        setFolderReady(true);
      } else if (perm === "prompt") {
        setNeedsReconnect(true);
        setRestorableHandle(saved);
      }
      // if denied, user will need to Select Folder again
    })();
  }, []);

  const navigate = (target, id = null) => {
    setMenuOpen(false);
    setEditingCardId(id);
    setScreen(target);
  };

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
      tags: Array.isArray(newCard.tags) ? newCard.tags : [],
      folderName: cardFolder.name,
    };

    const cardFile = await cardFolder.getFileHandle("card.json", { create: true });
    const writable = await cardFile.createWritable();
    await writable.write(JSON.stringify(cardData));
    await writable.close();

    cardData.images = cardData.images.map(
      (name) => URL.createObjectURL(files.images.find((f) => f.name === name))
    );
    if (cardData.audio) cardData.audio = URL.createObjectURL(files.audio);

    setCards((prev) => [...prev, cardData]);
  };

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
      tags: Array.isArray(updatedCard.tags) ? updatedCard.tags : [],
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

  if (!folderReady) {
    return (
      <div className="app-root">
        <header className="app-header">
          <button
            className="app-menu-button"
            onClick={() => setMenuOpen((p) => !p)}
          >
            ☰
          </button>
          <h1 className="app-title">Flashcards</h1>
        </header>

        <main className="app-main">
          <div className="app-picker">
            <p>No folder selected. Please choose a folder to store your flashcards:</p>

            {!needsReconnect && (
              <button
                className="app-action"
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
            )}

            {needsReconnect && (
              <button
                className="app-action"
                onClick={async () => {
                  if (!restorableHandle) return;
                  const status = await restorableHandle.requestPermission({ mode: "readwrite" });
                  if (status === "granted") {
                    directoryHandle = restorableHandle;
                    const loaded = await loadCardsFromDirectory();
                    setCards(loaded);
                    setFolderReady(true);
                    setNeedsReconnect(false);
                  }
                }}
              >
                Reconnect storage
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  let content;
  if (screen === "review") {
    content = (
      <ReviewScreen
        cards={cards}
        micEnabled={options.micEnabled}
        onSaveRecording={savePronunciation}
      />
    );
  } else if (screen === "add") {
    content = <AddScreen onAddCard={handleAddCard} onDone={() => navigate("cards")} />;
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
    content = (
      <CardsScreen
        cards={cards}
        onAddCard={handleAddCard}
        onSaveCard={handleSaveCard}
      />
    );
  } else if (screen === "options") {
    content = (
      <OptionsScreen
        micEnabled={options.micEnabled}
        onChangeMic={(v) => setOptions((prev) => ({ ...prev, micEnabled: v }))}
      />
    );
  } else if (screen === "study") {
    content = (
      <StudyScreen
        cards={cards}
        micEnabled={options.micEnabled}
        onSaveRecording={savePronunciation}
      />
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <button
          className="app-menu-button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>
        <h1 className="app-title">Flashcards</h1>
      </header>

      {/* Backdrop to close menu on outside click */}
      {menuOpen && <div className="app-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sliding Menu */}
      <nav className={`app-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <ul className="app-menu-list">
          <li><button className="app-menu-item" onClick={() => navigate("review")}>Review</button></li>
          <li><button className="app-menu-item" onClick={() => navigate("study")}>Study</button></li>
          <li><button className="app-menu-item" onClick={() => navigate("cards")}>Cards</button></li>
          <li><button className="app-menu-item" onClick={() => navigate("options")}>Options</button></li>
        </ul>
      </nav>

      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
