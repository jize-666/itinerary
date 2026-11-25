/**
 * Kadar suara membatik (Tugas 11.4): keadaan kain → kadar wax/water/boil, tangan, dan amplop animasi.
 */
import { describe, expect, it } from "vitest";
import { BACKWARD, DYE_SPLASH, dyeEnvelope, filmLevels, handWax, lorodEnvelope, saturate, SILENT } from "@/engine/canting/sound";
import { EMPTY_STATE, type BatikState } from "@/engine/canting/state";

const at = (p: Partial<BatikState>): BatikState => ({ ...EMPTY_STATE, ...p });
const inRange = (x: number) => x >= 0 && x <= 1;

describe("filmLevels", () => {
  it("diam atau keadaan sama = hening", () => {
    const s = at({ draw: 0.5, nila: 0.3 });
    expect(filmLevels(s, s, 0.016)).toEqual(SILENT);
    expect(filmLevels(EMPTY_STATE, EMPTY_STATE, 1)).toEqual(SILENT);
  });

  it("dt <= 0 atau bukan angka = hening", () => {
    const next = at({ draw: 0.4 });
    expect(filmLevels(EMPTY_STATE, next, 0)).toEqual(SILENT);
    expect(filmLevels(EMPTY_STATE, next, -1)).toEqual(SILENT);
    expect(filmLevels(EMPTY_STATE, next, Number.NaN)).toEqual(SILENT);
  });

  it("torehan maju: hanya wax", () => {
    const l = filmLevels(EMPTY_STATE, at({ draw: 0.1 }), 0.5);
    expect(l.wax).toBeGreaterThan(0);
    expect(l.water).toBe(0);
    expect(l.boil).toBe(0);
  });

  it("nila atau soga berubah: hanya water", () => {
    for (const k of ["nila", "soga"] as const) {
      const l = filmLevels(EMPTY_STATE, at({ [k]: 0.2 }), 0.5);
      expect(l.water, k).toBeGreaterThan(0);
      expect(l.wax, k).toBe(0);
      expect(l.boil, k).toBe(0);
    }
  });

  it("lorod: hanya boil", () => {
    const l = filmLevels(EMPTY_STATE, at({ lorod: 0.2 }), 0.5);
    expect(l.boil).toBeGreaterThan(0);
    expect(l.wax).toBe(0);
    expect(l.water).toBe(0);
  });

  it("mundur: kadar sama dikali BACKWARD", () => {
    const fwd = filmLevels(EMPTY_STATE, at({ draw: 0.05, nila: 0.1, lorod: 0.1 }), 1);
    const back = filmLevels(at({ draw: 0.05, nila: 0.1, lorod: 0.1 }), EMPTY_STATE, 1);
    expect(back.wax).toBeCloseTo(fwd.wax * BACKWARD, 10);
    expect(back.water).toBeCloseTo(fwd.water * BACKWARD, 10);
    expect(back.boil).toBeCloseTo(fwd.boil * BACKWARD, 10);
    expect(BACKWARD).toBeLessThan(1);
    expect(fwd.wax).toBeLessThan(1);
  });

  it("selalu di 0..1 walau lompatan besar atau NaN", () => {
    const cases: [BatikState, BatikState, number][] = [
      [EMPTY_STATE, at({ draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 1 }), 1e-6],
      [at({ draw: 1, nila: 1, soga: 1, lorod: 1 }), EMPTY_STATE, 1e-6],
      [EMPTY_STATE, at({ draw: Number.NaN, nila: Number.NaN, lorod: Number.NaN }), 0.016],
      [EMPTY_STATE, at({ draw: Infinity, soga: Infinity, lorod: -Infinity }), 0.016],
    ];
    for (const [a, b, dt] of cases) {
      const l = filmLevels(a, b, dt);
      expect(inRange(l.wax) && inRange(l.water) && inRange(l.boil), JSON.stringify(l)).toBe(true);
    }
  });
});

describe("saturate", () => {
  it("nol di laju nol, naik, dan tidak lewat 1", () => {
    expect(saturate(0, 0.2)).toBe(0);
    expect(saturate(0.1, 0.2)).toBeGreaterThan(0);
    expect(saturate(0.4, 0.2)).toBeGreaterThan(saturate(0.1, 0.2));
    expect(saturate(1e9, 0.2)).toBeLessThanOrEqual(1);
    expect(saturate(Number.NaN, 0.2)).toBe(0);
  });
});

describe("handWax", () => {
  it("tidak menyentuh = 0", () => {
    expect(handWax(false, 1, 1, 1)).toBe(0);
  });

  it("makin cepat makin keras, tetap di 0..1", () => {
    const slow = handWax(true, 0, 1, 1);
    const fast = handWax(true, 1, 1, 1);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    expect(inRange(fast)).toBe(true);
    expect(inRange(handWax(true, 1e9, 5, 1))).toBe(true);
  });

  it("malam dingin lebih pelan", () => {
    expect(handWax(true, 0.5, 0.1, 1)).toBeLessThan(handWax(true, 0.5, 1, 1));
  });

  it("nyamplung kosong: sangat pelan", () => {
    const empty = handWax(true, 1, 1, 0);
    expect(empty).toBeLessThan(0.2);
    expect(empty).toBeLessThan(handWax(true, 1, 1, 1) / 4);
  });
});

describe("amplop animasi", () => {
  for (const [name, env] of [["dyeEnvelope", dyeEnvelope], ["lorodEnvelope", lorodEnvelope]] as const) {
    it(`${name}: 0 di luar (0,1), di 0..1 di dalam, positif di tengah`, () => {
      for (const k of [-1, 0, 1, 2, Number.NaN]) expect(env(k), String(k)).toBe(0);
      for (let i = 1; i < 100; i++) expect(inRange(env(i / 100)), String(i / 100)).toBe(true);
      expect(env(0.5)).toBeGreaterThan(0);
    });
  }

  it("DYE_SPLASH: masuk sebelum angkat, keduanya di dalam (0,1)", () => {
    expect(DYE_SPLASH.enter).toBeGreaterThan(0);
    expect(DYE_SPLASH.enter).toBeLessThan(DYE_SPLASH.lift);
    expect(DYE_SPLASH.lift).toBeLessThan(1);
  });
});
