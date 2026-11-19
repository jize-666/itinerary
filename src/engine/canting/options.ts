import { EMPTY_STATE, type BatikState } from "./state";
export type { BatikState };
export { EMPTY_STATE };

export type Tahap = "malam" | "nila" | "soga" | "lorod";
export type CantingQuality = "high" | "medium" | "low";

/** Opsi dari query string: `?q=high|medium|low`, `?tahap=malam|nila|soga|lorod`, `?draw=0..1`, `?fps`. */
export function readCantingOptions(search: string): {
  quality?: CantingQuality;
  tahap?: Tahap;
  draw?: number;
  showFps: boolean;
} {
  const p = new URLSearchParams(search);
  const q = p.get("q");
  const t = p.get("tahap");
  const raw = p.get("draw");
  const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return {
    quality: q === "high" || q === "medium" || q === "low" ? q : undefined,
    tahap: t === "malam" || t === "nila" || t === "soga" || t === "lorod" ? t : undefined,
    draw: Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : undefined,
    showFps: p.has("fps"),
  };
}

/** Keadaan kain untuk satu tahap; tanpa tahap = kain selesai (lorod). */
export function tahapState(tahap: Tahap | undefined, draw?: number): BatikState {
  switch (tahap) {
    case "malam":
      return { ...EMPTY_STATE, draw: draw ?? 1 };
    case "nila":
      return { ...EMPTY_STATE, draw: 1, nila: 1 };
    case "soga":
      return { draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 0 };
    default:
      return { draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 1 };
  }
}
