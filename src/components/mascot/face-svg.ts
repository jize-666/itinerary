/**
 * Wajah Clawd sebagai SVG untuk film 2,5D (M4): mata, alis, dan pipi kit digambar dari data yang sama dengan film 3D
 * (`engine/mascot/kit-face.ts`), bukan digambar ulang. Kotak pandang = muka depan badan (lebar 2, tinggi 1,9 satuan
 * kit), Y ke atas dibalik ke Y ke bawah SVG. Garis mata dan alis = poligon dari `strokeOutline`, sama dengan ekstrusi 3D.
 */
import type { Expression } from "@/engine/mascot/face";
import { browPoints, EYE_BOX, EYE_OVAL, EYE_STROKE, type EyeType, expressionShape, FACE_COLORS, FACE_DIM, type Pt, strokeOutline } from "@/engine/mascot/kit-face";

const f = (n: number) => +n.toFixed(4);
const poly = (pts: readonly Pt[]) => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}"/>`;

/** Satu mata di ruang mata (sebelum skala 1,65), titik asal di tengah mata. */
function eyeMarkup(type: EyeType): string {
  const box = EYE_BOX[type];
  if (box) return `<rect x="${f(-box.w / 2)}" y="${f(box.y - box.h / 2)}" width="${box.w}" height="${box.h}" rx="${box.r}"/>`;
  const oval = EYE_OVAL[type];
  if (oval) return `<ellipse rx="${oval.rx}" ry="${oval.ry}"/>`;
  const stroke = EYE_STROKE[type];
  return stroke ? poly(strokeOutline(stroke.points, stroke.width * FACE_DIM.strokeScale)) : "";
}

/**
 * Isi SVG wajah satu ekspresi. Kedua mata berada dalam `g.cf-eyes` yang berporos di garis tengah mata: kedipan =
 * skala Y grup itu (seperti skala Y tiap mata di kit, karena keduanya setinggi).
 */
export function faceMarkup(ex: Expression): string {
  const { eyes, brows } = expressionShape(ex);
  const eyeMarks = eyes
    .map((t, i) => `<g transform="translate(${(i ? 1 : -1) * FACE_DIM.eyeX} 0) scale(${FACE_DIM.shapeScale})">${eyeMarkup(t)}</g>`)
    .join("");
  const browMarks = brows.map((b, i) => (b ? poly(strokeOutline(browPoints(b, i ? 1 : -1), FACE_DIM.browWidth)) : "")).join("");
  const cheeks = [-1, 1].map((s) => `<circle cx="${s * FACE_DIM.cheekX}" cy="${FACE_DIM.cheekY}" r="${FACE_DIM.cheekRadius}"/>`).join("");
  return `<g transform="scale(1 -1)"><g fill="${FACE_COLORS.cheeks}">${cheeks}</g><g fill="${FACE_COLORS.eyes}"><g class="cf-eyes" transform="translate(0 ${FACE_DIM.eyeY})">${eyeMarks}</g>${browMarks}</g></g>`;
}

/** Elemen SVG wajah (kotak pandang muka depan badan). */
export function faceSvg(ex: Expression): string {
  return `<svg class="cf-face" viewBox="-1 -0.95 2 1.9" aria-hidden="true">${faceMarkup(ex)}</svg>`;
}
