/**
 * Bengawan Solo di panggung 3D (Tugas 8.1, pilihan host 17 Nov "b aja coba": sungai dan larung lampion menggantikan
 * benang emas). Murni: letak sungai, lebar, tinggi muka air, dan alurnya yang diukir di tanah (`carve`, dipakai
 * `terrainHeight`), supaya tanah, air, lampion, dan perahu memakai bentuk yang sama dan bisa dites.
 *
 * Sungai melengkung mengitari bukit pendapa pada jarak `ring` dari pusat, tepat di pita lanskap yang tampak di
 * bawah kartu gallery. Jarak itu mengikuti bentuk layar (baris lampion di layar lebar lebih jauh dari di HP; dihitung
 * `riverRing` di route.ts dan disimpan di `TerrainShape.river`). Di busur itu tinggi bukit sama di mana-mana, jadi
 * muka air datar. Di kedua ujung busur sungai berbelok menjauh ke dataran dan menghilang di cakrawala kiri dan
 * kanan, makin lebar dan makin rendah mengikuti dataran.
 */

type P2 = readonly [x: number, z: number];

export const RIVER = {
  /** Jari-jari busur bawaan (m; layar lebar) dan setengah lebar sungai di busur itu. */
  ring: 15.5,
  half: 1.35,
  /** Busur di depan kamera gallery: dari azimut −`arc` sampai +`arc` (rad, 0 = arah pandang gallery). */
  arc: 0.75,
  /** Air sekian m di bawah tanah asal di tengah alur; dasar alur sekian m di bawah muka air. */
  sink: 0.32,
  depth: 0.3,
  /** Lebar tebing dari tepi air ke tanah asal (m), dan tinggi bibir tebing di atas air. */
  bank: 1.6,
  lip: 0.06,
  /** Setengah lebar di ujung yang jauh (m). */
  farHalf: 12,
} as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Tanah asal tanpa sungai, bagian yang menentukan tinggi air: bukit pendapa yang melandai ke dataran (−9 m). */
export const hillAt = (r: number) => -9 * smooth(7, 48, r);

/**
 * Garis tengah sungai, dari hulu (cakrawala kiri) ke hilir (cakrawala kanan): titik-titik [x, z]. Di tengah busur
 * berjari-jari `ring`; di kedua ujung berbelok menjauh dari pendapa.
 */
function centerline(ring: number): P2[] {
  const pts: P2[] = [];
  const polar = (r: number, az: number): P2 => [r * Math.sin(az), -r * Math.cos(az)];
  // hulu: dari jauh di kiri belakang, mendekat ke busur
  const far: [number, number][] = [
    [190, -1.32],
    [120, -1.28],
    [70, -1.18],
    [40, -1.06],
    [24, -0.95],
    [17, -0.86],
  ];
  for (const [r, az] of far) pts.push(polar(r, az));
  // busur di depan kamera gallery, sedikit berkelok (±0,35 m)
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const az = -RIVER.arc + (2 * RIVER.arc * i) / n;
    pts.push(polar(ring + 0.3 * Math.sin(az * 5.1 + 0.6), az));
  }
  // hilir: menjauh ke kanan belakang
  for (const [r, az] of [...far].reverse()) pts.push(polar(r * 1.08, -az * 0.97));
  return pts;
}

export type RiverLine = Readonly<{
  /** Jari-jari busur (m). */
  ring: number;
  points: readonly P2[];
  /** Jarak di sepanjang sungai (m) di tiap titik. */
  s: readonly number[];
  /** Setengah lebar dan tinggi muka air di tiap titik. */
  half: readonly number[];
  level: readonly number[];
  length: number;
  /** Kelompok segmen beserta kotak batasnya (sudah ditambah lebar sungai dan tebing), untuk menolak titik jauh dengan cepat. */
  chunks: readonly Readonly<{ from: number; to: number; minX: number; maxX: number; minZ: number; maxZ: number }>[];
}>;

