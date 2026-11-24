/**
 * Kadar suara membatik (Tugas 11.4). Murni: keadaan kain → kadar tiga suara 0–1, dipakai `/canting/` dan film Hari 3.
 *
 * - `wax`: desis malam panas yang menyentuh mori (menorehkan, mbleber, tetes).
 * - `water`: gemericik celupan (kain turun ke bak nila atau soga, naik lagi dan menetes).
 * - `boil`: gelembung air mendidih saat lorod.
 *
 * Di film suara mengikuti gulir: kadar dihitung dari laju perubahan proses kain di antara dua frame, jadi diam = hening,
 * mundur = suara yang sama sedikit lebih pelan. Di `/canting/` kadar mengikuti tangan (malam), dan amplop tiap animasi
 * tahap (celup, lorod).
 */
import type { BatikState } from "./state";

export type BatikLevels = { wax: number; water: number; boil: number };
export const SILENT: BatikLevels = { wax: 0, water: 0, boil: 0 };

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : 0));
/** Laju (per detik) → kadar 0–1 yang jenuh lembut: laju `ref` ≈ 0,63. */
export const saturate = (rate: number, ref: number) => clamp(1 - Math.exp(-Math.abs(rate) / Math.max(1e-6, ref)));

/**
 * Laju acuan per tahap di film. Satu geseran panel ±0,6–0,8 dtk: sungai (pembuka hari → panel 1) menambah torehan
 * ±0,1 (±0,15/dtk, desis sedang), kawung ±0,45 per panel (±0,7/dtk, desis penuh), nila dan lorod satu panel penuh
 * (±1,5/dtk), soga ±1,4 panel.
 */
export const FILM_REF = { draw: 0.15, dye: 0.45, lorod: 0.4 } as const;
/** Mundur (menghapus torehan, kain kembali ke mori): suara sama, lebih pelan. */
export const BACKWARD = 0.6;

const signed = (d: number) => (d < 0 ? BACKWARD : 1);

/**
 * Film: kadar dari dua keadaan kain berurutan (`dt` detik). Hanya bagian kain yang berubah yang berbunyi: torehan →
 * desis, nila/soga → gemericik, lorod → gelembung. `dt` ≤ 0 atau keadaan sama = hening.
 */
export function filmLevels(prev: BatikState, next: BatikState, dt: number): BatikLevels {
  if (!(dt > 0)) return SILENT;
  const dDraw = next.draw - prev.draw;
  const dDye = Math.abs(next.nila - prev.nila) > Math.abs(next.soga - prev.soga) ? next.nila - prev.nila : next.soga - prev.soga;
  const dLorod = next.lorod - prev.lorod;
  return {
    wax: saturate(dDraw / dt, FILM_REF.draw) * signed(dDraw),
    water: saturate(dDye / dt, FILM_REF.dye) * signed(dDye),
    boil: saturate(dLorod / dt, FILM_REF.lorod) * signed(dLorod),
  };
}

/** Laju tangan acuan di `/canting/` (satuan tinggi kain per detik): goresan biasa ±0,3/dtk. */
export const HAND_REF = 0.35;

/**
 * Desis malam di `/canting/`: selama cucuk menyentuh kain ada desis dasar, makin keras bila tangan bergerak; panas
 * malam (1 = baru dicelup, turun saat mendingin) dan isi nyamplung (0 = habis) meredamnya. Tidak menggambar = hening.
 */
export function handWax(touching: boolean, speed: number, heat: number, malam: number): number {
  if (!touching) return 0;
  const full = malam > 0.02 ? 1 : 0.12;
  return clamp((0.35 + 0.65 * saturate(speed, HAND_REF)) * (0.35 + 0.65 * clamp(heat)) * full);
}

/**
 * Amplop gemericik celupan di `/canting/` menurut kemajuan animasi celup `k` (0–1, `process.ts` nila/soga): kain masuk
 * (ombak), terendam (riak tenang), lalu diangkat (air mengucur dan menetes), berhenti di akhir.
 */
export function dyeEnvelope(k: number): number {
  if (!(k > 0) || k >= 1) return 0;
  if (k < 0.1) return k / 0.1;
  if (k < 0.3) return 1 - ((k - 0.1) / 0.2) * 0.65;
  if (k < 0.68) return 0.35;
  return 0.35 + 0.55 * Math.sin((Math.PI * (k - 0.68)) / 0.32);
}

/** Saat kain menyentuh cairan dan saat terangkat dari bak (pecahan animasi celup): bunyi ombak sekali. */
export const DYE_SPLASH = { enter: 0.06, lift: 0.72 } as const;

/** Amplop gelembung lorod `k` (0–1): air cepat mendidih, bergolak, lalu reda sebelum kain diangkat. */
export function lorodEnvelope(k: number): number {
  if (!(k > 0) || k >= 1) return 0;
  return clamp(Math.min(k / 0.12, 1, (1 - k) / 0.25));
}
