"use client";
import { useState } from "react";
import { getAudio } from "@/engine/audio/AudioEngine";
import { readSoundPref, writeSoundPref } from "@/engine/audio/preference";
import { useI18n } from "@/engine/i18n/useI18n";
import { IconGong } from "./Icons";
import { SoundButton } from "./SoundToggle";
import { useAudioState } from "./useAudio";

/**
 * Pintu masuk (PRD §7.1, FR-43): satu tombol, klik langsung disambut gamelan.
 * Mute tetap ada: tombol speaker di kanan atas sudah tampil di sambutan (bawaan menyala, diingat di perangkat);
 * kalau dimatikan sebelum mulai, lakon dimulai hening dan audio tidak diunduh sama sekali.
 * Klik Begin juga gesture yang membuka audio di iOS/Chrome (kebijakan autoplay).
 */
export function BeginChoice({ onBegin }: { onBegin: (withSound: boolean) => void }) {
  const { t } = useI18n();
  const { started } = useAudioState();
  const [sound, setSound] = useState(() => readSoundPref() !== "off");
  const begin = () => {
    getAudio().begin(sound);
    onBegin(sound);
  };
  return (
    <>
      {!started && (
        <SoundButton
          on={sound}
          onToggle={() => {
            setSound(!sound);
            writeSoundPref(sound ? "off" : "on");
          }}
        />
      )}
      <button type="button" data-press="" data-haptic="" data-sfx="ui-pop" className="hb hb--primary hm-begin" onClick={begin}>
        <span className="hb-sheen" aria-hidden="true" />
        <span className="hb-label">{t("begin.go")}</span>
        <span className="hb-orb" aria-hidden="true">
          <IconGong size={20} />
        </span>
      </button>
    </>
  );
}
