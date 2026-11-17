/**
 * Benang emas (Tugas 8.1, PRD "Benang Emas": satu garis emas berpendar yang tergambar seiring gulir dan
 * menyambungkan semua tempat). Murni: lintasan, simpul, dan seberapa panjang benang sudah tergambar pada letak film
 * tertentu. Cara menggambarnya ada di `components/film/stage3d/thread.ts`.
 *
 * Gallery tiap hari: benang dibentangkan rendah di atas tanah, di pita lanskap tepat di bawah kartu (tempat yang
 * tidak tertutup kartu di layar lebar maupun HP). Tiap tempat singgah satu manik, diletakkan tepat di bawah kartunya:
 * titik di layar (tengah, `THREAD.knotY`) ditembakkan dari kamera gallery panel itu ke ketinggian manik di atas
 * tanah. Di antara dua manik benang melengkung turun seperti benang yang dibentangkan; pangkal dan ujungnya menyentuh
 * tanah. Benang tergambar sampai manik panel yang sedang tampil, dan selama geseran ujungnya maju ke manik berikutnya
 * mengikuti kemajuan gulir atau jari (masukan host 17 Nov atas versi pertama: "upgrade lah, keliatan basic banget").
 */
import type { Film } from "@/engine/slides/build-slides";
import { galleryDrift } from "@/engine/slides/build-slides";
import type { Cursor } from "./cue";
import { type Frame, galleryShot, rayThrough, type Vec3 } from "./shots";
import { terrainHeight, TERRAIN_DEFAULT, type TerrainShape } from "./terrain";

export const THREAD = {
  /** Letak simpul di layar gallery (NDC, −1 = tepi bawah): pita tanah di antara tepi bawah kartu dan label bab. */
  knotY: -0.7,
  /** Manik melayang sekian m di atas tanah; benang di antara dua manik melengkung turun sejauh `sag`. */
  knotLift: 0.2,
  sag: 0.11,
  /** Pangkal dan ujung benang hampir menyentuh tanah. */
  endLift: 0.025,
  /** Titik contoh per bentang (pangkal → manik, manik → titik tengah, dst.). */
  perSpan: 18,
  /** Lekuk benang: titik tengah tiap bentang bergeser sekian × panjang bentang ke depan/belakang, bergantian. */
  sway: 0.22,
  /** Ekor sebelum simpul pertama dan sesudah simpul terakhir, × jarak rata-rata antar simpul. */
  tail: 0.7,
  /** Benang memudar masuk/keluar selama sekian slide di tepi rentang tampaknya. */
  fade: 0.5,
} as const;

/** Satu benang: titik-titik di dunia, panjang busur ternormalisasi tiap titik, dan simpul tempat singgah. */
export type Strand = Readonly<{
  id: string;
  points: readonly Vec3[];
  /** Panjang busur 0–1 tiap titik (0 = pangkal, 1 = ujung). */
  at: readonly number[];
  /** Simpul: letak, panjang busurnya, dan indeks slide panelnya. */
  knots: readonly Readonly<{ pos: Vec3; at: number; slide: number }>[];
  /** Titik kunci gambar: [letak film (indeks slide pecahan), panjang tergambar 0–1], urut menurut letak film. */
  keys: readonly (readonly [number, number])[];
  /** Rentang letak film tempat benang tampak penuh; di luarnya memudar selama `THREAD.fade` slide. */
  span: readonly [number, number];
}>;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/**
 * Titik pertama sinar (`origin` + t·`dir`) yang menyentuh tanah (ditambah `lift`), atau null bila tidak menyentuh
 * dalam `far` m. Melangkah lalu membelah dua: tanah halus, jadi langkah 0,25 m tidak melewatkan bukit.
 */
export function groundHit(origin: Vec3, dir: Vec3, shape: TerrainShape = TERRAIN_DEFAULT, lift = 0, far = 120): Vec3 | null {
  const above = (t: number) => {
    const p = add(origin, scale(dir, t));
    return p[1] - (terrainHeight(p[0], p[2], shape) + lift);
  };
  if (above(0) <= 0) return origin;
  const step = 0.25;
  for (let t = step; t <= far; t += step) {
    if (above(t) > 0) continue;
    let [lo, hi] = [t - step, t];
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (above(mid) > 0) lo = mid;
      else hi = mid;
    }
    return add(origin, scale(dir, hi));
  }
  return null;
}

