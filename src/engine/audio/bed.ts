import { effectiveXfade, equalPowerIn, equalPowerOut, LOOP_LOOKAHEAD, loopStep } from "./loop";

/** Bagian AudioContext yang dipakai BedPlayer (dipersempit supaya bisa dites dengan tiruan). */
export type BedCtx = Pick<BaseAudioContext, "currentTime" | "createBufferSource" | "createGain">;

export type BedOptions = {
  /** Ulang tanpa jeda (crossfade equal-power antar-salinan). */
  loop: boolean;
  /** Durasi fade-in salinan pertama (dtk). */
  fadeIn: number;
  /** Durasi crossfade antar-salinan, atau ke gendhing berikutnya (dtk). */
  xfade: number;
  /** Untuk gendhing sekali putar: dipanggil menjelang ekor, dengan waktu mulai & durasi crossfade ke gendhing berikutnya. */
  onTail?: (at: number, xfade: number) => void;
};

/**
 * Satu gendhing yang sedang diputar. Salinan dijadwalkan di jam AudioContext (bukan timer),
 * `pump()` cukup dipanggil berkala: saat konteks di-suspend jamnya berhenti, jadi tidak ada yang meleset.
 */
export class BedPlayer {
  readonly out: GainNode;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly xf: number;
  private next = Number.POSITIVE_INFINITY;
  private tailAt = Number.POSITIVE_INFINITY;
  private stopped = false;

  constructor(
    private readonly ctx: BedCtx,
    private readonly buffer: AudioBuffer,
    dest: AudioNode,
    private readonly opts: BedOptions,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.xf = effectiveXfade(buffer.duration, opts.xfade);
  }

  get duration() {
    return this.buffer.duration;
  }

  start(at: number) {
    const d = this.buffer.duration;
    const tail = this.opts.loop || this.opts.onTail ? this.xf : 0;
    this.copy(at, Math.min(this.opts.fadeIn, d / 3), tail);
    if (this.opts.loop) this.next = at + loopStep(d, this.opts.xfade);
    else if (this.opts.onTail) this.tailAt = at + d - this.xf;
    this.pump();
  }

  /** Jadwalkan salinan / ekor yang jatuh dalam jendela lookahead. */
  pump() {
    if (this.stopped) return;
    const horizon = this.ctx.currentTime + LOOP_LOOKAHEAD;
    while (this.next < horizon) {
      this.copy(this.next, this.xf, this.xf);
      this.next += loopStep(this.buffer.duration, this.opts.xfade);
    }
    if (this.tailAt < horizon) {
      const at = this.tailAt;
      this.tailAt = Number.POSITIVE_INFINITY;
      this.opts.onTail?.(at, this.xf);
    }
  }

  /** Redam lalu hentikan. */
  stop(fade = 1.2) {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    const from = g.value;
    g.cancelScheduledValues(now);
    if (fade > 0.01) g.setValueCurveAtTime(equalPowerOut().map((v) => v * from), now, fade);
    else g.value = 0;
    for (const s of this.sources) s.stop(now + fade + 0.05);
  }

  get playing() {
    return !this.stopped && (this.sources.size > 0 || this.next < Number.POSITIVE_INFINITY);
  }

  private copy(at: number, fadeIn: number, fadeOut: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    const g = this.ctx.createGain();
    g.gain.value = fadeIn > 0 ? 0 : 1;
    if (fadeIn > 0) g.gain.setValueCurveAtTime(equalPowerIn(), at, fadeIn);
    if (fadeOut > 0) g.gain.setValueCurveAtTime(equalPowerOut(), at + this.buffer.duration - fadeOut, fadeOut);
    src.connect(g).connect(this.out);
    src.onended = () => {
      this.sources.delete(src);
      g.disconnect();
      if (this.sources.size === 0 && (this.stopped || this.next === Number.POSITIVE_INFINITY)) this.out.disconnect();
    };
    this.sources.add(src);
    src.start(at);
  }
}
