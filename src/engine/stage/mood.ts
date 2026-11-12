/**
 * Suasana panggung 3D sebagai fungsi keadaan langit film (`SkyState` dari src/engine/slides/sky.ts). Murni.
 *
 * Satu sumber dengan langit 2,5D: kadar lapisan subuh/siang/senja/gerbang yang sama, dicampur dengan urutan
 * tumpukan yang sama (malam di dasar, lalu subuh, siang, senja, gerbang). Hasilnya warna langit dari cakrawala
 * ke zenit, cahaya kunci (matahari atau bulan), cahaya sekitar, kabut, dan kadar bintang. Semua warna linear.
 */
import type { SkyState } from "@/engine/slides/sky";

export type RGB = readonly [r: number, g: number, b: number];

/** "#rrggbb" (sRGB) → RGB linear. */
export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const scale3 = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** Jumlah titik warna langit, dari cakrawala (0) ke zenit (terakhir). Ketinggiannya: `SKY_STOPS`. */
export const SKY_STOPS = [0, 0.1, 0.26, 0.5, 1] as const;

type Look = Readonly<{
  /** Warna langit di tiap `SKY_STOPS`. */
  sky: readonly [RGB, RGB, RGB, RGB, RGB];
  /** Cahaya kunci saat matahari tampak penuh (warna × kuat). */
  key: RGB;
  /** Cahaya sekitar: dari langit dan pantulan tanah. */
  ambientSky: RGB;
  ambientGround: RGB;
  fog: RGB;
  /** Kerapatan kabut eksponensial (per meter). */
  fogDensity: number;
  stars: number;
  /** Pengali nyala blencong: malam terang, siang nyaris tak terlihat. */
  lamp: number;
  exposure: number;
}>;

/** Warna diambil dari gradien langit film 2,5D (film.css), supaya pergantian ke tier Static tidak berganti rona. */
const LOOK: Readonly<Record<"night" | "dawn" | "day" | "dusk" | "gate", Look>> = {
  night: {
    sky: [hex("#1b1d4e"), hex("#141740"), hex("#0d1130"), hex("#090c22"), hex("#04050c")],
    key: scale3(hex("#9db4ff"), 0.5),
    ambientSky: scale3(hex("#2b3a8c"), 0.5),
    ambientGround: scale3(hex("#1a0f12"), 0.5),
    fog: hex("#0c0f2a"),
    fogDensity: 0.0032,
    stars: 1,
    lamp: 1,
    exposure: 1,
  },
  dawn: {
    sky: [hex("#ffe2b4"), hex("#f0a070"), hex("#a45e7c"), hex("#3a2f6c"), hex("#0a0f2b")],
    key: scale3(hex("#ffb07a"), 2.2),
    ambientSky: scale3(hex("#8a6aa8"), 0.9),
    ambientGround: scale3(hex("#5a3a34"), 0.6),
    fog: hex("#c98a86"),
    fogDensity: 0.0052,
    stars: 0.12,
    lamp: 0.45,
    exposure: 1,
  },
  day: {
    sky: [hex("#efe6d2"), hex("#c6dccf"), hex("#7fb0cb"), hex("#3a78ad"), hex("#1c4a80")],
    key: scale3(hex("#fff4dc"), 3.4),
    ambientSky: scale3(hex("#8fb8dc"), 1.3),
    ambientGround: scale3(hex("#7a8a5a"), 0.8),
    fog: hex("#b9d2d6"),
    fogDensity: 0.002,
    stars: 0,
    lamp: 0.12,
    exposure: 0.92,
  },
  dusk: {
    sky: [hex("#ffd592"), hex("#f39a4a"), hex("#c9543e"), hex("#58264f"), hex("#120f2e")],
    key: scale3(hex("#ff8a4a"), 2.4),
    ambientSky: scale3(hex("#7a4a78"), 0.9),
    ambientGround: scale3(hex("#5a2c1c"), 0.6),
    fog: hex("#c9683e"),
    fogDensity: 0.004,
    stars: 0.08,
    lamp: 0.7,
    exposure: 1,
  },
  gate: {
    sky: [hex("#12163a"), hex("#0d1024"), hex("#0a0c18"), hex("#07080f"), hex("#030409")],
    key: scale3(hex("#8fa6ff"), 0.32),
    ambientSky: scale3(hex("#232a66"), 0.42),
    ambientGround: scale3(hex("#1c0d0c"), 0.5),
    fog: hex("#070814"),
    fogDensity: 0.006,
    stars: 0.55,
    lamp: 1.15,
    exposure: 1,
  },
};

