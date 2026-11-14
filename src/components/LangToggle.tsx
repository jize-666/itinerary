"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CHROME } from "@/engine/i18n/chrome";
import { LANGS, langStore } from "@/engine/i18n/lang";
import { useLang } from "@/engine/i18n/useLang";
import { Seg } from "./Seg";

/** Halaman bergaya kapsul (home dan Today 2,5D): sakelar bahasa dan tombol suara ikut gayanya. */
export const isCapsulePage = (path: string | null) => path === "/" || path === "/today" || path === "/today/";

/**
 * EN | ID di pojok kanan atas, ganti tanpa reload (PRD FR-11). Nama bahasa ditulis dalam bahasanya sendiri.
 * Home dan Today memakai kapsul bergaris (`line`, desain 2,5D); film memakai sakelar pahat.
 */
export function LangToggle() {
  const lang = useLang();
  const home = isCapsulePage(usePathname());
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <Seg
      className="lang-toggle"
      variant={home ? "line" : "carved"}
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
