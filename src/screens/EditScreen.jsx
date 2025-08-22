import React, { useState, useEffect } from "react";
import "./EditScreen.scss";

export default function EditScreen({ card, onSave, onCancel }) {
  const [word, setWord] = useState("");
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    if (card) {
      setWord(card.word || "");
      setImages([]);
      setAudio(null);
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word) return;

    await onSave({ ...card, word }, { images, audio });
  };

  return (
    <form className="edit-root" onSubmit={handleSubmit}>
      <div className="edit-row">
        <label className="edit-label">Word:</label>
        <input
          className="edit-input"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          required
        />
      </div>

      <div className="edit-row">
        <label className="edit-label">New Images:</label>
        <input
          className="edit-file"
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files))}
        />
      </div>

      <div className="edit-previews">
        {images.map((file, idx) => (
          <img
            key={idx}
            src={URL.createObjectURL(file)}
            alt={`preview-${idx}`}
            className="edit-preview-image"
          />
        ))}
      </div>

      <div className="edit-row">
        <label className="edit-label">New Audio:</label>
        <input
          className="edit-file"
          type="file"
          accept="audio/*"
          onChange={(e) => setAudio(e.target.files[0])}
        />
      </div>

      <div className="edit-actions">
        <button className="edit-save" type="submit">Save</button>
        <button className="edit-cancel" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
