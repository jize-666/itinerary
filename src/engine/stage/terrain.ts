/**
 * Bentuk lanskap panggung 3D: tinggi tanah di titik (x, z). Murni dan deterministik, supaya benda lain
 * (diorama, pohon, lampu) bisa ditaruh di atas tanah yang sama dan bentuknya bisa dites.
 *
 * Pendapa berdiri di puncak bukit kecil (y = 0). Di sekelilingnya dataran Solo (±9 m di bawah), dan di arah
 * −z menjulang Gunung Lawu. Lawu ditaruh menurut lebar lintasan matahari di layar: puncaknya di kiri tengah,
 * sedangkan kedua ujung lintasan (tempat matahari terbit dan terbenam) dibiarkan rendah, supaya matahari yang
 * baru terbit tetap tampak menyembul di cakrawala pada bentuk layar apa pun.
 */

export type TerrainShape = Readonly<{
  /** Setengah lebar lintasan matahari sebagai sudut datar (rad) dari kamera gallery. */
  trackHalf: number;
  /** Tinggi puncak lintasan matahari sebagai sudut dari cakrawala (rad). */
  trackTop: number;
}>;
export const TERRAIN_DEFAULT: TerrainShape = { trackHalf: 0.46, trackTop: 0.12 };

export const TERRAIN = {
  /** Jari-jari tepi dalam (di bawah lantai pendapa) dan tepi luar jala. */
  inner: 6.4,
  outer: 950,
  /** Dataran berada sekian meter di bawah lantai pendapa. */
  plain: -9,
  /** Jarak Lawu dari pendapa. */
  lawuAt: 640,
} as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number): number {
  const [xi, yi] = [Math.floor(x), Math.floor(y)];
  const [xf, yf] = [x - xi, y - yi];
  const [u, v] = [xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)];
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Derau fraktal 0–1. */
export function fbm(x: number, y: number, octaves = 4): number {
  let [amp, sum, norm] = [0.5, 0, 0];
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x, y);
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Arah datar titik (x, z) dari pendapa: 0 = lurus ke −z (arah pandang gallery), positif = ke kanan. */
export const azimuthOf = (x: number, z: number) => Math.atan2(x, -z);

/** Tinggi tanah (m). */
export function terrainHeight(x: number, z: number, shape: TerrainShape = TERRAIN_DEFAULT): number {
  const r = Math.hypot(x, z);
  const az = azimuthOf(x, z);
  // bukit pendapa: datar di puncak, melandai ke dataran
  let y = TERRAIN.plain * smooth(7, 48, r);
  // dataran: gelombang halus
  y += smooth(26, 90, r) * 2.2 * (fbm(x * 0.011 + 3.2, z * 0.011 - 1.4) - 0.5);
  // perbukitan rendah di kejauhan, mengelilingi dataran
  const rim = smooth(240, 600, r) * (3 + 7 * fbm(az * 5.2 + 3.1, r * 0.003 + 1.7));
  // Lawu: punggung panjang dengan tiga puncak, di kiri tengah lintasan matahari
  const half = Math.max(0.16, shape.trackHalf);
  const peak = TERRAIN.lawuAt * Math.tan(Math.min(0.09, Math.max(0.035, shape.trackTop * 0.52)));
  const bell = (center: number, width: number) => Math.exp(-0.5 * ((az - center * half) / (width * half)) ** 2);
  const across = Math.exp(-0.5 * ((r - TERRAIN.lawuAt) / 190) ** 2);
  const ridge = 1 + 0.16 * (fbm(az * 38 + 5.5, r * 0.012) - 0.5);
  const lawu = peak * across * ridge * (bell(-0.3, 0.2) + 0.62 * bell(-0.02, 0.26) + 0.4 * bell(-0.52, 0.16) + 0.3 * bell(0.42, 0.3));
  // kedua ujung lintasan matahari: cakrawala rendah
  const ends = 1 - 0.8 * Math.max(Math.exp(-0.5 * ((az + 0.95 * half) / (0.14 * half)) ** 2), Math.exp(-0.5 * ((az - 0.95 * half) / (0.14 * half)) ** 2)) * smooth(200, 420, r);
  return y + rim * ends + lawu;
}
