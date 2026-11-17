/**
 * Perjalanan satu hari di gallery 3D: larung lampion di Bengawan Solo (Tugas 8.1; pilihan host 17 Nov "b aja coba",
 * menggantikan benang emas). Murni: letak lampion, jalur perahu, dan seberapa jauh perahu sudah hanyut pada letak
 * film tertentu. Sungainya di `river.ts`; cara menggambar di `components/film/stage3d/river.ts` dan `larung.ts`.
 *
 * Tiap tempat singgah satu lampion terapung, tepat di bawah kartunya: titik di layar (tengah, `ROUTE.knotY`)
 * ditembakkan dari kamera gallery panel itu ke muka air, lalu dijaga tetap di tengah alur. Perahu lampion tamu hanyut
 * dari hulu (kiri) ke hilir (kanan) di sisi dekat lampion: di panel ke-k ia berlabuh di samping lampion ke-k, dan
 * selama geseran ia hanyut ke lampion berikutnya mengikuti kemajuan gulir atau jari, menyalakan tiap lampion yang
 * disinggahi.
 */
import type { Film } from "@/engine/slides/build-slides";
import { galleryDrift } from "@/engine/slides/build-slides";
import type { Cursor } from "./cue";
import { arcLevel, nearestRiver, RIVER, type RiverLine, riverLine } from "./river";
import { type Frame, galleryShot, rayThrough, type Vec3 } from "./shots";

export const ROUTE = {
  /** Letak lampion di layar gallery (NDC, −1 = tepi bawah): pita lanskap di antara tepi bawah kartu dan label bab. */
  knotY: -0.72,
  /** Lampion dijaga di tengah alur: paling jauh sekian × setengah lebar sungai dari garis tengah. */
  keep: 0.42,
  /** Perahu berlabuh sekian m dari lampion, ke arah kamera (sisi dekat sungai). */
  berth: 0.55,
  /** Titik contoh per bentang jalur perahu. */
  perSpan: 16,
  /** Jalur perahu sebelum lampion pertama dan sesudah lampion terakhir, × jarak rata-rata antar lampion. */
  tail: 1.1,
  /** Perjalanan memudar masuk/keluar selama sekian slide di tepi rentang tampaknya. */
  fade: 0.5,
} as const;

/** Satu hari: jalur perahu, panjang busur tiap titiknya, lampion tempat singgah, dan titik kunci kemajuan. */
export type Route = Readonly<{
  id: string;
  /** Jalur perahu di muka air (dunia). */
  points: readonly Vec3[];
  /** Panjang busur 0–1 tiap titik (0 = hulu, 1 = hilir). */
  at: readonly number[];
  /** Lampion: letak di muka air, panjang busur jalur perahu saat berlabuh di sampingnya, dan indeks slide panelnya. */
  knots: readonly Readonly<{ pos: Vec3; at: number; slide: number }>[];
  /** Titik kunci: [letak film (indeks slide pecahan), panjang jalur yang sudah ditempuh 0–1], urut menurut letak film. */
  keys: readonly (readonly [number, number])[];
  /** Rentang letak film tempat perjalanan tampak penuh; di luarnya memudar selama `ROUTE.fade` slide. */
  span: readonly [number, number];
}>;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** Titik sinar (`origin` + t·`dir`) di bidang datar y = `level`, atau null bila sinar tidak turun ke sana. */
export function planeHit(origin: Vec3, dir: Vec3, level: number): Vec3 | null {
  if (dir[1] >= -1e-6) return null;
  const t = (level - origin[1]) / dir[1];
  return t > 0 ? add(origin, scale(dir, t)) : null;
}

/** Catmull-Rom seragam di antara p1 dan p2. */
function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
}

/** Kurva halus melewati `ctrl`, `per` titik contoh per bentang; mengembalikan titik dan indeks titik tiap titik kendali. */
export function spline(ctrl: readonly Vec3[], per: number): { points: Vec3[]; marks: number[] } {
  const points: Vec3[] = [];
  const marks: number[] = [];
  const at = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    marks.push(points.length);
    for (let j = 0; j < per; j++) points.push(catmull(at(i - 1), at(i), at(i + 1), at(i + 2), j / per));
  }
  marks.push(points.length);
  points.push([...ctrl[ctrl.length - 1]!] as Vec3);
  return { points, marks };
}

/** Panjang busur ternormalisasi tiap titik. */
export function arcLengths(points: readonly Vec3[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + len(sub(points[i]!, points[i - 1]!)));
  const total = out[out.length - 1]! || 1;
  return out.map((d) => d / total);
}

