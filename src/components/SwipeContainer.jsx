import React, { useMemo, useState } from "react";
import { useGesture } from "@use-gesture/react";

export default function SwipeContainer({ onPrev, onNext, children }) {
  const [dragX, setDragX] = useState(0);

  const bind = useGesture({
    onDrag: ({ down, movement: [mx], direction: [xDir], velocity }) => {
      if (!down) {
        if (Math.abs(mx) > 100 || velocity > 0.5) {
          if (xDir > 0) onPrev?.();
          else onNext?.();
        }
        setDragX(0);
      } else {
        setDragX(mx);
      }
    }
  });

  // IMPORTANT: execute bind() and pass the props object
  const bindProps = useMemo(() => bind(), [bind]);

  return children(dragX, bindProps);
}
