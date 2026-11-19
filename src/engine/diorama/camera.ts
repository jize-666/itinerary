/** Coordinates in exhibition units, with +X east, +Y up and −Z north.
 * Azimuth is clockwise viewed from above and may exceed 360° during a shot. */
export type Vec = [number, number, number];
export type Pose = { target: Vec; azimuth: number; elevation: number; distance: number };
export type LocationId = "pendhapa" | "pasar" | "laweyan";
export const FOV = 38;
export const TOUR_SECONDS = 64;
export const SCENE_STARTS = [0, 4, 34, 42, 50, 58] as const;
export const CALM_SECONDS = [0, 17.2, 41.9, 49.7, 57.95, 64] as const;
export const NEXT = ["pendhapa", "pasar", "laweyan"] as const;
export const DIRECTIONS = [
  { id: "utara", en: "north", azimuth: 0, elevation: 28 },
  { id: "timur-laut", en: "north-east", azimuth: 45, elevation: 28 },
  { id: "timur", en: "east", azimuth: 90, elevation: 28 },
  { id: "tenggara", en: "south-east", azimuth: 135, elevation: 28 },
  { id: "selatan", en: "south", azimuth: 180, elevation: 28 },
  { id: "barat-daya", en: "south-west", azimuth: 225, elevation: 28 },
  { id: "barat", en: "west", azimuth: 270, elevation: 28 },
  { id: "barat-laut", en: "north-west", azimuth: 315, elevation: 28 },
  { id: "atas", en: "top", azimuth: 180, elevation: 90 },
] as const;

const RAD = Math.PI / 180;
const CENTER: Vec = [0, 0.92, 0];
const halfWidth = 11,
  halfDepth = 8;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const radians = (degrees: number) => degrees * RAD;
const safeAspect = (n: number) => (Number.isFinite(n) && n > 0 ? n : 1);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const blend = (a: number, b: number, t: number) => a + (b - a) * t;
const repeat = (a: number, n: number) => ((a % n) + n) % n;
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function boxCorners(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Vec[] {
  const points: Vec[] = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) points.push([x, y, z]);
  return points;
}

// The support points include the apron and suspended plinth below ground level.
// Separate envelopes for the pavilion and gardens avoid fitting an empty corner
// of a tall, full-width bounding cube in portrait.
const exhibition = [
  ...boxCorners(-halfWidth, halfWidth, -1.1, 0.12, -halfDepth, halfDepth),
  ...boxCorners(-4.86, 4.86, 0, 2.54, -6.42, -0.29),
  ...boxCorners(-0.92, 0.92, 2.54, 5.3, -3.81, -3.49),
  ...boxCorners(-9.95, 9.95, 0, 3.85, -6.7, 6.7),
];

function axes(azimuth: number, elevation: number): { outward: Vec; right: Vec; up: Vec } {
  const a = radians(azimuth),
    e = radians(elevation);
  const sa = Math.sin(a),
    ca = Math.cos(a),
    se = Math.sin(e);
  const ce = elevation === 90 ? 0 : Math.cos(e);
  return {
    outward: [sa * ce, se, -ca * ce],
    right: [-ca, 0, -sa],
    up: [-sa * se, ce, ca * se],
  };
}

export function eyeOf(pose: Pose): Vec {
  const { outward } = axes(pose.azimuth, pose.elevation);
  const [x, y, z] = pose.target;
  return [x + outward[0] * pose.distance, y + outward[1] * pose.distance, z + outward[2] * pose.distance];
}

/** Supplying the analytical up vector to lookAt also fixes north-up at the zenith. */
export function upOf(pose: Pose): Vec {
  return axes(pose.azimuth, pose.elevation).up;
}
export function rightOf(pose: Pose): Vec {
  return axes(pose.azimuth, pose.elevation).right;
}

export function clampTarget([x, y, z]: Vec): Vec {
  return [
    clamp(Number.isNaN(x) ? 0 : x, -halfWidth, halfWidth),
    clamp(Number.isNaN(y) ? 0 : y, 0, 5.5),
    clamp(Number.isNaN(z) ? 0 : z, -halfDepth, halfDepth),
  ];
}

export function fromEye(eye: Vec, target: Vec, nearAzimuth = 180): Pose {
  const x = eye[0] - target[0],
    y = eye[1] - target[1],
    z = eye[2] - target[2];
  const planar = Math.hypot(x, z);
  const raw = planar < 1e-9 ? nearAzimuth : Math.atan2(x, -z) / RAD;
  const azimuth = raw + 360 * Math.round((nearAzimuth - raw) / 360);
  return {
    target: [...target],
    azimuth,
    elevation: Math.atan2(y, planar) / RAD,
    distance: Math.hypot(planar, y),
  };
}

