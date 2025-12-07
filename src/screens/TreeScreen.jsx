import React, { useMemo, useState } from "react";
import "../styles/TreeScreen.scss";

function TreeScreen({
  skills,
  treeRows,
  onEnterStudy,
  onEnterReview,
  onEditSlot,
  onAddRow,
}) {
  const [editMode, setEditMode] = useState(false);

  const slots = useMemo(() => {
    const byOrder = new Map();
    (skills || []).forEach((s) => {
      if (typeof s.order === "number") {
        byOrder.set(s.order, s);
      }
    });

    const totalSlots = Math.max(0, (treeRows || 0) * 3);
    const result = [];
    for (let i = 0; i < totalSlots; i += 1) {
      result.push({
        index: i,
        skill: byOrder.get(i) || null,
      });
    }
    return result;
  }, [skills, treeRows]);

  const handleCircleClick = (slotIndex, skill, half) => {
    if (editMode) {
      // Editing: always go to skill editor for this slot
      onEditSlot(slotIndex, skill ? skill.id : null);
      return;
    }

    // View mode: only filled circles do anything
    if (!skill) return;

    if (half === "left") {
      onEnterStudy(skill.id);
    } else if (half === "right") {
      onEnterReview(skill.id);
    }
  };

  const rows = [];
  for (let r = 0; r < treeRows; r += 1) {
    const start = r * 3;
    const rowSlots = slots.slice(start, start + 3);
    rows.push(
      <div className="tree-row" key={r}>
        {rowSlots.map(({ index, skill }) => (
          <div className="tree-slot" key={index}>
            <div
              className={
                "tree-circle " +
                (skill ? "tree-circle--filled" : "tree-circle--empty")
              }
            >
              <div
                className="tree-circle-half tree-circle-half--left"
                onClick={() => handleCircleClick(index, skill, "left")}
              />
              <div
                className="tree-circle-half tree-circle-half--right"
                onClick={() => handleCircleClick(index, skill, "right")}
              />
              <div className="tree-circle-divider" />
              {skill && (
                <div className="tree-circle-label">
                  {skill.name || "Untitled"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tree-root">
      <div className="tree-toolbar">
        <button
          type="button"
          className="tree-edit-button"
          onClick={() => setEditMode((prev) => !prev)}
        >
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      <div className="tree-grid">{rows}</div>

      {editMode && (
        <div className="tree-footer">
          <button
            type="button"
            className="tree-add-row-button"
            onClick={onAddRow}
          >
            Add row
          </button>
        </div>
      )}
    </div>
  );
}

export default TreeScreen;
