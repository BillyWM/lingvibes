import React from "react";

export default function ListScreen({ cards, onEdit }) {
  return (
    <div style={{ padding: "1rem" }}>
      <h2>Card List</h2>
      {cards.length === 0 && <p>No cards added yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cards.map((card, index) => (
          <li
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0",
              borderBottom: "1px solid #ccc"
            }}
          >
            <span>{card.word}</span>
            <button onClick={() => onEdit(index)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
