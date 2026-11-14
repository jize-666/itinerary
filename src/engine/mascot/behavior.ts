/**
 * Perilaku maskot pemandu (permintaan host 15 Nov: "assistant responsive ketika di click, bisa menyapa atau marah
 * ketika di spam click, mengantuk ketika diam terlalu lama, happy ketika di click beberapa kali"). Diadaptasi dari
 * `behavior.ts` paket coral-assistant, ditambah suasana hati "sayang" (mata hati) untuk klik pelan yang terus
 * berlanjut, dan ucapan berupa kunci teks (`Line`) supaya lapisan chat bisa menuliskannya dalam EN/ID.
 * Murni dan deterministik: semua waktu dalam milidetik dari pemanggil.
 */
import type { Mood } from "./face";
import type { Motion } from "./pose";

/** Kunci ucapan spontan (teksnya di i18n `mascot.say.*`). */
export type Line = "tap" | "wake" | "angry" | "happy" | "love" | "gong" | "calm";

export type Snapshot = Readonly<{ mood: Mood; motion: Motion; motionSince: number; resting: boolean; traveling: boolean; guiding: boolean }>;

export type BehaviorOptions = { onSpeech?: (line: Line) => void; onRest?: () => void };

/** Ambang perilaku (ms). */
export const MASCOT = {
  /** Klik pelan: jeda antar klik 400–1.500 ms; tiga berturut-turut = senang (sesudah jendela 300 ms). */
  gentleMin: 400,
  gentleMax: 1500,
  happyAfter: 3,
  /** Enam klik pelan berturut-turut = sayang (mata hati). */
  loveAfter: 6,
  arbitration: 300,
  /** Spam: lima klik dalam 1.200 ms = marah selama 6 dtk, lalu tidak bisa marah lagi selama 8 dtk sesudahnya. */
  spamCount: 5,
  spamWindow: 1200,
  angryFor: 6000,
  angryCooldown: 8000,
  /** Diam: mengantuk sesudah 30 dtk, tidur sesudah 60 dtk. */
  sleepyAfter: 30000,
  sleepAfter: 60000,
  /** Ucapan spontan paling rapat. */
  speechGap: 4000,
} as const;

const DUR: Partial<Record<Motion, number>> = { greet: 2400, happy: 2000, angry: 1800, wake: 1400, surprised: 1300, point: 2600 };

export class MascotBehavior {
  mood: Mood = "neutral";
  traveling = false;
  guiding = false;
  resting = false;
  private taps: number[] = [];
  private gentle: number[] = [];
  private happyAt = Infinity;
  private happyMood: "happy" | "love" = "happy";
  private moodUntil = Infinity;
  private angerAllowedAt = 0;
  private lastSpeech = -Infinity;
  private lastActivity: number;
  private gesture: Motion | null = null;
  private gestureSince = 0;
  private gestureUntil = 0;
  private hiddenAt: number | null = null;
  private options: BehaviorOptions;

  constructor(now = 0, options: BehaviorOptions = {}) {
    this.lastActivity = now;
    this.options = options;
  }

  configure(options: BehaviorOptions) {
    this.options = options;
  }

  private clearTaps() {
    this.taps = [];
    this.gentle = [];
    this.happyAt = Infinity;
  }

  /** Ucapan spontan dijarangkan (`speechGap`) dan diam selama memandu; reaksi (`force`) selalu diucapkan. */
  private say(line: Line, now: number, force = false) {
    if (force || (!this.guiding && now - this.lastSpeech >= MASCOT.speechGap)) {
      this.lastSpeech = now;
      this.options.onSpeech?.(line);
    }
  }

  /** Ada kegiatan (gulir, sentuh, klik di mana pun): membangunkan dan menunda kantuk. */
  activity(now: number) {
    this.lastActivity = now;
    if (this.mood === "sleepy" || this.mood === "sleeping" || this.resting) {
      this.mood = "curious";
      this.moodUntil = now + 1200;
      this.resting = false;
      this.play("wake", now);
      this.clearTaps();
    }
  }

  /** Penonton sedang menyeret kamera atau menggeser slide: rangkaian klik diputus. */
  cameraInteraction(now: number) {
    this.activity(now);
    this.clearTaps();
  }

  setGuiding(value: boolean, now: number) {
    this.guiding = value;
    this.activity(now);
  }

  setTraveling(value: boolean) {
    this.traveling = value;
  }

  setMood(mood: Mood, now: number, duration = 2000) {
    this.mood = mood;
    this.moodUntil = now + duration;
    this.clearTaps();
  }

