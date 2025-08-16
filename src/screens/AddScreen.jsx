import React, { useState } from "react";

export default function AddScreen({ onAddCard, onDone }) {
  const [word, setWord] = useState("");
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);

  const handleImageChange = (e) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAudio(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!word) {
      alert("Please enter a word.");
      return;
    }

    const newCard = {
      word,
      images: images.map((f) => URL.createObjectURL(f)),
      audio: audio ? URL.createObjectURL(audio) : null
    };

    if (onAddCard) onAddCard(newCard);

    setWord("");
    setImages([]);
    setAudio(null);

    if (onDone) onDone();
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        Add New Card
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
          {images.map((file, idx) => (
            <img
              key={idx}
              src={URL.createObjectURL(file)}
              alt={`preview-${idx}`}
              style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "4px" }}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Audio:
          <input type="file" accept="audio/*" onChange={handleAudioChange} />
        </label>
        {audio && <div>Selected: {audio.name}</div>}
      </div>
      <button onClick={handleSubmit} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
        Add Card
      </button>
    </div>
  );
}
