"use client";
import { useEffect } from "react";
import { CHROME } from "@/engine/i18n/chrome";
import { LANGS, langStore } from "@/engine/i18n/lang";
import { useLang } from "@/engine/i18n/useLang";

/** EN | ID di pojok kanan atas, ganti tanpa reload (PRD FR-11). Nama bahasa ditulis dalam bahasanya sendiri. */
export function LangToggle() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <div className="lang-toggle" role="group" aria-label={CHROME["lang.label"][lang]}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => langStore.set(l)}>
          {l.toUpperCase()}
          <span className="sr-only"> {CHROME[`lang.${l}`][l]}</span>
        </button>
      ))}
    </div>
  );
}
