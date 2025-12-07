import React, { useMemo } from "react";
import "../styles/TreeScreen.scss";

function TreeScreen({
  skills,
  treeRows,
  editMode,
  onEnterStudy,
  onEnterReview,
  onEditSlot,
  onAddRow,
}) {


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
        {rowSlots.map(({ index, skill }) => {
          const hasSkill = !!skill;

          // If there's no skill in this slot and we're NOT in edit mode,
          // don't show an empty circle – just an invisible spacer.
          if (!hasSkill && !editMode) {
            return <div className="tree-slot" key={index} />;
          }

          const circleClass = hasSkill
            ? "tree-circle tree-circle--filled"
            : "tree-circle tree-circle--empty";

          return (
            <div className="tree-slot" key={index}>
              <div
                className={circleClass}
                // In edit mode, clicking an empty circle should open the slot editor
                onClick={
                  !hasSkill && editMode
                    ? () => onEditSlot(index)
                    : undefined
                }
              >
                {/* divider + label only when there is a skill */}
                {hasSkill && <div className="tree-circle-divider" />}

                {hasSkill && (
                  <div className="tree-circle-label">
                    {skill.name}
                  </div>
                )}

                {/* left/right halves only matter when a skill exists */}
                {hasSkill && (
                  <>
                    <div
                      className="tree-circle-half tree-circle-half--left"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editMode) {
                          onEditSlot(index);
                        } else {
                          onEnterStudy(skill.id);
                        }
                      }}
                    />
                    <div
                      className="tree-circle-half tree-circle-half--right"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editMode) {
                          onEditSlot(index);
                        } else {
                          onEnterReview(skill.id);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="tree-root">
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
