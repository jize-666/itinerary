/**
 * Hitungan murni untuk parallax kursor di home (src/components/home/useDepth.ts).
 * Letak kursor dinyatakan dalam satuan −1…1 dari tengah layar; nilai itu yang dibaca CSS lewat --mx / --my.
 */
export type Point = { x: number; y: number };

export const CENTER: Point = { x: 0, y: 0 };

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Letak kursor di layar → −1 (kiri/atas) … 1 (kanan/bawah). Layar tanpa ukuran dianggap tengah. */
export function pointerToUnit(clientX: number, clientY: number, width: number, height: number): Point {
  if (!(width > 0) || !(height > 0)) return CENTER;
  return { x: clamp((clientX / width) * 2 - 1), y: clamp((clientY / height) * 2 - 1) };
}

/**
 * Mendekati sasaran dengan peluruhan eksponensial yang tidak bergantung pada laju frame:
 * setelah `tau` ms, sisa jarak tinggal 1/e. `dt` yang tidak wajar (tab baru kembali) langsung tiba.
 */
export function follow(from: Point, to: Point, dt: number, tau: number): Point {
  if (!(dt > 0)) return from;
  if (!(tau > 0) || dt > tau * 12) return to;
  const k = 1 - Math.exp(-dt / tau);
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

/** Sudah cukup dekat untuk berhenti menggambar? */
export const settled = (from: Point, to: Point, rest: number) => Math.abs(to.x - from.x) < rest && Math.abs(to.y - from.y) < rest;
