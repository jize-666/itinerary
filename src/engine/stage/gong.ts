/**
 * Gong ageng panggung 3D: ukuran rakitan, profil badan gong, dan garis waktu pukulan. Murni: tanpa DOM,
 * tanpa three. Bentuk dan perilakunya mengikuti prototipe yang disetujui host ("Gong Murka",
 * `prototypes/gong/scene.js`); yang menggambar ada di `components/film/stage3d/gong.ts`.
 *
 * Satuan: "model" = meter pada skala prototipe, titik asal di lantai di bawah pencu, gong menghadap +z.
 * Dunia = model × `GONG_SCALE` (shot kamera Tugas 5 dibuat untuk rakitan selebar ±3,5 m).
 */
import type { Vec3 } from "./shots";

export const GONG_SCALE = 1.35;

/** Ukuran rakitan (satuan model). */
export const GONG = {
  /** Jari-jari terluar badan gong. */
  radius: 0.506,
  /** Tinggi pusat gong (pencu) di atas lantai. */
  y: 1.1,
  /** Tinggi poros ayun: sisi bawah palang, tempat tali digantung. Gong dan talinya berayun mengitari titik ini. */
  pivot: 1.82,
  /** Tebal dinding perunggu. */
  thick: 0.013,
  /** Jarak kedua tiang gayor dari tengah. */
  postX: 0.86,
  /** Tinggi sumbu palang. */
  barY: 1.88,
  /** Setengah panjang palang. */
  barHalf: 0.97,
  /** Jari-jari pencu (benjolan tengah) sampai kaki lehernya. */
  pencu: 0.135,
} as const;

type P2 = readonly [r: number, z: number];

/** Profil muka (r, z): pencu → leher → rai dengan dua punggung halus (recep) → pundak → bau. */
const FRONT: readonly P2[] = [
  [0.0, 0.112],
  [0.045, 0.106],
  [0.08, 0.086],
  [0.104, 0.052],
  [0.12, 0.024],
  [0.135, 0.011],
  [0.165, 0.006],
  [0.19, 0.011],
  [0.215, 0.004],
  [0.3, 0.0],
  [0.33, 0.004],
  [0.355, -0.003],
  [0.4, -0.011],
  [0.452, -0.027],
  [0.488, -0.06],
  [0.503, -0.11],
  [0.506, -0.175],
  [0.499, -0.218],
  [0.486, -0.238],
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Catmull-Rom seragam di antara p1 dan p2. */
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  return (2 * p1 - 2 * p2 + v0 + v1) * t2 * t + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
};

/** Kurva halus yang melewati semua titik profil, dicuplik rapat (untuk panjang busur dan pencarian). */
const DENSE: readonly P2[] = (() => {
  const out: P2[] = [];
  const last = FRONT.length - 1;
  const per = 16;
  for (let i = 0; i < last; i++) {
    const [a, b, c, d] = [FRONT[Math.max(0, i - 1)]!, FRONT[i]!, FRONT[i + 1]!, FRONT[Math.min(last, i + 2)]!];
    for (let k = 0; k < per; k++) out.push([Math.max(0, catmull(a[0], b[0], c[0], d[0], k / per)), catmull(a[1], b[1], c[1], d[1], k / per)]);
  }
  out.push(FRONT[last]!);
  return out;
})();

/** Profil muka gong, `n + 1` titik berjarak sama sepanjang busur, dari pusat pencu sampai tepi bau. */
export function gongFront(n: number): P2[] {
  const acc = [0];
  for (let i = 1; i < DENSE.length; i++) acc.push(acc[i - 1]! + Math.hypot(DENSE[i]![0] - DENSE[i - 1]![0], DENSE[i]![1] - DENSE[i - 1]![1]));
  const total = acc[acc.length - 1]!;
  const out: P2[] = [];
  let j = 1;
  for (let i = 0; i <= n; i++) {
    const s = (total * i) / n;
    while (j < acc.length - 1 && acc[j]! < s) j++;
    const span = acc[j]! - acc[j - 1]! || 1;
    const t = clamp01((s - acc[j - 1]!) / span);
    out.push([DENSE[j - 1]![0] + (DENSE[j]![0] - DENSE[j - 1]![0]) * t, DENSE[j - 1]![1] + (DENSE[j]![1] - DENSE[j - 1]![1]) * t]);
  }
  out[0] = [0, out[0]![1]];
  return out;
}

export type Section = Readonly<{ points: P2[]; normals: P2[] }>;

/**
 * Penampang badan gong untuk diputar mengelilingi sumbu z: muka (`nFront + 1` titik, pusat → tepi) lalu punggung
 * (tepi → pusat, digeser ke dalam setebal dinding, titiknya separuh muka). Normal menghadap ke luar perunggu.
 */
