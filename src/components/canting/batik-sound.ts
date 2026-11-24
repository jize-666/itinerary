/**
 * Suara membatik prosedural (Tugas 11.4): desis malam, gemericik celupan, gelembung lorod, dan bunyi sekali
 * (tetes, ombak celup, nyamplung masuk ke malam panas, malam menetes ke kain). Semua dibangkitkan di perangkat dari
 * derau dan nada sinus, tanpa berkas audio yang diunduh; memakai AudioContext dan bus efek film yang sudah dibuka
 * sakelar suara (`audioStatus.environment()`), jadi ikut mute dan jeda latar.
 *
 * Tiga suara menerus adalah putaran buffer pendek yang dibangkitkan sekali per konteks (desis = derau terang dengan
 * letupan kecil; gemericik = ratusan gelembung kecil bernada naik; didih = gelembung besar di atas gemuruh rendah).
 * Kadarnya diatur tiap frame (`set`), naik cepat dan turun dengan ekor yang wajar; suara yang lama hening dilepas.
 */

type Env = { context: BaseAudioContext; output: AudioNode };
type Voice = "wax" | "water" | "boil";
type Levels = Partial<Record<Voice, number>>;

export type BatikVoices = {
  readonly context: BaseAudioContext;
  /** Kadar tiga suara menerus 0–1 (dipanggil tiap frame; nilai yang tidak diberi tidak berubah). */
  set(levels: Levels): void;
  /** Tetes air jatuh ke bak, `delay` detik dari sekarang. */
  drip(delay?: number, level?: number): void;
  /** Ombak saat kain masuk ke atau terangkat dari bak celup. */
  splash(level?: number): void;
  /** Nyamplung dicelup ke malam panas di wajan. */
  blub(level?: number): void;
  /** Setetes malam panas jatuh ke kain (mbleber, tetes). */
  sizzle(level?: number): void;
  dispose(): void;
};

/** Penguat puncak tiap suara (sebelum bus efek). Desis lembut di bawah gendhing, didih paling bulat. */
const PEAK: Record<Voice, number> = { wax: 0.38, water: 0.3, boil: 0.34 };
/** Naik cepat; turun dengan ekor tiap suara (detik, konstanta waktu). */
const ATTACK = 0.025;
const RELEASE: Record<Voice, number> = { wax: 0.07, water: 0.22, boil: 0.55 };
/** Panjang putaran (detik). Berbeda-beda supaya pola tidak terdengar berulang bersamaan. */
const LOOP: Record<Voice, number> = { wax: 2.6, water: 3.2, boil: 3.7 };
/** Suara yang hening selama ini (detik) dilepas. */
const IDLE = 2.5;

/** Pantauan untuk e2e: kadar tertinggi tiap suara dan banyak bunyi sekali. */
type Debug = { peak: Record<Voice, number>; shots: { drip: number; splash: number; blub: number; sizzle: number }; live: number };
/**
 * Penyadap untuk perekam pratinjau (`scripts/preview/record-film.cjs` SOUND=…): rekaman Playwright tidak membawa audio,
 * jadi kadar dan bunyi sekali dicatat lalu dibangkitkan ulang di OfflineAudioContext (`mix-batik.cjs`). Tanpa
 * perekam tidak ada.
 */
type Tap = (kind: "set" | "drip" | "splash" | "blub" | "sizzle", ...args: number[]) => void;
type DebugWindow = Window & { __lakonBatikSound?: Debug; __batikSoundTap?: Tap };
const debug = (): Debug | null => {
  if (typeof window === "undefined") return null;
  const w = window as DebugWindow;
  return (w.__lakonBatikSound ??= { peak: { wax: 0, water: 0, boil: 0 }, shots: { drip: 0, splash: 0, blub: 0, sizzle: 0 }, live: 0 });
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function normalize(d: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]!));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] = (d[i]! / m) * peak;
}

/** Desis malam: derau bergetar pelan, ditaburi letupan kecil seperti lemak panas (disaring 2–8 kHz di grafik). */
function waxData(sr: number): Float32Array {
  const n = Math.round(sr * LOOP.wax);
  const d = new Float32Array(n);
  const r = rng(0x6d616c);
  let wob = 0.8;
  for (let i = 0; i < n; i++) {
    wob += (0.55 + r() * 0.45 - wob) * 0.0009;
    d[i] = (r() * 2 - 1) * 0.22 * wob;
  }
  const pops = Math.round(LOOP.wax * 95);
  for (let k = 0; k < pops; k++) {
    const t0 = Math.floor(r() * n);
    const len = Math.max(8, Math.floor(sr * (0.0008 + r() * r() * 0.006)));
    const amp = 0.15 + r() * r() * 0.85;
    for (let j = 0; j < len; j++) d[(t0 + j) % n]! += amp * (r() * 2 - 1) * Math.exp((-4 * j) / len) * Math.min(1, j / 4);
  }
  normalize(d);
  return d;
}

type Bubbles = { density: number; f: [number, number]; tau: [number, number]; rise: number; amp: [number, number] };

