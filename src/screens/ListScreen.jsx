import React from "react";
import "../styles/ListScreen.scss";

export default function ListScreen({ cards, onEdit }) {
  return (
    <div className="list-root">
      <h2 className="list-title">Card List</h2>
      {cards.length === 0 && <p className="list-empty">No cards added yet.</p>}
      <ul className="list-list">
        {cards.map((card, index) => (
          <li key={index} className="list-item">
            <span className="list-word">{card.word}</span>
            <button className="list-edit" onClick={() => onEdit(index)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