/** Titik di sepanjang jalur pada panjang busur `s` (0–1), di antara dua titik contoh. */
export function pointAt(route: Pick<Route, "points" | "at">, s: number): Vec3 {
  const { points, at } = route;
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

/** Titik garis tengah sungai terdekat dari (x, z) beserta arah alirannya (ke hilir), atau null bila jauh dari sungai. */
function riverAt(x: number, z: number, line: RiverLine): { center: Vec3; along: Vec3; half: number } | null {
  const n = nearestRiver(x, z, line);
  if (!n) return null;
  const { points } = line;
  const [a, b] = [points[n.i]!, points[n.i + 1]!];
  const center: Vec3 = [a[0] + (b[0] - a[0]) * n.t, n.level, a[1] + (b[1] - a[1]) * n.t];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { center, along: [(b[0] - a[0]) / l, 0, (b[1] - a[1]) / l], half: n.half };
}

/**
 * Jari-jari busur sungai untuk bentuk layar `frame`: tempat titik layar lampion (tengah, `ROUTE.knotY`) dari kamera
 * gallery di tengah hari menyentuh muka air. Jadi sungai selalu tepat di pita di bawah kartu (layar lebar ±15,5 m,
 * HP tegak ±12 m dari pendapa). Dibulatkan 10 cm supaya tanah tidak dibangun ulang untuk perubahan kecil.
 */
export function riverRing(frame: Frame): number {
  const shot = galleryShot(0.5, frame);
  const ray = rayThrough(shot, frame.aspect, 0, ROUTE.knotY);
  let ring: number = RIVER.ring;
  for (let i = 0; i < 4; i++) {
    const hit = planeHit(shot.pos, ray, arcLevel(ring));
    if (!hit) return RIVER.ring;
    ring = Math.max(9.5, Math.min(24, Math.hypot(hit[0], hit[2])));
  }
  return Math.round(ring * 10) / 10;
}

/**
 * Perjalanan tiap bab hari: satu lampion per panel, perahu hanyut dari intro hari sampai sesudah panel terakhir.
 * Bab tanpa panel tidak punya perjalanan. `ring` = jari-jari busur sungai (bawaan: dari bentuk layar).
 */
export function larungRoutes(film: Film, frame: Frame, ring: number = riverRing(frame)): Route[] {
  const line = riverLine(ring);
  const level = arcLevel(ring);
  const out: Route[] = [];
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
    const lamps: Vec3[] = [];
    const berths: Vec3[] = [];
    const flows: Vec3[] = [];
    for (const i of panels) {
      const shot = galleryShot(galleryDrift(film.slides[i]), frame);
      const ray = rayThrough(shot, frame.aspect, 0, ROUTE.knotY);
      const hit = planeHit(shot.pos, ray, level);
      const river = hit && riverAt(hit[0], hit[2], line);
      if (!hit || !river) break;
      // tetap di tengah alur: bila terlalu jauh dari garis tengah, lampion digeser maju/mundur di sepanjang arah
      // pandang kamera (mendatar), jadi tetap tepat di kolom tengah layar, di bawah kartu
      const flat = Math.hypot(ray[0], ray[2]) || 1;
      const dir: Vec3 = [ray[0] / flat, 0, ray[2] / flat];
      let lamp = hit;
      // alur melengkung: koreksi diulang beberapa kali sampai tepat
      for (let k = 0; k < 4; k++) {
        const r = riverAt(lamp[0], lamp[2], line) ?? river;
        const across: Vec3 = [-r.along[2], 0, r.along[0]];
        const keep = ROUTE.keep * r.half;
        const w0 = (lamp[0] - r.center[0]) * across[0] + (lamp[2] - r.center[2]) * across[2];
        const lean = dir[0] * across[0] + dir[2] * across[2];
        if (Math.abs(w0) <= keep || Math.abs(lean) < 0.05) break;
        lamp = add(lamp, scale(dir, (Math.sign(w0) * keep * 0.999 - w0) / lean));
      }
      // perahu berlabuh di sisi dekat lampion (ke arah kamera, mendatar)
      const toCam = sub([shot.pos[0], lamp[1], shot.pos[2]], lamp);
      lamps.push(lamp);
      berths.push(add(lamp, scale(toCam, ROUTE.berth / (len(toCam) || 1))));
      flows.push(river.along);
    }
    if (lamps.length !== panels.length) continue;
    const gap = berths.length > 1 ? len(sub(berths[berths.length - 1]!, berths[0]!)) / (berths.length - 1) : 1.6;
    const ctrl: Vec3[] = [sub(berths[0]!, scale(flows[0]!, gap * ROUTE.tail)), ...berths, add(berths[berths.length - 1]!, scale(flows[flows.length - 1]!, gap * ROUTE.tail))];
    const { points, marks } = spline(ctrl, ROUTE.perSpan);
    const at = arcLengths(points);
    // tempat berlabuh ke-j ada di titik kendali ke-(1 + j)
    const knotAt = berths.map((_, j) => at[marks[1 + j]!]!);
    const lastPanel = panels[panels.length - 1]!;
    const keys: (readonly [number, number])[] = [];
    if (intro >= 0) keys.push([intro, 0]);
    panels.forEach((i, j) => keys.push([i, knotAt[j]!]));
    keys.push([lastPanel + 1, 1]);
    out.push({
      id: chapter.id,
      points,
      at,
      knots: lamps.map((pos, j) => ({ pos, at: knotAt[j]!, slide: panels[j]! })),
      keys,
      span: [intro >= 0 ? intro : panels[0]!, lastPanel],
    });
  }
  return out;
}

/** Letak film sebagai indeks slide pecahan: `from` saat diam, bergerak ke `to` selama transisi. */
export const filmPosition = (c: Cursor) => (c.to === c.from ? c.from : c.from + (c.to - c.from) * Math.max(0, Math.min(1, c.p)));

/** Panjang jalur yang sudah ditempuh (0–1) pada letak film `f`: linear di antara titik kunci, ditahan di luar. */
export function drawnAt(route: Route, f: number): number {
  const k = route.keys;
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

/** Kadar tampak (0–1) pada letak film `f`: penuh di dalam `span`, memudar selama `ROUTE.fade` slide di luarnya. */
export function shownAt(route: Route, f: number): number {
  const [a, b] = route.span;
  const out = f < a ? a - f : f > b ? f - b : 0;
  const t = Math.max(0, 1 - out / ROUTE.fade);
  return t * t * (3 - 2 * t);
}

/** Panjang busur lampion panel yang sedang tampil (slide terdekat dengan letak film `f`), atau −1 bila bukan panel hari ini. */
export function currentKnot(route: Route, f: number): number {
  const near = Math.round(f);
  return route.knots.find((k) => k.slide === near)?.at ?? -1;
}
