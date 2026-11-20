/** Kemiringan kain di gawangan (rad): sisi atas menjauh dari kamera. */
export const CLOTH_TILT = 0.42;

/**
 * Jarak kamera (menghadap pusat kain) supaya seluruh kain yang miring muat di layar dengan `margin` (0–1, bagian
 * layar yang dikosongkan di tiap sisi) pada sisi yang membatasi. Kain berpusat di asal, berputar `-tilt` di sumbu X.
 */
export function fitDistance(
  fovDeg: number,
  viewAspect: number,
  clothW: number,
  clothH: number,
  margin: number,
  tilt = CLOTH_TILT,
): number {
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * viewAspect;
  const keep = 1 - margin;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  let d = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = (sx * clothW) / 2;
      const y = (sy * clothH) / 2;
      const yy = y * c;
      const z = -y * s; // sisi atas (y>0) menjauh
      d = Math.max(d, z + Math.abs(x) / (tanH * keep), z + Math.abs(yy) / (tanV * keep));
    }
  }
  return d;
}
