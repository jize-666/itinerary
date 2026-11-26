/**
 * Pemetaan suara tiket 3D (Tugas 12b). Murni, tanpa DOM: kejadian fisika (`PassSignal`) → parameter bunyi 0–1.
 * Waktu selalu diberikan dari luar supaya deterministik dan bisa dites. Semua kadar pelan: tiket berbunyi di bawah gendhing.
 *
 * - `rustleGain`: gemerisik kertas kartu selama berayun (hening di bawah ambang, lutut lembut, berbatas).
 * - `clink`: dering kuningan mata ayam dari kekuatan ketukan, dengan jeda minimum agar tidak menembak beruntun.
 * - `flipParams`: tepukan kertas dan debam rendah saat tiket dibalik.
 * - `grabGain`, `releaseWhoosh`: sentuhan kertas dan desir pendek saat dilepas.
 */

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : 0));

/** Laju (m/s) di bawah ini = hening (tiket diam atau bergoyang nyaris tak terlihat). */
export const RUSTLE_THRESHOLD = 0.05;
/** Laju yang sudah mendekati batas atas gemerisik. */
export const RUSTLE_FULL = 1.2;
/** Batas atas kadar gemerisik (0–1, sebelum penguat puncak di pembangkit). */
export const RUSTLE_CAP = 0.85;
/** Bobot kecepatan sudut (rad/s) terhadap laju: putaran cepat ikut menggesek udara. */
const ANGULAR_WEIGHT = 0.04;

/** Kadar gemerisik dari laju ayunan: ambang, lutut lembut (kuadrat lalu jenuh), dan batas atas. Naik terus terhadap laju. */
export function rustleGain(speed: number, angularSpeed = 0): number {
  const eff = clamp(speed, 0, 10) + ANGULAR_WEIGHT * clamp(angularSpeed, 0, 30);
  if (eff <= RUSTLE_THRESHOLD) return 0;
  const x = clamp((eff - RUSTLE_THRESHOLD) / (RUSTLE_FULL - RUSTLE_THRESHOLD));
  // x^1,5 di awal (lutut lembut) lalu jenuh pelan menuju batas
  const soft = Math.pow(x, 1.5);
  return RUSTLE_CAP * (1 - Math.exp(-2.5 * soft)) / (1 - Math.exp(-2.5));
}

/** Jeda minimum antar dering mata ayam (ms). */
export const CLINK_MIN_INTERVAL_MS = 90;
/** Ketukan di bawah kekuatan ini tidak berbunyi. */
export const CLINK_MIN_STRENGTH = 0.04;
/** Batas atas kadar dering. */
export const CLINK_CAP = 0.8;

export type Clink = {
  /** Kadar 0–1. */
  gain: number;
  /** Pengali nada: ketukan keras sedikit lebih tinggi dan terang. */
  pitch: number;
  /** Peluruhan (detik): ketukan keras berdering sedikit lebih lama (±60–120 ms). */
  decay: number;
};

/**
 * Dering mata ayam. `nowMs` dan `lastMs` (waktu dering terakhir yang diterima; `-Infinity` bila belum pernah) diberikan
 * dari luar. Mengembalikan `null` bila terlalu lemah atau terlalu cepat sesudah dering sebelumnya.
 */
export function clink(strength: number, nowMs: number, lastMs: number): Clink | null {
  const s = clamp(strength);
  if (s < CLINK_MIN_STRENGTH) return null;
  if (nowMs - lastMs < CLINK_MIN_INTERVAL_MS) return null;
  return { gain: CLINK_CAP * Math.pow(s, 0.8), pitch: 0.96 + 0.08 * s, decay: 0.06 + 0.06 * s };
}

export type FlipSound = {
  /** Kadar tepukan kertas. */
  flap: number;
  /** Frekuensi tengah penyaring tepukan (Hz): sisi belakang sedikit lebih kusam. */
  flapFreq: number;
  /** Lama tepukan (detik). */
  flapDur: number;
  /** Kadar debam rendah. */
  thump: number;
  /** Frekuensi debam (Hz). */
  thumpFreq: number;
  /** Lama debam (detik). */
  thumpDur: number;
};

/** Tepukan kertas renyah + debam rendah samar saat tiket dibalik; `back` = menuju sisi belakang. */
export function flipParams(back: boolean): FlipSound {
  return {
    flap: back ? 0.5 : 0.55,
    flapFreq: back ? 3000 : 3600,
    flapDur: 0.09,
    thump: 0.22,
    thumpFreq: 140,
    thumpDur: 0.04,
  };
}

/** Sentuhan kertas saat tiket (lebih keras) atau benang (lebih pelan) dipegang. */
export function grabGain(kind: "card" | "thread"): number {
  return kind === "card" ? 0.3 : 0.18;
}

/** Laju lepas (m/s) di bawah ini tidak berdesir. */
export const WHOOSH_MIN_SPEED = 0.2;
/** Laju lepas yang mencapai batas atas desir. */
export const WHOOSH_FULL_SPEED = 3;
export const WHOOSH_CAP = 0.5;

export type Whoosh = { gain: number; /** Lama desir (detik). */ dur: number; /** Frekuensi tengah (Hz). */ freq: number };

/** Desir kertas pendek saat dilepas, makin kencang makin keras, tinggi, dan singkat. Di bawah ambang = `null`. */
export function releaseWhoosh(speed: number): Whoosh | null {
  if (!(speed > WHOOSH_MIN_SPEED)) return null;
  const x = clamp((speed - WHOOSH_MIN_SPEED) / (WHOOSH_FULL_SPEED - WHOOSH_MIN_SPEED));
  return { gain: 0.08 + (WHOOSH_CAP - 0.08) * x, dur: 0.16 - 0.06 * x, freq: 1800 + 2200 * x };
}
