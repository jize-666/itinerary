/**
 * Grading warna panggung 3D per fase (Tugas 8.2 + 8.3, arahan host 18 Nov: "kerjakan tugas 8.2 + 8.3 dulu"). Murni.
 *
 * Satu sumber dengan langit dan cahaya (`moodOf` di mood.ts): kadar lapisan subuh/siang/senja/gerbang dari `SkyState`
 * yang sama, ditumpuk dengan urutan yang sama (malam di dasar, lalu subuh, siang, senja, gerbang). Karena `SkyState`
 * sudah dicampur mulus sepanjang transisi (`skyAlong`), grading ikut bergeser mengikuti gulir tanpa lompatan, di semua
 * slide 3D: prolog dan judul (gerbang), malam (intro, gong penutup, epilog), subuh (pembuka hari), dan gallery
 * (mengikuti jam tiap tempat singgah).
 *
 * Grading bekerja pada nilai yang tampak di layar (sesudah tone mapping ACES dan encode sRGB) di pass FINAL post.ts.
 * Sebelum encode, geseran kecil di nada gelap ikut dibesarkan kurva gamma (rona bayangan +0,018 menjadi ±45/255):
 * percobaan pertama 18 Nov membuat malam terlalu biru dan gerbang ikut kebiruan, jadi dipindah ke sesudah encode.
 * Rumusnya:
 *   c = pow(max(c × slope + offset, 0), power)          (gaya ASC CDL, per kanal)
 *   c = luma + (c − luma) × sat                           (saturasi di sekitar luma Rec.709)
 *   c += shadow × (1 − smoothstep(0, 0.5, luma)) + high × smoothstep(0.5, 1, luma)   (split toning)
 * `applyGrade` di bawah adalah cermin JS rumus itu untuk tes.
 *
 * Aturan host "beban hemat tapi jangan turunkan kualitas": hanya beberapa baris di pass FINAL yang sudah ada (tanpa
 * pass atau target baru), dan tiap fase menjaga abu tengah tampilan (0,46) dalam ±12 % supaya gambar tidak tergencet.
 */
import type { SkyState } from "@/engine/slides/sky";
import type { RGB } from "./mood";

export type Grade = Readonly<{
  slope: RGB;
  offset: RGB;
  power: RGB;
  sat: number;
  /** Rona bayangan dan sorotan (split toning), ditambahkan di ruang tampilan. */
  shadow: RGB;
  high: RGB;
}>;

export type GradePhase = "night" | "dawn" | "day" | "dusk" | "gate";

export const NEUTRAL: Grade = { slope: [1, 1, 1], offset: [0, 0, 0], power: [1, 1, 1], sat: 1, shadow: [0, 0, 0], high: [0, 0, 0] };

/**
 * Rupa tiap fase. Arah warnanya mengikuti langit film (mood.ts / film.css):
 * - malam: bayangan biru tua, hitam sedikit terangkat ke biru, warna agak redup;
 * - subuh: bayangan ungu kemerahan, sorotan persik;
 * - siang: netral dan cerah, sedikit lebih kontras dan jenuh, bayangan sejuk, sorotan hangat tipis;
 * - senja: sorotan jingga keemasan, bayangan ungu, lebih jenuh;
 * - gerbang (kelir dan blencong): hangat lampu minyak, bayangan dalam, warna sedikit ditahan.
 */
export const GRADE: Readonly<Record<GradePhase, Grade>> = {
  night: { slope: [0.95, 0.98, 1.07], offset: [0, 0.003, 0.012], power: [1.04, 1.02, 0.97], sat: 0.88, shadow: [0, 0.003, 0.016], high: [-0.004, 0, 0.012] },
  dawn: { slope: [1.05, 0.98, 1], offset: [0.008, 0, 0.01], power: [1, 1.02, 1], sat: 0.96, shadow: [0.014, 0, 0.018], high: [0.03, 0.012, 0] },
  day: { slope: [1.02, 1.02, 1], offset: [0, 0, 0.002], power: [1.05, 1.05, 1.05], sat: 1.08, shadow: [0, 0.004, 0.012], high: [0.012, 0.008, 0] },
  dusk: { slope: [1.08, 1, 0.9], offset: [0.006, 0, 0.008], power: [1, 1.02, 1.06], sat: 1.06, shadow: [0.016, 0, 0.02], high: [0.045, 0.02, -0.01] },
  gate: { slope: [1.06, 1, 0.92], offset: [0, 0, 0], power: [1.08, 1.08, 1.04], sat: 0.94, shadow: [0.006, 0.002, -0.004], high: [0.03, 0.014, 0] },
};