export function gongSection(nFront: number): Section {
  const front = gongFront(nFront);
  const tangent = (pts: readonly P2[], i: number): P2 => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const back: P2[] = [];
  for (let i = front.length - 1; i >= 0; i--) {
    if (i % 2 === 1 && i !== front.length - 1) continue;
    const t = tangent(front, i);
    const p = front[i]!;
    // ke dalam = berlawanan dengan normal muka (−t.z, t.r)
    back.push([Math.max(0, p[0] + t[1] * GONG.thick), p[1] - t[0] * GONG.thick]);
  }
  back[back.length - 1] = [0, back[back.length - 1]![1]];
  const points = [...front, ...back];
  const normals = points.map((p, i): P2 => {
    // di sumbu putar normal tepat sepanjang sumbu
    if (i === 0) return [0, 1];
    if (i === points.length - 1) return [0, -1];
    const t = tangent(points, i);
    return [-t[1], t[0]];
  });
  return { points, normals };
}

/** Tinggi muka gong (z, satuan model) pada jarak `r` dari sumbu, untuk r di dalam rai (0 … jari-jari). */
export function gongDepth(r: number): number {
  const x = Math.max(0, r);
  for (let i = 1; i < DENSE.length; i++) {
    const [a, b] = [DENSE[i - 1]!, DENSE[i]!];
    if (b[0] < a[0]) return a[1]; // lewat titik terluar: bau melengkung ke dalam
    if (b[0] >= x) return a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]));
  }
  return DENSE[DENSE.length - 1]![1];
}

// ---------------------------------------------------------------------------------------------------------
// Pukulan
// ---------------------------------------------------------------------------------------------------------

/**
 * Garis waktu satu pukulan (detik sejak dipicu). Tabuh diayun melengkung dari samping, berporos di tangan
 * penabuh di sisi kanan gong: ancang-ancang → jeda → ayunan makin cepat → kena pencu → pantulan → kembali.
 */
export const STRIKE = {
  /** Akhir ancang-ancang. */
  load: 0.34,
  /** Akhir jeda di puncak ancang-ancang. */
  hold: 0.4,
  /** Tabuh mengenai pencu: bunyi dan semua efek dimulai di sini. */
  impact: 0.52,
  /** Akhir pantulan. */
  bounce: 0.66,
  /** Tabuh sudah kembali menggantung; pukulan berikutnya boleh dimulai. */
  rest: 1.5,
  /** Sudut ancang-ancang dan pantulan (derajat dari titik kontak). */
  back: 105,
  rebound: 22,
  /** Efek sesudah hantaman (bara, riak, ayunan) dianggap habis sesudah sekian detik. */
  tail: 8,
} as const;

const RAD = Math.PI / 180;
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const easeIn3 = (x: number) => {
  const t = clamp01(x);
  return t * t * t;
};
const easeOut4 = (x: number) => 1 - Math.pow(1 - clamp01(x), 4);

/** Titik kontak kepala tabuh, tepat di depan pencu. */
export const MALLET_HIT: Vec3 = [0.05, 1.095, 0.195];
/** Arah gerak kepala tabuh saat kontak: dari kanan depan, masuk ke gong. */
const SWING_V: Vec3 = (() => {
  const l = Math.hypot(0.45, 0.89);
  return [-0.45 / l, 0, -0.89 / l];
})();
const SWING_R = 0.62;
/** Tangan → kepala tabuh saat kontak: tegak lurus arah ayunan, mendatar. */
const ARM: Vec3 = [SWING_V[2] * SWING_R, 0, -SWING_V[0] * SWING_R];
/** Tangan penabuh (poros ayunan) saat diam. */
export const MALLET_HAND: Vec3 = [MALLET_HIT[0] - ARM[0], MALLET_HIT[1] - ARM[1], MALLET_HIT[2] - ARM[2]];
/**
 * Diam: tabuh digantung tegak di cantolan tiang kanan, sedikit di luar tangan penabuh supaya bantalannya tidak
 * menyentuh bibir gong. `MALLET_REST` = titik gantung (ujung gagang mengarah ke sini), kepala 62 cm di bawahnya.
 */
export const MALLET_REST: Vec3 = [MALLET_HAND[0] + 0.05, MALLET_HAND[1], MALLET_HAND[2]];
const REST_DROP = 0.62;