/** Gelembung pecah: nada sinus yang naik (gelembung mengecil di permukaan) dan meluruh cepat. Melingkar mulus. */
function addBubbles(d: Float32Array, sr: number, seconds: number, b: Bubbles, r: () => number) {
  const n = d.length;
  const count = Math.round(seconds * b.density);
  for (let k = 0; k < count; k++) {
    const t0 = Math.floor(r() * n);
    const f0 = b.f[0] * Math.pow(b.f[1] / b.f[0], r());
    const tau = b.tau[0] + (b.tau[1] - b.tau[0]) * r();
    const amp = b.amp[0] + (b.amp[1] - b.amp[0]) * r() * r();
    const len = Math.floor(tau * 5 * sr);
    let phase = 0;
    for (let j = 0; j < len; j++) {
      const t = j / sr;
      phase += (2 * Math.PI * f0 * (1 + (b.rise * t) / tau)) / sr;
      d[(t0 + j) % n]! += amp * Math.sin(phase) * Math.exp(-t / tau) * Math.min(1, t / 0.0012);
    }
  }
}

/** Derau gelap (satu kutub) di bawah gelembung: aliran air atau gemuruh air mendidih. */
function addWash(d: Float32Array, level: number, pole: number, r: () => number) {
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    y += ((r() * 2 - 1) - y) * pole;
    d[i]! += y * level;
  }
}

function waterData(sr: number): Float32Array {
  const d = new Float32Array(Math.round(sr * LOOP.water));
  const r = rng(0x6e696c61);
  addWash(d, 0.5, 0.08, r);
  addBubbles(d, sr, LOOP.water, { density: 58, f: [480, 2600], tau: [0.005, 0.02], rise: 0.55, amp: [0.2, 1] }, r);
  normalize(d);
  return d;
}

function boilData(sr: number): Float32Array {
  const d = new Float32Array(Math.round(sr * LOOP.boil));
  const r = rng(0x6c6f726f);
  // gemuruh tipis saja: di speaker HP nada di bawah ±300 Hz hilang, jadi gelembungnya yang membawa rasa mendidih
  addWash(d, 0.4, 0.03, r);
  addBubbles(d, sr, LOOP.boil, { density: 26, f: [230, 720], tau: [0.018, 0.055], rise: 0.3, amp: [0.35, 1] }, r);
  addBubbles(d, sr, LOOP.boil, { density: 38, f: [850, 2200], tau: [0.004, 0.012], rise: 0.6, amp: [0.08, 0.4] }, r);
  normalize(d);
  return d;
}

const MAKE: Record<Voice, (sr: number) => Float32Array> = { wax: waxData, water: waterData, boil: boilData };
/** Buffer per konteks: dibangkitkan sekali, dipakai ulang film dan `/canting/`. */
const cache = new WeakMap<BaseAudioContext, Partial<Record<Voice | "noise", AudioBuffer>>>();

function bufferFor(ctx: BaseAudioContext, v: Voice | "noise"): AudioBuffer {
  let c = cache.get(ctx);
  if (!c) cache.set(ctx, (c = {}));
  const have = c[v];
  if (have) return have;
  let data: Float32Array;
  if (v === "noise") {
    data = new Float32Array(Math.round(ctx.sampleRate * 0.9));
    const r = rng(0x6f6d62);
    for (let i = 0; i < data.length; i++) data[i] = r() * 2 - 1;
  } else data = MAKE[v](ctx.sampleRate);
  const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  c[v] = buf;
  return buf;
}

type Live = { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; target: number; quietSince: number | null };

const FILTER: Record<Voice, { type: BiquadFilterType; f: number; q: number }> = {
  // desis malam di 2–8 kHz (bukan derau tajam di atas 8 kHz seperti uap)
  wax: { type: "bandpass", f: 4200, q: 0.6 },
  water: { type: "highpass", f: 220, q: 0.6 },
  boil: { type: "lowpass", f: 3600, q: 0.5 },
};

