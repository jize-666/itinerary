/**
 * Keadaan panggung 3D pada satu saat: shot kamera + keadaan langit, dihitung dari letak film (`Cursor`).
 * Murni. Sumber waktunya sama dengan lapisan DOM: kemajuan transisi dari `Timeline.progress()`.
 */
import { type Film, type TransitionKind, transitionKind } from "@/engine/slides/build-slides";
import { type SkyKey, skyPath, skyState, type SkyState, STILL } from "@/engine/slides/sky";
import { blendShot, type Frame, type Shot, shotFor } from "./shots";

/** Letak film: dari slide `from` menuju `to`, sejauh `p` (0–1). Diam: `to === from`, `p = 0`. */
export type Cursor = Readonly<{ from: number; to: number; p: number }>;

/**
 * Jendela langit di dalam transisi, per rupa transisi: langit berganti di antara dua titik ini. Dipakai
 * lapisan DOM (transitions.ts) dan panggung 3D, supaya keduanya berganti warna pada saat yang sama.
 */
export const SKY_WINDOW: Readonly<Record<TransitionKind | "fade", readonly [number, number]>> = {
  slide: [0.08, 0.86],
  inner: [0, 1],
  wipe: [0.44, 0.56],
  fade: [0, 1],
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Keadaan langit di posisi `p` pada lintasan `keys` (linear di antara titik kunci, ditahan di luar). */
export function skyAlong(keys: readonly SkyKey[], p: number): SkyState {
  const first = keys[0];
  if (!first) return STILL.night;
  if (p <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [pa, a] = keys[i - 1]!;
    const [pb, b] = keys[i]!;
    if (p > pb) continue;
    const t = pb === pa ? 1 : (p - pa) / (pb - pa);
    return {
      dawn: mix(a.dawn, b.dawn, t),
      day: mix(a.day, b.day, t),
      dusk: mix(a.dusk, b.dusk, t),
      gate: mix(a.gate, b.gate, t),
      ground: mix(a.ground, b.ground, t),
      sun: { u: mix(a.sun.u, b.sun.u, t), v: mix(a.sun.v, b.sun.v, t), opacity: mix(a.sun.opacity, b.sun.opacity, t), warm: mix(a.sun.warm, b.sun.warm, t), scale: mix(a.sun.scale, b.sun.scale, t) },
    };
  }
  return keys[keys.length - 1]![1];
}

export type Cue = Readonly<{ shot: Shot; sky: SkyState; kind: TransitionKind; moving: boolean }>;

/**
 * Pembuat cue untuk satu film dan satu bentuk layar. Shot per slide dan lintasan langit per transisi disimpan,
 * jadi per frame hanya ada pencampuran angka.
 */
export function createCues(film: Film, frame: Frame) {
  const shots = new Map<number, Shot>();
  const shot = (i: number): Shot => {
    let s = shots.get(i);
    if (!s) {
      const slide = film.slides[Math.max(0, Math.min(film.slides.length - 1, i))]!;
      s = shotFor(slide, frame);
      shots.set(i, s);
    }
    return s;
  };
  let pathKey = "";
  let path: readonly SkyKey[] = [];
  let kind: TransitionKind = "slide";

  return (c: Cursor): Cue => {
    const a = film.slides[c.from];
    const b = film.slides[c.to];
    if (!a) return { shot: shot(0), sky: STILL.gate, kind: "slide", moving: false };
    if (!b || c.from === c.to || c.p <= 0) return { shot: shot(c.from), sky: skyState(a), kind: "slide", moving: false };
    const key = `${c.from}>${c.to}`;
    if (key !== pathKey) {
      pathKey = key;
      path = skyPath(a, b);
      kind = transitionKind(film, c.from, c.to);
    }
    const [s, e] = SKY_WINDOW[kind];
    const at = e === s ? (c.p < s ? 0 : 1) : Math.max(0, Math.min(1, (c.p - s) / (e - s)));
    return { shot: blendShot(shot(c.from), shot(c.to), c.p, kind), sky: skyAlong(path, at), kind, moving: c.p < 1 };
  };
}
