import type { Film, Slide } from "@/engine/slides/build-slides";
import type { Cursor } from "@/engine/stage/cue";
import { clamp, groundY, meshY, type Ground, mix, SITE, type Site, smooth, world } from "./ground";

type Mark = { site: Site; dx: number; back: number; height: number; pitch: number; yaw: number };
const mark = (site: Site, dx: number, back: number, height: number, pitch: number, yaw: number): Mark => ({
  site,
  dx,
  back,
  height,
  pitch,
  yaw,
});
// Slightly off-axis architectural portraits leave room for the centred DOM gallery cards.
export const marks = [
  mark([-7.613, 111.067], 0, 6, 6, -3, -4),
  mark(SITE.tea, 1.5, 4, 1.65, -5, -8),
  mark(SITE.house, 1.1, 6.5, 1.72, -6, -5),
  mark(SITE.gate, 1.05, 7.1, 2.4, -9, -5),
  mark(SITE.pyramid, -1.25, 8.35, 2.85, -9, 4),
  mark([-7.647, 111.122], 0, 4, 3.5, -5, 1),
  mark(SITE.town, -0.3, 5, 2.5, -4, -3),
  mark(SITE.falls, -1.5, 13, 3.65, 1, 1),
  mark([-7.661, 111.099], 1, 4, 12, 0, 4),
  mark([-7.64, 111.052], 0, 3, 8, 0, 4),
  mark([-7.64, 111.048], 0, 3, 7.4, 1, 2),
] as const;
const stopIds = [
  "depart-lawu",
  "kemuning-sunrise",
  "tea-house",
  "candi-cetho",
  "candi-sukuh",
  "friday-prayer",
  "tawangmangu-lunch",
  "grojogan-sewu",
  "rest-2",
  "selat-solo",
  "movie-night",
];
export const hasWorld = (s?: Slide) => s?.theme === "lawu" && (s.kind === "dayintro" || s.kind === "panel");
export function journeyIndex(s: Slide) {
  if (s.kind !== "panel") return 0;
  const i = stopIds.indexOf(s.stop.id);
  return i >= 0 ? i : s.of > 1 ? ((s.n - 1) / (s.of - 1)) * 10 : 1;
}
export function travel(film: Film, c: Cursor) {
  const a = film.slides[c.from],
    b = film.slides[c.to];
  if (!a || !b) return null;
  const av = hasWorld(a),
    bv = hasWorld(b);
  if (!av && !bv) return null;
  const p = clamp(c.p),
    ai = journeyIndex(av ? a : b),
    bi = journeyIndex(bv ? b : a);
  const minutes = (s: Slide, fallback: number) =>
    s.clock ??
    (s.kind === "panel" && s.stop.start
      ? Number(s.stop.start.slice(0, 2)) * 60 + Number(s.stop.start.slice(3, 5))
      : fallback);
  const ac = minutes(av ? a : b, 240),
    bc = minutes(bv ? b : a, ac);
  const count = (s: Slide) => (s.kind === "panel" ? s.n : 0);
  return {
    index: mix(ai, bi, p),
    minute: mix(ac, bc, p),
    amount: av && bv ? 1 : av ? 1 - p : p,
    passed: mix(count(av ? a : b), count(bv ? b : a), p),
  };
}
export function cameraAt(g: Ground, index: number, aspect = 1, look = { x: 0, y: 0 }, stride = 6.5) {
  const v = clamp(index, 0, 10),
    i = Math.min(9, Math.floor(v)),
    p = smooth(v - i);
  const a = marks[i]!,
    b = marks[i + 1]!,
    u = world(a.site),
    w = world(b.site);
  const arc = Math.sin(Math.PI * p) ** 2,
    extent = Math.hypot(u.x - w.x, u.z - w.z);
  const mobile = aspect < 1 ? 1.18 : 1;
  const x = mix(u.x + a.dx, w.x + b.dx, p) + Math.min(5, extent * 0.035) * arc + look.x * 0.33;
  const z = mix(u.z + a.back * mobile, w.z + b.back * mobile, p) - 1.15 * arc;
  const ground = Math.max(groundY(g, x, z), meshY(g, x, z, stride));
  const ay = groundY(g, u.x, u.z),
    by = groundY(g, w.x, w.z);
  const y = Math.max(ground + 1.2, mix(ay + a.height, by + b.height, p) + Math.min(16, extent * 0.12) * arc) - look.y * 0.13;
  return {
    x,
    y,
    z,
    pitch: mix(a.pitch, b.pitch, p) - look.y * 0.48,
    yaw: mix(a.yaw, b.yaw, p) - look.x * 0.65,
    fov: mix(48, 52, arc) + (aspect < 1 ? 4 : 0),
  };
}
