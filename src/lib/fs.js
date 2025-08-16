// Small helpers around the File System Access API

// Ensure persistent storage so the browser is less likely to evict our IndexedDB
export async function ensurePersistence() {
  if (!navigator.storage?.persist) return false
  const persisted = await navigator.storage.persisted()
  if (persisted) return true
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

// Save a File into dirHandle/subdir with a (mostly) unique name
export async function saveFileToDir(dirHandle, subdir, file) {
  const folder = await dirHandle.getDirectoryHandle(subdir, { create: true })
  // avoid collisions: timestamp + original name
  const safeName = `${Date.now()}-${file.name}`
  const fileHandle = await folder.getFileHandle(safeName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file)
  await writable.close()
  return `${subdir}/${safeName}` // return relative path for metadata
}

// Turn a "images/foo.png" path into a blob URL
export async function getFileURLFromPath(dirHandle, path) {
  if (!path) return null
  const [folder, ...rest] = path.split('/')
  const filename = rest.join('/')
  const folderHandle = await dirHandle.getDirectoryHandle(folder)
  const fileHandle = await folderHandle.getFileHandle(filename)
  const file = await fileHandle.getFile()
  return URL.createObjectURL(file)
}

// Read & write metadata.json at repo root
export async function readMetadata(dirHandle) {
  try {
    const fh = await dirHandle.getFileHandle('metadata.json')
    const file = await fh.getFile()
    return JSON.parse(await file.text())
  } catch {
    return [] // first run
  }
}

export async function writeMetadata(dirHandle, data) {
  const fh = await dirHandle.getFileHandle('metadata.json', { create: true })
  const w = await fh.createWritable()
  await w.write(JSON.stringify(data, null, 2))
  await w.close()
}
