import React, { useEffect, useState } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import CardsScreen from "./screens/CardsScreen.jsx";
import OptionsScreen from "./screens/OptionsScreen.jsx";
import StudyScreen from "./screens/StudyScreen.jsx";
import { openDB } from "idb";
import "./App.scss";

let directoryHandle = null;

/* =========================
   IDB: persist FS handle
   ========================= */
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

/* =========================
   Small helpers
   ========================= */
function pad6(n) {
  const s = String(Math.max(0, Number(n) | 0));
  return s.padStart(6, "0");
}

function sanitizeName(name) {
  const base = (name || "").split("/").pop().split("\\").pop();
  const trimmed = base.trim().replace(/\s+/g, " ");
  const safe = trimmed.replace(/[^\w.\- +]/g, "-");
  return safe.slice(0, 80);
}

async function getOrCreateDir(name) {
  return await directoryHandle.getDirectoryHandle(name, { create: true });
}

async function getDir(name) {
  try {
    return await directoryHandle.getDirectoryHandle(name, { create: false });
  } catch {
    return null;
  }
}

async function writeFileToDir(dirName, targetFilename, srcFileOrBlob) {
  const dir = await getOrCreateDir(dirName);
  const fileHandle = await dir.getFileHandle(targetFilename, { create: true });
  const writable = await fileHandle.createWritable();
  if ("arrayBuffer" in srcFileOrBlob) {
    await writable.write(await srcFileOrBlob.arrayBuffer());
  } else {
    await writable.write(srcFileOrBlob);
  }
  await writable.close();
  return fileHandle;
}

async function deleteFromDirIfExists(dirName, filename) {
  try {
    const dir = await getOrCreateDir(dirName);
    await dir.removeEntry(filename);
  } catch {
    // ignore missing
  }
}

async function blobUrlFromDirFile(dirName, filename) {
  const dir = await getDir(dirName);
  if (!dir) return null;
  try {
    const fh = await dir.getFileHandle(filename);
    const f = await fh.getFile();
    return URL.createObjectURL(f);
  } catch {
    return null;
  }
}

/* =========================
   cards.json (atomic)
   ========================= */
