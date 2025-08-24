import { useRef } from "react";

/**
 * Mic recorder shared hook.
 * - micEnabled: boolean
 * - onSave(folderName, blob, ext): async saver
 * - getFolderName(): returns current card folder name or null
 */
export function useRecorder({ micEnabled, onSave, getFolderName }) {
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("audio/webm");

  async function ensureStream() {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }

  async function startRecording() {
    if (!micEnabled) return;
    const folder = getFolderName?.();
    if (!folder) return;

    const stream = await ensureStream();

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm"
    ];
    let mime = "";
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        mime = t;
        break;
      }
    }

    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mimeRef.current = rec.mimeType || "audio/webm";
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start();
    recorderRef.current = rec;
  }

  async function stopAndSaveIfAny() {
    const rec = recorderRef.current;
    if (!rec) return;

    if (rec.state !== "inactive") {
      await new Promise((resolve) => {
        rec.onstop = resolve;
        rec.stop();
      });
    }

    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    recorderRef.current = null;

    const folder = getFolderName?.();
    if (onSave && folder && blob.size > 0) {
      const ext = mimeRef.current.includes("ogg") ? "ogg" : "webm";
      await onSave(folder, blob, ext);
    }
  }

  return {
    startRecording,
    stopAndSaveIfAny
  };
}
