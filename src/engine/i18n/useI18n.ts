"use client";
import { useCallback, useSyncExternalStore } from "react";
import { type Lang, langStore, pick, translate } from "./lang";
import type { StringKey } from "./strings";

export function useI18n() {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, langStore.getServer);
  const t = useCallback((key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const tx = useCallback((text: { en: string; id: string } | undefined) => pick(lang, text), [lang]);
  return { lang, setLang: (l: Lang) => langStore.set(l), t, tx };
}
