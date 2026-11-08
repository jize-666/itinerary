"use client";
import { getAudio } from "@/engine/audio/AudioEngine";
import { useAudioState } from "./useAudio";

/** Tombol speaker mengambang. Muncul setelah tamu memilih di gerbang. */
export function SoundToggle() {
  const { started, enabled } = useAudioState();
  if (!started) return null;
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={enabled}
      aria-label="Gamelan sound"
      title={enabled ? "Gamelan on" : "Gamelan off"}
      onClick={() => getAudio().setEnabled(!enabled)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.18" />
        {enabled ? (
          <>
            <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
          </>
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </button>
  );
}
