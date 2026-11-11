/**
 * Langit dan matahari film sebagai fungsi jam (murni, tanpa DOM).
 *
 * Tiap panel gallery membawa jam stop-nya (`clock`) dan cahaya hari itu (`light`: terbit, terbenam, kapan
 * matahari mulai tampak). Dari situ dihitung satu keadaan langit: kadar tiap lapisan warna dan letak matahari.
 * Perpindahan antar panel = perjalanan jam dari stop asal ke stop tujuan, dicuplik jadi titik kunci untuk
 * `Timeline`, sehingga matahari ikut bergerak selama slide bergerak (scrub jari maupun transisi penuh) dan
 * berhenti ketika slide berhenti.
 *
 * Lapisan bertumpuk dari bawah: malam (selalu penuh), subuh, siang, senja, [matahari], gerbang. Yang dianimasikan
 * hanya opacity & transform (aturan performa film).
 */
import { SKY } from "@/engine/motion/tokens";
import type { DayView, Phase, StopView } from "@/lib/trip";

export type Sky = "gate" | Phase;

/** Cahaya satu hari, menit sejak 00:00. Matahari tak tampak sampai `sunFrom` (sarapan), tampak penuh di `sunFull`. */
export type DayLight = Readonly<{ sunrise: number; sunset: number; sunFrom: number; sunFull: number }>;

/**
 * Matahari di dalam bingkai lintasannya (ukuran bingkai diatur CSS, `.fl-sunbox`):
 * `u` 0 = ujung timur (terbit) … 1 = ujung barat (terbenam); `v` 0 = puncak busur … 1 = garis cakrawala.
 * `warm` 0 = putih siang … 1 = jingga di cakrawala.
 */
export type SunState = Readonly<{ u: number; v: number; opacity: number; warm: number; scale: number }>;
export type SkyState = Readonly<{ dawn: number; day: number; dusk: number; gate: number; sun: SunState }>;
/** Lapisan yang kadarnya berubah-ubah, urut dari bawah ke atas (malam di dasar selalu penuh). */
export const SKY_LAYERS = ["dawn", "day", "dusk", "gate"] as const;
export type SkyLayer = (typeof SKY_LAYERS)[number];

/** Bagian slide yang menentukan langitnya. */
export type Lit = { sky: Sky; clock?: number; light?: DayLight };
/** Titik kunci: [posisi 0–1 dalam transisi, keadaan langit]. */
export type SkyKey = readonly [at: number, state: SkyState];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round = (n: number) => Math.round(n * 10000) / 10000;

