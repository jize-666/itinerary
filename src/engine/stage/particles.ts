/**
 * Partikel per fase (Tugas 8.4, arahan host 18 Nov: "dah gw merge, lanjut 8.4"). Murni.
 *
 * Satu sistem titik di panggung 3D (stage3d/dust.ts, satu draw call) berisi empat jenis butir. Kadar tampak tiap jenis
 * diturunkan dari bobot fase langit yang sama dengan grading warna (`phaseWeights` di grade.ts), jadi partikel ikut
 * jam tiap slide dan bergeser mulus mengikuti gulir:
 * - debu lampu: debu emas di udara pendapa, terang di dekat blencong (gerbang dan malam);
 * - embun: butir sejuk yang melayang rendah di atas sawah dan berkilau saat kena cahaya (subuh);
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
 * Sebaran tiap jenis di sekitar pendapa (meter): cincin jari-jari `r` (luas merata) dan tinggi di atas tanah atau
 * muka air. Lanskap gallery dipandang dari tepi belakang pendapa ke sawah dan Bengawan Solo (±15 m), jadi embun
 * tersebar sampai 18 m dan kunang-kunang sampai 24 m; sebagian kunang-kunang di halaman pendapa supaya tampak juga di
 * prolog dan gong.
 */
export const SPREAD: Readonly<Record<Exclude<ParticleKind, "lamp">, { r: readonly [number, number]; h: readonly [number, number] }>> = {
  dew: { r: [4, 18], h: [0.05, 0.8] },
  // debu emas tinggi dan dekat, supaya banyak yang tampak di depan langit (kilau ke arah matahari)
  motes: { r: [2.5, 14], h: [0.6, 7] },
  fireflies: { r: [4, 24], h: [0.25, 1.6] },
};
/** Bagian kunang-kunang yang berada di halaman pendapa (jari-jari `YARD`). */
export const YARD = { share: 0.3, r: [2.6, 6.5] as const };

export type Ground = (x: number, z: number) => number;

/**
 * Letak dasar satu butir (dunia, meter) dari empat benih 0–1. Debu lampu tidak memakai letak dasar (geraknya di
 * kotak udara pendapa, dihitung shader dari benih), jadi untuknya hasilnya titik asal.
 */
export function placeParticle(kind: ParticleKind, seed: readonly [number, number, number, number], ground: Ground): [number, number, number] {
  if (kind === "lamp") return [0, 0, 0];
  const [a, b, c, d] = seed;
  const near = kind === "fireflies" && d < YARD.share;
  const [r0, r1] = near ? YARD.r : SPREAD[kind].r;
  const r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * a);
  const th = b * Math.PI * 2;
  const x = Math.sin(th) * r;
  const z = -Math.cos(th) * r;
  const [h0, h1] = SPREAD[kind].h;
  return [x, ground(x, z) + h0 + (h1 - h0) * c, z];
}
