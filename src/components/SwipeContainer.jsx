import React, { useState } from "react";
import { useGesture } from "@use-gesture/react";
import "../styles/common.scss";

/**
 * Renders side click zones and provides swipe gestures.
 * Children is a render prop: (dragX, bind) => ReactNode
 */
export default function SwipeContainer({ onPrev, onNext, children }) {
  const [dragX, setDragX] = useState(0);

  const bind = useGesture({
    onDrag: ({ down, movement: [mx], direction: [xDir], velocity }) => {
      if (!down) {
        if (Math.abs(mx) > 100 || velocity > 0.5) {
          if (xDir > 0) onPrev();
          else onNext();
        }
        setDragX(0);
      } else {
        setDragX(mx);
      }
    }
  });

  return (
    <div className="flash-root">
      <div className="flash-zone flash-zone-left" onClick={onPrev} />
      <div className="flash-zone flash-zone-right" onClick={onNext} />
      {children(dragX, bind)}
    </div>
  );
}
