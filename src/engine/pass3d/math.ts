export const TAU = 2 * Math.PI;

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function wrapAngle(angle: number): number {
  return angle - TAU * Math.floor((angle + Math.PI) / TAU);
}

export function rotate(out: Float64Array, q: Float64Array, x: number, y: number, z: number, inverse = false): void {
  const sign = inverse ? -1 : 1;
  const qx = q[0]! * sign, qy = q[1]! * sign, qz = q[2]! * sign, qw = q[3]!;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + qy * tz - qz * ty;
  out[1] = y + qw * ty + qz * tx - qx * tz;
  out[2] = z + qw * tz + qx * ty - qy * tx;
}

/** Exponential-map rotation in world space, with bounded positional correction. */
export function advanceRotation(q: Float64Array, x: number, y: number, z: number): void {
  const angle = Math.sqrt(x * x + y * y + z * z);
  if (angle < 1e-10) return;
  const half = Math.min(angle, 0.34) * 0.5;
  const scale = Math.sin(half) / angle;
  const dx = x * scale, dy = y * scale, dz = z * scale, dw = Math.cos(half);
  const qx = q[0]!, qy = q[1]!, qz = q[2]!, qw = q[3]!;
  q[0] = dw * qx + dx * qw + dy * qz - dz * qy;
  q[1] = dw * qy - dx * qz + dy * qw + dz * qx;
  q[2] = dw * qz + dx * qy - dy * qx + dz * qw;
  q[3] = dw * qw - dx * qx - dy * qy - dz * qz;
}

export function velocityFromRotation(out: Float64Array, q: Float64Array, previous: Float64Array, step: number): void {
  const x = q[0]!, y = q[1]!, z = q[2]!, w = q[3]!;
  const px = previous[0]!, py = previous[1]!, pz = previous[2]!, pw = previous[3]!;
  const dx = -w * px + x * pw - y * pz + z * py;
  const dy = -w * py + x * pz + y * pw - z * px;
  const dz = -w * pz - x * py + y * px + z * pw;
  const dw = w * pw + x * px + y * py + z * pz;
  const sinHalf = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const signed = dw < 0 ? -1 : 1;
  const factor = sinHalf < 1e-7 ? 2 * signed / step : 2 * signed * Math.atan2(sinHalf, Math.abs(dw)) / (sinHalf * step);
  out[0] = dx * factor;
  out[1] = dy * factor;
  out[2] = dz * factor;
}

export function limitLength(out: Float64Array, maximum: number): void {
  const squared = out[0]! ** 2 + out[1]! ** 2 + out[2]! ** 2;
  if (squared <= maximum ** 2) return;
  const factor = maximum / Math.sqrt(squared);
  out[0]! *= factor;
  out[1]! *= factor;
  out[2]! *= factor;
}
