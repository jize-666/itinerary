/**
 * Otak Clawd, maskot pemandu (M2, arahan host 15 Nov: "teks bubble nya? perkenalan dulu, nama dia clawd", "gas m2"):
 * menyatukan perilaku klik (`behavior.ts`) dengan gelembung ucapan (`dialogue.ts`).
 *
 * - Saat pertama muncul Clawd menyapa dan memperkenalkan diri (`INTRO`). Selama perkenalan, ketukan memajukan
 *   kalimat (seperti dialog gim), bukan dihitung sebagai klik, jadi tamu yang tidak sabar tidak membuatnya marah.
 * - Sesudahnya, reaksi perilaku (sapa, senang, sayang, marah, tenang, bangun, gong, mulai mengantuk) tertulis di
 *   gelembung, dengan variasi yang digilir.
 * - Selama kalimat diketik Clawd bergerak "bicara" (lengan menjelaskan) bila tidak sedang bergerak lain.
 * Murni: waktu dalam milidetik dari pemanggil.
 */
import type { Lang } from "@/engine/i18n/lang";
import { MascotBehavior } from "./behavior";
import { Dialogue, type SpeechFrame, type Utterance } from "./dialogue";
import type { Mood } from "./face";
import { INTRO, SAY, type SpeechKey, textOf } from "./lines";
import type { Motion } from "./pose";

export type ClawdFrame = Readonly<{
  mood: Mood;
  motion: Motion;
  /** Awal gerakan (ms, jam pemanggil). */
  motionSince: number;
  speech: SpeechFrame | null;
  introducing: boolean;
}>;

/** Hasil ketukan: maju dialog (perkenalan) atau klik biasa pada Clawd. */
export type TapResult = "advance" | "tap";

export class Clawd {
  readonly behavior: MascotBehavior;
  readonly dialogue = new Dialogue();
  lang: Lang;
  introducing = false;
  private clock = 0;
  private turns: Partial<Record<SpeechKey, number>> = {};
  private talkSince = 0;
  private talking = false;

  constructor(now: number, lang: Lang) {
    this.lang = lang;
    this.clock = now;
    this.behavior = new MascotBehavior(now, { onSpeech: (line) => this.speak(line), onRest: () => this.speak("rest") });
  }

  /** Kalimat dari kunci ucapan, dengan variasi bergilir. */
  private speak(key: SpeechKey) {
    const options = SAY[key];
    const n = this.turns[key] ?? 0;
    this.turns[key] = n + 1;
    const text = options[n % options.length]!;
    this.dialogue.say([{ id: `${key}.${n % options.length}`, text: () => textOf(text, this.lang) }], this.clock, true);
  }

  /** Muncul pertama kali: menyapa dan memperkenalkan diri. */
  start(now: number) {
    this.clock = now;
    this.behavior.greet(now);
    const lines: Utterance[] = INTRO.map((t, i) => ({ id: `intro.${i}`, text: () => textOf(t, this.lang) }));
    this.dialogue.say(lines, now, true);
    this.introducing = true;
  }

  /** Ketukan pada Clawd atau gelembungnya. */
  tap(now: number): TapResult {
    this.clock = now;
    if (this.introducing && !this.dialogue.active) this.introducing = false;
    if (this.introducing) {
      this.behavior.activity(now);
      this.dialogue.advance(now);
      return "advance";
    }
    this.behavior.tap(now);
    return "tap";
  }

  /** Ketukan pada gelembung saja: memajukan atau menutup kalimat tanpa dihitung sebagai klik pada Clawd. */
  tapBubble(now: number) {
    this.clock = now;
    this.behavior.activity(now);
    this.dialogue.advance(now);
  }

  gong(now: number) {
    this.clock = now;
    this.behavior.gong(now);
  }

  /** Kegiatan lain di halaman (gulir, geser): menunda kantuk. */
  activity(now: number) {
    this.clock = now;
    this.behavior.activity(now);
  }

  visibility(hidden: boolean, now: number) {
    this.clock = now;
    this.behavior.visibility(hidden, now);
  }

  tick(now: number): ClawdFrame {
    this.clock = now;
    const snap = this.behavior.tick(now);
    const speech = this.dialogue.tick(now);
    if (this.introducing && !this.dialogue.active) this.introducing = false;
    let { motion, motionSince } = snap;
    const typing = !!speech?.typing;
    if (typing && !this.talking) this.talkSince = now;
    this.talking = typing;
    if (typing && motion === "hover") [motion, motionSince] = ["talk", this.talkSince];
    return { mood: snap.mood, motion, motionSince, speech, introducing: this.introducing };
  }
}
