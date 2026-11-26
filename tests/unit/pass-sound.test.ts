/**
 * Suara tiket 3D (Tugas 12b): kejadian fisika → kadar gemerisik, dering, balik, sentuhan, dan desir.
 */
import { describe, expect, it } from "vitest";
import {
  CLINK_CAP,
  CLINK_MIN_INTERVAL_MS,
  CLINK_MIN_STRENGTH,
  RUSTLE_CAP,
  RUSTLE_THRESHOLD,
  WHOOSH_CAP,
  WHOOSH_MIN_SPEED,
  clink,
  flipParams,
  grabGain,
  releaseWhoosh,
  rustleGain,
} from "@/engine/pass3d/sound";

describe("rustleGain", () => {
  it("hening di bawah ambang dan untuk masukan aneh", () => {
    expect(rustleGain(0)).toBe(0);
    expect(rustleGain(RUSTLE_THRESHOLD)).toBe(0);
    expect(rustleGain(Number.NaN)).toBe(0);
    expect(rustleGain(-3, -3)).toBe(0);
  });

  it("naik terus terhadap laju dan terhadap kecepatan sudut", () => {
    let prev = 0;
    for (let v = 0.06; v <= 2; v += 0.05) {
      const g = rustleGain(v);
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
    expect(rustleGain(0.5, 6)).toBeGreaterThan(rustleGain(0.5, 0));
  });

  it("berbatas atas dan tidak pernah di luar 0..1", () => {
    for (const v of [1.2, 5, 1e9, Number.POSITIVE_INFINITY]) {
      const g = rustleGain(v, 100);
      expect(g).toBeLessThanOrEqual(RUSTLE_CAP + 1e-9);
      expect(g).toBeGreaterThanOrEqual(0);
    }
    expect(RUSTLE_CAP).toBeLessThan(1);
  });

  it("lutut lembut: ayunan pelan jauh lebih pelan daripada ayunan penuh", () => {
    expect(rustleGain(0.15)).toBeLessThan(0.25 * rustleGain(1.2));
  });
});

describe("clink", () => {
  it("terlalu lemah = null", () => {
    expect(clink(0, 1000, -Infinity)).toBeNull();
    expect(clink(CLINK_MIN_STRENGTH / 2, 1000, -Infinity)).toBeNull();
    expect(clink(Number.NaN, 1000, -Infinity)).toBeNull();
  });

  it("jeda minimum: terlalu cepat null, tepat di jeda diterima", () => {
    expect(clink(0.8, 1000 + CLINK_MIN_INTERVAL_MS - 1, 1000)).toBeNull();
    expect(clink(0.8, 1000 + CLINK_MIN_INTERVAL_MS, 1000)).not.toBeNull();
    expect(CLINK_MIN_INTERVAL_MS).toBeGreaterThanOrEqual(90);
  });

  it("gain naik dengan kekuatan, berbatas CLINK_CAP, dan di 0..1", () => {
    let prev = 0;
    for (const s of [0.05, 0.2, 0.5, 0.8, 1]) {
      const c = clink(s, 1000, -Infinity)!;
      expect(c.gain).toBeGreaterThan(prev);
      expect(c.gain).toBeLessThanOrEqual(CLINK_CAP + 1e-9);
      prev = c.gain;
    }
  });

  it("peluruhan 60–120 ms dan nada bergeser tipis", () => {
    for (const s of [0.05, 1]) {
      const c = clink(s, 1000, -Infinity)!;
      expect(c.decay).toBeGreaterThanOrEqual(0.06);
      expect(c.decay).toBeLessThanOrEqual(0.12);
      expect(c.pitch).toBeGreaterThan(0.95);
      expect(c.pitch).toBeLessThan(1.05);
    }
  });

  it("kekuatan di atas 1 dijepit ke 1", () => {
    expect(clink(5, 1000, -Infinity)!.gain).toBe(clink(1, 1000, -Infinity)!.gain);
  });

  it("deterministik", () => {
    expect(clink(0.4, 500, 100)).toEqual(clink(0.4, 500, 100));
  });
});

describe("flipParams", () => {
  it("debam rendah ±140 Hz selama 40 ms, tepukan lebih tinggi dari debam", () => {
    for (const back of [false, true]) {
      const p = flipParams(back);
      expect(p.thumpFreq).toBe(140);
      expect(p.thumpDur).toBeCloseTo(0.04, 5);
      expect(p.flapFreq).toBeGreaterThan(p.thumpFreq * 10);
      expect(p.thump).toBeLessThan(p.flap);
      for (const k of [p.flap, p.thump]) expect(k).toBeGreaterThan(0);
      for (const k of [p.flap, p.thump]) expect(k).toBeLessThanOrEqual(1);
    }
  });

  it("sisi belakang sedikit lebih kusam", () => {
    expect(flipParams(true).flapFreq).toBeLessThan(flipParams(false).flapFreq);
  });
});

describe("grabGain", () => {
  it("pelan, kartu lebih keras dari benang", () => {
    expect(grabGain("card")).toBeGreaterThan(grabGain("thread"));
    expect(grabGain("card")).toBeLessThan(0.5);
    expect(grabGain("thread")).toBeGreaterThan(0);
  });
});

describe("releaseWhoosh", () => {
  it("lepas pelan atau masukan aneh = null", () => {
    expect(releaseWhoosh(0)).toBeNull();
    expect(releaseWhoosh(WHOOSH_MIN_SPEED)).toBeNull();
    expect(releaseWhoosh(Number.NaN)).toBeNull();
  });

  it("makin kencang makin keras, tinggi, dan singkat; berbatas", () => {
    const slow = releaseWhoosh(0.5)!;
    const fast = releaseWhoosh(2.5)!;
    expect(fast.gain).toBeGreaterThan(slow.gain);
    expect(fast.freq).toBeGreaterThan(slow.freq);
    expect(fast.dur).toBeLessThan(slow.dur);
    expect(releaseWhoosh(1e6)!.gain).toBeLessThanOrEqual(WHOOSH_CAP + 1e-9);
  });
});
