"use client";
import { useEffect } from "react";
import { LANGS, translate } from "@/engine/i18n/lang";
import { useI18n } from "@/engine/i18n/useI18n";

/** EN | ID di pojok kanan atas, ganti tanpa reload (PRD FR-11). */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <div className="lang-toggle" role="group" aria-label={t("lang.label")}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} aria-label={translate(l, `lang.${l}`)} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
