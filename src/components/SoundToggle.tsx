"use client";
import { usePathname } from "next/navigation";
import { audioStatus } from "@/engine/audio/status";
import { CHROME } from "@/engine/i18n/chrome";
import { useLang } from "@/engine/i18n/useLang";
import { useAudioState } from "./useAudio";

/**
 * Tombol speaker di kelompok kanan atas. Di home: cincin tipis, menyala = emas (gaya `.hb`, home.css).
 * Di halaman lain: tombol bulat 3D, menyala = emas & tertekan.
 */
export function SoundButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const lang = useLang();
  const home = usePathname() === "/";
  return (
    <button
      type="button"
      className={home ? "hb hb--icon sound-toggle" : "pb pb--glass pb--icon pb--round sound-toggle"}
      data-press=""
      data-sfx="ui-tok"
      aria-pressed={on}
      aria-label={CHROME["sound.label"][lang]}
      title={CHROME[on ? "sound.on" : "sound.off"][lang]}
      onClick={onToggle}
    >
      <span className={home ? "hb-face" : "pb-face"}>
        <svg viewBox="0 0 24 24" width={home ? 20 : 22} height={home ? 20 : 22} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
