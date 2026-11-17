/**
 * Data wajah karakter kit `claude-3d-reference-kit` v4 (diambil dari `src/claude-character.js` kit): bentuk mata tiap
 * ekspresi, garis chevron/kedip/kantuk/sedih, alis, dan pipi. Satu sumber untuk dua cara menggambar:
 *  - film 3D (`stage3d/claude.ts`): diekstrusi jadi jaring;
 *  - film 2,5D (`components/mascot/face-svg.ts`): digambar sebagai SVG di muka depan badan CSS 3D.
 * Satuan kit (lebar badan 2); koordinat wajah: titik asal di tengah muka depan badan, Y ke atas. Murni.
 */
import type { Expression } from "./face";

export type Pt = readonly [number, number];
export type EyeType = "open" | "round" | "small" | "happy" | "closed" | "sleepy" | "sad" | "angry";
export type BrowKind = "raised" | "soft" | "sad" | "angry" | null;

/** Ukuran wajah (kit v4: mata 1,65×, garis 1,5×, alis dinaikkan 0,065). */
export const FACE_DIM = {
  eyeX: 0.43,
  eyeY: 0.2,
  shapeScale: 1.65,
  strokeScale: 1.5,
  browLift: 0.065,
  browWidth: 0.044,
  cheekX: 0.57,
  cheekY: -0.19,
  cheekRadius: 0.095,
} as const;

export const FACE_COLORS = { eyes: "#242120", cheeks: "#F3A184" } as const;

/** Mata dan alis kiri/kanan tiap ekspresi (kit: indeks 0 = sisi −X). */
export function expressionShape(ex: Expression): { eyes: [EyeType, EyeType]; brows: [BrowKind, BrowKind] } {
  switch (ex) {
    case "happy":
      return { eyes: ["happy", "happy"], brows: [null, null] };
    case "curious":
      return { eyes: ["round", "round"], brows: ["raised", "soft"] };
    case "concerned":
      return { eyes: ["small", "small"], brows: ["sad", "sad"] };
    case "sad":
      return { eyes: ["sad", "sad"], brows: ["sad", "sad"] };
    case "surprised":
      return { eyes: ["round", "round"], brows: ["raised", "raised"] };
    case "angry":
      return { eyes: ["angry", "angry"], brows: ["angry", "angry"] };
    case "sleepy":
      return { eyes: ["sleepy", "sleepy"], brows: [null, null] };
    case "blink":
      return { eyes: ["closed", "closed"], brows: [null, null] };
    case "wink":
      return { eyes: ["open", "happy"], brows: [null, null] };
    case "embarrassed":
      return { eyes: ["sad", "sad"], brows: ["soft", "soft"] };
    case "excited":
      return { eyes: ["happy", "happy"], brows: ["raised", "raised"] };
    default:
      return { eyes: ["open", "open"], brows: [null, null] };
  }
}

/** Mata padat: kotak membulat (lebar, tinggi, jari-jari sudut, geser Y), dalam ruang mata sebelum skala 1,65. */
export const EYE_BOX: Partial<Record<EyeType, { w: number; h: number; r: number; y: number }>> = {
  open: { w: 0.13, h: 0.17, r: 0.026, y: 0 },
  angry: { w: 0.13, h: 0.1, r: 0.02, y: -0.025 },
};

/** Mata bulat: elips (jari-jari X, Y), dalam ruang mata sebelum skala 1,65. */
export const EYE_OVAL: Partial<Record<EyeType, { rx: number; ry: number }>> = {
  round: { rx: 0.078, ry: 0.108 },
  small: { rx: 0.059, ry: 0.076 },
};

/** Mata garis: titik-titik goresan dan lebarnya (sebelum pengali 1,5), dalam ruang mata sebelum skala 1,65. */
export const EYE_STROKE: Partial<Record<EyeType, { points: readonly Pt[]; width: number }>> = {
  happy: {
    points: [
      [-0.115, -0.045],
      [0, 0.065],
      [0.115, -0.045],
    ],
    width: 0.052,
  },
  closed: {
    points: [
      [-0.105, 0],
      [0.105, 0],
    ],
    width: 0.041,
  },
  sleepy: {
    points: [
      [-0.105, 0.025],
      [-0.052, -0.014],
      [0, -0.03],
      [0.052, -0.014],
      [0.105, 0.025],
    ],
    width: 0.043,
  },
  sad: {
    points: [
      [-0.09, 0.025],
      [0, -0.018],
      [0.09, 0.025],
    ],
    width: 0.045,
  },
};

/** Titik alis di ruang wajah untuk sisi `sign` (−1 kiri, 1 kanan), sudah dinaikkan `browLift`. */
export function browPoints(kind: Exclude<BrowKind, null>, sign: number): Pt[] {
  const x = sign * FACE_DIM.eyeX;
  let p: Pt[] = [];
  if (kind === "raised")
    p = [
      [-0.11, 0.39],
      [-0.02, 0.435],
      [0.09, 0.4],
    ];
  if (kind === "soft")
    p = [
      [-0.1, 0.365],
      [0, 0.39],
      [0.1, 0.365],
    ];
  if (kind === "sad")
    p = [
      [-0.11, 0.39 + sign * 0.045],
      [0.11, 0.39 - sign * 0.045],
    ];
  if (kind === "angry")
    p = [
      [-0.11, 0.365 - sign * 0.055],
      [0.11, 0.365 + sign * 0.055],
    ];
  return p.map(([a, b]) => [x + a, b + FACE_DIM.browLift] as const);
}

/**
 * Garis tepi goresan tebal bersambung (kit: chevron tetap mulus di puncaknya): poligon kiri lalu kanan, ujungnya
 * diperpanjang 0,2 × lebar. `bevel` dikurangkan dari setengah lebar (kit memakai bevel ekstrusi 0,003).
 */
export function strokeOutline(points: readonly Pt[], width: number, bevel = 0): Pt[] {
  if (points.length < 2) return [];
  const half = (width - 2 * bevel) / 2;
  const norm = (x: number, y: number): Pt => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  const dirs = points.slice(1).map((b, i) => norm(b[0] - points[i]![0], b[1] - points[i]![1]));
  const normals = dirs.map(([x, y]) => [-y, x] as const);
  const left: Pt[] = [];
  const right: Pt[] = [];
  points.forEach((point, i) => {
    let [px, py] = point;
    const first = i === 0;
    const last = i === points.length - 1;
    if (first) [px, py] = [px - dirs[0]![0] * (width * 0.2 - bevel), py - dirs[0]![1] * (width * 0.2 - bevel)];
    if (last) [px, py] = [px + dirs.at(-1)![0] * (width * 0.2 - bevel), py + dirs.at(-1)![1] * (width * 0.2 - bevel)];
    let n: Pt = first ? normals[0]! : last ? normals.at(-1)! : norm(normals[i - 1]![0] + normals[i]![0], normals[i - 1]![1] + normals[i]![1]);
    const k = half / (first || last ? 1 : n[0] * normals[i]![0] + n[1] * normals[i]![1]);
    n = [n[0] * k, n[1] * k];
    left.push([px + n[0], py + n[1]]);
    right.push([px - n[0], py - n[1]]);
  });
  return [...left, ...right.reverse()];
}
