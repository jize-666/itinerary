/**
 * Suara tiket 3D prosedural (Tugas 12b): gemerisik kertas kartu, dering kuningan mata ayam, tepukan balik, sentuhan,
 * dan desir lepas. Semua dibangkitkan di perangkat dari derau dan nada sinus, tanpa berkas audio. Memakai AudioContext
 * dan bus efek film yang sudah dibuka sakelar suara (`audioStatus.environment()`), jadi ikut mute dan jeda latar.
 * Sangat pelan: duduk di bawah gendhing. Pemetaan kejadian → kadar ada di `engine/pass3d/sound.ts`.
 */
import type { PassSignal } from "@/engine/stage/bus";
import { clink, flipParams, grabGain, releaseWhoosh, rustleGain } from "@/engine/pass3d/sound";

type Env = { context: BaseAudioContext; output: AudioNode };

export type PassVoices = {
  readonly context: BaseAudioContext;
  /** Teruskan satu kejadian fisika tiket. */
  signal(e: PassSignal): void;
  dispose(): void;
};

/** Penguat bus tiket (sebelum bus efek). */
const BUS = 0.5;
/** Penguat puncak gemerisik menerus. */
const RUSTLE_PEAK = 0.16;
const ATTACK = 0.03;
const RELEASE = 0.12;
/** Gemerisik yang hening selama ini (detik) dilepas. */
const IDLE = 2.5;
const NOISE_SECONDS = 1.6;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Buffer derau per konteks: dibangkitkan sekali. */
const cache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseFor(ctx: BaseAudioContext): AudioBuffer {
  const have = cache.get(ctx);
  if (have) return have;
  const n = Math.round(ctx.sampleRate * NOISE_SECONDS);
  const d = new Float32Array(n);
  const r = rng(0x70617373);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  buf.copyToChannel(d as Float32Array<ArrayBuffer>, 0);
  cache.set(ctx, buf);
  return buf;
}

/** Sebagian kuningan: nada tak harmonik (Hz) dan bobot relatif. */
const BRASS: readonly (readonly [number, number])[] = [
  [2600, 1],
  [4300, 0.55],
  [6900, 0.28],
];

type Rustle = { src: AudioBufferSourceNode; band: BiquadFilterNode; gain: GainNode; target: number; quietSince: number | null };

export function createPassVoices({ context: ctx, output }: Env): PassVoices {
  const bus = ctx.createGain();
  bus.gain.value = BUS;
  bus.connect(output);
  const r = rng((Math.random() * 2 ** 32) >>> 0);
  let dead = false;
  let rustle: Rustle | null = null;
  let lastClink = Number.NEGATIVE_INFINITY;

  // buffer derau dibangkitkan di waktu senggang, bukan di tengah gestur pertama
  const idle = (fn: () => void) =>
    typeof window !== "undefined" && "requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);
  idle(() => !dead && noiseFor(ctx));

  const startRustle = (): Rustle => {
    const src = ctx.createBufferSource();
    src.buffer = noiseFor(ctx);
    src.loop = true;
    src.playbackRate.value = 0.97 + r() * 0.06;
    // kertas kartu: pita ±1,5–6 kHz (tengah ±3 kHz, Q lebar)
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3000;
    band.Q.value = 0.55;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(band).connect(gain).connect(bus);
    src.start(ctx.currentTime, r() * NOISE_SECONDS);
    return { src, band, gain, target: 0, quietSince: null };
  };
  const stopRustle = () => {
    const l = rustle;
    if (!l) return;
    rustle = null;
    l.gain.gain.cancelScheduledValues(ctx.currentTime);
    l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    l.src.stop(ctx.currentTime + 0.2);
    l.src.onended = () => {
      l.src.disconnect();
      l.band.disconnect();
      l.gain.disconnect();
    };
  };
  const setRustle = (level: number) => {
    const now = ctx.currentTime;
    const target = Math.min(1, Math.max(0, level)) * RUSTLE_PEAK;
    let l = rustle;
    if (!l) {
      if (target < 0.002) return;
      l = rustle = startRustle();
    }
    if (Math.abs(target - l.target) > 0.0015) {
      l.gain.gain.cancelScheduledValues(now);
      l.gain.gain.setTargetAtTime(target, now, target > l.target ? ATTACK : RELEASE);
      // ayunan cepat sedikit lebih terang
      l.band.frequency.setTargetAtTime(2600 + 1400 * level, now, 0.08);
      l.target = target;
    }
    if (target < 0.002) {
      l.quietSince ??= now;
      if (now - l.quietSince > IDLE) stopRustle();
    } else l.quietSince = null;
  };

  /** Semburan derau tersaring dengan amplop cepat; `at` = waktu konteks. */
  const burst = (at: number, type: BiquadFilterType, freq: number, q: number, amp: number, dur: number) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseFor(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.006);
    g.gain.setTargetAtTime(0, at + 0.01, dur / 3.5);
    s.connect(f).connect(g).connect(bus);
    s.start(at, r() * (NOISE_SECONDS - dur - 0.3));
    s.stop(at + dur + 0.15);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
  };
  /** Nada sinus meluruh; `f1` ≠ `f0` untuk menyapu. */
  const tone = (at: number, f0: number, f1: number, amp: number, decay: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + decay);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(amp, at + 0.002);
    g.gain.setTargetAtTime(0, at + 0.004, decay / 3);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + 0.01 + decay * 2.5);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  };

  const ping = (c: { gain: number; pitch: number; decay: number }) => {
    const at = ctx.currentTime;
    const total = BRASS.reduce((a, [, w]) => a + w, 0);
    for (const [f, w] of BRASS) {
      // bagian atas meluruh lebih cepat, seperti logam kecil
      tone(at, f * c.pitch, f * c.pitch, 0.2 * c.gain * (w / total) * 1.8, c.decay * (f > 5000 ? 0.6 : 1));
    }
  };

  return {
    context: ctx,
    signal(e) {
      if (dead) return;
      const now = ctx.currentTime;
      switch (e.type) {
        case "grab":
          burst(now, "bandpass", 2800, 0.8, 0.12 * grabGain(e.kind), 0.05);
          break;
        case "release": {
          const w = releaseWhoosh(e.speed);
          if (w) burst(now, "bandpass", w.freq, 0.6, 0.2 * w.gain, w.dur);
          break;
        }
        case "flip": {
          const p = flipParams(e.back);
          burst(now, "bandpass", p.flapFreq, 0.7, 0.2 * p.flap, p.flapDur);
          tone(now, p.thumpFreq, p.thumpFreq * 0.8, 0.14 * p.thump, p.thumpDur);
          break;
        }
        case "eyelet-knock": {
          const t = performance.now();
          const c = clink(e.strength, t, lastClink);
          if (c) {
            lastClink = t;
            ping(c);
          }
          break;
        }
        case "swing-speed":
          setRustle(rustleGain(e.speed, e.angularSpeed));
          break;
        case "rest":
          setRustle(0);
          break;
      }
    },
    dispose() {
      if (dead) return;
      dead = true;
      stopRustle();
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => bus.disconnect(), 500);
    },
  };
}
