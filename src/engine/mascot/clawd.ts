/**
 * Otak Clawd, maskot pemandu (M2, arahan host 15 Nov: "teks bubble nya? perkenalan dulu, nama dia clawd", "gas m2"):
 * menyatukan perilaku klik (`behavior.ts`) dengan gelembung ucapan (`dialogue.ts`).
 *
 * - Saat pertama muncul Clawd menyapa dan memperkenalkan diri (`INTRO`). Selama perkenalan, ketukan memajukan
 *   kalimat (seperti dialog gim), bukan dihitung sebagai klik, jadi tamu yang tidak sabar tidak membuatnya marah.
 * - Sesudahnya, reaksi perilaku (sapa, senang, sayang, marah, tenang, bangun, gong, mulai mengantuk) tertulis di
 *   gelembung, dengan variasi yang digilir.
 * - Selama kalimat diketik Clawd bergerak "bicara" (lengan menjelaskan) bila tidak sedang bergerak lain. Biip tiap
 *   kata dibunyikan sesi (`components/mascot/session.ts`, `beep.ts`).
 * Murni: waktu dalam milidetik dari pemanggil.
 */
import type { Lang } from "@/engine/i18n/lang";
import type { PassSignal } from "@/engine/stage/bus";
import { MascotBehavior, type TicketKind } from "./behavior";
import { Dialogue, type SpeechFrame, type Utterance } from "./dialogue";
import type { Mood } from "./face";
import { INTRO, SAY, type SpeechKey, type Text, TIPS, type TipId, textOf, WELCOME_BACK } from "./lines";
import type { Motion } from "./pose";
import { GRAB_DELAY, ticketReaction } from "./ticket";

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
  readonly dialogue: Dialogue;
  lang: Lang;
  /** Layar sentuh: ucapan memakai "ketuk"/"geser" alih-alih "klik"/"gulir". */
  touch: boolean;
  introducing = false;
  private clock = 0;
  private turns: Partial<Record<SpeechKey, number>> = {};
  private talkSince = 0;
  private talking = false;
  /** Tiket sedang dipegang sejak (ms), menunggu `GRAB_DELAY`; null = tidak ada pegangan yang ditunda. */
  private grabAt: number | null = null;

  constructor(now: number, lang: Lang, touch = false) {
    this.lang = lang;
    this.touch = touch;
    this.clock = now;
    this.dialogue = new Dialogue();
    this.behavior = new MascotBehavior(now, { onSpeech: (line) => this.speak(line), onRest: () => this.speak("rest") });
  }

  /** Kalimat dari kunci ucapan, dengan variasi bergilir. */
  private speak(key: SpeechKey) {
    const options = SAY[key];
    const n = this.turns[key] ?? 0;
    this.turns[key] = n + 1;
    const text = options[n % options.length]!;
    this.say([this.line(`${key}.${n % options.length}`, text)], this.clock, true);
  }

  private line(id: string, t: Text): Utterance {
    return { id, text: () => textOf(t, this.lang, this.touch) };
  }

  private say(lines: Utterance[], now: number, interrupt = false) {
    this.dialogue.say(lines, now, interrupt);
  }

  /**
   * Muncul: menyapa. Tamu baru diperkenalkan (`INTRO`); tamu yang sudah berkenalan di perangkat ini cukup disapa
   * singkat (`WELCOME_BACK`).
   */
  start(now: number, returning = false) {
    this.clock = now;
    this.behavior.greet(now);
    const lines = (returning ? WELCOME_BACK : INTRO).map((t, i) => this.line(`${returning ? "welcome" : "intro"}.${i}`, t));
    this.say(lines, now, true);
    this.introducing = true;
  }

  /** Petunjuk pemandu: diantrekan sesudah yang sedang diucapkan (perkenalan tidak dipotong). */
  tip(id: TipId, now: number) {
    this.clock = now;
    this.behavior.activity(now);
    this.say(
      TIPS[id].map((t, i) => this.line(`tip.${id}.${i}`, t)),
      now,
    );
  }

  /** Petunjuk yang sedang diucapkan atau menunggu giliran (null bila bukan petunjuk). */
  tipShown(frame: SpeechFrame | null): TipId | null {
    const m = frame?.id.match(/^tip\.([a-z]+)\./);
    return m ? (m[1] as TipId) : null;
  }

  /** Petunjuk `id` sedang diucapkan atau menunggu giliran. */
  hasTip(id: TipId) {
    return this.dialogue.has(`tip.${id}.`);
  }

  /** Petunjuk tidak berlaku lagi (tamu sudah pindah tempat): kalimatnya dibuang, ucapan lain tetap. */
  hushTip(id: TipId, now: number) {
    this.clock = now;
    this.dialogue.drop(`tip.${id}.`, now);
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

  ticket(kind: TicketKind, now: number) {
    this.clock = now;
    this.behavior.ticket(kind, now);
  }

  /** Isyarat tiket bertali (3D atau 2,5D). Pegangan baru ditanggapi sesudah `GRAB_DELAY` bila belum dilepas. */
  ticketSignal(signal: PassSignal, now: number) {
    this.clock = now;
    if (signal.type === "release") this.grabAt = null;
    const kind = ticketReaction(signal);
    if (!kind) return;
    if (kind === "grab") {
      this.grabAt = now;
      return;
    }
    this.grabAt = null;
    this.behavior.ticket(kind, now);
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
    if (this.grabAt !== null && now - this.grabAt >= GRAB_DELAY) {
      this.grabAt = null;
      this.behavior.ticket("grab", now);
    }
    // selama berbicara Clawd tidak mengantuk; selama perkenalan dan petunjuk ia tidak menyela dirinya dengan celetukan
    this.dialogue.tick(now);
    this.behavior.guiding = this.dialogue.has("intro.") || this.dialogue.has("welcome.") || this.dialogue.has("tip.");
    if (this.dialogue.active) this.behavior.keepAwake(now);
    const snap = this.behavior.tick(now);
    const speech = this.dialogue.tick(now);
    if (this.introducing && !this.dialogue.active) this.introducing = false;
    let { motion, motionSince } = snap;
    const talking = !!speech?.typing;
    if (talking && !this.talking) this.talkSince = now;
    this.talking = talking;
    if (talking && motion === "hover") [motion, motionSince] = ["talk", this.talkSince];
    return { mood: snap.mood, motion, motionSince, speech, introducing: this.introducing };
  }
}
