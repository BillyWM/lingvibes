import React, { useState } from "react";
import "../styles/AddScreen.scss";

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
    <form className="add-root" onSubmit={handleSubmit}>
      <div className="add-row">
        <label className="add-label">Word:</label>
        <input
          className="add-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          required
        />
      </div>

      <div className="add-row">
        <label className="add-label">Images:</label>
        <input
          className="add-file"
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files))}
        />
      </div>

      <div className="add-previews">
        {images.map((file, idx) => (
          <img
            key={idx}
            src={URL.createObjectURL(file)}
            alt={`preview-${idx}`}
            className="add-preview-image"
          />
        ))}
      </div>

      <div className="add-row">
        <label className="add-label">Audio:</label>
        <input
          className="add-file"
          type="file"
          accept="audio/*"
          onChange={(e) => setAudio(e.target.files[0])}
        />
      </div>

      <button className="add-submit" type="submit">Add Card</button>
    </form>
  );
}
