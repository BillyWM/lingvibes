import React, { useState, useEffect, useRef } from "react";
import { useDrag } from "@use-gesture/react";

export default function ReviewScreen({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef(null);

  const card = cards[currentIndex] || null;

  useEffect(() => {
    if (card && card.audio) {
      if (audioRef.current) {
        audioRef.current.src = card.audio;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [card]);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const bind = useDrag(
    ({ swipe: [swipeX] }) => {
      if (swipeX === 1) prevCard();
      if (swipeX === -1) nextCard();
    },
    { swipe: { velocity: 0.5 } }
  );

  if (!card) return <div style={{ padding: "1rem" }}>No cards available.</div>;

  return (
    <div
      {...bind()}
      style={{ padding: "1rem", textAlign: "center", position: "relative", userSelect: "none" }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{card.word}</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          flexWrap: "wrap"
        }}
      >
        {card.images?.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`card-${idx}`}
            style={{ maxWidth: "200px", borderRadius: "4px" }}
          />
        ))}
      </div>
      <audio ref={audioRef} hidden />

      {/* Left click zone */}
      <div
        onClick={prevCard}
        style={{
          position: "absolute",
          top: "25%",           // start 25% down
          bottom: "25%",        // end 25% from bottom
          left: 0,
          width: "25%",
          cursor: "pointer",
          zIndex: 5,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />

      {/* Right click zone */}
      <div
        onClick={nextCard}
        style={{
          position: "absolute",
          top: "25%",           // start 25% down
          bottom: "25%",        // end 25% from bottom
          right: 0,
          width: "25%",
          cursor: "pointer",
          zIndex: 5,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}
