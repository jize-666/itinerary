"use client";
import { useEffect } from "react";
import { CHROME } from "@/engine/i18n/chrome";
import { LANGS, langStore } from "@/engine/i18n/lang";
import { useLang } from "@/engine/i18n/useLang";
import { Seg } from "./Seg";

/** EN | ID di pojok kanan atas, ganti tanpa reload (PRD FR-11). Nama bahasa ditulis dalam bahasanya sendiri. */
export function LangToggle() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <Seg
      className="lang-toggle"
      label={CHROME["lang.label"][lang]}
      value={lang}
      onChange={(l) => langStore.set(l)}
      options={LANGS.map((l) => ({
        value: l,
        lang: l,
        label: (
          <>
            {l.toUpperCase()}
            <span className="sr-only"> {CHROME[`lang.${l}`][l]}</span>
          </>
        ),
      }))}
    />
  );
}
