import { describe, expect, it } from "vitest";
import { GONG_ZOOM, VIEW, approach, gongStep, pointerLook, recenterBase, scrollDepth, tiltLook, zoomByPinch, zoomByWheel } from "@/engine/motion/view";

describe("kedalaman ikut gulir", () => {
  it("nol di kedua ujung perpindahan, terbesar di tengah, dan menerus", () => {
    expect(scrollDepth(0)).toBe(0);
    expect(scrollDepth(1)).toBeCloseTo(0, 12);
    expect(scrollDepth(0.5)).toBeCloseTo(VIEW.push, 12);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const d = scrollDepth(i / 100);
      expect(Math.abs(d - prev)).toBeLessThan(0.01);
      prev = d;
    }
    // di luar rentang ditahan
    expect(scrollDepth(-0.3)).toBe(0);
    expect(scrollDepth(1.4)).toBeCloseTo(0, 12);
  });
});

describe("penghalus", () => {
  it("bebas laju frame: satu langkah 1 dtk sama dengan 60 langkah 1/60 dtk", () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 1 / 60, 0.3);
    expect(a).toBeCloseTo(approach(0, 1, 1, 0.3), 9);
    expect(approach(0.4, 0.4, 0.016, 0.3)).toBe(0.4);
  });
});

describe("arah pandang dari kursor dan kemiringan HP", () => {
  it("kursor: tengah layar = 0, tepi = ±1, di luar layar ditahan", () => {
    expect(pointerLook(500, 300, 1000, 600)).toEqual({ x: 0, y: 0 });
    expect(pointerLook(1000, 0, 1000, 600)).toEqual({ x: 1, y: -1 });
    expect(pointerLook(-50, 900, 1000, 600)).toEqual({ x: -1, y: 1 });
  });

  it("HP tegak: miring ke kanan = pandang ke kanan; sebesar VIEW.tilt = tepi; lebih dari itu ditahan", () => {
    const base = { beta: 60, gamma: 0 };
    expect(tiltLook(60, 0, base).x).toBeCloseTo(0, 9);
    expect(tiltLook(60, VIEW.tilt / 2, base).x).toBeCloseTo(0.5, 9);
    expect(tiltLook(60, 90, base).x).toBe(1);
    expect(tiltLook(60 + VIEW.tilt, 0, base).y).toBeCloseTo(1, 9);
  });

  it("layar mendatar: sumbu kemiringan ikut berputar", () => {
    const base = { beta: 0, gamma: 0 };
    const portrait = tiltLook(0, 8, base, 0);
    const landscape = tiltLook(8, 0, base, 90);
    expect(portrait.x).toBeCloseTo(landscape.x, 9);
  });

  it("melewati posisi tegak terbalik (beta melompat ±180) tidak membuat pandangan melompat", () => {
    const base = { beta: 178, gamma: 0 };
    expect(Math.abs(tiltLook(-178, 0, base).y)).toBeLessThan(0.3);
  });

  it("posisi memegang yang baru pelan-pelan menjadi netral", () => {
    let base = { beta: 60, gamma: 0 };
    for (let i = 0; i < 60 * 40; i++) base = recenterBase(base, 30, 10, 1 / 60);
    expect(base.beta).toBeCloseTo(30, 1);
    expect(base.gamma).toBeCloseTo(10, 1);
    // tapi dalam sekejap hampir tidak bergeser: gerak tangan tetap terasa
    const quick = recenterBase({ beta: 60, gamma: 0 }, 30, 10, 0.1);
    expect(Math.abs(quick.beta - 60)).toBeLessThan(1);
  });
});

describe("zoom dan dua tahap gulir di slide gong", () => {
  it("dua tahap: maju dari jauh mendekat dulu, maju lagi pindah slide; mundur dari dekat menjauh dulu", () => {
    expect(gongStep(0, 1)).toBe(1);
    expect(gongStep(1, 1)).toBeNull();
    expect(gongStep(1, -1)).toBe(0);
    expect(gongStep(0, -1)).toBeNull();
    // zoom cubit setengah jalan: dihitung menurut batas "dekat"
    expect(gongStep(GONG_ZOOM.near - 0.01, 1)).toBe(1);
    expect(gongStep(GONG_ZOOM.near, -1)).toBe(0);
  });

  it("Ctrl+roda dan cubit dibatasi 0–1, arahnya benar", () => {
    expect(zoomByWheel(0, -40)).toBeGreaterThan(0);
    expect(zoomByWheel(0.5, 40)).toBeLessThan(0.5);
    expect(zoomByWheel(0, 1e6)).toBe(0);
    expect(zoomByWheel(1, -1e6)).toBe(1);
    expect(zoomByPinch(0.2, 1)).toBeCloseTo(0.2, 9);
    expect(zoomByPinch(0.2, 2)).toBeGreaterThan(0.2);
    expect(zoomByPinch(0.2, 0.5)).toBeLessThan(0.2);
    expect(zoomByPinch(0, 100)).toBe(1);
    expect(zoomByPinch(1, 0)).toBe(0);
  });

  it("dekat tetap di luar badan gong: kamera tidak menembus", () => {
    // bidikan gong: jarak ±9,4 m; dekat = (1 − close) × jarak harus lebih dari jari-jari gong × skala (±0,7 m) + ruang
    expect((1 - GONG_ZOOM.close) * 9.4).toBeGreaterThan(2.5);
  });
});