export function createBatikVoices({ context: ctx, output }: Env): BatikVoices {
  const bus = ctx.createGain();
  bus.connect(output);
  const live: Partial<Record<Voice, Live>> = {};
  const r = rng((Math.random() * 2 ** 32) >>> 0);
  const dbg = debug();
  const tap = typeof window !== "undefined" ? (window as DebugWindow).__batikSoundTap : undefined;
  let dead = false;
  if (dbg) dbg.live++;

  // buffer dibangkitkan di waktu senggang (±10–30 ms masing-masing), bukan di tengah geseran pertama
  const idle = (fn: () => void) =>
    typeof window !== "undefined" && "requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);
  for (const v of ["wax", "water", "boil"] as const) idle(() => !dead && bufferFor(ctx, v));

  const start = (v: Voice): Live => {
    const src = ctx.createBufferSource();
    src.buffer = bufferFor(ctx, v);
    src.loop = true;
    src.playbackRate.value = 0.96 + r() * 0.08;
    const filter = ctx.createBiquadFilter();
    const f = FILTER[v];
    filter.type = f.type;
    filter.frequency.value = f.f;
    filter.Q.value = f.q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(bus);
    src.start(ctx.currentTime, r() * LOOP[v]);
    return { src, filter, gain, target: 0, quietSince: null };
  };
  const stop = (v: Voice) => {
    const l = live[v];
    if (!l) return;
    delete live[v];
    l.gain.gain.cancelScheduledValues(ctx.currentTime);
    l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    l.src.stop(ctx.currentTime + 0.2);
    l.src.onended = () => {
      l.src.disconnect();
      l.filter.disconnect();
      l.gain.disconnect();
    };
  };

  /** Bunyi sekali dari nada sinus yang menyapu, `at` = waktu konteks. */
  const chirp = (at: number, f0: number, f1: number, sweep: number, amp: number, decay: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + sweep);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.002);
    g.gain.setTargetAtTime(0, at + 0.004, decay);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + 0.01 + decay * 6);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  };
  /** Semburan derau tersaring: ombak (lowpass menyapu turun) atau desis singkat (buffer malam). */
  const burst = (at: number, buf: AudioBuffer, amp: number, dur: number, filter?: { type: BiquadFilterType; from: number; to: number }) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    let tail: AudioNode = s;
    let bq: BiquadFilterNode | null = null;
    if (filter) {
      bq = ctx.createBiquadFilter();
      bq.type = filter.type;
      bq.Q.value = 0.7;
      bq.frequency.setValueAtTime(filter.from, at);
      bq.frequency.exponentialRampToValueAtTime(filter.to, at + dur);
      tail = s.connect(bq);
    }
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.02);
    g.gain.setTargetAtTime(0, at + 0.05, dur / 3.5);
    tail.connect(g).connect(bus);
    s.start(at, r() * Math.max(0, buf.duration - dur - 0.1));
    s.stop(at + dur + 0.2);
    s.onended = () => {
      s.disconnect();
      bq?.disconnect();
      g.disconnect();
    };
  };

  const chirpDrip = (delay: number, level: number) => {
    const f0 = 650 + r() * 900;
    chirp(ctx.currentTime + Math.max(0, delay), f0, f0 * (2 + r() * 0.8), 0.03 + r() * 0.02, 0.12 * level, 0.018);
  };

  const voices: BatikVoices = {
    context: ctx,
    set(levels) {
      if (dead) return;
      const now = ctx.currentTime;
      let changed = false;
      for (const v of ["wax", "water", "boil"] as const) {
        const level = levels[v];
        if (level === undefined) continue;
        const target = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0)) * PEAK[v];
        let l = live[v];
        if (!l) {
          if (target < 0.002) continue;
          l = live[v] = start(v);
        }
        if (dbg) dbg.peak[v] = Math.max(dbg.peak[v], target / PEAK[v]);
        if (Math.abs(target - l.target) > 0.003) {
          changed = true;
          l.gain.gain.cancelScheduledValues(now);
          l.gain.gain.setTargetAtTime(target, now, target > l.target ? ATTACK : RELEASE[v]);
          l.target = target;
        }
        if (target < 0.002) {
          l.quietSince ??= now;
          if (now - l.quietSince > IDLE) stop(v);
        } else l.quietSince = null;
      }
      if (tap && changed) tap("set", ...(["wax", "water", "boil"] as const).map((v) => (live[v]?.target ?? 0) / PEAK[v]));
    },
    drip(delay = 0, level = 1) {
      if (dead) return;
      chirpDrip(delay, level);
      if (dbg) dbg.shots.drip++;
      tap?.("drip", delay, level);
    },
    splash(level = 1) {
      if (dead) return;
      const at = ctx.currentTime;
      burst(at, bufferFor(ctx, "noise"), 0.24 * level, 0.65, { type: "lowpass", from: 3400, to: 480 });
      // tetes ikutan tidak dicatat penyadap: perender ulang membuatnya sendiri dari `splash`
      for (let i = 0; i < 6; i++) chirpDrip(0.08 + r() * 0.7, 0.5 + r() * 0.5);
      if (dbg) dbg.shots.splash++;
      tap?.("splash", level);
    },
    blub(level = 1) {
      if (dead) return;
      const at = ctx.currentTime;
      chirp(at, 150, 330, 0.09, 0.2 * level, 0.045);
      burst(at + 0.03, bufferFor(ctx, "wax"), 0.16 * level, 0.5, { type: "bandpass", from: 4600, to: 2800 });
      if (dbg) dbg.shots.blub++;
      tap?.("blub", level);
    },
    sizzle(level = 1) {
      if (dead) return;
      burst(ctx.currentTime, bufferFor(ctx, "wax"), 0.2 * level, 0.22, { type: "bandpass", from: 5200, to: 3400 });
      if (dbg) dbg.shots.sizzle++;
      tap?.("sizzle", level);
    },
    dispose() {
      if (dead) return;
      dead = true;
      if (dbg) dbg.live--;
      for (const v of ["wax", "water", "boil"] as const) stop(v);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => bus.disconnect(), 500);
    },
  };
  return voices;
}