// A conservative C1 maximum avoids radial velocity jumps when a different
// plinth corner becomes the limiting point during the full orbit.
function smoothMax(a: number, b: number): number {
  const width = 0.075,
    difference = Math.abs(a - b);
  if (difference >= width) return Math.max(a, b);
  return Math.max(a, b) + (width - difference) ** 2 / (4 * width);
}

export function fitDistance(
  points: readonly Vec[],
  target: Vec,
  azimuth: number,
  elevation: number,
  aspect: number,
  margin = 0.08,
): number {
  const { outward, right, up } = axes(azimuth, elevation);
  const height = Math.tan(radians(FOV / 2)) * (1 - 2 * clamp(margin, 0, 0.49));
  const width = height * safeAspect(aspect);
  let distance = 0.25;
  for (const p of points) {
    const delta: Vec = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
    const depth = dot(delta, outward);
    distance = smoothMax(distance, depth + Math.abs(dot(delta, right)) / width);
    distance = smoothMax(distance, depth + Math.abs(dot(delta, up)) / height);
  }
  return distance + 0.006;
}

function view(azimuth: number, elevation: number, aspect: number, margin: number): Pose {
  return {
    target: [...CENTER],
    azimuth,
    elevation,
    distance: fitDistance(exhibition, CENTER, azimuth, elevation, aspect, margin),
  };
}

export function homePose(aspect: number): Pose {
  return view(180, 28, aspect, 0.107);
}
export function anglePose(index: number, aspect: number): Pose {
  const direction = DIRECTIONS[index] ?? DIRECTIONS[4];
  return view(direction.azimuth, direction.elevation, aspect, 0.085);
}

const zones: Record<LocationId, { target: Vec; yaw: number; elevation: number; bounds: Vec[] }> = {
  pendhapa: {
    target: [0, 2.06, -3.46],
    yaw: 158,
    elevation: 23,
    bounds: boxCorners(-4.82, 4.82, 0, 5.26, -6.4, -0.3),
  },
  pasar: {
    target: [5.7, 1.28, 2.94],
    yaw: 214,
    elevation: 24,
    bounds: boxCorners(1.65, 9.82, 0, 3.4, -0.35, 6.1),
  },
  laweyan: {
    target: [-5.66, 1.13, 3],
    yaw: 202,
    elevation: 29,
    bounds: boxCorners(-9.7, -1.85, 0, 3.1, -0.5, 6.53),
  },
};
export function focusPose(id: LocationId, aspect: number): Pose {
  const { target, yaw, elevation, bounds } = zones[id];
  return {
    target: [...target],
    azimuth: yaw,
    elevation,
    distance: fitDistance(bounds, target, yaw, elevation, aspect, 0.083),
  };
}

export function cycleLocation(id: LocationId | null, delta: number): LocationId {
  const step = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  if (id === null && step === 0) return NEXT[0];
  const i = id === null ? (step > 0 ? -1 : 0) : NEXT.indexOf(id);
  return NEXT[repeat(i + step, NEXT.length)]!;
}

export function sceneIndex(time: number): number {
  for (let i = SCENE_STARTS.length - 1; i > 0; i--) if (time >= SCENE_STARTS[i]!) return i;
  return 0;
}

// Integrated smoothstep velocity accelerates briefly, cruises and decelerates.
// Its total is exactly one revolution. Longitude is never reduced modulo 360.
function orbitFraction(t: number): number {
  const ramp = 0.065;
  function enter(s: number) {
    const u = s / ramp;
    return (ramp * u * u * u * (1 - u * 0.5)) / (1 - ramp);
  }
  if (t < ramp) return enter(Math.max(0, t));
  if (t > 1 - ramp) return 1 - enter(Math.max(0, 1 - t));
  return (t - ramp / 2) / (1 - ramp);
}

