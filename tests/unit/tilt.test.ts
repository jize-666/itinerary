import { describe, expect, it } from "vitest";
import { HOME } from "@/engine/motion/tokens";
import { CENTER, follow, pointerToUnit, settled } from "@/engine/motion/tilt";

describe("pointerToUnit", () => {
  it("tengah layar = 0, tepi = ±1", () => {
    expect(pointerToUnit(720, 450, 1440, 900)).toEqual({ x: 0, y: 0 });
    expect(pointerToUnit(0, 0, 1440, 900)).toEqual({ x: -1, y: -1 });
    expect(pointerToUnit(1440, 900, 1440, 900)).toEqual({ x: 1, y: 1 });
  });

  it("kursor di luar jendela dijepit ke ±1", () => {
    expect(pointerToUnit(-200, 5000, 1440, 900)).toEqual({ x: -1, y: 1 });
  });

  it("layar tanpa ukuran dianggap tengah", () => {
    expect(pointerToUnit(10, 10, 0, 0)).toBe(CENTER);
    expect(pointerToUnit(10, 10, Number.NaN, 900)).toBe(CENTER);
  });
});

describe("follow", () => {
  const target = { x: 1, y: -1 };

  it("setelah satu tau, sisa jarak tinggal 1/e", () => {
    const p = follow(CENTER, target, HOME.follow, HOME.follow);
    expect(p.x).toBeCloseTo(1 - 1 / Math.E, 6);
    expect(p.y).toBeCloseTo(-(1 - 1 / Math.E), 6);
  });

  it("hasilnya sama berapa pun laju frame-nya (60 fps vs 30 fps)", () => {
    let a = CENTER;
    for (let i = 0; i < 60; i++) a = follow(a, target, 1000 / 60, HOME.follow);
    let b = CENTER;
    for (let i = 0; i < 30; i++) b = follow(b, target, 1000 / 30, HOME.follow);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  });

  it("tidak pernah melewati sasaran", () => {
    let p = CENTER;
    for (let i = 0; i < 400; i++) {
      p = follow(p, target, 16, HOME.follow);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(-1);
    }
    expect(settled(p, target, HOME.rest)).toBe(true);
  });

  it("dt nol atau negatif: diam; dt sangat besar (tab baru kembali): langsung tiba", () => {
    expect(follow(CENTER, target, 0, HOME.follow)).toBe(CENTER);
    expect(follow(CENTER, target, -5, HOME.follow)).toBe(CENTER);
    expect(follow(CENTER, target, 60_000, HOME.follow)).toBe(target);
  });
});

describe("settled", () => {
  it("benar hanya bila kedua sumbu di bawah ambang", () => {
    expect(settled({ x: 0.001, y: 0 }, CENTER, HOME.rest)).toBe(true);
    expect(settled({ x: 0.001, y: 0.01 }, CENTER, HOME.rest)).toBe(false);
  });
});
