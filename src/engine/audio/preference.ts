/** Pilihan suara tamu (tombol speaker; bawaan menyala), diingat di perangkat. */
export const SOUND_KEY = "lakon.sound";
export type SoundPref = "on" | "off";
type ReadStore = Pick<Storage, "getItem">;
type WriteStore = Pick<Storage, "setItem">;

const localStore = (): Storage | undefined => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined; // mode privat / penyimpanan diblokir
  }
};

export function readSoundPref(store: ReadStore | undefined = localStore()): SoundPref | null {
  try {
    const v = store?.getItem(SOUND_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function writeSoundPref(pref: SoundPref, store: WriteStore | undefined = localStore()): void {
  try {
    store?.setItem(SOUND_KEY, pref);
  } catch {
    /* penyimpanan penuh/diblokir: tetap jalan, hanya tidak diingat */
  }
}
