import React, { useState, useRef, useEffect } from "react";
import { useGesture } from "@use-gesture/react";
import "./ReviewScreen.scss";

function ReviewScreen({ cards }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const audioRef = useRef(null);

  const card = cards[index] || null;

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
            setIndex((i) => Math.max(0, i - 1));
          } else {
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }
        }
        setDragX(0);
      } else {
        setDragX(mx);
      }
    },
  });

  const prevCard = () => setIndex((i) => Math.max(0, i - 1));
  const nextCard = () => setIndex((i) => Math.min(cards.length - 1, i + 1));

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