type Shot = { time: number; eye: Vec; aim: Vec };
function place([x, y, z]: Vec, tx: number, tz: number, yaw: number): Vec {
  const s = Math.sin(yaw),
    c = Math.cos(yaw);
  return [tx + c * x + s * z, y, tz - s * x + c * z];
}
const market = (v: Vec): Vec => place(v, 5.75, 3.05, -0.17);
const batik = (v: Vec): Vec => place(v, -5.7, 3, 0.12);
const cloth: Vec = batik([-0.87, 1.02, 0.48]);
const path: readonly Shot[] = [
  { time: 36.7, eye: [0.07, 4.9, 10.4], aim: [0, 1.02, -1.36] },
  { time: 39.1, eye: [0.59, 2.15, 3.25], aim: [-0.43, 1.2, -1.88] },
  { time: 42, eye: [0.92, 1.78, 0.46], aim: [-0.72, 1.23, -1.88] },
  { time: 43.35, eye: [0.56, 1.93, 2.47], aim: [0.31, 1.2, -1.16] },
  { time: 44.5, eye: [0.72, 1.95, 4.4], aim: [2.43, 1.17, 1.12] },
  { time: 46, eye: market([-3.63, 1.67, 2.73]), aim: market([-3.1, 0.74, 0.55]) },
  { time: 47.15, eye: market([-2.9, 1.5, 2.6]), aim: market([-2.37, 0.57, 0.42]) },
  { time: 50, eye: market([-0.43, 1.5, 2.6]), aim: market([0.1, 0.57, 0.42]) },
  { time: 51.35, eye: market([-2.86, 1.98, 2.76]), aim: market([-2.33, 1.05, 0.58]) },
  { time: 52.45, eye: [0.83, 2.26, 6.04], aim: [0.54, 1.1, 2.53] },
  { time: 53.65, eye: [-1.63, 2.46, 8.34], aim: [-4.23, 1.14, 3.86] },
  { time: 54.85, eye: [-6.06, 2.16, 8.17], aim: batik([-0.76, 1.15, 0.45]) },
  { time: 56.15, eye: batik([-1.7, 1.55, 3.8]), aim: cloth },
  { time: 57.0, eye: batik([-1.67, 1.36, 3.05]), aim: cloth },
  { time: 58, eye: batik([-1.62, 1.24, 2.1]), aim: cloth },
  { time: 58.75, eye: batik([-1.67, 1.36, 3.05]), aim: cloth },
  { time: 59.14, eye: batik([-1.7, 1.67, 3.76]), aim: cloth },
  { time: 60.0, eye: [-6.61, 3.47, 8.39], aim: [-5.15, 1.17, 3.47] },
];

// Shape-preserving, time-weighted Hermite slopes. Each coordinate stays inside
// its adjacent waypoint interval, including turns in the narrow courtyard.
function tangent(prev: number, value: number, next: number, h0: number, h1: number): number {
  const before = (value - prev) / h0,
    after = (next - value) / h1;
  if (before * after <= 0) return 0;
  const a = 2 * h1 + h0,
    b = h1 + 2 * h0;
  return (a + b) / (a / before + b / after);
}
function sampleVector(shots: readonly Shot[], index: number, t: number, key: "eye" | "aim"): Vec {
  const left = shots[index]!,
    right = shots[index + 1]!,
    prev = shots[index - 1],
    next = shots[index + 2];
  const dt = right.time - left.time,
    u = (t - left.time) / dt,
    u2 = u * u,
    u3 = u2 * u;
  const value: Vec = [0, 0, 0];
  for (const k of [0, 1, 2] as const) {
    const x = left[key][k],
      y = right[key][k];
    const m = prev ? tangent(prev[key][k], x, y, left.time - prev.time, dt) : 0;
    const n = next ? tangent(x, y, next[key][k], dt, next.time - right.time) : 0;
    value[k] =
      (2 * u3 - 3 * u2 + 1) * x + (u3 - 2 * u2 + u) * dt * m + (-2 * u3 + 3 * u2) * y + (u3 - u2) * dt * n;
  }
  return value;
}

export function tourPose(seconds: number, ratio: number): Pose {
  const t = clamp(Number.isNaN(seconds) ? 0 : seconds, 0, TOUR_SECONDS),
    aspect = safeAspect(ratio);
  if (t < 4) {
    const advance = smoothstep(clamp((t - 0.6) / 3.4, 0, 1));
    return view(180, 28, aspect, blend(0.107, 0.085, advance));
  }
  if (t <= 34) return view(180 + 360 * orbitFraction((t - 4) / 30), 28, aspect, 0.085);

  const finish: Pose = { ...anglePose(8, aspect), azimuth: 540 };
  if (t >= 63) return finish;
  const start = view(540, 28, aspect, 0.085),
    top = eyeOf(finish);
  const shots: Shot[] = [
    { time: 34, eye: eyeOf(start), aim: start.target },
    ...path,
    { time: 60.84, eye: [-3.92, Math.max(5.4, top[1] * 0.3), 9.12], aim: [-2.65, 1.09, 2.36] },
    { time: 61.81, eye: [0, top[1] * 0.68, 6.32], aim: [0, CENTER[1], 0] },
    { time: 63, eye: top, aim: finish.target },
  ];
  const index = shots.findIndex((_, i) => i + 1 < shots.length && t <= shots[i + 1]!.time);
  // After the orbit the dolly tracks look into the exhibit from its southern
  // half. The last north-up lift has the same unwrapped azimuth, 540°.
  return fromEye(
    sampleVector(shots, index, t, "eye"),
    clampTarget(sampleVector(shots, index, t, "aim")),
    540,
  );
}
