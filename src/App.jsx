import React, { useState, useEffect, useMemo } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import CardsScreen from "./screens/CardsScreen.jsx";
import OptionsScreen from "./screens/OptionsScreen.jsx";
import StudyScreen from "./screens/StudyScreen.jsx";
import TreeScreen from "./screens/TreeScreen.jsx";
import SkillEditScreen from "./screens/SkillEditScreen.jsx";
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

/* =========================
   FS helpers
   ========================= */
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
    const fh = await directoryHandle.getFileHandle("cards.json", {
      create: false,
    });
    const file = await fh.getFile();
    const text = await file.text();
    const obj = JSON.parse(text);

    if (!obj || typeof obj !== "object") {
      throw new Error("bad index");
    }

    // normalize core fields
    if (!Array.isArray(obj.cards)) obj.cards = [];
    if (typeof obj.nextCardNo !== "number") obj.nextCardNo = 1;
    if (typeof obj.nextMediaNo !== "number") obj.nextMediaNo = 1;

    // normalize skill-tree fields
    if (!Array.isArray(obj.skills)) obj.skills = [];
    if (typeof obj.treeRows !== "number" || obj.treeRows < 1) obj.treeRows = 2;
    if (typeof obj.nextSkillNo !== "number" || obj.nextSkillNo < 1) {
      obj.nextSkillNo = 1;
    }

    return obj;
  } catch {
    // default index if cards.json doesn't exist or is invalid
    return {
      updatedAt: new Date().toISOString(),
      nextCardNo: 1,
      nextMediaNo: 1,
      cards: [],
      skills: [],
      treeRows: 2,
      nextSkillNo: 1,
    };
  }
}

