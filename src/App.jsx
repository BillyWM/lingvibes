import React, { useState } from "react";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import AddScreen from "./screens/AddScreen.jsx";
import EditScreen from "./screens/EditScreen.jsx";
import CardListScreen from "./screens/ListScreen.jsx";

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
    content = <ReviewScreen />;
  } else if (screen === "add") {
    content = <AddScreen onAddCard={(newCard) => setCards((prev) => [...prev, newCard])} onDone={() => navigate("cards")} />
  } else if (screen === "edit") {
    content = (
      <EditScreen cardId={editingCardId} onDone={() => navigate("cards")} />
    );
  } else if (screen === "cards") {
    content = <CardListScreen cards={cards} onEdit={(id) => navigate("edit", id)} />
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center bg-gray-800 text-white px-4 py-2">
        <button
          className="mr-4"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>
        <h1 className="text-lg font-bold">Flashcards</h1>
      </header>

      {/* Sidebar Menu */}
      {menuOpen && (
        <nav className="absolute top-0 left-0 w-48 h-full bg-gray-700 text-white shadow-lg p-4 z-10">
          <ul className="space-y-2">
            <li>
              <button onClick={() => navigate("review")}>Review</button>
            </li>
            <li>
              <button onClick={() => navigate("cards")}>Card List</button>
            </li>
            <li>
              <button onClick={() => navigate("add")}>Add Card</button>
            </li>
          </ul>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {content}
      </main>
    </div>
  );
}

export default App;
