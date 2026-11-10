/**
 * Penggerak transisi slide di atas Web Animations API.
 *
 * Kenapa bukan rAF/GSAP untuk lapisan DOM: animasi `opacity` & `transform` lewat WAAPI dikerjakan thread
 * compositor, jadi teks tetap mulus ketika thread utama sibuk merender WebGL (F2). Saat jari men-scrub,
 * animasinya dijeda dan waktunya digeser dari JS; begitu dilepas, sisanya kembali diputar compositor.
 *
 * Lintasan ditulis sebagai angka (bukan string CSS) supaya nilai di titik mana pun bisa dihitung: itulah yang
 * memungkinkan transisi dilanjutkan dari posisi jari, dibalik di tengah jalan, dan dibaca panggung 3D
 * (`progress()`) dari sumber waktu yang sama.
 */
import { BEZIER, easeCss, type EaseName } from "@/engine/motion/tokens";

/** Titik kunci: [posisi 0–1 dalam transisi, nilai]. Di antaranya linear; di luar rentang ditahan. */
export type Key = readonly [at: number, value: number];
export type Channels = { opacity?: readonly Key[]; x?: readonly Key[]; y?: readonly Key[]; scale?: readonly Key[] };
export type Track = Channels & {
  el: Element;
  /** Satuan x & y: "px" atau "%" (dari ukuran elemen itu sendiri). */
  unit?: "px" | "%";
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Nilai lintasan di posisi `p`. */
export function valueAt(keys: readonly Key[], p: number): number {
  const first = keys[0];
  if (!first) return 0;
  if (p <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (p <= b[0]) return b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (p - a[0])) / (b[0] - a[0]);
  }
  return keys[keys.length - 1]![1];
}

const CHANNELS = ["opacity", "x", "y", "scale"] as const;

/** Gaya di posisi `p` (hanya opacity & transform). */
export function styleAt(track: Channels & { unit?: "px" | "%" }, p: number): { opacity?: string; transform?: string } {
  const out: { opacity?: string; transform?: string } = {};
  if (track.opacity) out.opacity = String(round(valueAt(track.opacity, p)));
  if (track.x || track.y || track.scale) {
    const u = track.unit ?? "px";
    const x = track.x ? round(valueAt(track.x, p)) : 0;
    const y = track.y ? round(valueAt(track.y, p)) : 0;
    const s = track.scale ? ` scale(${round(valueAt(track.scale, p))})` : "";
    out.transform = `translate3d(${x}${x ? u : ""}, ${y}${y ? u : ""}, 0)${s}`;
  }
  return out;
}
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Keyframe untuk ruas a → b (b boleh lebih kecil dari a: berjalan mundur). Semua titik kunci di dalam ruas
 * ikut jadi keyframe, sehingga bentuk lintasan tetap sama walau hanya sebagian yang diputar.
 */
export function framesBetween(track: Channels & { unit?: "px" | "%" }, a: number, b: number): Keyframe[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const stops = new Set<number>([a, b]);
  for (const ch of CHANNELS) for (const [at] of track[ch] ?? []) if (at > lo && at < hi) stops.add(at);
  const span = b - a;
  return [...stops]
    .map((p) => ({ p, offset: span === 0 ? 0 : (p - a) / span }))
    .sort((m, n) => m.offset - n.offset)
    .map(({ p, offset }) => ({ offset: round(clamp01(offset)), ...styleAt(track, p) }));
}

/** cubic-bezier(x1, y1, x2, y2) sebagai fungsi, sama dengan kurva CSS-nya. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  if (x1 === y1 && x2 === y2) return clamp01;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-5) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Newton tidak konvergen (kurva sangat curam): belah dua
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
export const ease = (name: EaseName) => {
  const [x1, y1, x2, y2] = BEZIER[name];
  return bezier(x1, y1, x2, y2);
};

/** Durasi anggapan saat di-scrub (waktu animasi = kemajuan × ini). */
const SCRUB_MS = 1000;

type Segment = { from: number; to: number; dur: number; curve: (x: number) => number };

/**
 * Satu transisi: sekumpulan lintasan yang bergerak bersama.
 * `seek` (ikut jari) → `run` (putar sampai 0 atau 1) → `cancel` (lepas, gaya kembali ke CSS).
 */
export class Timeline {
  private anims: Animation[] = [];
  private seg: Segment | null = null;
  private at = 0;
  private token = 0;

  constructor(private readonly tracks: Track[]) {}

  /** Kemajuan saat ini (0 = slide asal, 1 = slide tujuan), termasuk selama diputar compositor. */
  progress(): number {
    const seg = this.seg;
    const master = this.anims[0];
    if (!seg || !master) return this.at;
    const t = typeof master.currentTime === "number" ? master.currentTime : 0;
    return seg.from + (seg.to - seg.from) * seg.curve(seg.dur <= 0 ? 1 : clamp01(t / seg.dur));
  }

  /** Ikuti jari: linear, dijeda, waktunya digeser dari sini. */
  seek(p: number) {
    const next = clamp01(p);
    if (this.seg || this.anims.length === 0) {
      this.replace(this.tracks.map((t) => t.el.animate(framesBetween(t, 0, 1), { duration: SCRUB_MS, fill: "both", easing: "linear" })));
      for (const a of this.anims) a.pause();
      this.seg = null;
    }
    this.at = next;
    for (const a of this.anims) a.currentTime = next * SCRUB_MS;
  }

  /**
   * Putar dari posisi sekarang ke `end`. Selesai → true; digantikan `run`/`seek`/`cancel` lain → false.
   * Animasi terakhir tetap menahan gaya akhirnya sampai `cancel()` dipanggil.
   */
  run(end: 0 | 1, dur: number, easing: EaseName): Promise<boolean> {
    const from = this.progress();
    const token = ++this.token;
    this.at = from;
    const duration = Math.max(0, Math.round(dur));
    this.replace(this.tracks.map((t) => t.el.animate(framesBetween(t, from, end), { duration: Math.max(1, duration), fill: "both", easing: easeCss(easing) })));
    this.seg = { from, to: end, dur: Math.max(1, duration), curve: ease(easing) };
    const master = this.anims[0];
    if (!master) {
      this.at = end;
      this.seg = null;
      return Promise.resolve(true);
    }
    return master.finished.then(
      () => {
        if (token !== this.token) return false;
        this.at = end;
        return true;
      },
      () => false,
    );
  }

  /** Percepat sisa perjalanan (ada langkah yang menunggu). */
  hurry(rate: number) {
    for (const a of this.anims) a.updatePlaybackRate(rate);
  }

  /** Lepas semua animasi; elemen kembali ke gaya CSS-nya. */
  cancel() {
    this.token++;
    this.replace([]);
    this.seg = null;
  }

  private replace(next: Animation[]) {
    const old = this.anims;
    this.anims = next;
    for (const a of old) a.cancel();
  }
}
