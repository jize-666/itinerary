import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CollisionWorld } from "@/engine/diorama/collision";
import { photoSize, readOptions, percentile, renderDpr } from "@/engine/diorama/options";
import { photoName } from "@/components/diorama/photos";

describe("diorama camera clearance", () => {
  type Point = [number, number, number];
  function panel(world: CollisionWorld, a: Point, b: Point, c: Point, d: Point) {
    world.triangle(new Vector3(...a), new Vector3(...b), new Vector3(...c));
    world.triangle(new Vector3(...a), new Vector3(...c), new Vector3(...d));
  }
  function stop(world: CollisionWorld, from: Point, to: Point) {
    const eye = new Vector3(...from);
    const destination = new Vector3(...to);
    const fraction = world.fraction(eye, destination);
    expect(fraction).toBeGreaterThan(0);
    expect(fraction).toBeLessThan(1);
    return eye.lerp(destination, fraction);
  }
  it("blocks a thick wall and leaves its doorway open", () => {
    const world = new CollisionWorld();
    for (const z of [0, 0.24]) {
      panel(world, [-2, 0.2, z], [-0.55, 0.2, z], [-0.55, 3, z], [-2, 3, z]);
      panel(world, [0.55, 0.2, z], [2, 0.2, z], [2, 3, z], [0.55, 3, z]);
      panel(world, [-0.55, 2.3, z], [0.55, 2.3, z], [0.55, 3, z], [-0.55, 3, z]);
    }
    expect(stop(world, [1, 1.3, 3], [1, 1.3, -3]).z).toBeGreaterThan(0.37);
    expect(stop(world, [1, 1.3, -3], [1, 1.3, 3]).z).toBeLessThan(-0.13);
    expect(world.fraction(new Vector3(0, 1.3, 3), new Vector3(0, 1.3, -3))).toBe(1);
  });
  it("preserves clearance above and underneath a sloping roof", () => {
    const world = new CollisionWorld();
    panel(world, [-2, 1, -2], [2, 3, -2], [2, 3, 2], [-2, 1, 2]);
    const roofY = 2.25; // y = 2 + x/2 at x = .5
    expect(stop(world, [0.5, 4, 0], [0.5, 0.4, 0]).y).toBeGreaterThan(roofY + 0.14);
    expect(stop(world, [0.5, 0.4, 0], [0.5, 4, 0]).y).toBeLessThan(roofY - 0.14);
  });
  it("stops on both sides of a thin folded cloth", () => {
    const world = new CollisionWorld();
    panel(world, [-1, 0.4, -0.2], [0, 0.4, 0.2], [0, 2, 0.2], [-1, 2, -0.2]);
    panel(world, [0, 0.4, 0.2], [1, 0.4, -0.2], [1, 2, -0.2], [0, 2, 0.2]);
    // At x=.5 the two directions meet the same panel at z=0.
    expect(stop(world, [0.5, 1, 2], [0.5, 1, -2]).z).toBeGreaterThan(0.14);
    expect(stop(world, [0.5, 1, -2], [0.5, 1, 2]).z).toBeLessThan(-0.14);
  });
  it("stops above the floor along a downward dolly", () => {
    const a = new Vector3(0, 3, 3),
      b = new Vector3(0, -2, 3);
    const u = new CollisionWorld().fraction(a, b);
    expect(a.lerp(b, u).y).toBeCloseTo(0.25);
  });
});
describe("integration and photos", () => {
  it("accepts the four supported URL options", () => {
    expect(readOptions("?lokasi=pasar&tur=1&q=low&fps")).toEqual({
      focus: "pasar",
      autoTour: true,
      quality: "low",
      showFps: true,
    });
    expect(readOptions("?lokasi=no&q=ultra").focus).toBeUndefined();
    expect(readOptions("?lokasi=no&q=ultra").quality).toBeUndefined();
  });
  it("preserves the viewport aspect with a 1920px long side", () => {
    expect(photoSize(360, 640)).toEqual([1080, 1920]);
    expect(photoSize(1280, 720)).toEqual([1920, 1080]);
    expect(photoSize(1000, 750)).toEqual([1920, 1440]);
  });
  it("names both ZIP formats in each language", () => {
    expect(photoName(5, "en", "jpeg")).toBe("diorama-solo-south-west.jpg");
    expect(photoName(1, "id", "png")).toBe("diorama-solo-timur-laut.png");
    expect(photoName(8, "id", "jpeg")).toBe("diorama-solo-atas.jpg");
  });
  it("uses the nearest-rank p95", () =>
    expect(percentile(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95));
});

it("reduces pixel cost even on a DPR-1 display and caps high-DPI rendering", () => {
  expect(renderDpr("high", 1)).toBe(1);
  expect(renderDpr("medium", 1)).toBeCloseTo(0.82);
  expect(renderDpr("low", 1)).toBeCloseTo(0.6);
  expect(renderDpr("high", 3)).toBe(1.5);
  expect(renderDpr("low", 3)).toBeCloseTo(0.9);
});
