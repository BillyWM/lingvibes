import React from "react";
import "../styles/common.scss";

const CardView = React.forwardRef(function CardView(
  { word, images = [], style, bindProps = {}, onRepeat },
  audioRef
) {
  return (
    <div className="flash-card" style={style} {...bindProps} onClick={onRepeat}>
      <h2 className="flash-title">{word}</h2>
      <div className="flash-images">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="flash-image"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        ))}
      </div>
      <audio ref={audioRef} hidden />
    </div>
  );
});

export default CardView;
