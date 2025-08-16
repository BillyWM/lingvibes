import React, { useState, useRef, useEffect } from "react";
import { useGesture } from "@use-gesture/react";

function ReviewScreen({ cards }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const audioRef = useRef(null);

  const card = cards[index] || null;

  // Auto-play audio when card changes
  useEffect(() => {
    if (card && card.audio && audioRef.current) {
      audioRef.current.src = card.audio;
      audioRef.current.play().catch(() => {});
    }
  }, [card]);

  const bind = useGesture({
    onDrag: ({ down, movement: [mx], direction: [xDir], velocity }) => {
      if (!card) return;

      if (!down) {
        if (Math.abs(mx) > 100 || velocity > 0.5) {
          if (xDir > 0) {
            // swipe right = previous
            setIndex((i) => Math.max(0, i - 1));
          } else {
            // swipe left = next
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }
        }
        setDragX(0);
      } else {
        setDragX(mx);
      }
    },
  });

  const prevCard = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  const nextCard = () => {
    setIndex((i) => Math.min(cards.length - 1, i + 1));
  };

  if (!card) {
    return <div style={{ padding: "1rem" }}>No cards to review</div>;
  }

  return (
    <div style={{ position: "relative", flex: 1, height: "100%", overflow: "hidden" }}>
      {/* Left clickable region */}
      <div
        onClick={prevCard}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "20%",
          height: "100%",
          zIndex: 1,
          cursor: "pointer",
        }}
      />

      {/* Right clickable region */}
      <div
        onClick={nextCard}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "20%",
          height: "100%",
          zIndex: 1,
          cursor: "pointer",
        }}
      />

      {/* Card */}
      <div
        {...bind()}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === 0 ? "transform 0.2s ease" : "none",
          width: "60%",
          maxWidth: "500px",
          margin: "0 auto",
          textAlign: "center",
          padding: "1rem",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          borderRadius: "8px",
          background: "#fff",
          position: "relative",
          top: "50%",
          transformOrigin: "center",
          userSelect: "none",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{card.word}</h2>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          {card.images.map((src, i) => (
            <img key={i} src={src} alt="" style={{ maxWidth: "100px", maxHeight: "100px" }} />
          ))}
        </div>
        <audio ref={audioRef} hidden />
      </div>
    </div>
  );
}

export default ReviewScreen;
