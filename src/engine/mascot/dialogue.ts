/**
 * Gelembung ucapan Clawd: antrean kalimat dengan efek ketik ala gim piksel. Murni (tanpa DOM): waktu dalam milidetik
 * dari pemanggil, teks diambil lewat fungsi supaya kalimat yang sedang tampil ikut berganti saat bahasa diganti.
 *
 * - Huruf muncul satu per satu (`TYPE.cps`), berhenti sejenak sesudah tanda baca.
 * - Sesudah kalimat selesai diketik, kalimat ditahan selama waktu baca lalu lanjut ke kalimat berikutnya sendiri.
 * - Ketukan pada gelembung/maskot: kalimat yang sedang diketik langsung lengkap; kalimat yang sudah lengkap diganti
 *   kalimat berikutnya.
 * - Ucapan yang menyela (reaksi klik) menggantikan antrean.
 */

export const TYPE = {
  /** Huruf per detik. */
  cps: 34,
  /** Jeda tambahan sesudah tanda baca (ms). */
  stop: 260,
  comma: 110,
  /** Waktu baca sesudah kalimat lengkap: dasar + per huruf (ms). */
  holdBase: 1300,
  holdPerChar: 38,
  /** Kalimat terakhir menghilang dalam waktu ini (ms). */
  fade: 220,
} as const;

/** Jeda sebelum huruf ke-`i` (ms), sesudah huruf sebelumnya. */
function delayAfter(ch: string | undefined): number {
  if (ch === "." || ch === "!" || ch === "?") return TYPE.stop;
  if (ch === "," || ch === ";" || ch === ":") return TYPE.comma;
  return 0;
}

/** Banyak huruf yang sudah tampil `elapsed` ms sesudah kalimat mulai diketik. */
export function typedLength(text: string, elapsed: number): number {
  if (elapsed <= 0) return 0;
  const per = 1000 / TYPE.cps;
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    // titik berurutan ("...") dijeda sekali saja, di titik terakhir
    const prev = text[i - 1];
    const pause = prev === "." && text[i] === "." ? 0 : delayAfter(prev);
    t += per + pause;
    if (t > elapsed) return i;
  }
  return text.length;
}

/** Lama mengetik seluruh kalimat (ms). */
export function typingTime(text: string): number {
  const per = 1000 / TYPE.cps;
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    const prev = text[i - 1];
    t += per + (prev === "." && text[i] === "." ? 0 : delayAfter(prev));
  }
  return t;
}

export const holdTime = (text: string) => TYPE.holdBase + TYPE.holdPerChar * text.length;

/** Satu kalimat dalam antrean: `text()` dibaca ulang tiap frame (bahasa bisa berganti). */
export type Utterance = { id: string; text: () => string };

export type SpeechFrame = Readonly<{
  /** Kunci kalimat yang sedang tampil. */
  id: string;
  text: string;
  /** Huruf yang sudah tampil. */
  shown: number;
  typing: boolean;
  /** Masih ada kalimat sesudah ini (tampilkan tanda lanjut). */
  more: boolean;
  /** 0–1: memudar saat kalimat terakhir selesai. */
  fade: number;
  /** Kalimat mulai tampil (ms, jam pemanggil). */
  since: number;
}>;

export class Dialogue {
  private queue: Utterance[] = [];
  private current: Utterance | null = null;
  private startedAt = 0;
  /** Diketuk saat mengetik: dianggap sudah lengkap sejak saat itu. */
  private completedAt: number | null = null;
  private endedAt: number | null = null;
  private last: Utterance | null = null;

  get active() {
    return this.current !== null;
  }
  /** Banyak kalimat yang belum tampil. */
  get pending() {
    return this.queue.length;
  }

  /** Antrekan kalimat; `interrupt` = buang yang sedang tampil dan antreannya. */
  say(lines: readonly Utterance[], now: number, interrupt = false) {
    if (interrupt) {
      this.queue = [...lines];
      this.current = null;
    } else this.queue.push(...lines);
    if (!this.current) this.next(now);
  }

  /** Ada kalimat (tampil atau menunggu) yang kuncinya diawali `prefix`. */
  has(prefix: string) {
    return !!this.current?.id.startsWith(prefix) || this.queue.some((u) => u.id.startsWith(prefix));
  }

  /** Buang kalimat yang kuncinya diawali `prefix`; bila sedang tampil, langsung lanjut ke kalimat berikutnya. */
  drop(prefix: string, now: number) {
    this.queue = this.queue.filter((u) => !u.id.startsWith(prefix));
    if (this.current?.id.startsWith(prefix)) this.next(now);
  }

  clear() {
    this.queue = [];
    this.current = null;
    this.endedAt = null;
  }

  private next(now: number) {
    const u = this.queue.shift() ?? null;
    if (u) {
      this.current = u;
      this.startedAt = now;
      this.completedAt = null;
      this.endedAt = null;
    } else if (this.current) {
      this.last = this.current;
      this.current = null;
      this.endedAt = now;
    }
  }

  /** Saat kalimat sekarang lengkap diketik (ms, jam pemanggil). */
  private doneAt(text: string): number {
    const typed = this.startedAt + typingTime(text);
    return this.completedAt !== null ? Math.min(this.completedAt, typed) : typed;
  }

  /** Lama kalimat sekarang sudah lengkap (ms), atau null bila masih diketik. */
  private doneFor(text: string, now: number): number | null {
    const done = this.doneAt(text);
    return now >= done ? now - done : null;
  }

  /** Saat kalimat sekarang berganti: sesudah waktu baca. */
  private endAt(text: string): number {
    return this.doneAt(text) + holdTime(text);
  }

  /** Ketukan: lengkapi kalimat yang sedang diketik, atau lanjut ke kalimat berikutnya. Mengembalikan true bila terpakai. */
  advance(now: number): boolean {
    if (!this.current) return false;
    const text = this.current.text();
    if (this.doneFor(text, now) === null) this.completedAt = now;
    else this.next(now);
    return true;
  }

  tick(now: number): SpeechFrame | null {
    if (this.current) {
      // berganti tepat di akhir waktu baca, walau frame berikutnya datang terlambat
      const end = this.endAt(this.current.text());
      if (now >= end) this.next(end);
    }
    if (this.current) {
      const text = this.current.text();
      const done = this.doneFor(text, now);
      const shown = done !== null ? text.length : typedLength(text, now - this.startedAt);
      return { id: this.current.id, text, shown, typing: done === null, more: this.queue.length > 0, fade: 1, since: this.startedAt };
    }
    if (this.last && this.endedAt !== null && now - this.endedAt < TYPE.fade) {
      const text = this.last.text();
      return { id: this.last.id, text, shown: text.length, typing: false, more: false, fade: 1 - (now - this.endedAt) / TYPE.fade, since: this.endedAt };
    }
    return null;
  }
}
