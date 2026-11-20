/**
 * Pola tuntunan untuk halaman /canting/ (Tugas 11.2): garis pensil tipis di kain (seperti nyorek) yang diikuti tamu,
 * atau digambar sendiri oleh canting lewat auto-trace. Tiga pola: kawung (dari motif film), parang (lereng diagonal
 * dengan mlinjon), dan bengawan (Bengawan Solo dengan lampion, orisinal untuk proyek ini).
 *
 * Satuan sama dengan `motif.ts`: tinggi kain = 1, lebar = `aspect`, (0, 0) kiri atas, y ke bawah. Logika murni.
 */
import { kawungUkel, type Pt } from "./motif";

export type GuideKind = "kawung" | "parang" | "bengawan";
export const GUIDE_KINDS: readonly GuideKind[] = ["kawung", "parang", "bengawan"];

/** Satu garis tuntunan: titik berurutan; closed = ujung bertemu pangkal (titik awal tidak diulang di akhir). */
export type GuidePath = { pts: Pt[]; closed: boolean };
export type Guide = { kind: GuideKind; aspect: number; paths: GuidePath[]; dots: Pt[] };

/** Jarak aman dari tepi kain (satuan tinggi kain). */
export const GUIDE_MARGIN = 0.04;

const TAU = Math.PI * 2;

// ---- potong ke area aman ----

const inside = (p: Pt, aspect: number) =>
  p[0] >= GUIDE_MARGIN && p[0] <= aspect - GUIDE_MARGIN && p[1] >= GUIDE_MARGIN && p[1] <= 1 - GUIDE_MARGIN;

const clampPt = (p: Pt, aspect: number): Pt => [
  Math.min(aspect - GUIDE_MARGIN, Math.max(GUIDE_MARGIN, p[0])),
  Math.min(1 - GUIDE_MARGIN, Math.max(GUIDE_MARGIN, p[1])),
];

/** Tambah titik ke potongan bila bukan duplikat titik terakhir. */
function pushPt(piece: Pt[], p: Pt) {
  const last = piece[piece.length - 1];
  if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 1e-9) piece.push(p);
}

/** Buang titik di luar area aman; garis terbelah di tempat ia keluar. Cincin tertutup yang utuh tetap tertutup. */
function dropOutside(path: GuidePath, aspect: number): GuidePath[] {
  const { pts, closed } = path;
  if (pts.every((p) => inside(p, aspect))) return pts.length >= (closed ? 3 : 2) ? [path] : [];
  let seq: Pt[] = pts;
  if (closed) {
    // putar supaya mulai di titik luar, lalu anggap garis terbuka yang kembali ke pangkal
    const i0 = pts.findIndex((p) => !inside(p, aspect));
    seq = [...pts.slice(i0), ...pts.slice(0, i0), pts[i0]!];
  }
  const out: GuidePath[] = [];
  let cur: Pt[] = [];
  const flush = () => {
    if (cur.length >= 2) out.push({ pts: cur, closed: false });
    cur = [];
  };
  for (const p of seq) {
    if (inside(p, aspect)) cur.push(p);
    else flush();
  }
  flush();
  return out;
}

