// Local map uses metres above mean sea level. One stage unit represents ten metres.
// North points left (-X), east into the frame (-Z); both horizontal axes share the same scale.
export const SITE = {
  tea: [-7.595472, 111.132899],
  house: [-7.606125, 111.117528],
  gate: [-7.595724, 111.158122],
  pyramid: [-7.627301, 111.131523],
  town: [-7.672455, 111.128871],
  falls: [-7.660697, 111.131079],
  summit: [-7.627382, 111.194316],
} as const;
export type Site = readonly [number, number];
export const NORTH = 110585;
export const EAST = 111320 * Math.cos((7.62 * Math.PI) / 180);
export const SCALE = 10;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const world = ([lat, lon]: Site) => ({ x: ((-7.62 - lat) * NORTH) / SCALE, z: ((111.14 - lon) * EAST) / SCALE });
export const geo = (x: number, z: number): Site => [-7.62 - (x * SCALE) / NORTH, 111.14 - (z * SCALE) / EAST];
export interface Ground {
  source: "dem" | "procedural";
  bounds: readonly [number, number, number, number]; // north, west, south, east
  metres(lat: number, lon: number): number;
}
export function readGround(buffer: ArrayBuffer): Ground {
  const d = new DataView(buffer);
  if (buffer.byteLength < 32 || d.getUint32(0) !== 0x4c574831) throw new Error("Invalid relief header");
  const nx = d.getUint16(4, true),
    ny = d.getUint16(6, true);
  const north = d.getFloat64(8, true),
    west = d.getFloat64(16, true),
    step = d.getFloat64(24, true);
  if (nx < 2 || ny < 2 || buffer.byteLength !== 32 + nx * ny * 2 || !Number.isFinite(north + west + step) || step <= 0)
    throw new Error("Invalid relief dimensions");
  const at = (x: number, y: number) => d.getInt16(32 + 2 * (y * nx + x), true);
  return {
    source: "dem",
    bounds: [north, west, north - (ny - 1) * step, west + (nx - 1) * step],
    metres(lat, lon) {
      const u = clamp((lon - west) / step, 0, nx - 1),
        v = clamp((north - lat) / step, 0, ny - 1);
      const x = Math.min(nx - 2, Math.floor(u)),
        y = Math.min(ny - 2, Math.floor(v));
      return mix(mix(at(x, y), at(x + 1, y), u - x), mix(at(x, y + 1), at(x + 1, y + 1), u - x), v - y);
    },
  };
}
export const fallbackGround: Ground = {
  source: "procedural",
  bounds: [-7.54, 111.02, -7.71, 111.25],
  metres(lat, lon) {
    const dx = (lon - SITE.summit[1]) * EAST,
      dy = (lat - SITE.summit[0]) * NORTH;
    const r = Math.hypot(dx * 0.94, dy),
      angle = Math.atan2(dy, dx);
    return 300 + 2850 * Math.exp(-r / 6800) * (1 + 0.065 * Math.sin(angle * 9 + r / 1750) * Math.min(1, r / 1900));
  },
};
export const groundY = (g: Ground, x: number, z: number) => g.metres(...geo(x, z)) / SCALE;
export function groundFrom(buffer: ArrayBuffer | null): Ground {
  if (!buffer) return fallbackGround;
  try {
    return readGround(buffer);
  } catch {
    return fallbackGround;
  }
}

/** Same two triangles as the render mesh; a coarser ridge can locally stand above a DEM sample. */
export function meshY(g: Ground, x: number, z: number, stride: number) {
  const [n, w, s, e] = g.bounds,
    a = world([n, w]),
    b = world([s, e]);
  const nx = Math.ceil((b.x - a.x) / stride),
    nz = Math.ceil((a.z - b.z) / stride);
  const dx = (b.x - a.x) / nx,
    dz = (a.z - b.z) / nz;
  const u = clamp((x - a.x) / dx, 0, nx),
    v = clamp((a.z - z) / dz, 0, nz);
  const i = Math.min(nx - 1, Math.floor(u)),
    j = Math.min(nz - 1, Math.floor(v)),
    fx = u - i,
    fz = v - j;
  const sx = a.x + i * dx,
    sz = a.z - j * dz;
  const A = groundY(g, sx, sz),
    B = groundY(g, sx + dx, sz),
    C = groundY(g, sx, sz - dz);
  if (fx + fz <= 1) return A + (B - A) * fx + (C - A) * fz;
  const D = groundY(g, sx + dx, sz - dz);
  return D + (C - D) * (1 - fx) + (B - D) * (1 - fz);
}