/** Kepala tabuh pada busur ayunan: `deg` derajat sebelum titik kontak (0 = kontak). Seperti tongkat bisbol, makin jauh ke belakang makin terangkat. */
function arcHead(deg: number): Vec3 {
  const a = deg * RAD;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  // putar lengan mengitari sumbu tegak
  const x = ARM[0] * c + ARM[2] * s;
  const z = -ARM[0] * s + ARM[2] * c;
  const lift = 0.3 * Math.pow(Math.max(0, deg) / STRIKE.back, 1.6);
  return [MALLET_HAND[0] + x, MALLET_HAND[1] + lift, MALLET_HAND[2] + z];
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export type MalletPose = Readonly<{
  /** Pusat kepala tabuh (satuan model). */
  head: Vec3;
  /** Gagang mengarah ke titik ini: tangan penabuh saat mengayun, cantolan saat diam. */
  hand: Vec3;
  /** Gencetan bantalan kepala saat kontak (1 = bulat utuh). */
  squash: number;
}>;

/**
 * Sikap tabuh `p` detik sesudah pukulan dipicu (`p` < 0 atau ≥ `STRIKE.rest` = diam menggantung) pada jam `t`
 * (untuk goyang pelan saat diam). `ready` 0–1 mengangkat tabuh sedikit: tanda siap dipukul.
 */
export function malletPose(p: number, t: number, ready = 0): MalletPose {
  // menggantung: berayun sangat pelan seperti bandul
  let rest: Vec3 = [MALLET_REST[0] + Math.sin(t * 1.3) * 0.008, MALLET_REST[1] - REST_DROP, MALLET_REST[2] + Math.sin(t * 1.7 + 0.6) * 0.006];
  const idle = p < 0 || p >= STRIKE.rest;
  if (idle && ready > 0) rest = lerp3(rest, arcHead(48), 0.35 * clamp01(ready));
  const grip = (dx: number, dz: number): Vec3 => [MALLET_HAND[0] + dx, MALLET_HAND[1], MALLET_HAND[2] + dz];
  let head: Vec3 = rest;
  let hand: Vec3 = MALLET_REST;
  let squash = 1;
  if (idle) {
    /* menggantung di cantolan */
  } else if (p < STRIKE.load) {
    const k = easeInOut(p / STRIKE.load);
    head = lerp3(rest, arcHead(STRIKE.back), k);
    hand = lerp3(MALLET_REST, grip(0.04, 0.03), k);
  } else if (p < STRIKE.hold) {
    head = arcHead(STRIKE.back + 4 * Math.sin(((p - STRIKE.load) / (STRIKE.hold - STRIKE.load)) * Math.PI));
    hand = grip(0.04, 0.03);
  } else if (p < STRIKE.impact) {
    const k = easeIn3((p - STRIKE.hold) / (STRIKE.impact - STRIKE.hold));
    head = arcHead(STRIKE.back * (1 - k));
    hand = grip(0.04 * (1 - k) - 0.03 * k, 0.03 * (1 - k));
  } else if (p < STRIKE.bounce) {
    const k = (p - STRIKE.impact) / (STRIKE.bounce - STRIKE.impact);
    head = arcHead(STRIKE.rebound * Math.sin(k * Math.PI * 0.5));
    hand = grip(-0.03, 0);
    squash = 1 - 0.18 * Math.max(0, 1 - k * 3);
  } else {
    const k = easeInOut((p - STRIKE.bounce) / (STRIKE.rest - STRIKE.bounce));
    head = lerp3(arcHead(STRIKE.rebound), rest, k);
    hand = lerp3(grip(-0.03, 0), MALLET_REST, k);
  }
  return { head, hand, squash };
}

/** Ayunan gong sesudah dipukul: bandul yang meluruh. Simpangan terjauh di pusat gong ±3,8 cm (satuan model). */
export const SWING = { amp: 0.0525, period: 1.8, decay: 2.6 } as const;

/**
 * Sudut ayun gong (rad) `st` detik sesudah hantaman, mengitari poros gantung. Positif = bagian bawah gong
 * terdorong ke belakang (menjauhi penabuh): itu arah gerak pertama.
 */
export const gongSwing = (st: number) => (st <= 0 ? 0 : SWING.amp * Math.exp(-st / SWING.decay) * Math.sin((st * 2 * Math.PI) / SWING.period));

/** Dengung: getar halus maju-mundur badan gong (satuan model). */
export const gongHum = (st: number) => (st <= 0 ? 0 : 0.0007 * Math.exp(-st * 1.6) * Math.sin(st * 2 * Math.PI * 38));

/** Panas bara di retakan dan cincin recep sesudah hantaman (0 saat diam, ±2,2 tepat saat kena). */
export const strikeHeat = (st: number) => (st < 0 ? 0 : 2.2 * Math.exp(-st * 1.3));

/** Kilatan: mata naga, mulut berbara, dan cahaya di sekitar gong (1 tepat saat kena, lalu meluruh). */
export const strikeFlare = (st: number) => (st < 0 ? 0 : Math.exp(-st * 1.4));

/** Jantung gong: denyut ganda (deg-deg) tiap 2,1 detik, 0–1. Pencu, mata naga, dan mata Batara Kala seirama. */
export function heartbeat(t: number): number {
  const ph = ((t % 2.1) + 2.1) % 2.1;
  return Math.exp(-(ph * ph) / 0.004) + 0.65 * Math.exp(-((ph - 0.3) ** 2) / 0.005);
}

export const RIPPLES = 4;
/** Riak ke-`i` di muka gong: jari-jari (bagian dari jari-jari gong) dan kepekatannya. Tiap riak menyusul 0,16 dtk. */
export function ripple(i: number, st: number): { radius: number; opacity: number } {
  const rt = st - i * 0.16;
  if (rt <= 0) return { radius: 0, opacity: 0 };
  const k = clamp01(rt / 1.7);
  return { radius: 0.12 + easeOut4(k) * (0.62 + i * 0.05), opacity: (1 - k) * (i % 2 ? 0.45 : 0.8) };
}

/** Napas api naga sesudah hantaman: 0–1, naik cepat lalu habis dalam 1,8 detik. */
export const breath = (st: number) => (st < 0 || st >= 1.8 ? 0 : Math.min(1, st * 8) * (1 - st / 1.8));
