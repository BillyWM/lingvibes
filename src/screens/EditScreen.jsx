import React, { useState, useEffect } from "react";

export default function EditScreen({ card, onSave, onCancel }) {
  const [word, setWord] = useState("");
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    if (card) {
      setWord(card.word);
      setImages([]); // new files to replace existing images
      setAudio(null);
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word) return;

    await onSave(
      { ...card, word },
      { images, audio }
    );
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
        <label>New Images (optional):</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files))}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <label>New Audio (optional):</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setAudio(e.target.files[0])}
        />
      </div>

      <button type="submit" style={{ marginTop: "1rem", marginRight: "0.5rem" }}>
        Save
      </button>
      <button type="button" onClick={onCancel} style={{ marginTop: "1rem" }}>
        Cancel
      </button>
    </form>
  );
}
