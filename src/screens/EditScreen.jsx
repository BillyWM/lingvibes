import React, { useState, useEffect } from "react";

export default function EditScreen({ card, onSave, onCancel }) {
  const [word, setWord] = useState("");
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    if (card) {
      setWord(card.word || "");
      setImages(card.images || []);
      setAudio(card.audio || null);
    }
  }, [card]);

  const handleImageChange = (e) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files).map((f) => URL.createObjectURL(f)));
    }
  };

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAudio(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = () => {
    const updatedCard = { word, images, audio };
    if (onSave) onSave(updatedCard);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        Edit Card
      </h2>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Word:
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Images:
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
          {images.map((img, idx) => (
            <img key={idx} src={img} alt={`preview-${idx}`} style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "4px" }} />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Audio:
          <input type="file" accept="audio/*" onChange={handleAudioChange} />
        </label>
        {audio && <div>Selected: {audio}</div>}
      </div>
      <button onClick={handleSave} style={{ padding: "0.5rem 1rem", cursor: "pointer", marginRight: "0.5rem" }}>
        Save
      </button>
      <button onClick={onCancel} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
        Cancel
      </button>
    </div>
  );
}
