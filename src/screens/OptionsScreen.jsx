import React from "react";
import "../styles/OptionsScreen.scss";

export default function OptionsScreen({ micEnabled, onChangeMic }) {
  return (
    <div className="options-root">
      <h2 className="options-title">Options</h2>

      <div className="options-item">
        <label className="options-label" htmlFor="mic-toggle">
          Record microphone during review
        </label>
        <input
          id="mic-toggle"
          type="checkbox"
          checked={micEnabled}
          onChange={(e) => onChangeMic(e.target.checked)}
          className="options-checkbox"
        />
      </div>

      <p className="options-note">
        When disabled, the microphone will not start and no recordings will be saved.
      </p>
    </div>
  );
}