export type Mood = Readonly<{
  sky: readonly RGB[];
  /** Cahaya kunci: matahari saat tampak, selain itu bulan. `sun` = kadar matahari di dalamnya (0–1). */
  key: RGB;
  sun: number;
  /** Rona jingga matahari di dekat cakrawala (0–1) dan ukuran cakramnya. */
  warm: number;
  sunScale: number;
  /** Cakram matahari yang digambar di langit (0–1). */
  disc: number;
  ambientSky: RGB;
  ambientGround: RGB;
  fog: RGB;
  fogDensity: number;
  stars: number;
  lamp: number;
  exposure: number;
}>;

const NUMS = ["fogDensity", "stars", "lamp", "exposure"] as const;
const COLORS = ["key", "ambientSky", "ambientGround", "fog"] as const;

/** Suasana untuk satu keadaan langit. */
export function moodOf(s: SkyState): Mood {
  type Draft = { -readonly [K in keyof Look]: Look[K] };
  const out: Draft = { ...LOOK.night };
  const over = (look: Look, w: number) => {
    if (w <= 0) return;
    out.sky = out.sky.map((c, i) => mix3(c, look.sky[i]!, w)) as unknown as Look["sky"];
    for (const k of COLORS) out[k] = mix3(out[k], look[k], w);
    for (const k of NUMS) out[k] = mix(out[k], look[k], w);
  };
  over(LOOK.dawn, s.dawn);
  over(LOOK.day, s.day);
  over(LOOK.dusk, s.dusk);
  over(LOOK.gate, s.gate);
  // matahari yang belum/sudah tak tampak: cahaya kuncinya bulan (warna malam), tertutup gerbang ikut padam
  const sun = s.sun.opacity * (1 - s.gate);
  const warmKey = mix3(out.key, scale3(hex("#ff7a3c"), 2.0), s.sun.warm * 0.6);
  const moon = mix3(LOOK.night.key, LOOK.gate.key, s.gate);
  // langit terang tetapi matahari belum tampak (subuh sebelum sarapan): cahaya kunci tinggal sebagian
  const daylight = Math.max(s.dawn, s.day, s.dusk) * (1 - s.gate);
  const key = mix3(mix3(moon, scale3(out.key, 0.35), daylight), warmKey, sun);
  return { ...out, key, sun, warm: s.sun.warm, sunScale: s.sun.scale, disc: sun };
}

/**
 * Tinggi matahari untuk arah cahaya (rad). Di layar matahari hanya menempuh pita sempit di atas kartu, jadi
 * arah cahayanya dihitung terpisah: rendah di terbit dan terbenam, tinggi di tengah hari.
 */
export const lightElevation = (v: number) => (6 + 58 * (1 - Math.min(1, Math.max(0, v)))) * (Math.PI / 180);

/** Campur dua suasana (untuk kemajuan di antara dua titik kunci langit). */
export function mixMood(a: Mood, b: Mood, t: number): Mood {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    sky: a.sky.map((c, i) => mix3(c, b.sky[i]!, t)),
    key: mix3(a.key, b.key, t),
    sun: mix(a.sun, b.sun, t),
    warm: mix(a.warm, b.warm, t),
    sunScale: mix(a.sunScale, b.sunScale, t),
    disc: mix(a.disc, b.disc, t),
    ambientSky: mix3(a.ambientSky, b.ambientSky, t),
    ambientGround: mix3(a.ambientGround, b.ambientGround, t),
    fog: mix3(a.fog, b.fog, t),
    fogDensity: mix(a.fogDensity, b.fogDensity, t),
    stars: mix(a.stars, b.stars, t),
    lamp: mix(a.lamp, b.lamp, t),
    exposure: mix(a.exposure, b.exposure, t),
  };
}
