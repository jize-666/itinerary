import { describe, expect, it } from "vitest";
import {
  anglePose,
  CALM_SECONDS,
  clampTarget,
  cycleLocation,
  DIRECTIONS,
  eyeOf,
  FOV,
  focusPose,
  fromEye,
  homePose,
  NEXT,
  rightOf,
  SCENE_STARTS,
  sceneIndex,
  TOUR_SECONDS,
  tourPose,
  upOf,
  type Pose,
  type Vec,
} from "@/engine/diorama/camera";

const aspects = [9 / 16, 16 / 9, 4 / 3];
const subtract = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec): Vec => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Independent pinhole projection, using the view ray and world up. This catches
// using full width instead of half width or omitting the near plate's depth.
function screen(pose: Pose, aspect: number, point: Vec): Vec {
  const eye = eyeOf(pose),
    forward = normalize(subtract(pose.target, eye));
  const upHint: Vec = pose.elevation === 90 ? [0, 0, -1] : [0, 1, 0];
  const right = normalize(cross(forward, upHint)),
    up = cross(right, forward);
  const offset = subtract(point, eye),
    depth = dot(offset, forward),
    half = depth * Math.tan((FOV * Math.PI) / 360);
  return [dot(offset, right) / (half * aspect), dot(offset, up) / half, depth];
}
const hull: Vec[] = [
  [-0.88, 5.25, -3.65],
  [0.88, 5.25, -3.65],
  [-7.7, 3.35, -4.48],
  [7.5, 3.6, -4.7],
];
for (const x of [-11, 11]) for (const y of [-1.1, 0.1]) for (const z of [-8, 8]) hull.push([x, y, z]);
function checkMargin(pose: Pose, aspect: number) {
  for (const point of hull) {
    const [x, y, d] = screen(pose, aspect, point);
    expect(d).toBeGreaterThan(0);
    expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(0.84);
  }
}
function closeVector(a: Vec, b: Vec, places = 7) {
  for (const k of [0, 1, 2] as const) expect(a[k]).toBeCloseTo(b[k], places);
}

describe("diorama framing and direction presets", () => {
  it("uses the eight clockwise 45-degree starts and a north-up overhead view", () => {
    expect(DIRECTIONS.map((d) => d.azimuth)).toEqual([0, 45, 90, 135, 180, 225, 270, 315, 180]);
    expect(DIRECTIONS.map((d) => d.elevation)).toEqual([28, 28, 28, 28, 28, 28, 28, 28, 90]);
    expect(DIRECTIONS.map((d) => d.id)).toEqual([
      "utara",
      "timur-laut",
      "timur",
      "tenggara",
      "selatan",
      "barat-daya",
      "barat",
      "barat-laut",
      "atas",
    ]);
    expect(DIRECTIONS.map((d) => d.en)).toEqual([
      "north",
      "north-east",
      "east",
      "south-east",
      "south",
      "south-west",
      "west",
      "north-west",
      "top",
    ]);
    const top = anglePose(8, 1);
    closeVector(upOf(top), [0, 0, -1]);
    closeVector(rightOf(top), [1, 0, 0]);
    expect(screen(top, 1, [0, 0, -6])[1]).toBeGreaterThan(0);
  });
  it.each(aspects)("keeps at least 8%% of each side free at aspect %s", (aspect) => {
    expect(homePose(aspect)).toMatchObject({ azimuth: 180, elevation: 28 });
    checkMargin(homePose(aspect), aspect);
    for (let i = 0; i < DIRECTIONS.length; i++) checkMargin(anglePose(i, aspect), aspect);
    for (let t = 4; t <= 34; t += 0.5) checkMargin(tourPose(t, aspect), aspect);
  });
  it("frames the portrait canvas farther back using the same vertical focal angle", () => {
    expect(FOV).toBe(38);
    expect(homePose(9 / 16).distance).toBeGreaterThan(homePose(4 / 3).distance);
    expect(homePose(4 / 3).distance).toBeGreaterThan(homePose(16 / 9).distance);
  });
  it("round-trips a physical position with unwrapped yaw, including the zenith", () => {
    for (const altitude of [8, 28, 85, 90])
      for (const yaw of [-184, 45, 360, 540, 900]) {
        const pose: Pose = { target: [-3.4, 1.2, 2.3], azimuth: yaw, elevation: altitude, distance: 7.8 };
        const back = fromEye(eyeOf(pose), pose.target, yaw);
        expect(back.azimuth).toBeCloseTo(yaw, 7);
        expect(back.elevation).toBeCloseTo(altitude, 7);
        expect(back.distance).toBeCloseTo(7.8, 7);
      }
  });
});

