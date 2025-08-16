import React, { useState } from 'react'
import { saveFileToDir } from '../lib/fs'

export default function AddScreen({ dirHandle, cards, saveCards, setScreen }) {
  const [word, setWord] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [audioFile, setAudioFile] = useState(null)

  const handleSave = async () => {
    if (!word.trim()) {
      alert('Enter a word')
      return
    }

    const imagePaths = []
    for (const f of imageFiles) {
      imagePaths.push(await saveFileToDir(dirHandle, 'images', f))
    }

    let audioPath = null
    if (audioFile) audioPath = await saveFileToDir(dirHandle, 'audio', audioFile)

    const newCard = { id: crypto.randomUUID(), word: word.trim(), images: imagePaths, audio: audioPath }
    const next = [...cards, newCard]
    await saveCards(next)
    setScreen('review')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Add Card</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Word</label><br />
        <input value={word} onChange={e => setWord(e.target.value)} style={{ width: 320 }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Images (multiple)</label><br />
        <input type="file" accept="image/*" multiple onChange={e => setImageFiles([...e.target.files])} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Audio (single)</label><br />
        <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0] ?? null)} />
      </div>

      <button onClick={handleSave}>Save</button>{' '}
      <button onClick={() => setScreen('review')}>Cancel</button>
    </div>
  )
}
