import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFilm, type PanelSlide } from "@/engine/slides/build-slides";
import { type TripView } from "@/lib/trip";
import { filmFixture } from "../../e2e/helpers";
import { cameraAt, travel } from "@/engine/stage/lawu/journey";
import { fallbackGround, geo, groundY, groundFrom, meshY, readGround, SITE, world } from "@/engine/stage/lawu/ground";
import { firstLight, horizon, makeHorizon, solar } from "@/engine/stage/lawu/sun";
import field from "@/components/film/stage3d/lawu/tea-skyline.json";
import morning from "@/engine/stage/lawu/morning.json";
import { TIPS } from "@/engine/mascot/lines";
import { tipAt } from "@/engine/mascot/guide";
const bytes = Uint8Array.from(readFileSync("public/stage/lawu/relief.bin")).buffer,
  dem = readGround(bytes);
describe("western mountain relief and light, April 9 WIB", () => {
  // Independent PyEphem 4.2.1 / libastro topocentric calculations (refraction disabled).
  it.each([
    [337.845, -0.8333, 82.6541],
    [697.194, 74.9198, 0],
    [720, 73.8778, 339.2192],
    [1056.443, -0.8333, 277.5335],
  ])("sun at local minute %s", (m, alt, az) => {
    const v = solar(m);
    expect(Math.abs(v.altitude - alt)).toBeLessThan(0.05);
    expect(Math.abs(((v.azimuth - az + 540) % 360) - 180)).toBeLessThan(0.2);
  });
  it("upper limb crosses the measured ridge, later than the standard level-horizon sunrise", () => {
    const h = makeHorizon(dem),
      m = firstLight(h);
    expect(Math.abs(m - 375.2963)).toBeLessThan(0.5);
    expect(horizon(dem, 81.32)).toBeCloseTo(8.718, 1);
    expect(m - 337.845).toBeGreaterThan(36);
    expect(Math.abs(m - morning.firstMinute)).toBeLessThan(0.001);
  });
  it("distinguishes first light between the low and high tea rows", () => {
    const values = field.horizons.filter((_, i) => i % 3 === 1).map((a) => a / 8);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(2);
    expect(values[Math.floor(values.length / 2)]).toBeCloseTo(horizon(dem, 81.5), 0);
  });
  it.each([
    ["gate", 1497],
    ["pyramid", 1180],
    ["summit", 3246],
    ["tea", 1101],
    ["falls", 1054],
  ] as const)("raw HGT bilinear check at %s", (key, height) => {
    expect(Math.abs(dem.metres(SITE[key][0], SITE[key][1]) - height)).toBeLessThan(1.1);
    const q = world(SITE[key]);
    const [lat, lon] = geo(q.x, q.z);
    expect(lat).toBeCloseTo(SITE[key][0], 9);
    expect(lon).toBeCloseTo(SITE[key][1], 9);
  });
  it("keeps the original grid and falls back on a missing, truncated or corrupt asset", () => {
    expect(groundFrom(bytes).source).toBe("dem");
    for (const raw of [null, bytes.slice(0, 71), new ArrayBuffer(100)]) expect(groundFrom(raw)).toBe(fallbackGround);
  });
});
describe("camera, lights and captions", () => {
  const film = buildFilm(filmFixture() as unknown as TripView);
  const panels = film.slides.map((s, i) => (s.kind === "panel" && s.theme === "lawu" ? i : -1)).filter((i) => i >= 0),
    [a, b] = panels as [number, number];
  it("same hour, stop lights and spatial position when progressively reversing", () => {
    for (let n = 0; n <= 100; n++) {
      const p = n / 100,
        fw = travel(film, { from: a, to: b, p })!,
        rv = travel(film, { from: b, to: a, p: 1 - p })!;
      expect(fw.index).toBeCloseTo(rv.index, 10);
      expect(fw.minute).toBeCloseTo(rv.minute, 10);
      expect(fw.passed).toBeCloseTo(rv.passed, 10);
    }
    expect(travel(film, { from: a, to: a, p: 0 })!.passed).toBe((film.slides[a] as PanelSlide).n);
    expect(travel(film, { from: 0, to: 0, p: 0 })).toBeNull();
  });
  for (const ground of [dem, fallbackGround])
    it(`continuous clearance along both sides of every anchor, ${ground.source}`, () => {
      for (const [aspect, stride] of [
        [0.5625, 6.5],
        [1.6, 10],
        [0.9, 14],
      ] as const) {
        let last = cameraAt(ground, 0, aspect, { x: 1, y: 1 }, stride);
        for (let i = 0; i <= 4000; i++) {
          const pose = cameraAt(ground, i / 400, aspect, { x: 1, y: 1 }, stride);
          expect(pose.y - Math.max(groundY(ground, pose.x, pose.z), meshY(ground, pose.x, pose.z, stride))).toBeGreaterThan(
            1.05,
          );
          expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(4.2);
          last = pose;
        }
      }
    });
  it("identical held input gives identical pose and the shared look source changes perspective", () => {
    const neutral = cameraAt(dem, 3.37),
      shift = cameraAt(dem, 3.37, 1, { x: 1, y: 0.6 });
    expect(cameraAt(dem, 3.37)).toEqual(neutral);
    expect(shift.x).not.toBe(neutral.x);
    expect(shift.pitch).not.toBe(neutral.pitch);
  });
  it("puts the new bilingual line only at the morning stop", () => {
    expect(tipAt({ kind: "panel", moving: false, gate: "off", beat: false, sheet: false, mountainDawn: true })).toBe(
      "mountain",
    );
    expect(TIPS.mountain[0]?.en).toContain("ridge");
    expect(TIPS.mountain[0]?.id).toContain("bukit");
  });
});
