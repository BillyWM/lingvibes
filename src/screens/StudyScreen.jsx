import React, { useEffect, useMemo, useRef, useState } from "react";
import SwipeContainer from "../components/SwipeContainer.jsx";
import CardView from "../components/CardView.jsx";
import "../styles/StudyScreen.scss";

export default function StudyScreen({ cards = [], micEnabled = false, onSaveRecording }) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef(null);

  const delaySeconds = useMemo(() => {
    try {
      const raw = localStorage.getItem("options");
      const opt = raw ? JSON.parse(raw) : {};
      return Number.isFinite(opt.delaySeconds) ? opt.delaySeconds : 8;
    } catch {
      return 8;
    }
  }, []);

  const hasCards = cards && cards.length > 0;
  const card = useMemo(() => (hasCards ? cards[Math.max(0, Math.min(index, cards.length - 1))] : null), [cards, index, hasCards]);
  const seqToken = useRef(0);

  function prevCard() { if (hasCards) setIndex((i) => (i - 1 + cards.length) % cards.length); }
  function nextCard() { if (hasCards) setIndex((i) => (i + 1) % cards.length); }

  async function playOnce() {
    if (!audioRef.current || !card || !card.audio) return;
    audioRef.current.src = card.audio;
    audioRef.current.currentTime = 0;
    try { await audioRef.current.play(); } catch {}
    await new Promise((resolve) => {
      const el = audioRef.current;
      if (!el) return resolve();
      const onEnded = () => { el.removeEventListener("ended", onEnded); resolve(); };
      el.addEventListener("ended", onEnded, { once: true });
    });
  }

  // Recording
  const recStreamRef = useRef(null);
  const recRef = useRef(null);
  const recChunksRef = useRef([]);

  async function startRecording() {
    if (!micEnabled) return false;
    try {
      if (!recStreamRef.current) {
        recStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(recStreamRef.current, { mimeType: mime });
      recChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) recChunksRef.current.push(e.data); };
      recRef.current = rec;
      rec.start();
      return true;
    } catch {
      return false;
    }
  }

  async function stopAndSaveRecording() {
    const rec = recRef.current;
    if (!rec) return;
    await new Promise((resolve) => {
      rec.onstop = resolve;
      if (rec.state !== "inactive") rec.stop();
      else resolve();
    });
    recRef.current = null;
    const chunks = recChunksRef.current || [];
    recChunksRef.current = [];
    if (!chunks.length) return;
    const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
    if (onSaveRecording && card && typeof card.id === "number") {
      await onSaveRecording(card.id, blob, "webm");
    }
  }

  function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

  useEffect(() => {
    if (!card) return;
    const myToken = ++seqToken.current;
    (async () => {
      await playOnce();
      if (seqToken.current !== myToken) return;
      const started = await startRecording();
      await sleep(Math.max(0, delaySeconds) * 1000);
      if (seqToken.current !== myToken) return;
      if (started) await stopAndSaveRecording();
    })();
    return () => {
      seqToken.current++;
      void (async () => { await stopAndSaveRecording(); })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, delaySeconds]);

  async function manualPlay() {
    const myToken = ++seqToken.current;
    await playOnce();
    if (seqToken.current !== myToken) return;
    const started = await startRecording();
    await sleep(Math.max(0, delaySeconds) * 1000);
    if (seqToken.current !== myToken) return;
    if (started) await stopAndSaveRecording();
  }

  function handleRepeat() { void manualPlay(); }

  if (!hasCards) {
    return (
      <div className="flash-root">
        <div className="flash-card">
          <h2 className="flash-title">No cards yet</h2>
          <div className="flash-empty">Add a card on the Cards screen to begin.</div>
          <audio ref={audioRef} hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="flash-root">
      <div className="flash-zone flash-zone-left" onClick={prevCard} />
      <div className="flash-zone flash-zone-right" onClick={nextCard} />

      <SwipeContainer onPrev={prevCard} onNext={nextCard}>
        {(dragX, bindProps) => (
          <div style={{ width: "100%" }}>
            <CardView
              ref={audioRef}
              word={card.word}
              images={card.images}
              bindProps={bindProps}
              style={{ transform: `translateX(${dragX}px)`, transition: dragX === 0 ? "transform 0.2s ease" : "none" }}
              onRepeat={handleRepeat}
            />
            <div className="study-actions">
              <button className="study-play" type="button" onClick={manualPlay}>Play</button>
            </div>
          </div>
        )}
      </SwipeContainer>
    </div>
  );
}