/** Sorotan menghangat saat matahari rendah (pagi dan sore), di atas rupa fasenya. */
const SUN_WARM: RGB = [0.03, 0.012, -0.012];

/**
 * Kekuatan grading terhadap netral (1 = rupa di atas). Satu angka untuk menyetel semuanya sesudah tinjauan host.
 */
export const GRADE_STRENGTH = 1;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Campur dua grading. */
export function mixGrade(a: Grade, b: Grade, t: number): Grade {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    slope: mix3(a.slope, b.slope, t),
    offset: mix3(a.offset, b.offset, t),
    power: mix3(a.power, b.power, t),
    sat: mix(a.sat, b.sat, t),
    shadow: mix3(a.shadow, b.shadow, t),
    high: mix3(a.high, b.high, t),
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Bobot nyata tiap fase dengan urutan tumpukan langit (malam di dasar, gerbang paling atas): lapisan atas menutup
 * yang di bawahnya. Jumlahnya selalu 1.
 */
export function phaseWeights(s: SkyState): Record<GradePhase, number> {
  const gate = clamp01(s.gate);
  const dusk = clamp01(s.dusk) * (1 - gate);
  const day = clamp01(s.day) * (1 - clamp01(s.dusk)) * (1 - gate);
  const dawn = clamp01(s.dawn) * (1 - clamp01(s.day)) * (1 - clamp01(s.dusk)) * (1 - gate);
  return { night: Math.max(0, 1 - gate - dusk - day - dawn), dawn, day, dusk, gate };
}

const ORDER: readonly GradePhase[] = ["night", "dawn", "day", "dusk", "gate"];

/** Fase yang paling kuat (untuk statistik panggung dan e2e). */
export function phaseOf(s: SkyState): GradePhase {
  const w = phaseWeights(s);
  return ORDER.reduce((best, p) => (w[p] > w[best] ? p : best), "night" as GradePhase);
}

/** Grading untuk satu keadaan langit: rupa fase ditumpuk seperti `moodOf`, ditambah hangat matahari rendah. */
export function gradeOf(s: SkyState): Grade {
  let g = GRADE.night;
  g = mixGrade(g, GRADE.dawn, clamp01(s.dawn));
  g = mixGrade(g, GRADE.day, clamp01(s.day));
  g = mixGrade(g, GRADE.dusk, clamp01(s.dusk));
  g = mixGrade(g, GRADE.gate, clamp01(s.gate));
  const warm = clamp01(s.sun.warm) * clamp01(s.sun.opacity) * (1 - clamp01(s.gate));
  if (warm > 0) g = { ...g, high: [g.high[0] + SUN_WARM[0] * warm, g.high[1] + SUN_WARM[1] * warm, g.high[2] + SUN_WARM[2] * warm] };
  return GRADE_STRENGTH === 1 ? g : mixGrade(NEUTRAL, g, GRADE_STRENGTH);
}

/** Luma Rec.709 (ruang tampilan). */
export const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Cermin JS rumus grading di shader FINAL (post.ts), untuk tes. Masukan dan keluaran: nilai tampilan sRGB 0–1. */
export function applyGrade(c: RGB, g: Grade): RGB {
  const cdl = [0, 1, 2].map((i) => Math.pow(Math.max(c[i]! * g.slope[i]! + g.offset[i]!, 0), g.power[i]!)) as unknown as RGB;
  const y = luma(cdl);
  const sat = cdl.map((v) => y + (v - y) * g.sat) as unknown as RGB;
  const lo = 1 - smooth(0, 0.5, y);
  const hi = smooth(0.5, 1, y);
  return sat.map((v, i) => clamp01(v + g.shadow[i]! * lo + g.high[i]! * hi)) as unknown as RGB;
}
