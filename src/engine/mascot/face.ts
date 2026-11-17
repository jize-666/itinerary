/**
 * Wajah maskot pemandu. Rupanya dari `claude-3d-reference-kit` v4 milik host (arahan host 15 Nov: "update maskot"):
 * wajah tanpa mulut, ekspresi = pergantian bentuk mata/alis yang sudah disediakan kit (12 ekspresi), bukan morph.
 * Di sini hanya logika murninya (tanpa DOM, tanpa three):
 *  - suasana hati perilaku (`behavior.ts`) → ekspresi kit;
 *  - kedipan acak (kit: tutup lewat skala Y mata);
 *  - pergantian ekspresi disembunyikan di tengah kedipan (brief kit: "Transisi ekspresi dapat disembunyikan di tengah
 *    blink"), jadi mata menutup, bentuknya berganti saat tertutup, lalu membuka dengan bentuk baru.
 */
import type { Motion } from "./pose";

export type Mood = "neutral" | "curious" | "happy" | "love" | "angry" | "sleepy" | "sleeping" | "surprised";
export const MOODS: readonly Mood[] = ["neutral", "curious", "happy", "love", "angry", "sleepy", "sleeping", "surprised"];

/** Dua belas ekspresi kit, urutan `specs/expressions.json`. */
export const EXPRESSIONS = Object.freeze(["neutral", "happy", "curious", "concerned", "sad", "surprised", "angry", "sleepy", "blink", "wink", "embarrassed", "excited"] as const);
export type Expression = (typeof EXPRESSIONS)[number];
/** Ekspresi bermata terbuka yang berkedip (kit). */
export const BLINKABLE: readonly Expression[] = ["neutral", "curious", "concerned", "surprised", "angry", "wink", "embarrassed"];

/** Suasana hati → ekspresi kit. "Sayang" = `excited` (mata ^ ^ dan alis naik); hatinya berupa partikel, bukan mata. */
export const EXPRESSION_OF: Readonly<Record<Mood, Expression>> = {
  neutral: "neutral",
  curious: "curious",
  happy: "happy",
  love: "excited",
  angry: "angry",
  sleepy: "sleepy",
  sleeping: "blink",
  surprised: "surprised",
};

/** Lama kedipan mata kanan saat menyapa (dtk sejak gerakan dimulai). */
export const GREET_WINK = { from: 0.35, to: 1.5 } as const;

/** Ekspresi yang ditampilkan: dari suasana hati, kecuali saat menyapa sambil senang (mengedip sebelah). */
export function expressionFor(mood: Mood, motion: Motion, sinceMotion: number): Expression {
  if (motion === "greet" && mood === "happy" && sinceMotion >= GREET_WINK.from && sinceMotion < GREET_WINK.to) return "wink";
  return EXPRESSION_OF[mood];
}

/**
 * Kedipan: kapan mata berkedip berikutnya (detik sesudah `t`) dan seberapa terbuka mata pada saat `t` bila kedipan
 * dimulai di `at`. Kit berkedip sekali tiap 4,6 dtk sampai 8%; di sini jedanya acak 1,8–5,2 dtk dan sesekali dua kali
 * berturut-turut, supaya tidak terasa mekanis.
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

/** Keadaan wajah satu frame: ekspresi yang tampak dan bukaan mata (skala Y, 1 = terbuka). */
export type FaceFrame = { expression: Expression; open: number };

/**
 * Jejak wajah: menjalankan kedipan acak dan pergantian ekspresi yang disembunyikan di tengah kedipan.
 * `rand` = sumber acak 0–1 (deterministik di tes).
 */
export class FaceTrack {
  shown: Expression;
  private swapAt = -Infinity;
  private pending = false;
  private blinkAt: number;
  private pair = false;
  private rand: () => number;

  constructor(expression: Expression = "neutral", t = 0, rand: () => number = Math.random) {
    this.shown = expression;
    this.rand = rand;
    this.blinkAt = nextBlink(t, rand());
  }

  /** `blink` = kedip acak diizinkan (mati di mode gerak dikurangi); pergantian ekspresi tetap ditutup kedipan. */
  update(t: number, target: Expression, blink = true): FaceFrame {
    const span = BLINK.close + BLINK.open;
    if (target !== this.shown && !this.pending) {
      this.swapAt = t;
      this.pending = true;
    }
    // berganti begitu mata sudah tertutup, juga bila frame jarang (HP lambat, tab tersendat) melewati saat tertutupnya
    if (this.pending && t >= this.swapAt + BLINK.close) {
      this.shown = target;
      this.pending = false;
    }
    if (t > this.blinkAt + span) {
      this.blinkAt = this.pair ? t + 0.12 : nextBlink(t, this.rand());
      this.pair = !this.pair && this.rand() < BLINK.doubleChance;
    }
    const natural = blink && BLINKABLE.includes(this.shown) ? blinkOpen(t, this.blinkAt) : 1;
    return { expression: this.shown, open: Math.min(natural, blinkOpen(t, this.swapAt)) };
  }
}