/** Potong ruas demi ruas ke persegi aman (Liang–Barsky); garis terbuka terbelah di batas. */
function clipPolyline(pts: readonly Pt[], aspect: number): GuidePath[] {
  const x0 = GUIDE_MARGIN;
  const x1 = aspect - GUIDE_MARGIN;
  const y0 = GUIDE_MARGIN;
  const y1 = 1 - GUIDE_MARGIN;
  const out: GuidePath[] = [];
  let cur: Pt[] = [];
  const flush = () => {
    if (cur.length >= 2) out.push({ pts: cur, closed: false });
    cur = [];
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (const [p, q] of [
      [-dx, a[0] - x0],
      [dx, x1 - a[0]],
      [-dy, a[1] - y0],
      [dy, y1 - a[1]],
    ] as const) {
      if (p === 0) {
        if (q < 0) ok = false;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (!ok || t0 > t1) {
      flush();
      continue;
    }
    pushPt(cur, clampPt([a[0] + dx * t0, a[1] + dy * t0], aspect));
    pushPt(cur, clampPt([a[0] + dx * t1, a[1] + dy * t1], aspect));
    if (t1 < 1) flush();
  }
  flush();
  return out;
}

// ---- kawung ----

function kawungGuide(aspect: number): Guide {
  const m = kawungUkel({ aspect });
  const paths: GuidePath[] = [];
  const dots: Pt[] = [];
  for (const s of m.strokes) {
    if (s.kind === "line") paths.push(...dropOutside({ pts: s.pts, closed: s.closed }, aspect));
    else if (s.kind === "dot" && inside(s.at, aspect)) dots.push(s.at);
  }
  return { kind: "kawung", aspect, paths, dots };
}

// ---- parang ----

function parangGuide(aspect: number): Guide {
  const r2 = Math.SQRT1_2;
  // sumbu s menanjak ke kanan (arah 45°), sumbu o tegak lurus; y ke bawah
  const toXY = (s: number, o: number): Pt => [(s + o) * r2, (o - s) * r2];
  const band = 0.18; // jarak antar-pita
  const half = 0.032; // setengah lebar pita
  const amp = 0.008; // simpangan gelombang S
  const lam = 0.2; // panjang gelombang
  const sMin = -r2 - 0.05;
  const sMax = aspect * r2 + 0.05;
  const oMax = (aspect + 1) * r2;
  const oMid = oMax / 2;
  const wave = (s: number) => amp * Math.sin((TAU * s) / lam);
  const paths: GuidePath[] = [];
  const dots: Pt[] = [];
  const kMax = Math.ceil(oMax / band) + 1;
  for (let k = -kMax; k <= kMax; k++) {
    const c = oMid + k * band;
    if (c < -band || c > oMax + band) continue;
    // dua tepi pita, masing-masing gelombang S
    for (const sign of [1, -1] as const) {
      const pts: Pt[] = [];
      for (let s = sMin; s <= sMax; s += 0.01) pts.push(toXY(s, c + sign * half + wave(s)));
      paths.push(...clipPolyline(pts, aspect));
    }
    // deret belah ketupat kecil (mlinjon) di tengah celah antar-pita
    const gap = c + band / 2;
    for (let s = sMin + 0.05; s <= sMax; s += 0.1) {
      const o = gap + wave(s);
      const lozenge: Pt[] = [toXY(s - 0.03, o), toXY(s, o - 0.015), toXY(s + 0.03, o), toXY(s, o + 0.015)];
      if (!lozenge.every((p) => inside(p, aspect))) continue;
      paths.push({ pts: lozenge, closed: true });
      const mid = toXY(s, o);
      if (inside(mid, aspect)) dots.push(mid);
    }
  }
  return { kind: "parang", aspect, paths, dots };
}

// ---- bengawan ----

/** Titik-titik pada jarak sama `step` sepanjang garis (dimulai dari `first`). */
function resample(pts: readonly Pt[], step: number, first = 0): Pt[] {
  const out: Pt[] = [];
  let next = first;
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (next <= walked + seg && seg > 0) {
      const u = (next - walked) / seg;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      next += step;
    }
    walked += seg;
  }
  return out;
}

function bengawanGuide(aspect: number): Guide {
  const cycles = (1.2 * aspect) / 1.6 + 0.4;
  const y = (x: number) =>
    0.5 + 0.15 * Math.sin((TAU * cycles * x) / aspect + 0.6) + 0.04 * Math.sin((TAU * cycles * 2.3 * x) / aspect + 1.7);
  const slope = (x: number) => (y(x + 1e-4) - y(x - 1e-4)) / 2e-4;
  /** Titik pada tepi sungai: geser tegak lurus garis tengah sejauh `off`. */
  const edge = (x: number, off: number): Pt => {
    const k = slope(x);
    const n = Math.hypot(k, 1);
    return [x + (off * -k) / n, y(x) + off / n];
  };
  const xs: number[] = [];
  const N = 320;
  for (let i = 0; i <= N; i++) xs.push((aspect * i) / N);
  const curve = (off: number) => xs.map((x) => edge(x, off));

  const paths: GuidePath[] = [];
  // dua tepi sungai, berjarak 0,05
  for (const off of [-0.025, 0.025]) paths.push(...clipPolyline(curve(off), aspect));

  // lampion: lingkaran kecil di sepanjang garis tengah, tiap ±0,12
  const lanternR = 0.012;
  for (const c of resample(clipPolyline(curve(0), aspect)[0]?.pts ?? [], 0.12, 0.06)) {
    const ring: Pt[] = [];
    for (let i = 0; i < 16; i++) ring.push([c[0] + Math.cos((i / 16) * TAU) * lanternR, c[1] + Math.sin((i / 16) * TAU) * lanternR]);
    if (ring.every((p) => inside(p, aspect))) paths.push({ pts: ring, closed: true });
  }

  // bingkai tipis tepat di dalam batas aman
  const f = GUIDE_MARGIN + 0.01;
  paths.push({
    pts: [
      [f, f],
      [aspect - f, f],
      [aspect - f, 1 - f],
      [f, 1 - f],
    ],
    closed: true,
  });

  // cecek di luar tiap tepi sungai, jarak ±0,03
  const dots: Pt[] = [];
  for (const off of [-0.04, 0.04]) for (const p of resample(curve(off), 0.03)) if (inside(p, aspect)) dots.push(p);

  return { kind: "bengawan", aspect, paths, dots };
}

// ---- API ----

const cache = new Map<string, Guide>();

/** Pola tuntunan satu jenis untuk kain selebar `aspect`. Deterministik; hasilnya di-cache, jangan diubah. */
export function guide(kind: GuideKind, aspect = 1.6): Guide {
  const key = `${kind}:${aspect}`;
  let g = cache.get(key);
  if (!g) {
    g = kind === "kawung" ? kawungGuide(aspect) : kind === "parang" ? parangGuide(aspect) : bengawanGuide(aspect);
    cache.set(key, g);
  }
  return g;
}

/**
 * Dab malam untuk auto-trace: tiga angka (x, y, r) per dab, urut menurut urutan menggambar. Garis dulu (tiap
 * garis berjalan dengan jarak `spacing × lineR`, garis tertutup termasuk ruas penutupnya), lalu satu dab per cecek.
 */
export function guideDabs(
  g: Guide,
  opts: { lineR?: number; dotR?: number; spacing?: number } = {},
): { line: number[]; dots: number[] } {
  const lineR = opts.lineR ?? 0.0042;
  const dotR = opts.dotR ?? 0.0055;
  const step = (opts.spacing ?? 0.35) * lineR;
  const line: number[] = [];
  for (const { pts, closed } of g.paths) {
    const ring = closed ? [...pts, pts[0]!] : pts;
    line.push(ring[0]![0], ring[0]![1], lineR);
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!;
      const b = ring[i]!;
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let j = 1; j <= n; j++) line.push(a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n, lineR);
    }
  }
  const dots: number[] = [];
  for (const [x, y] of g.dots) dots.push(x, y, dotR);
  return { line, dots };
}
