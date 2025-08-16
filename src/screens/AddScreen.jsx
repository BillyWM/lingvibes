import React, { useState } from "react";

export default function AddScreen({ onAddCard, onDone }) {
  const [word, setWord] = useState("");
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word) return;

    await onAddCard({ word }, { images, audio });
    setWord("");
    setImages([]);
    setAudio(null);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1rem" }}>
      <div>
        <label>Word:</label>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          required
          style={{ marginLeft: "0.5rem" }}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>Images:</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files))}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>Audio:</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setAudio(e.target.files[0])}
        />
      </div>

      <button type="submit" style={{ marginTop: "1rem" }}>
        Add Card
      </button>
    </form>
  );
}
