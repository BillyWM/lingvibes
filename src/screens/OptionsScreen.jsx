import React, { useState } from "react";
import "../styles/OptionsScreen.scss";

const ELEVEN_MODEL_ID = "eleven_multilingual_v2";
const TEST_SENTENCE = "The quick brown fox jumps over the lazy dog.";

export default function OptionsScreen({ options, onChangeOptions }) {
  const {
    micEnabled,
    elevenApiKey,
    elevenVoiceUk,
    elevenVoiceEs,
    elevenVoiceZh,
  } = options;

  const [elevenError, setElevenError] = useState("");

  const handleMicChange = (checked) => {
    onChangeOptions({ micEnabled: checked });
  };

  const handleApiKeyChange = (value) => {
    onChangeOptions({ elevenApiKey: value });
  };

  const handleVoiceChange = (langKey, value) => {
    if (langKey === "uk") {
      onChangeOptions({ elevenVoiceUk: value });
    } else if (langKey === "es") {
      onChangeOptions({ elevenVoiceEs: value });
    } else if (langKey === "zh") {
      onChangeOptions({ elevenVoiceZh: value });
    }
  };

  const handleTestVoice = async (langKey) => {
    setElevenError("");

    const trimmedKey = (elevenApiKey || "").trim();
    if (!trimmedKey) {
      setElevenError("Please enter your ElevenLabs API key first.");
      return;
    }

    let voiceId = "";
    if (langKey === "uk") {
      voiceId = (elevenVoiceUk || "").trim();
    } else if (langKey === "es") {
      voiceId = (elevenVoiceEs || "").trim();
    } else if (langKey === "zh") {
      voiceId = (elevenVoiceZh || "").trim();
    }

    if (!voiceId) {
      setElevenError("Please enter a voice ID for that language before testing.");
      return;
    }

    try {
      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
          voiceId
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": trimmedKey,
          },
          body: JSON.stringify({
            text: TEST_SENTENCE,
            model_id: ELEVEN_MODEL_ID,
          }),
        }
      );

      if (!resp.ok) {
        let msg = `Error ${resp.status}`;
        try {
          const data = await resp.json();
          const detail = data?.detail || data?.message || data?.error;
          if (detail) {
            msg += `: ${detail}`;
          }
        } catch {
          // ignore JSON parse issues
        }
        setElevenError(msg);
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      try {
        await audio.play();
      } catch (err) {
        setElevenError(`Audio playback error: ${String(err)}`);
      }
    } catch (err) {
      setElevenError(`Network or API error: ${String(err)}`);
    }
  };

  return (
    <div className="options-root">
      <h2 className="options-title">Options</h2>

      {/* Microphone section */}
      <section className="options-section">
        <h3 className="options-subtitle">Microphone</h3>

        <div className="options-item">
          <label className="options-label" htmlFor="mic-toggle">
            Record microphone during review
          </label>
          <input
            id="mic-toggle"
            type="checkbox"
            checked={!!micEnabled}
            onChange={(e) => handleMicChange(e.target.checked)}
            className="options-checkbox"
          />
        </div>

        <p className="options-note">
          When disabled, the microphone will not start and no recordings will be saved.
        </p>
      </section>

      {/* ElevenLabs section */}
      <section className="options-section">
        <h3 className="options-subtitle">ElevenLabs</h3>

        <div className="options-item">
          <label className="options-label" htmlFor="eleven-api-key">
            API key
          </label>
          <input
            id="eleven-api-key"
            type="password"
            className="options-text-input"
            value={elevenApiKey || ""}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            autoComplete="off"
          />
        </div>

        <p className="options-note">
          The key is stored only in your browser (localStorage) and sent directly to ElevenLabs
          from this device. Do not reuse it on machines you don't trust.
        </p>

        <div className="options-eleven-row">
          <span className="options-eleven-lang">Ukrainian</span>
          <input
            type="text"
            className="options-eleven-input"
            placeholder="Voice ID"
            value={elevenVoiceUk || ""}
            onChange={(e) => handleVoiceChange("uk", e.target.value)}
          />
          <button
            type="button"
            className="options-eleven-test"
            onClick={() => handleTestVoice("uk")}
          >
            ▶️
          </button>
        </div>

        <div className="options-eleven-row">
          <span className="options-eleven-lang">Spanish</span>
          <input
            type="text"
            className="options-eleven-input"
            placeholder="Voice ID"
            value={elevenVoiceEs || ""}
            onChange={(e) => handleVoiceChange("es", e.target.value)}
          />
          <button
            type="button"
            className="options-eleven-test"
            onClick={() => handleTestVoice("es")}
          >
            ▶️
          </button>
        </div>

        <div className="options-eleven-row">
          <span className="options-eleven-lang">Mandarin</span>
          <input
            type="text"
            className="options-eleven-input"
            placeholder="Voice ID"
            value={elevenVoiceZh || ""}
            onChange={(e) => handleVoiceChange("zh", e.target.value)}
          />
          <button
            type="button"
            className="options-eleven-test"
            onClick={() => handleTestVoice("zh")}
          >
            ▶️
          </button>
        </div>

        {elevenError && (
          <div className="options-eleven-error">
            {elevenError}
          </div>
        )}
      </section>
    </div>
  );
}
