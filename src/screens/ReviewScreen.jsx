// imports unchanged
import React, { useEffect, useRef, useState } from "react";
import SwipeContainer from "../components/SwipeContainer.jsx";
import CardView from "../components/CardView.jsx";
import { useRecorder } from "../hooks/useRecorder.js";
import { waitMs, playOnce } from "../utils/audioUtils.js";
import "../styles/ReviewScreen.scss";

function ReviewScreen({ cards, micEnabled, onSaveRecording, delaySeconds, repeats }) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef(null);
  const seqTokenRef = useRef(0);

  // ✅ fallback defaults to handle older localStorage entries
  const delay = Number.isFinite(Number(delaySeconds)) ? Number(delaySeconds) : 8;
  const reps = Number.isFinite(Number(repeats)) ? Number(repeats) : 2;

  const card = cards[index] || null;

  const { startRecording, stopAndSaveIfAny } = useRecorder({
    micEnabled,
    onSave: onSaveRecording,
    getFolderName: () => card?.folderName || null
  });

  useEffect(() => {
    if (card && card.audio && audioRef.current) {
      audioRef.current.src = card.audio;
      audioRef.current.play().catch(() => {});
    }
  }, [card]);

  async function prevCard() {
    await stopAndSaveIfAny();
    setIndex((i) => Math.max(0, i - 1));
  }

  async function nextCard() {
    await stopAndSaveIfAny();
    setIndex((i) => Math.min(cards.length - 1, i + 1));
  }

  useEffect(() => {
    const myToken = ++seqTokenRef.current;

    async function run() {
      if (!card) return;

      const cycles = Math.max(1, reps);

      for (let i = 0; i < cycles; i++) {
        if (seqTokenRef.current !== myToken) return;

        if (card.audio && audioRef.current) {
          await playOnce(audioRef.current, card.audio);
        } else {
          // no audio: just wait the same window
          await waitMs(delay * 1000);
        }

        if (seqTokenRef.current !== myToken) return;
        await waitMs(delay * 1000);

        if (seqTokenRef.current !== myToken) return;
        if (micEnabled) {
          await stopAndSaveIfAny();
          if (i < cycles - 1) await startRecording();
        }
      }

      if (seqTokenRef.current === myToken) {
        await nextCard();
      }
    }

    (async () => {
      if (micEnabled && card) await startRecording();
      await run();
    })();

    return () => {
      // save partial on unmount / re-run
      stopAndSaveIfAny().catch(() => {});
    };
  }, [index, card, delay, reps, micEnabled]);

  if (!card) return <div className="flash-empty">No cards to review</div>;

  return (
    <SwipeContainer onPrev={() => prevCard()} onNext={() => nextCard()}>
      {(dragX, bindProps) => (
        <CardView
          ref={audioRef}
          word={card.word}
          images={card.images}
          bindProps={bindProps}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragX === 0 ? "transform 0.2s ease" : "none"
          }}
        />
      )}
    </SwipeContainer>
  );
}

export default ReviewScreen;