/** "07:30" → 450; bukan jam yang sah → null. */
export function minutesOf(hhmm: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/**
 * Cahaya satu hari dari data: jam terbit/terbenam + kapan matahari mulai tampak.
 * Permintaan host (audit 11 Nov): matahari muncul perlahan mulai dari jadwal pertama setelah sarapan. Sarapan =
 * panel makan pertama hari itu yang mulai pagi; matahari belum tampak sampai jam itu dan tampak penuh di panel
 * berikutnya. Hari tanpa sarapan di data: mengikuti jam terbit. Hari tanpa jam terbit/terbenam: null (langit
 * memakai fase stop seperti sebelumnya).
 */
export function dayLight(day: Pick<DayView, "sunrise" | "sunset">, panels: readonly Pick<StopView, "start" | "kind">[]): DayLight | null {
  const sunrise = minutesOf(day.sunrise);
  const sunset = minutesOf(day.sunset);
  if (sunrise === null || sunset === null || sunset <= sunrise) return null;
  const starts = panels.map((s) => minutesOf(s.start));
  const at = panels.findIndex((s, i) => s.kind === "food" && starts[i] !== null && starts[i]! < SKY.breakfastBefore);
  const breakfast = at < 0 ? null : starts[at]!;
  const sunFrom = Math.max(sunrise, breakfast ?? sunrise);
  const next = at < 0 ? null : (starts.slice(at + 1).find((t): t is number => t !== null && t > sunFrom) ?? null);
  return { sunrise, sunset, sunFrom, sunFull: next ?? sunFrom + SKY.sunAppear };
}

type Knot = readonly [t: number, dawn: number, day: number, dusk: number];
/**
 * Kadar lapisan sepanjang hari, linear di antara titik-titik ini. Lapisan yang tertutup lapisan penuh di atasnya
 * diturunkan ke 0 selagi tertutup (subuh di bawah siang, siang di bawah senja), jadi tidak pernah ada lompatan.
 */
function layerKnots({ sunrise: r, sunset: s }: DayLight): Knot[] {
  const knots: [number, number, number, number][] = [
    [r - SKY.dawnLead, 0, 0, 0],
    [r - SKY.dawnFull, 1, 0, 0],
    [r + SKY.dawnHold, 1, 0, 0],
    [r + SKY.dayFull, 1, 1, 0],
    [s - SKY.duskLead, 0, 1, 0],
    [s - SKY.duskFull, 0, 1, 1],
    [s + SKY.duskHold, 0, 0, 1],
    [s + SKY.nightFull, 0, 0, 0],
  ];
  // hari sangat pendek: jaga urutan waktu
  for (let i = 1; i < knots.length; i++) knots[i]![0] = Math.max(knots[i]![0], knots[i - 1]![0]);
  return knots;
}

function layersAt(t: number, light: DayLight): Pick<SkyState, "dawn" | "day" | "dusk"> {
  const knots = layerKnots(light);
  let prev: Knot | null = null;
  for (const k of knots) {
    if (t <= k[0]) {
      if (!prev || k[0] === prev[0]) return prev ? { dawn: k[1], day: k[2], dusk: k[3] } : { dawn: 0, day: 0, dusk: 0 };
      const w = (t - prev[0]) / (k[0] - prev[0]);
      const mix = (a: number, b: number) => round(a + (b - a) * w);
      return { dawn: mix(prev[1], k[1]), day: mix(prev[2], k[2]), dusk: mix(prev[3], k[3]) };
    }
    prev = k;
  }
  return { dawn: 0, day: 0, dusk: 0 };
}

function sunAt(t: number, { sunrise, sunset, sunFrom, sunFull }: DayLight): SunState {
  const f = clamp01((t - sunrise) / (sunset - sunrise));
  const height = Math.sin(Math.PI * f);
  const appear = clamp01((t - sunFrom) / Math.max(1, sunFull - sunFrom));
  const set = clamp01((sunset + SKY.sunsetLag - t) / (SKY.sunsetLead + SKY.sunsetLag));
  const warm = clamp01((SKY.warmBelow - height) / SKY.warmBelow);
  return { u: round(f), v: round(1 - height), opacity: round(Math.min(appear, set)), warm: round(warm), scale: round(1 + SKY.sunSwell * warm) };
}

/** Langit pada jam `t` (menit sejak 00:00). */
export function skyAt(t: number, light: DayLight): SkyState {
  return { ...layersAt(t, light), gate: 0, sun: sunAt(t, light) };
}

const HIDDEN: SunState = { u: 0.5, v: 1, opacity: 0, warm: 0, scale: 1 };
/** Langit slide tanpa jam (prolog, judul, gong, kartu kedatangan…): satu lapisan penuh. */
export const STILL: Readonly<Record<Sky, SkyState>> = {
  gate: { dawn: 0, day: 0, dusk: 0, gate: 1, sun: HIDDEN },
  night: { dawn: 0, day: 0, dusk: 0, gate: 0, sun: HIDDEN },
  dawn: { dawn: 1, day: 0, dusk: 0, gate: 0, sun: HIDDEN },
  day: { dawn: 0, day: 1, dusk: 0, gate: 0, sun: { u: SKY.stillSun, v: round(1 - Math.sin(Math.PI * SKY.stillSun)), opacity: 1, warm: 0, scale: 1 } },
  dusk: { dawn: 0, day: 0, dusk: 1, gate: 0, sun: HIDDEN },
};

const timed = (s: Lit): s is Lit & { clock: number; light: DayLight } => s.clock !== undefined && s.light !== undefined;
const sameLight = (a: DayLight, b: DayLight) => a.sunrise === b.sunrise && a.sunset === b.sunset && a.sunFrom === b.sunFrom && a.sunFull === b.sunFull;

/** Langit saat slide ini diam. */
export const skyState = (s: Lit): SkyState => (timed(s) ? skyAt(s.clock, s.light) : STILL[s.sky]);

/**
 * Apa yang tidak terlihat di satu ujung meminjam nilai ujung seberangnya, supaya yang tampak hanyalah satu
 * crossfade bersih: lapisan di bawah lapisan penuh tidak ikut berkedip, dan matahari yang sedang tak tampak
 * muncul/hilang di tempat, tidak meluncur melintasi layar.
 */
function reconcile(a: SkyState, b: SkyState): [SkyState, SkyState] {
  type Draft = { -readonly [K in keyof SkyState]: SkyState[K] };
  const from: Draft = { ...a };
  const to: Draft = { ...b };
  /** Lapisan di bawah lapisan penuh teratas: tak terlihat. */
  const covered = (s: SkyState) => {
    const top = SKY_LAYERS.findLastIndex((k) => s[k] === 1);
    return new Set<SkyLayer>(top > 0 ? SKY_LAYERS.slice(0, top) : []);
  };
  const [ca, cb] = [covered(a), covered(b)];
  for (const k of SKY_LAYERS) {
    if (ca.has(k)) from[k] = b[k];
    else if (cb.has(k)) to[k] = a[k];
  }
  const [ha, hb] = [a.gate === 1, b.gate === 1];
  if (ha && hb) to.sun = from.sun;
  else if (ha) from.sun = b.sun;
  else if (hb) to.sun = a.sun;
  else if (a.sun.opacity === 0 && b.sun.opacity === 0) to.sun = from.sun;
  else if (a.sun.opacity === 0) from.sun = { ...b.sun, opacity: 0 };
  else if (b.sun.opacity === 0) to.sun = { ...a.sun, opacity: 0 };
  return [from, to];
}

/**
 * Yang sepanjang lintasan tertutup lapisan penuh di atasnya, jadi tidak perlu digambar sama sekali
 * (tanpa GPU, tiap lapisan selayar yang ikut dikomposisi memakan waktu frame). Matahari hanya tertutup gerbang.
 */
export function skyCovered(keys: readonly SkyKey[]): ReadonlySet<"night" | "sun" | SkyLayer> {
  const out = new Set<"night" | "sun" | SkyLayer>();
  // per ruas antara dua titik kunci: lapisan teratas yang penuh di kedua ujungnya (di antaranya linear, jadi tetap penuh)
  let top: number = SKY_LAYERS.length;
  for (let i = 0; i < Math.max(1, keys.length - 1); i++) {
    const a = keys[i]?.[1];
    const b = keys[i + 1]?.[1] ?? a;
    top = Math.min(top, a && b ? SKY_LAYERS.findLastIndex((k) => a[k] === 1 && b[k] === 1) : -1);
  }
  if (top < 0) return out;
  out.add("night");
  for (const k of SKY_LAYERS.slice(0, top)) out.add(k);
  if (SKY_LAYERS[top] === "gate") out.add("sun");
  return out;
}

/**
 * Lintasan langit dari slide `a` ke `b`. Dua panel di hari yang sama: jam berjalan linear dari stop asal ke stop
 * tujuan, dicuplik di tiap titik belok kadar lapisan + `SKY.samples` cuplikan busur. Selain itu: satu crossfade.
 */
export function skyPath(a: Lit, b: Lit): SkyKey[] {
  if (!timed(a) || !timed(b) || !sameLight(a.light, b.light)) {
    const [from, to] = reconcile(skyState(a), skyState(b));
    return [
      [0, from],
      [1, to],
    ];
  }
  const light = a.light;
  const [ta, tb] = [a.clock, b.clock];
  if (ta === tb) return [[0, skyAt(ta, light)]];
  const lo = Math.min(ta, tb);
  const hi = Math.max(ta, tb);
  const times = new Set<number>([ta, tb]);
  const bends = [...layerKnots(light).map((k) => k[0]), light.sunrise, light.sunFrom, light.sunFull, light.sunset - SKY.sunsetLead, light.sunset + SKY.sunsetLag];
  for (const t of bends) if (t > lo && t < hi) times.add(t);
  for (let i = 1; i < SKY.samples; i++) times.add(ta + ((tb - ta) * i) / SKY.samples);
  return [...times]
    .map((t) => [round((t - ta) / (tb - ta)), skyAt(t, light)] as const)
    .sort((m, n) => m[0] - n[0]);
}
