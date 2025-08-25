import React, { useEffect, useMemo, useState } from "react";
import "../styles/CardsScreen.scss";

const PAGE_SIZE = 50;

function parseTagsInput(text) {
  return Array.from(
    new Set(
      (text || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

function parseInlineTags(text) {
  return (text || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function uniqueMerge(prevTags, newOnes) {
  const s = new Set(prevTags || []);
  for (const t of newOnes) s.add(t);
  return Array.from(s);
}

export default function CardsScreen({ cards, onAddCard, onSaveCard }) {
  // ---- Add form state ----
  const [newWord, setNewWord] = useState("");
  const [newImages, setNewImages] = useState([]);
  const [newAudio, setNewAudio] = useState(null);
  const [newTagsText, setNewTagsText] = useState("");

  // ---- Search + Pagination ----
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // ---- Edit state ----
  const [editingId, setEditingId] = useState(null);
  const [editWord, setEditWord] = useState("");
  const [editImages, setEditImages] = useState([]);
  const [editAudio, setEditAudio] = useState(null);
  const [editTags, setEditTags] = useState([]);      // array of strings
  const [editTagInput, setEditTagInput] = useState(""); // single tag add box

  // Previews
  const newImagePreviews = useMemo(
    () => Array.from(newImages || []).map((f) => URL.createObjectURL(f)),
    [newImages]
  );
  const editImagePreviews = useMemo(
    () => Array.from(editImages || []).map((f) => URL.createObjectURL(f)),
    [editImages]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const w = (c.word || "").toLowerCase();
      const t = Array.isArray(c.tags) ? c.tags.join(" ").toLowerCase() : "";
      return w.includes(q) || t.includes(q);
    });
  }, [cards, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filtered.slice(start, end);

  // ---- Add handlers ----
  function handleNewImagesChange(e) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setNewImages(files);
  }

  function handleNewAudioChange(e) {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setNewAudio(f);
  }

  async function submitAdd(e) {
    e.preventDefault();
    if (!newWord.trim()) return;

    const tags = parseTagsInput(newTagsText);
    const files = { images: newImages, audio: newAudio };
    await onAddCard({ word: newWord.trim(), tags }, files);

    setNewWord("");
    setNewImages([]);
    setNewAudio(null);
    setNewTagsText("");
    e.target.reset();
  }

	// ---- Edit handlers ----
	function beginEdit(card) {
		setEditingId(card.folderName);
		setEditWord(card.word || "");
		setEditImages([]);
		setEditAudio(null);
		setEditTags(Array.isArray(card.tags) ? [...card.tags] : []);
		setEditTagInput("");
	}

	function cancelEdit() {
		setEditingId(null);
		setEditWord("");
		setEditImages([]);
		setEditAudio(null);
		setEditTags([]);
		setEditTagInput("");
	}

	function handleEditImagesChange(e) {
		const files = e.target.files ? Array.from(e.target.files) : [];
		setEditImages(files);
	}

	function handleEditAudioChange(e) {
		const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
		setEditAudio(f);
	}

	// NEW: add multiple tags at once and dedupe
	function addEditTagsFromText(text) {
		const tags = parseInlineTags(text);
		if (tags.length === 0) return;
		setEditTags((prev) => uniqueMerge(prev, tags));
	}

	// Keep the "+" button behavior, but allow comma-separated here too
	function addEditTag() {
		if (!editTagInput.trim()) return;
		addEditTagsFromText(editTagInput);
		setEditTagInput("");
	}

	function removeEditTag(tag) {
		setEditTags((prev) => prev.filter((t) => t !== tag));
	}

	// NEW: onChange that consumes any complete segments before the last comma
	function handleEditTagInputChange(e) {
		const val = e.target.value;
		if (val.includes(",")) {
			const parts = val.split(",");
			const remainder = parts.pop(); // keep the last segment in the input
			const complete = parts.join(",");
			addEditTagsFromText(complete);
			setEditTagInput(remainder);
		} else {
			setEditTagInput(val);
		}
	}

	// NEW: Enter should add the current input as tags
	function handleEditTagKeyDown(e) {
		if (e.key === "Enter") {
			e.preventDefault();
			if (editTagInput.trim()) {
			addEditTagsFromText(editTagInput);
			setEditTagInput("");
			}
		}
	}

	async function submitEdit(e, original) {
		e.preventDefault();
		if (!original) return;

		const updated = {
			word: editWord.trim() || original.word,
			folderName: original.folderName,
			tags: editTags
		};
		const files = { images: editImages, audio: editAudio };
		await onSaveCard(updated, files);

		cancelEdit();
	}

  // ---- Pagination UI ----
  function Pagination() {
    if (totalPages <= 1) return null;
    return (
      <div className="cards-pagination">
        <button
          className="cards-pagebtn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ‹ Prev
        </button>
        <span className="cards-pageinfo">
          Page {page} of {totalPages}
        </span>
        <button
          className="cards-pagebtn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next ›
        </button>
      </div>
    );
  }

  return (
    <div className="cards-root">
      <h2 className="cards-title">Add Card</h2>

      <form className="cards-add-form" onSubmit={submitAdd}>
        <div className="cards-row">
          <label className="cards-label" htmlFor="add-word">Word</label>
          <input
            id="add-word"
            className="cards-input"
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Enter word"
          />
        </div>

        <div className="cards-row">
          <label className="cards-label" htmlFor="add-tags">Tags</label>
          <input
            id="add-tags"
            className="cards-input"
            type="text"
            value={newTagsText}
            onChange={(e) => setNewTagsText(e.target.value)}
            placeholder="Comma-separated (e.g. noun, animals, beginner)"
          />
        </div>

        <div className="cards-row">
          <label className="cards-label" htmlFor="add-images">Images</label>
          <input
            id="add-images"
            className="cards-file"
            type="file"
            accept="image/*"
            multiple
            onChange={handleNewImagesChange}
          />
        </div>

        {newImagePreviews.length > 0 && (
          <div className="cards-previews">
            {newImagePreviews.map((src, i) => (
              <img key={i} src={src} alt="" className="cards-preview-image" />
            ))}
          </div>
        )}

        <div className="cards-row">
          <label className="cards-label" htmlFor="add-audio">Audio</label>
          <input
            id="add-audio"
            className="cards-file"
            type="file"
            accept="audio/*"
            onChange={handleNewAudioChange}
          />
        </div>

        <div className="cards-actions">
          <button className="cards-submit" type="submit">Add</button>
        </div>
      </form>

      <div className="cards-toolbar">
        <input
          className="cards-search"
          type="search"
          placeholder="Search cards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cards-count">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <Pagination />

      <ul className="cards-list">
        {pageItems.map((card) => {
          const isEditing = editingId === card.folderName;
          const tags = Array.isArray(card.tags) ? card.tags : [];
          const visible = tags.slice(0, 4);
          const extra = Math.max(0, tags.length - visible.length);

          return (
            <li key={card.folderName} className="cards-item">
              <div className="cards-item-row">
                <div className="cards-word">
                  {card.word}
                  {visible.length > 0 && (
                    <span className="cards-tags">
                      {visible.map((t) => (
                        <span key={t} className="cards-tag">{t}</span>
                      ))}
                      {extra > 0 && <span className="cards-tag more">+{extra}</span>}
                    </span>
                  )}
                </div>
                <div className="cards-buttons">
                  <button
                    className="cards-edit"
                    onClick={() => beginEdit(card)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {isEditing && (
                <form className="cards-edit-form" onSubmit={(e) => submitEdit(e, card)}>
                  <div className="cards-row">
                    <label className="cards-label" htmlFor={`edit-word-${card.folderName}`}>Word</label>
                    <input
                      id={`edit-word-${card.folderName}`}
                      className="cards-input"
                      type="text"
                      value={editWord}
                      onChange={(e) => setEditWord(e.target.value)}
                    />
                  </div>

                  <div className="cards-row">
                    <label className="cards-label">Tags</label>
                    <div className="cards-tags-editor">
                      <div className="cards-tags-list">
                        {editTags.map((t) => (
                          <span key={t} className="cards-tag editable">
                            {t}
                            <button
                              type="button"
                              className="cards-tag-del"
                              onClick={() => removeEditTag(t)}
                              aria-label={`Remove tag ${t}`}
                              title={`Remove ${t}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
					<div className="cards-tags-addrow">
						<input
							className="cards-input"
							type="text"
							value={editTagInput}
							onChange={handleEditTagInputChange}
							onKeyDown={handleEditTagKeyDown}
							placeholder="Type tags, use commas or Enter"
						/>
						<button
							className="cards-edit"
							type="button"
							onClick={addEditTag}
							title="Add tag(s)"
							aria-label="Add tag(s)"
						>
						+
						</button>
					</div>
                </div>
                </div>

                  <div className="cards-row">
                    <label className="cards-label" htmlFor={`edit-images-${card.folderName}`}>Images</label>
                    <input
                      id={`edit-images-${card.folderName}`}
                      className="cards-file"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditImagesChange}
                    />
                  </div>

                  {editImagePreviews.length > 0 && (
                    <div className="cards-previews">
                      {editImagePreviews.map((src, i) => (
                        <img key={i} src={src} alt="" className="cards-preview-image" />
                      ))}
                    </div>
                  )}

                  <div className="cards-row">
                    <label className="cards-label" htmlFor={`edit-audio-${card.folderName}`}>Audio</label>
                    <input
                      id={`edit-audio-${card.folderName}`}
                      className="cards-file"
                      type="file"
                      accept="audio/*"
                      onChange={handleEditAudioChange}
                    />
                  </div>

                  <div className="cards-actions">
                    <button className="cards-save" type="submit">Save</button>
                    <button className="cards-cancel" type="button" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <Pagination />
    </div>
  );
}
