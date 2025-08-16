import React from 'react'

export default function ListScreen({ cards, onEdit, setScreen }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>All Cards</h2>
      {cards.length === 0 && <p>No cards yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cards.map(c => (
          <li key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}>
            <span>{c.word}</span>
            <span>
              <button onClick={() => onEdit(c.id)} style={{ marginRight: 8 }}>Edit</button>
            </span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setScreen('add')}>Add Card</button>
      </div>
    </div>
  )
}
