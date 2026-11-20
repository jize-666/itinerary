/**
 * Urutan torehan canting dari satu motif (Tugas 11). Motif (`motif.ts`) diubah menjadi:
 * - deret dab malam (titik bulat kecil di sepanjang garis klowong dan di tiap cecek), masing-masing dengan waktu
 *   `t` 0–1 saat malam itu jatuh ke kain;
 * - bidang (isian krem dan tembok soga) yang tersapu bertahap dari `t0` ke `t1`.
 *
 * Film cukup menggambar semua dab dengan `t ≤ progres` dan menyapu bidang sampai progres: maju dan mundur memberi
 * gambar yang sama persis (deterministik), tanpa sisa saat dihapus. Urutannya mengikuti proses batik tulis:
 * nglowong (semua garis), ngisen-iseni (cecek dan isian krem), lalu nembok (bidang soga).
 */
import { type Layer, type Motif, type Part, polygonArea, polylineLength, type Pt, type Stroke } from "./motif";

/** Satu dab = 5 angka: x, y, jari-jari, lapisan (0 keep, 1 temp), waktu t. */
export const DAB = 5;

export type TraceFill = { poly: Pt[]; layer: Layer; part: Part; t0: number; t1: number; area: number };
export type Trace = {
  /** Dab berurutan menurut waktu (naik). */
  dabs: Float32Array;
  count: number;
  fills: TraceFill[];
  /** Batas fase: akhir nglowong, akhir ngisen-iseni (sesudahnya nembok sampai 1). */
  phases: { lines: number; isen: number };
  /** Letak ujung cucuk (dan apakah sedang menempel di kain) pada progres `p`. */
  tipAt(p: number): { at: Pt; down: boolean };
  /** Banyak dab dengan t ≤ p (pencarian biner). */
  countAt(p: number): number;
};

export type TraceOptions = {
  /** Jarak antar-dab ÷ jari-jari. Lebih kecil = garis lebih mulus, lebih banyak dab. */
  spacing?: number;
  /** Waktu (satuan bebas) untuk mengangkat dan memindah canting antar-guratan. */
  lift?: number;
};

const PART_ORDER: readonly Part[] = ["core", "leaf", "ukel", "ring", "field", "border"];

/** Bilangan semu-acak deterministik 0–1 dari satu bilangan bulat (untuk getar lebar garis). */
export function hash01(n: number) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** `work` = waktu cucuk menempel di kain, `move` = waktu mengangkat dan memindah canting sesudahnya. */
type Job =
  | { kind: "line"; stroke: Extract<Stroke, { kind: "line" }>; work: number; move: number; index: number }
  | { kind: "dot"; stroke: Extract<Stroke, { kind: "dot" }>; work: number; move: number; index: number }
  | { kind: "fill"; stroke: Extract<Stroke, { kind: "fill" }>; work: number; move: number; index: number };

