import React, { useEffect, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFileURLFromPath } from '../lib/fs'

export default function ReviewScreen({ dirHandle, cards, setScreen }) {
  const [index, setIndex] = useState(0)
  const [imageUrls, setImageUrls] = useState([])
  const [audioUrl, setAudioUrl] = useState(null)
  const [direction, setDirection] = useState(1) // 1=forward, -1=back
  const audioRef = useRef(null)

  const loadAssets = async (card) => {
    // Load images
    const urls = await Promise.all(
      (card.images || []).map(p => getFileURLFromPath(dirHandle, p))
    )
    setImageUrls(urls)

    // Load audio
    if (card.audio) {
      const aurl = await getFileURLFromPath(dirHandle, card.audio)
      setAudioUrl(aurl)
      // autoplay may be blocked until user interacts; tap anywhere to replay
      if (audioRef.current) {
        audioRef.current.src = aurl
        try { await audioRef.current.play() } catch {}
      }
    } else {
      setAudioUrl(null)
      if (audioRef.current) audioRef.current.src = ''
    }
  }

  useEffect(() => {
    if (cards.length === 0) return
    loadAssets(cards[index])
    return () => {
      imageUrls.forEach(u => URL.revokeObjectURL(u))
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cards])

  const next = () => {
    if (cards.length === 0) return
    setDirection(1)
    setIndex(i => (i + 1) % cards.length)
  }
  const prev = () => {
    if (cards.length === 0) return
    setDirection(-1)
    setIndex(i => (i - 1 + cards.length) % cards.length)
  }

  const bind = useDrag(
    ({ swipe: [sx] }) => {
      if (sx === -1) next()
      if (sx === 1) prev()
    },
    { swipeDistance: [50, 50], swipeVelocity: 0.2 }
  )

  if (cards.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <p>No cards yet.</p>
        <button onClick={() => setScreen('add')}>Add a card</button>
      </div>
    )
  }

  const card = cards[index]

  return (
    <div
      {...bind()}
      style={{
        height: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#fafafa',
        touchAction: 'pan-y'
      }}
      onClick={() => audioRef.current?.play()}
    >
      {/* Left/right click zones */}
      <div onClick={prev} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%' }} />
      <div onClick={next} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%' }} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={card.id ?? index}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 120 : -120, rotate: direction * 4 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -180 : 180, rotate: direction * -8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 24px rgba(0,0,0,0.10)',
            padding: 20,
            width: 'min(720px, 92vw)',
            maxHeight: '84vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <h1 style={{ margin: '0 0 12px', fontSize: 28 }}>{card.word}</h1>
          <div style={{ overflowY: 'auto', width: '100%' }}>
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${card.word}-${i}`}
                style={{ display: 'block', maxWidth: '100%', margin: '8px auto', borderRadius: 8 }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <audio ref={audioRef} hidden />
    </div>
  )
}
