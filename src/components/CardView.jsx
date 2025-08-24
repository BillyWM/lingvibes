import React from "react";
import "../styles/common.scss";

const CardView = React.forwardRef(function CardView(
  { word, images, style, bindProps = {} },
  audioRef
) {
  return (
    <div
      className="flash-card"
      style={style}
      {...bindProps}
    >
      <h2 className="flash-title">{word}</h2>
      <div className="flash-images">
        {(images || []).map((src, i) => (
          <img key={i} src={src} alt="" className="flash-image" />
        ))}
      </div>
      <audio ref={audioRef} hidden />
    </div>
  );
});

export default CardView;
