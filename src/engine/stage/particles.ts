/**
 * Partikel per fase (Tugas 8.4, arahan host 18 Nov: "dah gw merge, lanjut 8.4"). Murni.
 *
 * Satu sistem titik di panggung 3D (stage3d/dust.ts, satu draw call) berisi empat jenis butir. Kadar tampak tiap jenis
 * diturunkan dari bobot fase langit yang sama dengan grading warna (`phaseWeights` di grade.ts), jadi partikel ikut
 * jam tiap slide dan bergeser mulus mengikuti gulir:
 * - debu lampu: debu emas di udara pendapa, terang di dekat blencong (gerbang dan malam);
 * - embun: butir sejuk yang melayang rendah di udara dan berkilau memantulkan langit subuh (subuh);
 * - debu emas siang: butir di udara yang berkilau saat memandang ke arah matahari, menjingga saat senja (siang, senja);
 * - kunang-kunang: titik kuning kehijauan yang berkedip dan mengembara rendah di atas sawah dan tepi sungai (malam,
 *   mulai muncul di akhir senja, sedikit di malam gerbang).
 * Butir adalah titik di dunia, jadi kamera parallax, perspective shift, dan kedalaman ikut gulir berlaku tanpa kode
 * tambahan (aturan host 13 Nov).
 */
import type { SkyState } from "@/engine/slides/sky";
import { type GradePhase, phaseWeights } from "./grade";

export const KINDS = ["lamp", "dew", "motes", "fireflies"] as const;
export type ParticleKind = (typeof KINDS)[number];

/** Bagian tiap jenis dari seluruh butir (jumlahnya 1). */
export const SHARE: Readonly<Record<ParticleKind, number>> = { lamp: 0.34, dew: 0.26, motes: 0.26, fireflies: 0.14 };

/** Kadar tampak tiap jenis di tiap fase (0–1). */
export const BY_PHASE: Readonly<Record<GradePhase, Readonly<Record<ParticleKind, number>>>> = {
  night: { lamp: 0.55, dew: 0, motes: 0, fireflies: 1 },
  dawn: { lamp: 0.15, dew: 1, motes: 0.12, fireflies: 0.08 },
  day: { lamp: 0, dew: 0, motes: 1, fireflies: 0 },
  dusk: { lamp: 0.25, dew: 0, motes: 0.8, fireflies: 0.35 },
  gate: { lamp: 1, dew: 0, motes: 0, fireflies: 0.45 },
};

export type ParticleMix = Readonly<Record<ParticleKind, number>>;

/** Kadar tampak tiap jenis untuk satu keadaan langit: campuran `BY_PHASE` menurut bobot fase. */
export function particleMix(s: SkyState): ParticleMix {
  const w = phaseWeights(s);
  const out = { lamp: 0, dew: 0, motes: 0, fireflies: 0 };
  for (const phase of Object.keys(w) as GradePhase[]) {
    for (const k of KINDS) out[k] += w[phase] * BY_PHASE[phase][k];
  }
  return out;
}

/** Jenis butir ke-`i` dari `count`: urut per jenis menurut `SHARE` (debu lampu dulu, kunang-kunang terakhir). */
export function kindOf(i: number, count: number): ParticleKind {
  const f = (i + 0.5) / Math.max(1, count);
  let edge = 0;
  for (const k of KINDS) {
    edge += SHARE[k];
    if (f < edge) return k;
  }
  return "fireflies";
}

/** Indeks jenis untuk shader (0 lampu, 1 embun, 2 debu siang, 3 kunang-kunang). */
export const kindIndex = (k: ParticleKind) => KINDS.indexOf(k);

/**
 * Kunang-kunang tersebar di cincin sekitar pendapa (meter, luas merata), melayang di atas tanah atau muka air.
 * Lanskap gallery dipandang dari tepi belakang pendapa ke sawah dan Bengawan Solo (±15 m), jadi sebarannya sampai
 * 24 m; sebagian di halaman pendapa (`YARD`) supaya tampak juga di prolog dan gong.
 */
export const SPREAD = { fireflies: { r: [4, 24] as const, h: [0.25, 1.6] as const } };
/** Bagian kunang-kunang yang berada di halaman pendapa (jari-jari `YARD`). */
export const YARD = { share: 0.3, r: [2.6, 6.5] as const };

/**
 * Embun dan debu emas mengisi ruang udara yang mengikuti kamera (cara salju dan debu di gim): letak tiap butir tetap
 * di dunia, dibungkus ke dalam kotak `box` (meter) yang berpusat `ahead` m di depan kamera dan `lift` m di atas atau
 * di bawah matanya. Kamera yang bergeser tidak menggeser butir (parallax dan kedalaman ikut gulir tetap benar), dan
 * di slide mana pun selalu ada butir di depan lensa. Butir dekat tampak sebagai cakram lembut (bokeh), butir jauh
 * sebagai kilau kecil. Tepi kotak memudar (`edge`) supaya butir yang terbungkus tidak muncul tiba-tiba.
 * Percobaan pertama menebarnya jauh di sawah: di siang hari tertelan langit dan sawah yang terang, di subuh terlalu
 * redup. Percobaan kedua memusatkan kotak di kamera dengan embun di bawah mata: separuh butir di belakang lensa, dan
 * di pembuka hari (kamera mendongak) embun hampir tidak masuk layar. Embun kini setinggi mata, sedikit lebih rendah
 * dan lebih tipis dari debu emas.
 */
export const NEAR = {
  dew: { box: [9, 3, 9] as const, ahead: 3, lift: -0.3 },
  motes: { box: [14, 7, 14] as const, ahead: 4.5, lift: 0.6 },
  edge: 0.75,
};

export type Ground = (x: number, z: number) => number;

/**
 * Letak dasar satu butir (dunia, meter) dari empat benih 0–1. Hanya kunang-kunang yang punya letak dasar di lanskap;
 * debu lampu (kotak udara pendapa) dan embun serta debu emas (ruang udara yang mengikuti kamera, `NEAR`) dihitung
 * shader dari benih, jadi untuk ketiganya hasilnya titik asal.
 */
export function placeParticle(kind: ParticleKind, seed: readonly [number, number, number, number], ground: Ground): [number, number, number] {
  if (kind !== "fireflies") return [0, 0, 0];
  const [a, b, c, d] = seed;
  const [r0, r1] = d < YARD.share ? YARD.r : SPREAD.fireflies.r;
  const r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * a);
  const th = b * Math.PI * 2;
  const x = Math.sin(th) * r;
  const z = -Math.cos(th) * r;
  const [h0, h1] = SPREAD.fireflies.h;
  return [x, ground(x, z) + h0 + (h1 - h0) * c, z];
}
