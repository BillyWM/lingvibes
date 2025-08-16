import React from "react";

export default function ListScreen({ cards = [], onEdit }) {
  return (
    <div style={{ padding: "1rem" }}>
      {cards.map((card, idx) => (
        <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
          <span>{card.word}</span>
          <button onClick={() => onEdit(idx)}>Edit</button>
        </div>
      ))}
    </div>
  );
}
