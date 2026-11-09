"use client";
import { getAudio } from "@/engine/audio/AudioEngine";
import { translate } from "@/engine/i18n/strings";
import { useI18n } from "@/engine/i18n/useI18n";

/**
 * Dua pintu masuk (PRD §7.1, FR-43): tamu memilih sendiri mau disambut gamelan atau hening.
 * Klik ini juga gesture yang membuka audio di iOS/Chrome (kebijakan autoplay).
 * Label utama mengikuti bahasa aktif, subjudul dalam bahasa satunya.
 */
export function BeginChoice({ onBegin }: { onBegin: (withSound: boolean) => void }) {
  const { lang, t } = useI18n();
  const other = lang === "en" ? "id" : "en";
  const choose = (withSound: boolean) => {
    getAudio().begin(withSound);
    onBegin(withSound);
  };
  return (
    <div className="begin">
      {([true, false] as const).map((withSound, i) => {
        const key = withSound ? "begin.sound" : "begin.quiet";
        return (
          <button key={key} type="button" style={{ "--i": i } as React.CSSProperties} className={`begin-btn begin-btn--${withSound ? "sound" : "quiet"}`} onClick={() => choose(withSound)}>
            <span className="begin-main">{t(key)}</span>
            <span className="begin-sub" lang={other}>
              {translate(other, key)}
            </span>
          </button>
        );
      })}
      <p className="begin-note">{t("begin.note")}</p>
    </div>
  );
}