  play(motion: Motion, now: number, duration = DUR[motion] ?? 2000) {
    this.gesture = motion;
    this.gestureSince = now;
    this.gestureUntil = now + duration;
  }

  greet(now: number) {
    this.activity(now);
    this.setMood("happy", now, 2400);
    this.play("greet", now);
  }

  /** Menunjuk objek yang sedang dijelaskan. */
  point(now: number) {
    this.activity(now);
    this.play("point", now);
  }

  /** Satu klik/ketuk sah pada maskot. */
  tap(now: number) {
    const asleep = this.mood === "sleepy" || this.mood === "sleeping";
    this.activity(now);
    if (asleep) {
      this.say("wake", now, true);
      return;
    }
    if (this.mood === "angry" || now < this.angerAllowedAt) {
      if (this.mood === "angry") this.play("angry", now);
      return;
    }
    this.taps = this.taps.filter((t) => now - t <= MASCOT.spamWindow);
    this.taps.push(now);
    if (this.taps.length >= MASCOT.spamCount) {
      this.setMood("angry", now, MASCOT.angryFor);
      this.play("angry", now);
      this.angerAllowedAt = now + MASCOT.angryFor + MASCOT.angryCooldown;
      this.say("angry", now, true);
      return;
    }
    const previous = this.gentle.at(-1);
    if (previous !== undefined && (now - previous < MASCOT.gentleMin || now - previous > MASCOT.gentleMax)) this.gentle = [];
    this.gentle.push(now);
    if (this.gentle.length >= MASCOT.loveAfter) {
      this.happyAt = now + MASCOT.arbitration;
      this.happyMood = "love";
    } else if (this.gentle.length >= MASCOT.happyAfter && this.mood !== "love") {
      this.happyAt = now + MASCOT.arbitration;
      this.happyMood = "happy";
    } else if (this.mood === "neutral") {
      this.mood = "curious";
      this.moodUntil = now + 1400;
      this.play("look", now, 1400);
      this.say("tap", now);
    }
  }

  /** Gong dipukul (judul hari, hero, atau gong penutup). */
  gong(now: number) {
    this.activity(now);
    if (this.mood === "angry") return;
    this.setMood("surprised", now, 1100);
    this.play("surprised", now);
    this.say("gong", now);
  }

  /** Tab disembunyikan/ditampilkan: semua jam emosi dibekukan selama tersembunyi. */
  visibility(hidden: boolean, now: number) {
    if (hidden && this.hiddenAt === null) this.hiddenAt = now;
    else if (!hidden && this.hiddenAt !== null) {
      const elapsed = now - this.hiddenAt;
      this.moodUntil += elapsed;
      this.gestureUntil += elapsed;
      this.gestureSince += elapsed;
      this.happyAt += elapsed;
      this.angerAllowedAt += elapsed;
      this.lastActivity = now;
      this.lastSpeech += elapsed;
      this.hiddenAt = null;
      this.clearTaps();
    }
  }

  tick(now: number): Snapshot {
    if (this.hiddenAt !== null) return this.snapshot(this.hiddenAt);
    if (now >= this.happyAt) {
      const mood = this.happyMood;
      this.happyAt = Infinity;
      this.mood = mood;
      this.moodUntil = now + (mood === "love" ? 3200 : 2200);
      this.play("happy", now);
      this.say(mood, now, true);
      if (mood === "love") this.gentle = [];
    }
    if (now >= this.moodUntil) {
      if (this.mood === "surprised") {
        this.mood = "happy";
        this.moodUntil = now + 1400;
      } else {
        if (this.mood === "angry") this.say("calm", now, true);
        this.mood = "neutral";
        this.moodUntil = Infinity;
      }
    }
    const idle = now - this.lastActivity;
    if (!this.guiding && idle >= MASCOT.sleepyAfter && this.mood !== "angry") {
      if (!this.resting) {
        this.resting = true;
        this.mood = "sleepy";
        this.moodUntil = Infinity;
        this.clearTaps();
        this.options.onRest?.();
      }
      if (idle >= MASCOT.sleepAfter && !this.traveling) this.mood = "sleeping";
    }
    return this.snapshot(now);
  }

  snapshot(now: number): Snapshot {
    let motion: Motion = "hover";
    let since = 0;
    if (this.traveling) motion = "fly";
    else if (this.mood === "sleeping") motion = "sleep";
    else if (this.gesture && now < this.gestureUntil) [motion, since] = [this.gesture, this.gestureSince];
    return { mood: this.mood, motion, motionSince: since, resting: this.resting, traveling: this.traveling, guiding: this.guiding };
  }
}