async function writeIndex(indexObj) {
  indexObj.updatedAt = new Date().toISOString();
  const json = JSON.stringify(indexObj, null, 2);
  const fh = await directoryHandle.getFileHandle("cards.json", {
    create: true,
  });
  const writable = await fh.createWritable();
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
      images: imageUrls,
      imageFiles: c.imageFiles || [],
      audio: audioUrl,
      audioFile: c.audioFile || null,
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

  // skill tree
  const [skills, setSkills] = useState([]);
  const [treeRows, setTreeRows] = useState(2);
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingSkillSlot, setEditingSkillSlot] = useState(null);
  const [treeEditMode, setTreeEditMode] = useState(false);


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
        const { index, cardsState } = await loadCardsForState();
        setCards(cardsState);
        setSkills(Array.isArray(index.skills) ? index.skills : []);
        setTreeRows(
          typeof index.treeRows === "number" && index.treeRows > 0
            ? index.treeRows
            : 2
        );
        setFolderReady(true);
      } else if (perm === "prompt") {
        setNeedsReconnect(true);
        setRestorableHandle(saved);
      }
    })();
  }, []);

  const navigate = (target) => {
    setMenuOpen(false);
	if (target !== "tree") {
		setTreeEditMode(false);
	}
    setScreen(target);
    if (target === "review" || target === "study") {
      setActiveSkillId(null);
    }
  };

  async function pickDirectory() {
    const handle = await window.showDirectoryPicker();
    await saveDirectoryHandle(handle);
    if (navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        /* ignore */
      }
    }
    directoryHandle = handle;
    return handle;
  }

  /* -------------------------
     Add Card
     ------------------------- */
  const handleAddCard = async (newCard, files) => {
    if (!directoryHandle) return;

    const index = await readIndex();
    const id = index.nextCardNo++;
    const createdAt = new Date().toISOString();

    const imageFiles = [];
    for (const img of files.images || []) {
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(img.name)}`;
      await writeFileToDir("images", fname, img);
      imageFiles.push(fname);
    }

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

    const keepNames = Array.isArray(updatedCard.imagesKeep)
      ? updatedCard.imagesKeep
      : existing.imageFiles;

    for (const name of existing.imageFiles) {
      if (!keepNames.includes(name)) {
        await deleteFromDirIfExists("images", name);
      }
    }

    const appended = [];
    for (const img of files.images || []) {
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(img.name)}`;
      await writeFileToDir("images", fname, img);
      appended.push(fname);
    }

    let audioFile = existing.audioFile || null;
    if (files.audio) {
      if (audioFile) await deleteFromDirIfExists("audio", audioFile);
      const mediaNo = index.nextMediaNo++;
      const fname = `${pad6(mediaNo)}_${sanitizeName(files.audio.name)}`;
      await writeFileToDir("audio", fname, files.audio);
      audioFile = fname;
    }

    const finalImageFiles = [...keepNames, ...appended];

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
              ...c,
              word: updatedCard.word,
              images: imageUrls,
              imageFiles: finalImageFiles,
              audio: audioUrl,
              audioFile,
              tags: Array.isArray(updatedCard.tags) ? updatedCard.tags : [],
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
    ).padStart(2, "0")}${String(stamp.getDate()).padStart(
      2,
      "0"
    )}-${String(stamp.getHours()).padStart(2, "0")}${String(
      stamp.getMinutes()
    ).padStart(2, "0")}${String(stamp.getSeconds()).padStart(
      2,
      "0"
    )}.${ext}`;

    await writeFileToDir("recordings", fileName, blob);

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

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              recordings: [
                {
                  file: fileName,
                  ts: stamp.toISOString(),
                  bytes: blob.size || undefined,
                  mime: blob.type || undefined,
                },
                ...(c.recordings || []),
              ],
            }
          : c
      )
    );
  }

  /* -------------------------
     Skill helpers
     ------------------------- */
  const visibleCards = useMemo(() => {
    if (!activeSkillId) return cards;
    const skill = skills.find((s) => s.id === activeSkillId);
    if (!skill || !Array.isArray(skill.cardIds) || skill.cardIds.length === 0) {
      return cards;
    }
    const idSet = new Set(skill.cardIds);
    return cards.filter((c) => idSet.has(c.id));
  }, [activeSkillId, skills, cards]);

  const enterStudyForSkill = (skillId) => {
    setActiveSkillId(skillId);
    setScreen("study");
    setMenuOpen(false);
  };

  const enterReviewForSkill = (skillId) => {
    setActiveSkillId(skillId);
    setScreen("review");
    setMenuOpen(false);
  };

  const handleEditSkillSlot = (slotIndex) => {
    const current = skills.find((s) => s.order === slotIndex) || null;
    setEditingSkillId(current ? current.id : null);
    setEditingSkillSlot(slotIndex);
    setScreen("skillEdit");
    setMenuOpen(false);
  };

  const handleAddTreeRow = async () => {
    if (!directoryHandle) return;
    const index = await readIndex();
    const currentRows =
      typeof index.treeRows === "number" && index.treeRows > 0
        ? index.treeRows
        : treeRows;
    const nextRows = currentRows + 1;
    index.treeRows = nextRows;
    await writeIndex(index);
    setTreeRows(nextRows);
  };

  const handleSaveSkill = async (name, cardIds) => {
    if (!directoryHandle) return;
    const index = await readIndex();

    let skillsArr = Array.isArray(index.skills) ? index.skills.slice() : [];
    let skillId = editingSkillId;

    if (skillId == null) {
      const nextNo =
        typeof index.nextSkillNo === "number" && index.nextSkillNo > 0
          ? index.nextSkillNo
          : 1;
      skillId = nextNo;
      index.nextSkillNo = nextNo + 1;
    }

    const trimmedName = (name || "").trim() || "Untitled";
    const order =
      typeof editingSkillSlot === "number" ? editingSkillSlot : 0;
    const ids = Array.isArray(cardIds) ? cardIds.slice() : [];
    const existingIdx = skillsArr.findIndex((s) => s.id === skillId);
    const now = new Date().toISOString();

    if (existingIdx === -1) {
      skillsArr.push({
        id: skillId,
        name: trimmedName,
        cardIds: ids,
        order,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const existing = skillsArr[existingIdx];
      skillsArr[existingIdx] = {
        ...existing,
        name: trimmedName,
        cardIds: ids,
        order,
        updatedAt: now,
      };
    }

    index.skills = skillsArr;
    await writeIndex(index);

    setSkills(skillsArr);
    setEditingSkillId(null);
    setEditingSkillSlot(null);
    setScreen("tree");
  };

  /* -------------------------
     Mode title (top bar)
     ------------------------- */
  const modeTitle = useMemo(() => {
    let base;
    switch (screen) {
      case "review":
        base = "Review";
        break;
      case "study":
        base = "Study";
        break;
      case "cards":
        base = "Cards";
        break;
      case "options":
        base = "Options";
        break;
      case "tree":
        base = "Tree";
        break;
      case "skillEdit":
        base = "Skill Editor";
        break;
      default:
        base = "Flashcards";
        break;
    }

    if ((screen === "review" || screen === "study") && activeSkillId) {
      const skill = skills.find((s) => s.id === activeSkillId);
      if (skill && skill.name) {
        return `${base} :: ${skill.name}`;
      }
    }

    return base;
  }, [screen, activeSkillId, skills]);

  /* -------------------------
     Folder select UI
     ------------------------- */
  if (!folderReady) {
    return (
      <div className="app-root">
		<header className="app-header">
			<button
			className="app-menu-button"
			onClick={() => setMenuOpen((prev) => !prev)}
			>
			☰
			</button>

			<h1 className="app-title">{modeTitle}</h1>

			<div className="app-header-right">
			{screen === "tree" && (
				<button
				className="app-header-action"
				onClick={() => setTreeEditMode((prev) => !prev)}
				aria-pressed={treeEditMode}
				aria-label={
					treeEditMode ? "Finish editing tree" : "Edit tree"
				}
				>
				{treeEditMode ? "✅" : "✏️"}
				</button>
			)}
			</div>
		</header>

        <main className="app-main">
          <div className="app-picker">
            <p>
              No folder selected. Please choose a folder to store your
              flashcards:
            </p>

            {!needsReconnect && (
              <button
                className="app-action"
                onClick={async () => {
                  const handle = await pickDirectory();
                  if (handle) {
                    const { index, cardsState } = await loadCardsForState();
                    setCards(cardsState);
                    setSkills(
                      Array.isArray(index.skills) ? index.skills : []
                    );
                    setTreeRows(
                      typeof index.treeRows === "number" &&
                        index.treeRows > 0
                        ? index.treeRows
                        : 2
                    );
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
                  const status = await restorableHandle.requestPermission({
                    mode: "readwrite",
                  });
                  if (status === "granted") {
                    directoryHandle = restorableHandle;
                    const { index, cardsState } = await loadCardsForState();
                    setCards(cardsState);
                    setSkills(
                      Array.isArray(index.skills) ? index.skills : []
                    );
                    setTreeRows(
                      typeof index.treeRows === "number" &&
                        index.treeRows > 0
                        ? index.treeRows
                        : 2
                    );
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
     Main screen switch
     ------------------------- */
  let content;
  if (screen === "review") {
    content = (
      <ReviewScreen
        cards={visibleCards}
        micEnabled={options.micEnabled}
        onSaveRecording={savePronunciation}
      />
    );
  } else if (screen === "study") {
    content = (
      <StudyScreen
        cards={visibleCards}
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
        onChangeMic={(v) =>
          setOptions((prev) => ({ ...prev, micEnabled: v }))
        }
      />
    );
  } else if (screen === "tree") {
    content = (
      <TreeScreen
        skills={skills}
        treeRows={treeRows}
        editMode={treeEditMode}
        onEnterStudy={enterStudyForSkill}
        onEnterReview={enterReviewForSkill}
        onEditSlot={handleEditSkillSlot}
        onAddRow={handleAddTreeRow}
      />
    );
  } else if (screen === "skillEdit") {
    const existingSkill =
      editingSkillId != null
        ? skills.find((s) => s.id === editingSkillId) || null
        : null;
    content = (
      <SkillEditScreen
        skill={existingSkill}
        slotIndex={editingSkillSlot}
        cards={cards}
        onSave={handleSaveSkill}
        onCancel={() => {
          setEditingSkillId(null);
          setEditingSkillSlot(null);
          setScreen("tree");
        }}
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

        <h1 className="app-title">{modeTitle}</h1>

        <div className="app-header-right">
          {screen === "tree" && (
            <button
              className="app-header-action"
              onClick={() => setTreeEditMode((prev) => !prev)}
              aria-pressed={treeEditMode}
              aria-label={
                treeEditMode ? "Finish editing tree" : "Edit tree"
              }
            >
              {treeEditMode ? "✅" : "✏️"}
            </button>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="app-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      <nav
        className={`app-menu ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <ul className="app-menu-list">
          <li>
            <button
              className="app-menu-item"
              onClick={() => navigate("review")}
            >
              Review
            </button>
          </li>
          <li>
            <button
              className="app-menu-item"
              onClick={() => navigate("study")}
            >
              Study
            </button>
          </li>
          <li>
            <button
              className="app-menu-item"
              onClick={() => navigate("cards")}
            >
              Cards
            </button>
          </li>
          <li>
            <button
              className="app-menu-item"
              onClick={() => navigate("tree")}
            >
              Tree
            </button>
          </li>
          <li>
            <button
              className="app-menu-item"
              onClick={() => navigate("options")}
            >
              Options
            </button>
          </li>
        </ul>
      </nav>

      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
