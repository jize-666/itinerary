"use client";
import { audioStatus } from "@/engine/audio/status";
import { CHROME } from "@/engine/i18n/chrome";
import { useLang } from "@/engine/i18n/useLang";
import { useAudioState } from "./useAudio";

/** Tombol speaker bulat 3D di kelompok kanan atas. Menyala = emas & tertekan. */
export function SoundButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const lang = useLang();
  return (
    <button
      type="button"
      className="pb pb--glass pb--icon pb--round sound-toggle"
      aria-pressed={on}
      aria-label={CHROME["sound.label"][lang]}
      title={CHROME[on ? "sound.on" : "sound.off"][lang]}
      onClick={onToggle}
    >
      <span className="pb-face">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.18" />
          {on ? (
            <>
              <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
              <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
            </>
          ) : (
            <path d="M16 9.5l5 5M21 9.5l-5 5" />
          )}
        </svg>
      </span>
    </button>
  );
}

/** Toggle mute global, setelah lakon dimulai. Sebelum mulai, sambutan memakai SoundButton dengan preferensi. */
export function SoundToggle() {
  const { started, enabled } = useAudioState();
  if (!started) return null;
  return <SoundButton on={enabled} onToggle={() => audioStatus.setEnabled(!enabled)} />;
}
