import React, { useState } from 'react'
import { saveFileToDir } from '../lib/fs'

export default function EditScreen({ dirHandle, cards, saveCards, setScreen, card }) {
  const [word, setWord] = useState(card.word)
  const [newImages, setNewImages] = useState([])       // newly added image files
  const [newAudio, setNewAudio] = useState(null)        // optional new audio

  const handleSave = async () => {
    if (!word.trim()) {
      alert('Enter a word')
      return
    }

    // Keep existing image paths; append any new images the user selected
    const imagePaths = [...(card.images || [])]
    for (const f of newImages) {
      imagePaths.push(await saveFileToDir(dirHandle, 'images', f))
    }

    // Replace audio only if a new file was chosen
    let audioPath = card.audio || null
    if (newAudio) {
      audioPath = await saveFileToDir(dirHandle, 'audio', newAudio)
    }

    const updated = cards.map(c =>
      c.id === card.id ? { ...c, word: word.trim(), images: imagePaths, audio: audioPath } : c
    )
    await saveCards(updated)
    setScreen('review')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Edit Card</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Word</label><br />
        <input value={word} onChange={e => setWord(e.target.value)} style={{ width: 320 }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, color: '#555' }}>
          Current images: {card.images?.length || 0}
        </div>
        <label>Add more images</label><br />
        <input type="file" accept="image/*" multiple onChange={e => setNewImages([...e.target.files])} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, color: '#555' }}>
          {card.audio ? 'Audio present' : 'No audio yet'}
        </div>
        <label>Replace audio (optional)</label><br />
        <input type="file" accept="audio/*" onChange={e => setNewAudio(e.target.files[0] ?? null)} />
      </div>

      <button onClick={handleSave}>Save</button>{' '}
      <button onClick={() => setScreen('review')}>Cancel</button>
    </div>
  )
}