/** Susun urutan kerja canting dan hitung waktu tiap dab dan bidang. */
export function traceMotif(motif: Motif, opts: TraceOptions = {}): Trace {
  const spacing = opts.spacing ?? 0.35;
  const lift = opts.lift ?? 0.05;
  const byPart = (a: Stroke, b: Stroke) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part);
  const strokes = motif.strokes.map((s, index) => ({ s, index }));
  const lines = strokes.filter((x) => x.s.kind === "line").sort((a, b) => byPart(a.s, b.s) || a.index - b.index);
  const isen = strokes
    .filter((x) => x.s.kind === "dot" || (x.s.kind === "fill" && x.s.layer === "keep"))
    .sort((a, b) => byPart(a.s, b.s) || a.index - b.index);
  const tembok = strokes.filter((x) => x.s.kind === "fill" && x.s.layer === "temp").sort((a, b) => byPart(a.s, b.s) || a.index - b.index);

  // biaya waktu: garis sepanjang panjangnya, cecek sekali tutul, bidang menurut luasnya (tembok lebih lambat dari garis)
  const jobs: Job[] = [];
  const push = ({ s, index }: { s: Stroke; index: number }) => {
    if (s.kind === "line") jobs.push({ kind: "line", stroke: s, work: polylineLength(s.pts, s.closed), move: lift, index });
    else if (s.kind === "dot") jobs.push({ kind: "dot", stroke: s, work: 0.012, move: lift * 0.4, index });
    else jobs.push({ kind: "fill", stroke: s, work: polygonArea(s.poly) * 9, move: lift, index });
  };
  lines.forEach(push);
  const nLines = jobs.length;
  isen.forEach(push);
  const nIsen = jobs.length;
  tembok.forEach(push);
  const total = jobs.reduce((a, j) => a + j.work + j.move, 0) || 1;

  const dabs: number[] = [];
  const fills: TraceFill[] = [];
  // titik-titik lintasan ujung canting (untuk tipAt): [t, x, y, ikutiDab]; pasangan (awal, akhir) per guratan
  const path: number[] = [];
  let clock = 0;
  let phaseLines = 0;
  let phaseIsen = 0;
  jobs.forEach((job, k) => {
    const t0 = clock / total;
    const t1 = (clock + job.work) / total;
    if (job.kind === "line") {
      const { pts, width, closed } = job.stroke;
      const ring = closed ? [...pts, pts[0]!] : pts;
      const len = polylineLength(ring) || 1e-6;
      const r0 = width / 2;
      const step = Math.max(r0 * spacing, 1e-4);
      let walked = 0;
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i]!;
        if (i > 0) {
          const q = ring[i - 1]!;
          const seg = Math.hypot(p[0] - q[0], p[1] - q[1]);
          const n = Math.max(1, Math.ceil(seg / step));
          for (let j = 1; j <= n; j++) {
            const u = j / n;
            const d = walked + seg * u;
            const f = d / len;
            // lebar bergetar halus sepanjang guratan, dan malam sedikit menggenang di awal (cucuk baru menyentuh kain)
            const wobble = 1 + 0.1 * Math.sin(f * 23 + hash01(job.index) * 6.28) + 0.05 * Math.sin(f * 71);
            const pool = 1 + 0.35 * Math.max(0, 1 - d / (r0 * 3));
            dabs.push(q[0] + (p[0] - q[0]) * u, q[1] + (p[1] - q[1]) * u, r0 * wobble * pool, 0, t0 + (t1 - t0) * f);
          }
          walked += seg;
        } else {
          dabs.push(p[0], p[1], r0 * 1.35, 0, t0);
        }
      }
      path.push(t0, ring[0]![0], ring[0]![1], 1, t1, ring[ring.length - 1]![0], ring[ring.length - 1]![1], 1);
    } else if (job.kind === "dot") {
      const { at, r } = job.stroke;
      // cecek: satu tutul, sedikit membesar selama cucuk menempel
      dabs.push(at[0], at[1], r * 0.55, 0, t0, at[0], at[1], r, 0, t1);
      path.push(t0, at[0], at[1], 0, t1, at[0], at[1], 0);
    } else {
      const { poly, layer, part } = job.stroke;
      fills.push({ poly, layer, part, t0, t1, area: polygonArea(poly) });
      const c = poly.reduce<[number, number]>((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
      path.push(t0, poly[0]![0], poly[0]![1], 0, t1, c[0], c[1], 0);
    }
    clock += job.work + job.move;
    if (k === nLines - 1) phaseLines = clock / total;
    if (k === nIsen - 1) phaseIsen = clock / total;
  });

  // dab dalam satu guratan sudah naik; antar-guratan juga naik karena jam terus maju
  const packed = new Float32Array(dabs);
  const count = packed.length / DAB;
  const times = new Float32Array(count);
  for (let i = 0; i < count; i++) times[i] = packed[i * DAB + 4]!;

  const countAt = (p: number) => {
    let lo = 0;
    let hi = count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid]! <= p) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const tipAt = (p: number) => {
    const n = path.length / 4;
    if (n === 0) return { at: motif.center, down: false };
    if (p <= path[0]!) return { at: [path[1]!, path[2]!] as Pt, down: false };
    for (let i = 0; i < n - 1; i++) {
      const ta = path[i * 4]!;
      const tb = path[(i + 1) * 4]!;
      if (p >= ta && p <= tb) {
        const u = tb > ta ? (p - ta) / (tb - ta) : 1;
        const ax = path[i * 4 + 1]!;
        const ay = path[i * 4 + 2]!;
        const bx = path[(i + 1) * 4 + 1]!;
        const by = path[(i + 1) * 4 + 2]!;
        // pasangan genap = selama guratan (menempel), ganjil = berpindah antar-guratan (terangkat)
        const down = i % 2 === 0;
        if (down && path[i * 4 + 3] === 1) {
          // selama garis: ikuti dab terakhir supaya cucuk tepat di ujung malam
          const k = countAt(p) - 1;
          if (k >= 0) return { at: [packed[k * DAB]!, packed[k * DAB + 1]!] as Pt, down: true };
        }
        return { at: [ax + (bx - ax) * u, ay + (by - ay) * u] as Pt, down };
      }
    }
    return { at: [path[(n - 1) * 4 + 1]!, path[(n - 1) * 4 + 2]!] as Pt, down: false };
  };

  return { dabs: packed, count, fills, phases: { lines: phaseLines, isen: phaseIsen }, tipAt, countAt };
}
