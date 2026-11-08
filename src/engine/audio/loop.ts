/**
 * Matematika putar-ulang tanpa jeda: salinan berikutnya mulai `xfade` detik sebelum salinan sebelumnya habis,
 * dengan kurva equal-power (sin/cos) supaya kenyaringan tidak melorot di tengah crossfade.
 */
export const LOOP_LOOKAHEAD = 1.0; // jadwalkan salinan berikutnya 1 dtk sebelum dibutuhkan

/** Crossfade efektif: tidak lebih dari sepertiga durasi supaya kurva masuk & keluar tidak bertumpuk. */
export const effectiveXfade = (duration: number, xfade: number) => Math.max(0, Math.min(xfade, duration / 3));

/** Jarak antar-mulai dua salinan berurutan. */
export const loopStep = (duration: number, xfade: number) => duration - effectiveXfade(duration, xfade);

/** Waktu mulai `count` salinan pertama. */
export function loopStarts(duration: number, xfade: number, t0: number, count: number): number[] {
  const step = loopStep(duration, xfade);
  return Array.from({ length: count }, (_, i) => t0 + i * step);
}

export function equalPowerIn(n = 64): Float32Array {
  return Float32Array.from({ length: n }, (_, i) => Math.sin((i / (n - 1)) * Math.PI * 0.5));
}

export function equalPowerOut(n = 64): Float32Array {
  return Float32Array.from({ length: n }, (_, i) => Math.cos((i / (n - 1)) * Math.PI * 0.5));
}