/** Catmull-Rom seragam di antara p1 dan p2. */
function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
}

/**
 * Kurva halus melewati `ctrl` (berurutan), dijatuhkan ke tanah: tiap titik contoh mengikuti tinggi tanah + `lift`.
 * Mengembalikan titik contoh dan indeks titik contoh tempat tiap titik kendali berada.
 */
export function drape(ctrl: readonly Vec3[], per: number, shape: TerrainShape, lift = 0): { points: Vec3[]; marks: number[] } {
  const points: Vec3[] = [];
  const marks: number[] = [];
  const at = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    marks.push(points.length);
    for (let j = 0; j < per; j++) points.push(catmull(at(i - 1), at(i), at(i + 1), at(i + 2), j / per));
  }
  marks.push(points.length);
  points.push([...ctrl[ctrl.length - 1]!] as Vec3);
  for (const p of points) (p as [number, number, number])[1] = terrainHeight(p[0], p[2], shape) + lift;
  return { points, marks };
}

/**
 * Tinggi benang di atas tanah (titik-titiknya sudah di permukaan): manik di `knotLift`, melengkung turun sejauh `sag`
 * di tengah tiap bentang, dan dari pangkal/ke ujung naik/turun halus dari `endLift`.
 */
export function lift(points: Vec3[], knotMarks: readonly number[]): void {
  const set = (i: number, h: number) => ((points[i] as [number, number, number])[1] += h);
  const first = knotMarks[0]!;
  const last = knotMarks[knotMarks.length - 1]!;
  const ease = (u: number) => u * u * (3 - 2 * u);
  for (let i = 0; i < first; i++) set(i, THREAD.endLift + (THREAD.knotLift - THREAD.endLift) * ease(i / first));
  for (let j = 0; j < knotMarks.length - 1; j++) {
    const [a, b] = [knotMarks[j]!, knotMarks[j + 1]!];
    for (let i = a; i < b; i++) set(i, THREAD.knotLift - THREAD.sag * Math.sin((Math.PI * (i - a)) / (b - a)));
  }
  const n = points.length - 1;
  for (let i = last; i <= n; i++) set(i, THREAD.knotLift + (THREAD.endLift - THREAD.knotLift) * ease(n > last ? (i - last) / (n - last) : 1));
}

/** Titik di sepanjang benang pada panjang busur `s` (0–1), di antara dua titik contoh. */
export function pointAt(strand: Pick<Strand, "points" | "at">, s: number): Vec3 {
  const { points, at } = strand;
  if (s <= 0) return points[0]!;
  if (s >= 1) return points[points.length - 1]!;
  let [lo, hi] = [0, at.length - 1];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (at[mid]! <= s) lo = mid;
    else hi = mid;
  }
  const t = (s - at[lo]!) / (at[hi]! - at[lo]! || 1);
  const [a, b] = [points[lo]!, points[hi]!];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Panjang busur ternormalisasi tiap titik. */
export function arcLengths(points: readonly Vec3[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + len(sub(points[i]!, points[i - 1]!)));
  const total = out[out.length - 1]! || 1;
  return out.map((d) => d / total);
}

/**
 * Benang gallery untuk tiap bab hari: pangkal di intro hari, satu simpul per panel, ujung sesudah panel terakhir.
 * Bab tanpa panel tidak punya benang.
 */
