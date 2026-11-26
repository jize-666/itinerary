/**
 * "Biip" Clawd (host 26 Nov: "ilangin suara clawd, ganti dengan \"biip\""): tiap kata yang diketik di gelembung
 * berbunyi satu biip pendek, seperti dialog gim piksel. Murni (tanpa DOM): pemanggil memberi teks, jumlah huruf
 * yang tampil sebelum dan sesudah frame ini, suasana kalimat, dan jam; hasilnya daftar nada yang dimainkan sekarang.
 * Bunyinya dibangkitkan `engine/audio/beep-synth.ts`.
 *
 * - Satu biip di awal tiap kata (deret huruf/angka), bukan per huruf. Emoji dan tanda baca tidak berbunyi.
 * - Paling banyak ±12 biip per detik (`BEEP.gap`); lompatan besar (Calm menampilkan satu kalimat sekaligus, atau
 *   frame tersendat) dibatasi `BEEP.burst` biip yang disebar berjarak `BEEP.gap`.
 * - Tinggi nada bergeser tetap per kata (hash kata, ± `spread` semiton) supaya terdengar mengoceh, bukan metronom.
 * - Nada mengikuti suasana kalimat (`moodOf`): tenang, senang, terkejut, marah, mengantuk (kata selang-seling).
 */

/** Suasana kalimat. Dasarnya tenang; reaksi mengikuti suasana hati Clawd. */
export type BeepMood = "calm" | "happy" | "angry" | "surprised" | "sleepy";

const MOODS: readonly (readonly [RegExp, BeepMood])[] = [
  [/^angry\./, "angry"],
  [/^(happy|love)\./, "happy"],
  [/^tap\.2/, "happy"], // "Hehe, that tickles!"
  [/^gong\./, "surprised"],
  [/^ticketToss\.0/, "surprised"],
  [/^(ticketToss\.1|ticketFront\.)/, "happy"],
  [/^wake\.0/, "surprised"], // "Huh! I wasn't sleeping!"
  [/^(rest|wake)\./, "sleepy"],
];

/** Suasana untuk kalimat berkunci `id` (perkenalan, sapaan, petunjuk, dan sisanya: tenang). */
export const moodOf = (id: string): BeepMood => MOODS.find(([re]) => re.test(id))?.[1] ?? "calm";

export type BeepWave = "square" | "triangle" | "sawtooth";

export type BeepTone = Readonly<{
  /** Frekuensi awal (Hz). */
  freq: number;
  /** Geseran nada sepanjang biip (semiton). */
  glide: number;
  /** Lama biip (dtk). */
  dur: number;
  wave: BeepWave;
  /** Puncak penguat (0–1), sudah lirih. */
  gain: number;
  /** Tunda dari sekarang (dtk), untuk biip kedua dan seterusnya dalam satu frame. */
  delay?: number;
}>;

type Voice = Readonly<{ freq: number; glide: number; dur: number; wave: BeepWave; gain: number; spread: number; everyOther?: boolean }>;

export const BEEP_TONES: Readonly<Record<BeepMood, Voice>> = {
  calm: { freq: 700, glide: 0, dur: 0.07, wave: "square", gain: 0.2, spread: 2 },
  happy: { freq: 880, glide: 2, dur: 0.06, wave: "square", gain: 0.2, spread: 4 },
  surprised: { freq: 900, glide: 5, dur: 0.08, wave: "square", gain: 0.22, spread: 2 },
  angry: { freq: 300, glide: -2, dur: 0.055, wave: "sawtooth", gain: 0.26, spread: 2 },
  sleepy: { freq: 480, glide: -3, dur: 0.11, wave: "triangle", gain: 0.18, spread: 2, everyOther: true },
};

export const BEEP = {
  /** Jarak minimum antar biip (ms): ±13 biip per detik paling banyak. */
  gap: 75,
  /** Paling banyak biip dalam satu frame (lompatan besar). */
  burst: 3,
} as const;

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);
const isApostrophe = (ch: string | undefined) => ch === "'" || ch === "’";

/** Kata dalam `text`: indeks awal dan isinya. Apostrof di dalam kata ("I'm") tidak memecahnya. */
export function wordsOf(text: string): { start: number; word: string }[] {
  const out: { start: number; word: string }[] = [];
  let i = 0;
  while (i < text.length) {
    if (!isWordChar(text[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < text.length && (isWordChar(text[j]) || (isApostrophe(text[j]) && isWordChar(text[j + 1])))) j++;
    out.push({ start: i, word: text.slice(i, j) });
    i = j;
  }
  return out;
}

/** Hash FNV-1a 32-bit. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** Nada untuk satu kata: tinggi bergeser tetap menurut kata itu. */
export function toneFor(mood: BeepMood, word: string, delay = 0): BeepTone {
  const v = BEEP_TONES[mood];
  const k = (hash(word.toLowerCase()) / 0xffffffff) * 2 - 1; // −1…1
  const tone = { freq: v.freq * 2 ** ((k * v.spread) / 12), glide: v.glide, dur: v.dur, wave: v.wave, gain: v.gain };
  return delay > 0 ? { ...tone, delay } : tone;
}

export type BeepPlan = Readonly<{ beeps: BeepTone[]; /** Jam biip terakhir (ms), untuk frame berikutnya. */ last: number }>;

/**
 * Biip frame ini. `from`/`to` = banyak huruf yang tampil sebelum/sesudah frame (dari `to` yang lebih kecil atau sama
 * dengan `from`: tidak ada biip). `last` = jam biip terakhir (ms) dari rencana sebelumnya.
 */
export function planBeeps(text: string, from: number, to: number, mood: BeepMood, now: number, last = -Infinity): BeepPlan {
  const hi = Math.min(to, text.length);
  const lo = Math.max(0, Math.min(from, hi));
  if (hi <= lo || now - last < BEEP.gap) return { beeps: [], last };
  const every = BEEP_TONES[mood].everyOther;
  let hits = wordsOf(text).filter((w, n) => w.start >= lo && w.start < hi && (!every || n % 2 === 0));
  if (hits.length === 0) return { beeps: [], last };
  if (hits.length > BEEP.burst) {
    const n = hits.length;
    hits = Array.from({ length: BEEP.burst }, (_, k) => hits[Math.round((k * (n - 1)) / (BEEP.burst - 1))]!);
  }
  const beeps = hits.map((w, k) => toneFor(mood, w.word, (k * BEEP.gap) / 1000));
  return { beeps, last: now + (hits.length - 1) * BEEP.gap };
}