function build(ring: number): RiverLine {
  const raw = centerline(ring);
  // haluskan sudut-sudut sambungan dengan Catmull-Rom, lalu ukur jaraknya
  const pts: P2[] = [];
  const at = (i: number) => raw[Math.max(0, Math.min(raw.length - 1, i))]!;
  for (let i = 0; i < raw.length - 1; i++) {
    // rapat di dekat kamera (0,6 m), renggang di kejauhan (±3 % jarak dari pendapa)
    const r = Math.hypot(at(i)[0], at(i)[1]);
    const steps = Math.max(2, Math.ceil(Math.hypot(at(i + 1)[0] - at(i)[0], at(i + 1)[1] - at(i)[1]) / Math.max(0.6, r * 0.03)));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const f = (k: 0 | 1) => {
        const [a, b, c, d] = [at(i - 1)[k], at(i)[k], at(i + 1)[k], at(i + 2)[k]];
        return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      };
      pts.push([f(0), f(1)]);
    }
  }
  pts.push(raw[raw.length - 1]!);
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const half: number[] = [];
  const level: number[] = [];
  for (const [x, z] of pts) {
    const r = Math.hypot(x, z);
    // makin jauh dari busur, makin lebar dan makin rendah (mengikuti dataran)
    const away = smooth(ring + 1.5, 120, r);
    half.push(RIVER.half + (RIVER.farHalf - RIVER.half) * away);
    // busur: muka air datar walau garis tengahnya berkelok ±0,3 m
    level.push(hillAt(Math.max(r - 0.35, ring)) - RIVER.sink - 1.2 * away);
  }
  const chunks: RiverLine["chunks"][number][] = [];
  for (let i = 0; i < pts.length - 1; i += CHUNK) {
    const to = Math.min(pts.length - 1, i + CHUNK);
    let [minX, maxX, minZ, maxZ, pad] = [Infinity, -Infinity, Infinity, -Infinity, 0];
    for (let k = i; k <= to; k++) {
      const [x, z] = pts[k]!;
      [minX, maxX, minZ, maxZ] = [Math.min(minX, x), Math.max(maxX, x), Math.min(minZ, z), Math.max(maxZ, z)];
      pad = Math.max(pad, half[k]! + RIVER.bank * Math.sqrt(half[k]! / RIVER.half) + 0.5);
    }
    chunks.push({ from: i, to, minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad });
  }
  return { ring, points: pts, s, half, level, length: s[s.length - 1]!, chunks };
}

const CHUNK = 8;
const lines = new Map<string, RiverLine>();
/** Sungai untuk busur berjari-jari `ring` (dibulatkan 5 cm; disimpan, jadi tiap bentuk hanya dibangun sekali). */
export function riverLine(ring: number = RIVER.ring): RiverLine {
  const key = ring.toFixed(2);
  let line = lines.get(key);
  if (!line) {
    line = build(Math.round(ring * 20) / 20);
    if (lines.size > 8) lines.clear();
    lines.set(key, line);
  }
  return line;
}

export type Nearest = Readonly<{ d: number; s: number; half: number; level: number; i: number; t: number }>;

/** Titik garis tengah terdekat dari (x, z): jaraknya, letaknya di sepanjang sungai, lebar dan muka air di sana. Null bila jauh. */
export function nearestRiver(x: number, z: number, line: RiverLine = riverLine()): Nearest | null {
  const { points, s, half, level, chunks } = line;
  let best: Nearest | null = null;
  let bestD2 = Infinity;
  for (const c of chunks) {
    if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
    for (let i = c.from; i < c.to; i++) {
      const [ax, az] = points[i]!;
      const [bx, bz] = points[i + 1]!;
      const [dx, dz] = [bx - ax, bz - az];
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const [px, pz] = [ax + dx * t, az + dz * t];
      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { d: Math.sqrt(d2), s: s[i]! + (s[i + 1]! - s[i]!) * t, half: half[i]! + (half[i + 1]! - half[i]!) * t, level: level[i]! + (level[i + 1]! - level[i]!) * t, i, t };
      }
    }
  }
  return best;
}

/**
 * Tanah di (x, z) setelah alur sungai diukir, dari tinggi tanah asal `base`. Di dalam alur: dasar berbentuk mangkuk
 * di bawah muka air. Di tebing: dari bibir tepi air naik atau turun halus ke tanah asal (di sisi luar busur, tempat
 * tanah asal lebih rendah dari air, bibir itu menjadi tanggul kecil, jadi air tidak pernah melayang di atas tanah).
 */
export function carve(x: number, z: number, base: number, line: RiverLine = riverLine()): number {
  const n = nearestRiver(x, z, line);
  if (!n) return base;
  const { d, half, level } = n;
  if (d <= half) return Math.min(base, level - RIVER.depth * (1 - (d / half) * (d / half)) - 0.02);
  const bank = RIVER.bank * (half / RIVER.half) ** 0.5;
  if (d >= half + bank) return base;
  const lip = level + RIVER.lip;
  return lip + (base - lip) * smooth(half, half + bank, d);
}

/** Muka air di dekat (x, z), atau null bila bukan di sungai. */
export function waterLevel(x: number, z: number, line: RiverLine = riverLine()): number | null {
  const n = nearestRiver(x, z, line);
  return n && n.d <= n.half ? n.level : null;
}

/** Muka air busur berjari-jari `ring` di depan kamera gallery (datar). */
export const arcLevel = (ring: number = RIVER.ring) => hillAt(Math.round(ring * 20) / 20) - RIVER.sink;