describe("diorama storyboard", () => {
  it("allocates six shots totalling 64 seconds, including the final one-second hold", () => {
    expect(SCENE_STARTS).toEqual([0, 4, 34, 42, 50, 58]);
    expect(TOUR_SECONDS).toBe(64);
    const end = [...SCENE_STARTS.slice(1), TOUR_SECONDS];
    expect(SCENE_STARTS.map((start, i) => end[i]! - start)).toEqual([4, 30, 8, 8, 8, 6]);
    expect(CALM_SECONDS.map(sceneIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(SCENE_STARTS.map(sceneIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(tourPose(0, 1.5)).toEqual(homePose(1.5));
    expect(tourPose(4, 1.5).distance).toBeLessThan(tourPose(0, 1.5).distance);
    expect(tourPose(63, 1.5)).toEqual(tourPose(64, 1.5));
    expect(tourPose(64, 1.5)).toEqual({ ...anglePose(8, 1.5), azimuth: 540 });
  });
  it("runs a full continuous south → west → north → east → south orbit", () => {
    let previous = tourPose(4, 1).azimuth;
    expect(previous).toBe(180);
    for (let frame = 1; frame <= 300; frame++) {
      const pose = tourPose(4 + frame * 0.1, 1);
      expect(pose.azimuth).toBeGreaterThan(previous);
      expect(pose.azimuth - previous).toBeLessThan(1.3);
      expect(pose.elevation).toBe(28);
      previous = pose.azimuth;
    }
    expect(previous).toBe(540);
    expect(tourPose(19, 1).azimuth).toBeCloseTo(360, 8);
  });
  it("joins moving segments continuously, with a frozen start and stop", () => {
    const step = 1e-4,
      aspect = 16 / 9;
    for (const t of [
      4, 34, 36.7, 39.1, 42, 43.35, 44.5, 46, 47.15, 50, 51.35, 52.45, 53.65, 54.85, 56.15, 57, 58, 58.75,
      59.14, 60, 60.84, 61.81, 63,
    ]) {
      const before = tourPose(t - step, aspect),
        at = tourPose(t, aspect),
        after = tourPose(t + step, aspect);
      const left = subtract(eyeOf(at), eyeOf(before)),
        right = subtract(eyeOf(after), eyeOf(at));
      for (const k of [0, 1, 2] as const) expect(Math.abs((left[k] - right[k]) / step)).toBeLessThan(0.03);
      expect(Math.abs(after.azimuth - before.azimuth)).toBeLessThan(0.1);
    }
  });
  it("slides in front of the market with fixed aim direction and actual parallax", () => {
    const a = tourPose(47.15, 16 / 9),
      near = eyeOf(a),
      vector = subtract(near, a.target);
    const b = tourPose(50, 16 / 9),
      delta = subtract(eyeOf(b), near);
    expect(Math.hypot(...delta)).toBeGreaterThan(1.7);
    closeVector(subtract(b.target, a.target), delta);
    for (const t of [47.55, 48, 48.7, 49.45, 50]) {
      const q = tourPose(t, 16 / 9);
      closeVector(subtract(eyeOf(q), q.target), vector);
    }
    const forward = normalize(subtract(a.target, near));
    const point = (d: number): Vec => [
      near[0] + d * forward[0],
      near[1] + d * forward[1],
      near[2] + d * forward[2],
    ];
    expect(Math.abs(screen(b, 16 / 9, point(3))[0])).toBeGreaterThan(
      Math.abs(screen(b, 16 / 9, point(9))[0]),
    );
  });
  it.each(aspects)("keeps aim inside the plinth and scrubbed poses deterministic at aspect %s", (aspect) => {
    const samples: Pose[] = [];
    for (let i = 0; i <= 640; i++) {
      const pose = tourPose(i / 10, aspect);
      expect(clampTarget(pose.target)).toEqual(pose.target);
      expect(eyeOf(pose)[1]).toBeGreaterThan(1);
      samples.push(pose);
    }
    for (let i = 640; i >= 0; i -= 17) expect(tourPose(i / 10, aspect)).toEqual(samples[i]);
  });
});

describe("diorama location navigation", () => {
  it("wraps previous and next across all three views from any selection", () => {
    expect(cycleLocation(null, 1)).toBe("pendhapa");
    expect(cycleLocation(null, -1)).toBe("laweyan");
    expect(NEXT.map((id) => cycleLocation(id, 1))).toEqual(["pasar", "laweyan", "pendhapa"]);
    expect(NEXT.map((id) => cycleLocation(id, -1))).toEqual(["laweyan", "pendhapa", "pasar"]);
    expect(cycleLocation("pendhapa", 3)).toBe("pendhapa");
  });
  it("gives each location a distinct focus in its own zone", () => {
    for (const id of NEXT) {
      const p = focusPose(id, 1.5);
      expect(clampTarget(p.target)).toEqual(p.target);
      expect(p.distance).toBeLessThan(homePose(1.5).distance);
      if (id === "pendhapa") expect(p.target[2]).toBeLessThan(0);
      if (id === "pasar") expect(p.target[0]).toBeGreaterThan(0);
      if (id === "laweyan") expect(p.target[0]).toBeLessThan(0);
    }
    expect(clampTarget([-30, -4, 20])).toEqual([-11, 0, 8]);
    expect(clampTarget([30, 9, -20])).toEqual([11, 5.5, -8]);
  });
});
