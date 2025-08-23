import React, { useState, useRef, useEffect } from "react";
import { useGesture } from "@use-gesture/react";
import "./ReviewScreen.scss";

function ReviewScreen({ cards, micEnabled, onSaveRecording }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const audioRef = useRef(null);

  // Recording refs
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("audio/webm");

  const card = cards[index] || null;

  // Auto-play audio when card changes
  useEffect(() => {
    if (card && card.audio && audioRef.current) {
      audioRef.current.src = card.audio;
      audioRef.current.play().catch(() => {});
    }
  }, [card]);

  // Helpers to control recording
  async function ensureStream() {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }

  async function startRecording() {
    if (!micEnabled || !card) return;
    const stream = await ensureStream();

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
    ];
    let mime = "";
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        mime = t;
        break;
      }
    }
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mimeRef.current = rec.mimeType || "audio/webm";
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start();
    recorderRef.current = rec;
  }

  async function stopAndMaybeSave(save) {
    const rec = recorderRef.current;
    if (!rec) return;

    await new Promise((resolve) => {
      rec.onstop = resolve;
      if (rec.state !== "inactive") rec.stop();
      else resolve();
    });

    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    recorderRef.current = null;

    // If not saving (leaving review, toggled off, etc.), just drop the data.
    if (!save) return;

    if (onSaveRecording && card?.folderName && blob.size > 0) {
      const ext = mimeRef.current.includes("ogg") ? "ogg" : "webm";
      await onSaveRecording(card.folderName, blob, ext);
    }
  }

  // Start/stop recording when index or micEnabled changes
  useEffect(() => {
    let active = true;

    (async () => {
      if (micEnabled && card) {
        await startRecording();
      }
    })();

    // Cleanup: do NOT save when leaving review or turning mic off.
    return () => {
      if (!active) return;
      active = false;
      // discard on cleanup
      stopAndMaybeSave(false).catch(() => {});
    };
  }, [index, micEnabled]); // re-run when card index changes or mic is toggled

  // Explicitly save on card change initiated by user (prev/next)
  const prevCard = async () => {
    await stopAndMaybeSave(true); // save current attempt before changing
    setIndex((i) => Math.max(0, i - 1));
  };

  const nextCard = async () => {
    await stopAndMaybeSave(true); // save current attempt before changing
    setIndex((i) => Math.min(cards.length - 1, i + 1));
  };

  const bind = useGesture({
    onDrag: ({ down, movement: [mx], direction: [xDir], velocity }) => {
      if (!card) return;
      if (!down) {
        if (Math.abs(mx) > 100 || velocity > 0.5) {
          if (xDir > 0) prevCard();
          else nextCard();
        }
        setDragX(0);
      } else {
        setDragX(mx);
      }
    },
  });

  if (!card) return <div className="review-empty">No cards to review</div>;

  return (
    <div className="review-root">
      <div className="review-zone review-zone-left" onClick={prevCard} />
      <div className="review-zone review-zone-right" onClick={nextCard} />

      <div
        {...bind()}
        className="review-card"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === 0 ? "transform 0.2s ease" : "none",
        }}
      >
        <h2 className="review-title">{card.word}</h2>
        <div className="review-images">
          {card.images.map((src, i) => (
            <img key={i} src={src} alt="" className="review-image" />
          ))}
        </div>
        <audio ref={audioRef} hidden />
      </div>
    </div>
  );
}

export default ReviewScreen;
