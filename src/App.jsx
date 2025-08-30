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
  return await db.get("handles", "directory");
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

// ----- Load cards (now preserves filenames and builds URLs) -----
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

        const imageNames = Array.isArray(cardData.images) ? [...cardData.images] : [];
        const imageUrls = await Promise.all(
          imageNames.map(async (name) => {
            const f = await cardFolder.getFileHandle(name);
            return URL.createObjectURL(await f.getFile());
          })
        );

        let audioUrl = null;
        if (cardData.audio) {
          const f = await cardFolder.getFileHandle(cardData.audio);
          audioUrl = URL.createObjectURL(await f.getFile());
        }

        loadedCards.push({
          word: cardData.word,
          images: imageUrls,
          imageNames,
          audio: audioUrl,
          tags: Array.isArray(cardData.tags) ? cardData.tags : [],
          folderName: cardFolder.name,
        });
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

  // ----- Add card (writes files, saves JSON, then builds URLs + filenames for state) -----
  const handleAddCard = async (newCard, files) => {
    if (!directoryHandle) return;

    const cardFolder = await directoryHandle.getDirectoryHandle(
      `card-${cards.length}`,
      { create: true }
    );

    const imageNames = [];
    for (const imgFile of files.images || []) {
      const imgHandle = await cardFolder.getFileHandle(imgFile.name, { create: true });
      const writable = await imgHandle.createWritable();
      await writable.write(await imgFile.arrayBuffer());
      await writable.close();
      imageNames.push(imgFile.name);
    }

    let audioPath = null;
    if (files.audio) {
      const audioHandle = await cardFolder.getFileHandle(files.audio.name, { create: true });
      const writable = await audioHandle.createWritable();
      await writable.write(await files.audio.arrayBuffer());
      await writable.close();
      audioPath = files.audio.name;
    }

    const jsonData = {
      word: newCard.word,
      images: imageNames,
      audio: audioPath,
      tags: Array.isArray(newCard.tags) ? newCard.tags : [],
      folderName: cardFolder.name,
    };

    const cardFile = await cardFolder.getFileHandle("card.json", { create: true });
    const writable = await cardFile.createWritable();
    await writable.write(JSON.stringify(jsonData));
    await writable.close();

    const urls = await Promise.all(
      imageNames.map(async (name) => {
        const f = await cardFolder.getFileHandle(name);
        return URL.createObjectURL(await f.getFile());
      })
    );

    let audioUrl = null;
    if (audioPath) {
      const f = await cardFolder.getFileHandle(audioPath);
      audioUrl = URL.createObjectURL(await f.getFile());
    }

    setCards((prev) => [
      ...prev,
      {
        word: jsonData.word,
        images: urls,
        imageNames,
        audio: audioUrl,
        tags: jsonData.tags,
        folderName: jsonData.folderName,
      },
    ]);
  };

  // ----- Save card (merge kept + new images; delete removed; preserve filenames) -----
  const handleSaveCard = async (updatedCard, files) => {
    if (!directoryHandle) return;
    if (!updatedCard.folderName) return;

    const cardFolder = await directoryHandle.getDirectoryHandle(updatedCard.folderName, { create: true });

    const existing = cards.find((c) => c.folderName === updatedCard.folderName) || {};
    const oldNames = Array.isArray(existing.imageNames) ? existing.imageNames : [];
    const keepNames = Array.isArray(updatedCard.imagesKeep) ? updatedCard.imagesKeep : oldNames;

    // Delete removed files
    for (const name of oldNames) {
      if (!keepNames.includes(name)) {
        try {
          await cardFolder.removeEntry(name);
        } catch (e) {
          console.warn("Could not remove", name, e);
        }
      }
    }

    // Add newly selected images
    const newImageNames = [];
    for (const imgFile of files.images || []) {
      const imgHandle = await cardFolder.getFileHandle(imgFile.name, { create: true });
      const writable = await imgHandle.createWritable();
      await writable.write(await imgFile.arrayBuffer());
      await writable.close();
      newImageNames.push(imgFile.name);
    }

    // Audio (replace only if a new one provided; else keep what's in JSON)
    let audioPath = null;
    if (files.audio) {
      const audioHandle = await cardFolder.getFileHandle(files.audio.name, { create: true });
      const writable = await audioHandle.createWritable();
      await writable.write(await files.audio.arrayBuffer());
      await writable.close();
      audioPath = files.audio.name;
    } else {
      try {
        const cardFileOld = await cardFolder.getFileHandle("card.json");
        const textOld = await (await cardFileOld.getFile()).text();
        const parsedOld = JSON.parse(textOld);
        if (parsedOld && parsedOld.audio) audioPath = parsedOld.audio;
      } catch {
        // ignore
      }
    }

    const finalImageNames = [...keepNames, ...newImageNames];

    const jsonData = {
      word: updatedCard.word,
      images: finalImageNames,
      audio: audioPath,
      tags: Array.isArray(updatedCard.tags) ? updatedCard.tags : [],
      folderName: updatedCard.folderName,
    };

    const cardFile = await cardFolder.getFileHandle("card.json", { create: true });
    const writable = await cardFile.createWritable();
    await writable.write(JSON.stringify(jsonData));
    await writable.close();

    // Rebuild URLs from disk for state
    const urls = await Promise.all(
      finalImageNames.map(async (name) => {
        const f = await cardFolder.getFileHandle(name);
        return URL.createObjectURL(await f.getFile());
      })
    );

    let audioUrl = null;
    if (jsonData.audio) {
      const f = await cardFolder.getFileHandle(jsonData.audio);
      audioUrl = URL.createObjectURL(await f.getFile());
    }

    const cardState = {
      word: jsonData.word,
      images: urls,
      imageNames: finalImageNames,
      audio: audioUrl,
      tags: jsonData.tags,
      folderName: jsonData.folderName,
    };

    setCards((prev) =>
      prev.map((c) => (c.folderName === updatedCard.folderName ? cardState : c))
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
    // (Kept for compatibility; CardsScreen handles add/edit now)
    content = null;
  } else if (screen === "edit") {
    // (Kept for compatibility)
    content = null;
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
