// src/utils/audioUtils.js

// Utility: simple sleep
export function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility: play an audio element once and resolve when it finishes
export async function playOnce(audioEl, src) {
  if (!audioEl || !src) return;

  audioEl.src = src;

  await new Promise((resolve) => {
    const onEnded = () => {
      audioEl.removeEventListener("ended", onEnded);
      resolve();
    };
    audioEl.addEventListener("ended", onEnded);

    const p = audioEl.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        audioEl.removeEventListener("ended", onEnded);
        resolve();
      });
    }
  });
}
