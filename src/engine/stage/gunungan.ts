/**
 * Gunungan (kayon) panggung 3D: ukuran lembaran dan koreografi sapuan antar bab. Murni: tanpa DOM, tanpa three.
 * Yang menggambar ada di `components/film/stage3d/gunungan.ts`; gambarnya dipanggang oleh
 * `scripts/assets/bake-gunungan.cjs` ke `public/film/gunungan/`.
 *
 * Lembarannya bermuka dua (arahan host 12 Nov: "redesign/remodel/upgrade ... jangan yang murka aja"):
 * - muka **Agung**: pohon hayat, medali surya-padma, sepasang merak, bingkai nila (tenang, pembuka lakon);
 * - muka **Murka**: kala/banaspati dari prototipe yang disetujui 8 Nov, yang bisa menyala menjadi sisi geni.
 * Maju ke bab berikutnya memperlihatkan muka Agung; mundur memperlihatkan baliknya, muka Murka.
 *
 * Semua letak di layar dalam NDC: x −1 (kiri) … 1 (kanan), y −1 (bawah) … 1 (atas).
 */

export const KAYON = {
  /** Lebar ÷ tinggi lembaran (kanvas gambar 1400×2000). */
  aspect: 0.7,
  /** Mata kala pada muka Murka (u dari kiri, v dari bawah): pupil bara digambar shader di lubangnya. */
  eyes: [
    [0.4371, 0.429],
    [0.5629, 0.429],
  ],
  /** Tebal kulit sebagai bagian dari tinggi lembaran: lubang tatahan tampak berdinding saat lembaran miring. */
  thick: 0.004,
  /** Tinggi garis dasar daun kayon (v): di bawahnya tangkai, di atasnya gambar. Poros ayun dalang ada di sini. */
  base: 0.0925,
} as const;

export type KayonFace = "agung" | "murka";

/** Tabir gelap yang mengikuti gunungan (bayangannya): isi panggung berganti di baliknya. */
export const VEIL = {
  /** Jarak tempuh pusat tabir dari tengah layar (NDC): sama dengan sapuan DOM lama, jadi jendela langit dan potongan kamera tetap pas. */
  travel: 4.22,
  /** Setengah lebar inti yang gelap penuh. */
  core: 1.664,
  /** Lebar tepi lembut di tiap sisi. */
  soft: 1.536,
} as const;

/** Sapuan: batas-batas gerak lembaran (rad). */
export const SWEEP = {
  /** Lembaran selalu sedikit berpaling ke tengah layar: sebesar ini saat masuk dan keluar, datar saat di tengah. */
  yaw: 0.52,
  /** Pucuk tertinggal dari tangkai saat disapukan (miring di bidang layar), terbesar saat paling cepat. */
  roll: 0.2,
  /** Kulit melentur: pucuk melengkung ke belakang arah gerak. */
  bend: 0.55,
  /** Kibasan dalang di tengah sapuan: getar kecil pada putaran (rad) dan lajunya (Hz). */
  flutter: 0.045,
  flutterHz: 6.2,
} as const;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Tinggi gunungan sebagai bagian dari tinggi layar: hampir setinggi layar lebar; di layar tegak dibatasi lebarnya. */
export function kayonSize(aspect: number): number {
  const fit = (0.96 * aspect) / KAYON.aspect;
  return Math.min(0.94, fit);
}

/** Setengah lebar gunungan di layar (NDC x) pada ukuran `size`. */
export const kayonHalfWidth = (size: number, aspect: number) => (size * KAYON.aspect) / aspect;

export type SweepPose = Readonly<{
  /** Pusat lembaran di layar (NDC). */
  x: number;
  y: number;
  /** Tinggi lembaran ÷ tinggi layar. */
  size: number;
  /** Putaran mengitari sumbu tegak (positif = muka berpaling ke kanan), miring di bidang layar, dan lentur pucuk. */
  yaw: number;
  roll: number;
  bend: number;
  /** Muka yang menghadap penonton. */
  face: KayonFace;
  /** Tabir: pusat (NDC x) dan kepekatan 0–1. Lebarnya tetap (`VEIL`). */
  veilX: number;
  veil: number;
  /** Pendar blencong di balik lembaran (0–1). */
  glow: number;
}>;

/**
 * Sapuan antar bab pada kemajuan transisi `p` (0–1, **sudah di-ease**: nilai `Timeline.progress()`, sumber waktu
 * yang sama dengan lapisan DOM), arah `dir` (1 = maju, kiri → kanan), bentuk layar `aspect`, dan jam `t` (detik,
 * hanya untuk kibasan). Gunungan melintas lebih pelan dari tabirnya, jadi ia terlihat hampir sepanjang
 * transisi; tabir menutup seluruh layar di tengah (p 0,42–0,58), saat kamera dipotong dan langit berganti.
 */
export function sweepPose(p: number, dir: 1 | -1, aspect: number, t: number): SweepPose {
  const q = clamp01(p);
  const across = 2 * q - 1; // −1 … 1
  // laju pada ease sinus: 0 di kedua ujung, 1 di tengah
  const speed = 2 * Math.sqrt(q * (1 - q));
  const size = kayonSize(aspect);
  const reach = 1 + kayonHalfWidth(size, aspect) + 0.3;
  // kibasan: hanya di sekitar tengah, saat gunungan paling terlihat
  const flutter = SWEEP.flutter * smooth(0.2, 0.38, q) * (1 - smooth(0.62, 0.8, q)) * Math.sin(t * Math.PI * 2 * SWEEP.flutterHz);
  // muncul dan hilang di luar layar; kepekatan hanya menjaga agar awal dan akhir tidak meletup
  const fade = smooth(0, 0.02, q) * (1 - smooth(0.98, 1, q));
  return {
    x: dir * reach * across,
    y: -0.03 + 0.05 * speed,
    size,
    yaw: -dir * SWEEP.yaw * across + flutter,
    roll: dir * SWEEP.roll * speed,
    bend: dir * SWEEP.bend * speed,
    face: dir > 0 ? "agung" : "murka",
    veilX: dir * VEIL.travel * across,
    veil: fade,
    glow: fade,
  };
}

/** Bagian layar yang tertutup tabir pada letak `x` (NDC) saat pusat tabir di `veilX`: 1 = gelap penuh. */
export const veilAt = (x: number, veilX: number) => 1 - smooth(VEIL.core, VEIL.core + VEIL.soft, Math.abs(x - veilX));

/**
 * Jendela teks pada sapuan 3D, dalam kemajuan yang sudah di-ease: teks lama hilang sebelum gunungan masuk layar,
 * teks baru muncul sesudah tabir tersibak dari tengah layar. Teks itu DOM di atas kanvas, jadi tidak tertutup
 * tabir; karena itu dipudarkan lebih awal dan dimunculkan lebih lambat daripada sapuan DOM. `textAt` = saat
 * reveal teks baru dimulai, bagian dari lama transisi (waktu, bukan kemajuan).
 */
export const SWEEP_TEXT = { outEnd: 0.1, inStart: 0.74, inEnd: 0.9, textAt: 0.66 } as const;
