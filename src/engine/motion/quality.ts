/**
 * Tingkat kualitas halaman 3D selain film (maket, canting): hanya "ultra" dan "high". Tidak ada tingkat di bawah High
 * dan resolusi tidak pernah diturunkan saat berjalan (keputusan host 27 Nov: tablet flagship terlihat buram).
 * Murni: tanpa DOM.
 */

export type Quality = "ultra" | "high";

/** Lebih dari ini, kerapatan piksel tidak lagi terlihat dan hanya menambah beban. */
const HIGH_DPR_MAX = 2;
const ULTRA_DPR_MIN = 1.5;
const ULTRA_DPR_MAX = 2.5;

/** Ultra jadi bawaan hanya di desktop (bukan layar sentuh) dengan inti banyak; inti tidak diketahui (0) dianggap cukup. */
export function preferUltra(env: { touch: boolean; cores: number }): boolean {
  return !env.touch && (!(env.cores > 0) || env.cores >= 8);
}

/** Bawaan perangkat ini (dibaca dari browser). */
export function defaultQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return preferUltra({ touch, cores: navigator.hardwareConcurrency || 0 }) ? "ultra" : "high";
}

/** `?q=`: ultra dan high; `medium` dan `low` (tautan lama) menjadi high. */
export function parseQuality(raw: string | null | undefined): Quality | undefined {
  if (raw === "ultra") return "ultra";
  if (raw === "high" || raw === "medium" || raw === "low") return "high";
  return undefined;
}

/**
 * Rasio piksel kanvas. High: kerapatan layar, paling banyak 2 (HP tidak pernah lembek). Ultra: paling sedikit 1,5
 * (supersampling di layar 1×), paling banyak 2,5.
 */
export function pixelRatio(q: Quality, native: number): number {
  const n = native > 0 ? native : 1;
  return q === "ultra" ? Math.min(ULTRA_DPR_MAX, Math.max(ULTRA_DPR_MIN, n)) : Math.min(HIGH_DPR_MAX, n);
}
