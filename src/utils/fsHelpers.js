import { openDB } from "idb";

let directoryHandle = null;

/* ========== directory handle ========== */

export function setDirectoryHandle(handle) {
  directoryHandle = handle;
}

export function getDirectoryHandle() {
  return directoryHandle;
}

/* ========== IDB: persist FS handle ========== */

async function getDB() {
  return await openDB("flashcards", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    },
  });
}

export async function saveDirectoryHandle(handle) {
  const db = await getDB();
  await db.put("handles", handle, "directory");
}

export async function getSavedDirectoryHandle() {
  const db = await getDB();
  return await db.get("handles", "directory");
}

/* ========== small helpers ========== */

export function pad6(n) {
  const s = String(Math.max(0, Number(n) | 0));
  return s.padStart(6, "0");
}

export function sanitizeName(name) {
  const base = (name || "").split("/").pop().split("\\").pop();
  const trimmed = base.trim().replace(/\s+/g, " ");
  const safe = trimmed.replace(/[^\w.\- +]/g, "-");
  return safe.slice(0, 80);
}

/* ========== FS helpers ========== */

async function getOrCreateDir(name) {
  if (!directoryHandle) {
    throw new Error("directoryHandle not set");
  }
  return await directoryHandle.getDirectoryHandle(name, { create: true });
}

async function getDir(name) {
  if (!directoryHandle) return null;
  try {
    return await directoryHandle.getDirectoryHandle(name, { create: false });
  } catch {
    return null;
  }
}

export async function writeFileToDir(dirName, targetFilename, srcFileOrBlob) {
  const dir = await getOrCreateDir(dirName);
  const fileHandle = await dir.getFileHandle(targetFilename, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  if ("arrayBuffer" in srcFileOrBlob) {
    await writable.write(await srcFileOrBlob.arrayBuffer());
  } else {
    await writable.write(srcFileOrBlob);
  }
  await writable.close();
  return fileHandle;
}

export async function deleteFromDirIfExists(dirName, filename) {
  if (!directoryHandle) return;
  try {
    const dir = await getOrCreateDir(dirName);
    await dir.removeEntry(filename);
  } catch {
    // ignore missing
  }
}

export async function blobUrlFromDirFile(dirName, filename) {
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

/* ========== cards.json (atomic) ========== */

export async function readIndex() {
  if (!directoryHandle) {
    throw new Error("directoryHandle not set");
  }

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
    if (typeof obj.treeRows !== "number" || obj.treeRows < 1) {
      obj.treeRows = 2;
    }
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

export async function writeIndex(indexObj) {
  if (!directoryHandle) {
    throw new Error("directoryHandle not set");
  }

  indexObj.updatedAt = new Date().toISOString();
  const json = JSON.stringify(indexObj, null, 2);
  const fh = await directoryHandle.getFileHandle("cards.json", {
    create: true,
  });
  const writable = await fh.createWritable();
  await writable.write(json);
  await writable.close();
}

/* ========== Load cards into React state ========== */

export async function loadCardsForState() {
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

    const lang = c.lang || "uk"; // default legacy cards to Ukrainian

    cardsState.push({
      id: c.id,
      lang,
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