export function galleryStrands(film: Film, frame: Frame, shape: TerrainShape = TERRAIN_DEFAULT): Strand[] {
  const out: Strand[] = [];
  for (const chapter of film.chapters) {
    if (chapter.kind !== "day") continue;
    const panels: number[] = [];
    let intro = -1;
    for (let i = chapter.first; i <= chapter.last; i++) {
      const kind = film.slides[i]?.kind;
      if (kind === "panel") panels.push(i);
      else if (kind === "dayintro") intro = i;
    }
    if (!panels.length) continue;
    const knots: Vec3[] = [];
    for (const i of panels) {
      const shot = galleryShot(galleryDrift(film.slides[i]), frame);
      const hit = groundHit(shot.pos, rayThrough(shot, frame.aspect, 0, THREAD.knotY), shape, THREAD.knotLift);
      if (hit) knots.push(hit);
    }
    if (knots.length !== panels.length) continue;
    // jarak rata-rata antar simpul (satu panel: ekor tetap 1,6 m)
    const gap = knots.length > 1 ? len(sub(knots[knots.length - 1]!, knots[0]!)) / (knots.length - 1) : 1.6 / THREAD.tail;
    const first = knots[0]!;
    const last = knots[knots.length - 1]!;
    const along: Vec3 = knots.length > 1 ? scale(sub(last, first), 1 / (len(sub(last, first)) || 1)) : [1, 0, 0];
    const ctrl: Vec3[] = [sub(first, scale(along, gap * THREAD.tail))];
    knots.forEach((k, j) => {
      ctrl.push(k);
      const next = knots[j + 1];
      if (!next) return;
      // titik tengah bentang bergeser bergantian ke depan dan ke belakang (tegak lurus arah benang, mendatar)
      const d = sub(next, k);
      const side: Vec3 = [-d[2], 0, d[0]];
      const s = len(side) || 1;
      ctrl.push(add(scale(add(k, next), 0.5), scale(side, ((j % 2 ? 1 : -1) * THREAD.sway * len(d)) / s)));
    });
    ctrl.push(add(last, scale(along, gap * THREAD.tail)));
    const { points, marks } = drape(ctrl, THREAD.perSpan, shape);
    // manik ke-j ada di titik kendali ke-(1 + 2j)
    const knotMarks = knots.map((_, j) => marks[1 + 2 * j]!);
    lift(points, knotMarks);
    const at = arcLengths(points);
    const knotAt = knotMarks.map((m) => at[m]!);
    const lastPanel = panels[panels.length - 1]!;
    const keys: (readonly [number, number])[] = [];
    if (intro >= 0) keys.push([intro, 0]);
    panels.forEach((i, j) => keys.push([i, knotAt[j]!]));
    keys.push([lastPanel + 1, 1]);
    out.push({
      id: chapter.id,
      points,
      at,
      knots: knotMarks.map((m, j) => ({ pos: points[m]!, at: knotAt[j]!, slide: panels[j]! })),
      keys,
      span: [intro >= 0 ? intro : panels[0]!, lastPanel],
    });
  }
  return out;
}

/** Letak film sebagai indeks slide pecahan: `from` saat diam, bergerak ke `to` selama transisi. */
export const filmPosition = (c: Cursor) => (c.to === c.from ? c.from : c.from + (c.to - c.from) * Math.max(0, Math.min(1, c.p)));

/** Panjang tergambar (0–1) pada letak film `f`: linear di antara titik kunci, ditahan di luar. */
export function drawnAt(strand: Strand, f: number): number {
  const k = strand.keys;
  if (!k.length) return 0;
  if (f <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    const [fa, a] = k[i - 1]!;
    const [fb, b] = k[i]!;
    if (f > fb) continue;
    return fb === fa ? b : a + ((f - fa) / (fb - fa)) * (b - a);
  }
  return k[k.length - 1]![1];
}

/** Kadar tampak (0–1) pada letak film `f`: penuh di dalam `span`, memudar selama `THREAD.fade` slide di luarnya. */
export function shownAt(strand: Strand, f: number): number {
  const [a, b] = strand.span;
  const out = f < a ? a - f : f > b ? f - b : 0;
  const t = Math.max(0, 1 - out / THREAD.fade);
  return t * t * (3 - 2 * t);
}

/** Panjang busur simpul panel yang sedang tampil (slide terdekat dengan letak film `f`), atau −1 bila bukan panel benang ini. */
export function currentKnot(strand: Strand, f: number): number {
  const near = Math.round(f);
  return strand.knots.find((k) => k.slide === near)?.at ?? -1;
}
