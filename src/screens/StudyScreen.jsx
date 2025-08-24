import React, { useEffect, useRef, useState } from "react";
import SwipeContainer from "../components/SwipeContainer.jsx";
import CardView from "../components/CardView.jsx";
import { useRecorder } from "../hooks/useRecorder.js";
import { waitMs, playOnce } from "../utils/audioUtils.js";
import "../styles/StudyScreen.scss";

const RECORD_WINDOW_MS = 8000; // fixed 8s window per your spec

export default function StudyScreen({ cards, micEnabled, onSaveRecording }) {
  const [index, setIndex] = useState(0);
  const [autoPlayedThisCard, setAutoPlayedThisCard] = useState(false);
  const audioRef = useRef(null);

  const card = cards[index] || null;

  const { startRecording, stopAndSaveIfAny } = useRecorder({
    micEnabled,
    onSave: onSaveRecording,
    getFolderName: () => card?.folderName || null
  });

  useEffect(() => {
    setAutoPlayedThisCard(false);
  }, [index, card?.folderName]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!card || autoPlayedThisCard) return;
      await playAndRecordWindow();
      if (active) setAutoPlayedThisCard(true);
    })();

    return () => {
      active = false;
      // Save partial segment on exit
      stopAndSaveIfAny().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayedThisCard, card?.folderName]);

  async function playAndRecordWindow() {
    await stopAndSaveIfAny();

    if (card?.audio && audioRef.current) {
      await playOnce(audioRef.current, card.audio);
    }

    if (micEnabled) {
      await startRecording();
      await waitMs(RECORD_WINDOW_MS);
      await stopAndSaveIfAny();
    }
  }

  async function prevCard() {
    await stopAndSaveIfAny();
    setIndex((i) => Math.max(0, i - 1));
  }

  async function nextCard() {
    await stopAndSaveIfAny();
    setIndex((i) => Math.min(cards.length - 1, i + 1));
  }

  if (!card) return <div className="flash-empty">No cards to study</div>;

  return (
    <SwipeContainer onPrev={() => prevCard()} onNext={() => nextCard()}>
      {(dragX, bind) => (
        <div style={{ width: "100%" }}>
          <CardView
            ref={audioRef}
            word={card.word}
            images={card.images}
            bindProps={bind()}
            style={{
              transform: `translateX(${dragX}px)`,
              transition: dragX === 0 ? "transform 0.2s ease" : "none"
            }}
          />
          <div className="study-actions">
            <button className="study-play" onClick={playAndRecordWindow}>
              Play
            </button>
          </div>
        </div>
      )}
    </SwipeContainer>
  );
}
