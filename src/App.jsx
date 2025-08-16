import React, { useEffect, useState, useMemo } from 'react'
import { get, set } from 'idb-keyval'
import { ensurePersistence, readMetadata, writeMetadata } from './lib/fs'
import ReviewScreen from './screens/ReviewScreen'
import AddScreen from './screens/AddScreen'
import EditScreen from './screens/EditScreen'
import ListScreen from './screens/ListScreen'

export default function App() {
  const [dirHandle, setDirHandle] = useState(null)
  const [cards, setCards] = useState([])
  const [screen, setScreen] = useState('review') // review | add | list | edit
  const [editingId, setEditingId] = useState(null)
  const editingCard = useMemo(() => cards.find(c => c.id === editingId) || null, [cards, editingId])

  // load dir handle & metadata
  useEffect(() => {
    (async () => {
      await ensurePersistence()
      const saved = await get('flashcard-dir')
      if (saved) {
        try {
          const perm = await saved.queryPermission({ mode: 'readwrite' })
          if (perm === 'granted' || perm === 'prompt') {
            setDirHandle(saved)
            const meta = await readMetadata(saved)
            setCards(meta)
          }
        } catch (e) {
          console.warn('Saved directory handle invalid:', e)
        }
      }
    })()
  }, [])

  const pickDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await set('flashcard-dir', handle)
      setDirHandle(handle)
      setCards(await readMetadata(handle))
    } catch (e) {
      console.error('User cancelled or blocked directory:', e)
    }
  }

  const saveCards = async (next) => {
    setCards(next)
    await writeMetadata(dirHandle, next)
  }

  const goEdit = (id) => { setEditingId(id); setScreen('edit') }

  if (!dirHandle) {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Flashcards</h1>
        <p>Pick a folder to store your cards (images/audio + metadata.json).</p>
        <button onClick={pickDirectory}>Pick storage directory</button>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <TopNav setScreen={setScreen} />
      {screen === 'review' && (
        <ReviewScreen dirHandle={dirHandle} cards={cards} setScreen={setScreen} />
      )}
      {screen === 'add' && (
        <AddScreen dirHandle={dirHandle} cards={cards} saveCards={saveCards} setScreen={setScreen} />
      )}
      {screen === 'list' && (
        <ListScreen cards={cards} onEdit={goEdit} setScreen={setScreen} />
      )}
      {screen === 'edit' && editingCard && (
        <EditScreen dirHandle={dirHandle} cards={cards} saveCards={saveCards} setScreen={setScreen} card={editingCard} />
      )}
    </div>
  )
}

function TopNav({ setScreen }) {
  const btn = { padding: '8px 12px', marginRight: 8, borderRadius: 8, border: '1px solid #ccc', background: '#fff' }
  return (
    <div style={{ padding: 8, position: 'sticky', top: 0, background: '#f7f7f7', borderBottom: '1px solid #eee', zIndex: 10 }}>
      <button style={btn} onClick={() => setScreen('review')}>Review</button>
      <button style={btn} onClick={() => setScreen('add')}>Add</button>
      <button style={btn} onClick={() => setScreen('list')}>List</button>
    </div>
  )
}
