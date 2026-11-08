import { STRINGS, type StringKey } from "./strings";

/** Bahasa UI (PRD FR-11): default EN, ganti tanpa reload, diingat di perangkat. */
export type Lang = "en" | "id";
export const LANGS: readonly Lang[] = ["en", "id"];
export const LANG_KEY = "lakon.lang";
export const DEFAULT_LANG: Lang = "en";

type Store = Pick<Storage, "getItem" | "setItem">;
const localStore = (): Store | undefined => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

export function readLang(store: Pick<Storage, "getItem"> | undefined = localStore()): Lang {
  try {
    const v = store?.getItem(LANG_KEY);
    return v === "en" || v === "id" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(lang: Lang, store: Pick<Storage, "setItem"> | undefined = localStore()): void {
  try {
    store?.setItem(LANG_KEY, lang);
  } catch {
    /* tidak diingat, tetap jalan */
  }
}

/** "{n} tries" + {n: 3} → "3 tries". Placeholder yang tidak diisi dibiarkan apa adanya. */
export const format = (template: string, vars: Record<string, string | number> = {}) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export const translate = (lang: Lang, key: StringKey, vars?: Record<string, string | number>) => format(STRINGS[key][lang], vars);

/** Teks dua bahasa dari data (bentuk {en, id}). */
export const pick = (lang: Lang, text: { en: string; id: string } | undefined) => (text ? text[lang] || text.en : "");

// ---- store kecil untuk useSyncExternalStore ----
let current: Lang | null = null;
const listeners = new Set<() => void>();
export const langStore = {
  get: (): Lang => (current ??= readLang()),
  getServer: (): Lang => DEFAULT_LANG,
  set(lang: Lang) {
    current = lang;
    writeLang(lang);
    for (const fn of listeners) fn();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
