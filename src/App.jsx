import React, { useState } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import AddScreen from "./screens/AddScreen.jsx";
import EditScreen from "./screens/EditScreen.jsx";
import ListScreen from "./screens/ListScreen.jsx"; // fixed import

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState("review");
  const [editingCardId, setEditingCardId] = useState(null);
  const [cards, setCards] = useState([]);

  const navigate = (target, id = null) => {
    setMenuOpen(false);
    setEditingCardId(id);
    setScreen(target);
  };

  let content;
  if (screen === "review") {
    content = <ReviewScreen cards={cards} />;
  } else if (screen === "add") {
    content = (
      <AddScreen
        onAddCard={(newCard) => setCards((prev) => [...prev, newCard])}
        onDone={() => navigate("cards")}
      />
    );
  } else if (screen === "edit") {
    const cardToEdit = cards[editingCardId] || null;
    content = (
      <EditScreen
        card={cardToEdit}
        onSave={(updatedCard) => {
          setCards((prev) =>
            prev.map((c, idx) => (idx === editingCardId ? updatedCard : c))
          );
          navigate("cards");
        }}
        onCancel={() => navigate("cards")}
      />
    );
  } else if (screen === "cards") {
    content = (
      <ListScreen
        cards={cards}
        onEdit={(id) => navigate("edit", id)}
      />
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          background: "#333",
          color: "#fff",
          padding: "0.5rem 1rem"
        }}
      >
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{ marginRight: "1rem", cursor: "pointer" }}
        >
          ☰
        </button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Flashcards</h1>
      </header>

      {/* Sidebar Menu */}
      {menuOpen && (
        <nav
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "200px",
            height: "100%",
            background: "#555",
            color: "#fff",
            padding: "1rem",
            zIndex: 10
          }}
        >
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <button
                onClick={() => navigate("review")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Review
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("cards")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Card List
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("add")}
                style={{ display: "block", margin: "0.5rem 0", cursor: "pointer" }}
              >
                Add Card
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: "auto" }}>{content}</main>
    </div>
  );
}

export default App;