async function readIndex() {
  try {
    const fh = await directoryHandle.getFileHandle("cards.json", { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    const obj = JSON.parse(text);
    // normalize minimal fields
    if (!obj || typeof obj !== "object") throw new Error("bad index");
    if (!Array.isArray(obj.cards)) obj.cards = [];
    if (typeof obj.nextCardNo !== "number") obj.nextCardNo = 1;
    if (typeof obj.nextMediaNo !== "number") obj.nextMediaNo = 1;
    return obj;
  } catch {
    return { updatedAt: new Date().toISOString(), nextCardNo: 1, nextMediaNo: 1, cards: [] };
  }
}

async function writeIndex(indexObj) {
  indexObj.updatedAt = new Date().toISOString();
  const json = JSON.stringify(indexObj, null, 2);
  const fh = await directoryHandle.getFileHandle("cards.json", { create: true });
  const writable = await fh.createWritable(); // atomic commit on close
  await writable.write(json);
  await writable.close();
}

/* =========================
   Load cards into state
   ========================= */
async function loadCardsForState() {
  const index = await readIndex();

  const cardsState = [];
  for (const c of index.cards) {
    const imageUrls = [];
    for (const fname of c.imageFiles || []) {
      const url = await blobUrlFromDirFile("images", fname);
      if (url) imageUrls.push(url);
    }
    let audioUrl = null;
    if (c.audioFile) {
      audioUrl = await blobUrlFromDirFile("audio", c.audioFile);
    }
    cardsState.push({
      id: c.id,
      word: c.word,
      images: imageUrls,          // blob URLs for UI
      imageFiles: c.imageFiles || [], // filenames on disk
      audio: audioUrl,            // blob URL
      audioFile: c.audioFile || null, // filename on disk
      tags: Array.isArray(c.tags) ? c.tags : [],
      recordings: Array.isArray(c.recordings) ? c.recordings : [],
    });
  }
  return { index, cardsState };
}

/* =========================
   App
   ========================= */
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState("review");
  const [cards, setCards] = useState([]);
  const [folderReady, setFolderReady] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [restorableHandle, setRestorableHandle] = useState(null);

  // Options persisted in localStorage
  const [options, setOptions] = useState(() => {
    const stored = localStorage.getItem("options");
    return stored ? JSON.parse(stored) : { micEnabled: false };
  });
  useEffect(() => {
    localStorage.setItem("options", JSON.stringify(options));
  }, [options]);

  // Restore handle on startup
  useEffect(() => {
    (async () => {
      const saved = await getSavedDirectoryHandle();
      if (!saved) return;

      const perm = await saved.queryPermission({ mode: "readwrite" });
      if (perm === "granted") {
        directoryHandle = saved;
        const { cardsState } = await loadCardsForState();
        setCards(cardsState);
        setFolderReady(true);
      } else if (perm === "prompt") {
        setNeedsReconnect(true);
        setRestorableHandle(saved);
      }
    })();
  }, []);

  const navigate = (target) => {
    setMenuOpen(false);
    setScreen(target);
  };

  /* -------------------------
     Select Folder
     ------------------------- */
  async function pickDirectory() {
    const handle = await window.showDirectoryPicker();
    await saveDirectoryHandle(handle);
    if (navigator.storage && navigator.storage.persist) {
      try { await navigator.storage.persist(); } catch {}
    }
    directoryHandle = handle;
    return handle;
  }

  /* -------------------------
     Add Card (uses index)
     ------------------------- */
  const handleAddCard = async (newCard, files) => {
    if (!directoryHandle) return;

    const index = await readIndex();
    const id = index.nextCardNo++;
    const createdAt = new Date().toISOString();

    // Images
    const imageFiles = [];
    for (const img of files.images || []) {
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(img.name)}`;
      await writeFileToDir("images", fname, img);
      imageFiles.push(fname);
    }

    // Audio (single)
    let audioFile = null;
    if (files.audio) {
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(files.audio.name)}`;
      await writeFileToDir("audio", fname, files.audio);
      audioFile = fname;
    }

    const cardEntry = {
      id,
      word: newCard.word,
      imageFiles,
      audioFile,
      tags: Array.isArray(newCard.tags) ? newCard.tags : [],
      recordings: [],
      createdAt,
      updatedAt: createdAt,
    };

    index.cards.push(cardEntry);
    await writeIndex(index);

    // Build state object with blob URLs
    const imageUrls = [];
    for (const fname of imageFiles) {
      const url = await blobUrlFromDirFile("images", fname);
      if (url) imageUrls.push(url);
    }
    let audioUrl = null;
    if (audioFile) {
      audioUrl = await blobUrlFromDirFile("audio", audioFile);
    }

    setCards((prev) => [
      ...prev,
      {
        id,
        word: newCard.word,
        images: imageUrls,
        imageFiles,
        audio: audioUrl,
        audioFile,
        tags: Array.isArray(newCard.tags) ? newCard.tags : [],
        recordings: [],
      },
    ]);
  };

  /* -------------------------
     Save Card (edit)
     ------------------------- */
  const handleSaveCard = async (updatedCard, files) => {
    if (!directoryHandle) return;
    const index = await readIndex();

    const idx = index.cards.findIndex((c) => c.id === updatedCard.id);
    if (idx === -1) return;
    const existing = index.cards[idx];

    // Keep list provided by UI (filenames)
    const keepNames = Array.isArray(updatedCard.imagesKeep)
      ? updatedCard.imagesKeep
      : existing.imageFiles;

    // Remove deleted images from disk
    for (const name of existing.imageFiles) {
      if (!keepNames.includes(name)) {
        await deleteFromDirIfExists("images", name);
      }
    }

    // Add new images
    const appended = [];
    for (const img of files.images || []) {
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(img.name)}`;
      await writeFileToDir("images", fname, img);
      appended.push(fname);
    }

    // Audio: replace only if provided
    let audioFile = existing.audioFile || null;
    if (files.audio) {
      // optional: delete old
      if (audioFile) await deleteFromDirIfExists("audio", audioFile);
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(files.audio.name)}`;
      await writeFileToDir("audio", fname, files.audio);
      audioFile = fname;
    }

    const finalImageFiles = [...keepNames, ...appended];

    // Update index card
    const updatedAt = new Date().toISOString();
    const nextCard = {
      ...existing,
      word: updatedCard.word,
      imageFiles: finalImageFiles,
      audioFile,
      tags: Array.isArray(updatedCard.tags) ? updatedCard.tags : [],
      updatedAt,
    };
    index.cards[idx] = nextCard;
    await writeIndex(index);

    // Rebuild state card with URLs
    const imageUrls = [];
    for (const fname of finalImageFiles) {
      const url = await blobUrlFromDirFile("images", fname);
      if (url) imageUrls.push(url);
    }
    let audioUrl = null;
    if (audioFile) {
      audioUrl = await blobUrlFromDirFile("audio", audioFile);
    }

    setCards((prev) =>
      prev.map((c) =>
        c.id === updatedCard.id
          ? {
              id: updatedCard.id,
              word: updatedCard.word,
              images: imageUrls,
              imageFiles: finalImageFiles,
              audio: audioUrl,
              audioFile,
              tags: Array.isArray(updatedCard.tags) ? updatedCard.tags : [],
              recordings: Array.isArray(c.recordings) ? c.recordings : [],
            }
          : c
      )
    );
  };

  /* -------------------------
     Save pronunciation recording
     ------------------------- */
  async function savePronunciation(cardId, blob, ext = "webm") {
    if (!directoryHandle || !blob || typeof cardId !== "number") return;

    const stamp = new Date();
    const fileName = `${pad6(cardId)}-${stamp.getFullYear()}${String(
      stamp.getMonth() + 1
    ).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}-${String(
      stamp.getHours()
    ).padStart(2, "0")}${String(stamp.getMinutes()).padStart(
      2,
      "0"
    )}${String(stamp.getSeconds()).padStart(2, "0")}.${ext}`;

    await writeFileToDir("recordings", fileName, blob);

    // Append to index card.recordings (newest first)
    const index = await readIndex();
    const card = index.cards.find((c) => c.id === cardId);
    if (card) {
      const rec = {
        file: fileName,
        ts: stamp.toISOString(),
        bytes: blob.size || undefined,
        mime: blob.type || undefined,
      };
      if (!Array.isArray(card.recordings)) card.recordings = [];
      card.recordings.unshift(rec);
      card.updatedAt = new Date().toISOString();
      await writeIndex(index);
    }

    // Update state
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              recordings: [{ file: fileName, ts: stamp.toISOString(), bytes: blob.size || undefined, mime: blob.type || undefined }, ...(c.recordings || [])],
            }
          : c
      )
    );
  }

  /* -------------------------
     Folder select UI (unchanged)
     ------------------------- */
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
                    const { cardsState } = await loadCardsForState();
                    setCards(cardsState);
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
                    const { cardsState } = await loadCardsForState();
                    setCards(cardsState);
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

  /* -------------------------
     Screens
     ------------------------- */
  let content = null;
  if (screen === "review") {
    content = (
      <ReviewScreen
        cards={cards}
        micEnabled={options.micEnabled}
        onSaveRecording={savePronunciation}
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

      {menuOpen && <div className="app-backdrop" onClick={() => setMenuOpen(false)} />}

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
