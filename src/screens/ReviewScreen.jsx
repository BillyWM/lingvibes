import React, { useState, useEffect, useRef } from "react";
import { useGesture } from "@use-gesture/react";

export default function ReviewScreen({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const card = cards[currentIndex] || null;
  const audioRef = useRef(null);
  const [style, setStyle] = useState({
    transform: "translateX(0px) rotate(0deg)",
    opacity: 1,
    transition: "none"
  });

  useEffect(() => {
    if (card?.audio) {
      const audio = new Audio(card.audio);
      audioRef.current = audio;
      audio.play();
    }
  }, [card]);

  const animateCard = (x, rotate, callback) => {
    setStyle({
      transform: `translateX(${x}px) rotate(${rotate}deg)`,
      opacity: 0,
      transition: "transform 0.2s ease, opacity 0.2s ease"
    });
    setTimeout(() => {
      callback();
      setStyle({
        transform: `translateX(${-x}px) rotate(${-rotate}deg)`,
        opacity: 0,
        transition: "none"
      });
      setTimeout(() => {
        setStyle({
          transform: "translateX(0px) rotate(0deg)",
          opacity: 1,
          transition: "transform 0.2s ease, opacity 0.2s ease"
        });
      }, 10);
    }, 200);
  };

  const nextCard = () => {
    animateCard(300, 15, () => {
      setCurrentIndex((i) => (i + 1) % cards.length);
    });
  };

  const prevCard = () => {
    animateCard(-300, -15, () => {
      setCurrentIndex((i) =>
        i === 0 ? cards.length - 1 : i - 1
      );
    });
  };

  const bind = useGesture(
    {
      onDragEnd: ({ swipe: [swipeX] }) => {
        if (swipeX < 0) {
          nextCard();
        } else if (swipeX > 0) {
          prevCard();
        }
      }
    },
    {
      swipe: { velocity: 0.5 }
    }
  );

  const handleReplayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  if (!card) {
    return <div style={{ padding: "1rem" }}>No cards available.</div>;
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        {...bind()}
        style={{
          ...style,
          maxWidth: "400px",
          width: "100%",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          touchAction: "pan-y"
        }}
        onClick={handleReplayAudio}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          {card.word}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {card.images?.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`image-${idx}`}
              style={{ maxWidth: "100%", borderRadius: "8px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
