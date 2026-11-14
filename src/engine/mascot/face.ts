/**
 * Wajah maskot pemandu (permintaan host 15 Nov: "upgrade design 3D ini … lebih berekspresi … lebih lucu", lalu foto
 * boneka maskot Claude sebagai acuan: "ini lebih lucu, bisa jadi acuan preferensi"). Wajah tanpa mulut: dua mata
 * hitam kecil, alis pendek melengkung, pipi bulat merah muda (tampak juga saat netral, seperti di foto), mata senang
 * chevron ^ ^. Ekspresi lain mengikuti paket coral-assistant (`face_pose`): tiap ekspresi = skala mata dan letak/sudut
 * alis. Tambahan: kedip, mata hati ("sayang"), badan memerah saat marah.
 *
 * Wajah digambar shader di muka depan badan (`stage3d/mascot.ts`); di sini hanya angka-angkanya, dan wajah yang
 * tampak bergerak halus menuju angka suasana hati yang berlaku. Murni: tanpa DOM, tanpa three.
 */

export type Mood = "neutral" | "curious" | "happy" | "love" | "angry" | "sleepy" | "sleeping" | "surprised";
export const MOODS: readonly Mood[] = ["neutral", "curious", "happy", "love", "angry", "sleepy", "sleeping", "surprised"];

/** Parameter wajah. */
export type Face = {
  /** Skala mata oval mendatar dan tegak (1 = netral). */
  sx: number;
  sy: number;
  /** Mata senang (chevron), 0–1. */
  happy: number;
  /** Mata hati, 0–1. */
  heart: number;
  /** Alis tampak, 0–1. */
  brows: number;
  /** Alis naik-turun (satuan badan; + naik). */
  browY: number;
  /** Sudut alis (rad): + ujung dalam turun (marah), − ujung dalam naik. */
  browAngle: number;
  /** Alis kiri lebih tinggi dari kanan (satuan badan). */
  browAsym: number;
  /** Pipi peach, 0–1. */
  cheeks: number;
  /** Badan memerah (marah), 0–1. */
  tint: number;
};

/** Satuan badan = lebar badan (1,6 m di Blender); ukuran asli dibagi 1,6. */
const U = 1 / 1.6;

const BASE: Face = { sx: 1, sy: 1, happy: 0, heart: 0, brows: 1, browY: 0, browAngle: 0, browAsym: 0, cheeks: 0.85, tint: 0 };

/** Mengikuti `face_pose` paket coral-assistant (angka Blender × U), ditambah "sayang". */
export const FACES: Readonly<Record<Mood, Face>> = {
  neutral: BASE,
  curious: { ...BASE, sx: 1.05, sy: 1.12, browY: 0.0675 * U, browAngle: -0.12, browAsym: 0.035 * U },
  happy: { ...BASE, happy: 1, brows: 0, cheeks: 1 },
  love: { ...BASE, heart: 1, brows: 0, cheeks: 1 },
  angry: { ...BASE, sx: 1.05, sy: 0.6, browY: -0.095 * U, browAngle: 0.38, cheeks: 0, tint: 1 },
  sleepy: { ...BASE, sx: 1.15, sy: 0.37, browY: -0.09 * U, cheeks: 0.6 },
  sleeping: { ...BASE, sx: 1.38, sy: 0.11, brows: 0, cheeks: 0.7 },
  surprised: { ...BASE, sx: 1.25, sy: 1.4, browY: 0.1 * U, cheeks: 0.4 },
};

const KEYS = Object.keys(BASE) as (keyof Face)[];

/** Wajah baru: `from` bergerak menuju `to` selama `dt` detik dengan tetapan waktu `tau` detik. */
export function approachFace(from: Face, to: Face, dt: number, tau = 0.12): Face {
  const k = tau <= 0 ? 1 : 1 - Math.exp(-Math.max(0, dt) / tau);
  const out = { ...from };
  for (const key of KEYS) out[key] = from[key] + (to[key] - from[key]) * k;
  return out;
}

/** Salinan wajah untuk suasana hati `mood`. */
export const faceOf = (mood: Mood): Face => ({ ...FACES[mood] });

/**
 * Kedipan: kapan mata berkedip berikutnya (detik sesudah `t`) dan seberapa terbuka mata pada saat `t` bila kedipan
 * dimulai di `at`. Paket aslinya berkedip sekali tiap 4 dtk sampai 6,5% (`face_pose`); di sini jedanya acak 1,8–5,2 dtk
 * dan sesekali dua kali berturut-turut, supaya tidak terasa mekanis.
 */
export const BLINK = { close: 0.06, open: 0.1, min: 0.065, minGap: 1.8, maxGap: 5.2, doubleChance: 0.18 } as const;
export function nextBlink(t: number, rand: number): number {
  return t + BLINK.minGap + (BLINK.maxGap - BLINK.minGap) * rand;
}
export function blinkOpen(t: number, at: number): number {
  const d = t - at;
  if (d < 0 || d > BLINK.close + BLINK.open) return 1;
  const k = d < BLINK.close ? 1 - d / BLINK.close : (d - BLINK.close) / BLINK.open;
  return BLINK.min + (1 - BLINK.min) * k;
}
