import React, { useMemo, useState } from "react";
import "../styles/SkillEditScreen.scss";

function normalizeTags(input) {
  return input
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function SkillEditScreen({ skill, slotIndex, cards, onSave, onCancel }) {
  const [name, setName] = useState(skill ? skill.name || "" : "");
  const [selectedIds, setSelectedIds] = useState(
    skill && Array.isArray(skill.cardIds) ? skill.cardIds.slice() : []
  );
  const [tagInput, setTagInput] = useState("");

  const parsedTags = useMemo(() => normalizeTags(tagInput), [tagInput]);

  const selectedSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );

  const cardsInSkill = useMemo(
    () =>
      (cards || []).filter((c) =>
        selectedSet.has(c.id)
      ),
    [cards, selectedSet]
  );

  const filteredCandidates = useMemo(() => {
    if (!parsedTags.length) return [];

    return (cards || []).filter((c) => {
      if (!Array.isArray(c.tags) || !c.tags.length) return false;
      return parsedTags.every((tag) => c.tags.includes(tag));
    });
  }, [cards, parsedTags]);

  const handleAddCard = (cardId) => {
    if (selectedSet.has(cardId)) return;
    setSelectedIds((prev) => prev.concat(cardId));
  };

  const handleRemoveCard = (cardId) => {
    setSelectedIds((prev) => prev.filter((id) => id !== cardId));
  };

  const handleAddAllCandidates = () => {
    if (!filteredCandidates.length) return;
    setSelectedIds((prev) => {
      const set = new Set(prev);
      filteredCandidates.forEach((c) => set.add(c.id));
      return Array.from(set);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(name.trim(), selectedIds);
  };

  const isNew = !skill;

  return (
    <div className="skill-root">
      <h2 className="skill-title">
        {isNew ? "New skill" : "Edit skill"}
      </h2>

      <form className="skill-form" onSubmit={handleSubmit}>
        <div className="skill-section">
          <label className="skill-label" htmlFor="skill-name">
            Name
          </label>
          <input
            id="skill-name"
            className="skill-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Food 1, Kitchen nouns, 青 cluster"
          />
          <div className="skill-slot-note">
            Slot index: {slotIndex}
          </div>
        </div>

        <div className="skill-columns">
          <div className="skill-section skill-section--left">
            <h3 className="skill-subtitle">Cards in this skill</h3>
            {cardsInSkill.length === 0 ? (
              <p className="skill-empty">No cards selected yet.</p>
            ) : (
              <ul className="skill-card-list">
                {cardsInSkill.map((card) => (
                  <li className="skill-card-row" key={card.id}>
                    <div className="skill-card-main">
                      <span className="skill-card-word">
                        {card.word}
                      </span>
                      {Array.isArray(card.tags) && card.tags.length > 0 && (
                        <span className="skill-card-tags">
                          {card.tags.slice(0, 4).map((tag) => (
                            <span
                              className="skill-tag-pill"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                          {card.tags.length > 4 && (
                            <span className="skill-tag-more">
                              +{card.tags.length - 4}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="skill-remove-button"
                      onClick={() => handleRemoveCard(card.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="skill-section skill-section--right">
            <h3 className="skill-subtitle">Add cards by tags</h3>
            <label className="skill-label" htmlFor="skill-tags">
              Enter tags (space or comma separated)
            </label>
            <input
              id="skill-tags"
              className="skill-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. food kitchen"
            />
            <div className="skill-filter-note">
              Shows cards whose tags contain <strong>all</strong>{" "}
              of these.
            </div>

            {filteredCandidates.length > 0 && (
              <div className="skill-add-all">
                <button
                  type="button"
                  className="skill-add-all-button"
                  onClick={handleAddAllCandidates}
                >
                  Add all ({filteredCandidates.length})
                </button>
              </div>
            )}

            {parsedTags.length === 0 ? (
              <p className="skill-empty">
                Enter tags to see matching cards.
              </p>
            ) : filteredCandidates.length === 0 ? (
              <p className="skill-empty">
                No cards match all of those tags.
              </p>
            ) : (
              <ul className="skill-card-list">
                {filteredCandidates.map((card) => {
                  const already = selectedSet.has(card.id);
                  return (
                    <li className="skill-card-row" key={card.id}>
                      <div className="skill-card-main">
                        <span className="skill-card-word">
                          {card.word}
                        </span>
                        {Array.isArray(card.tags) &&
                          card.tags.length > 0 && (
                            <span className="skill-card-tags">
                              {card.tags.slice(0, 4).map((tag) => (
                                <span
                                  className="skill-tag-pill"
                                  key={tag}
                                >
                                  {tag}
                                </span>
                              ))}
                              {card.tags.length > 4 && (
                                <span className="skill-tag-more">
                                  +{card.tags.length - 4}
                                </span>
                              )}
                            </span>
                          )}
                      </div>
                      <button
                        type="button"
                        className="skill-add-button"
                        onClick={() => handleAddCard(card.id)}
                        disabled={already}
                      >
                        {already ? "Added" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="skill-actions">
          <button type="submit" className="skill-save-button">
            Save
          </button>
          <button
            type="button"
            className="skill-cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default SkillEditScreen;
