import { describe, expect, it } from "vitest";
import { type DayLight, skyAt, STILL } from "@/engine/slides/sky";
import { BY_PHASE, KINDS, kindOf, NEAR, particleMix, placeParticle, SHARE, SPREAD, YARD } from "@/engine/stage/particles";
import { riverLine, waterLevel } from "@/engine/stage/river";
import { terrainHeight } from "@/engine/stage/terrain";

/**
 * Partikel per fase (Tugas 8.4, host 18 Nov: "dah gw merge, lanjut 8.4"): embun subuh, debu emas siang, kunang-kunang
 * malam, debu lampu di malam gerbang. Satu sumber dengan langit dan grading, mulus mengikuti jam dan gulir.
 */
const LIGHT: DayLight = { sunrise: 335, sunset: 1060, sunFrom: 335, sunFull: 365 };
const top = (m: Record<string, number>) => Object.entries(m).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

describe("kadar partikel per fase", () => {
  it("tiap slide diam mendapat jenis butirnya: gerbang debu lampu, malam kunang-kunang, subuh embun, siang debu emas", () => {
    expect(top(particleMix(STILL.gate))).toBe("lamp");
    expect(top(particleMix(STILL.night))).toBe("fireflies");
    expect(top(particleMix(STILL.dawn))).toBe("dew");
    expect(top(particleMix(STILL.day))).toBe("motes");
    expect(particleMix(STILL.night)).toEqual(BY_PHASE.night);
  });

  it("mengikuti jam: embun sebelum matahari tinggi, tanpa kunang-kunang di tengah hari, kunang-kunang sesudah gelap", () => {
    expect(top(particleMix(skyAt(LIGHT.sunrise - 10, LIGHT)))).toBe("dew");
    const noon = particleMix(skyAt(12 * 60, LIGHT));
    expect(noon.fireflies).toBe(0);
    expect(noon.dew).toBe(0);
    expect(noon.motes).toBeCloseTo(1, 6);
    expect(top(particleMix(skyAt(21 * 60, LIGHT)))).toBe("fireflies");
    expect(particleMix(skyAt(LIGHT.sunset - 15, LIGHT)).motes).toBeGreaterThan(0.5); // senja: debu emas menjingga
  });

  it("mulus sepanjang jam: tiap menit kadar tiap jenis bergeser sedikit, selalu 0–1", () => {
    let prev = particleMix(skyAt(0, LIGHT));
    for (let t = 1; t < 24 * 60; t++) {
      const m = particleMix(skyAt(t, LIGHT));
      for (const k of KINDS) {
        expect(m[k]).toBeGreaterThanOrEqual(0);
        expect(m[k]).toBeLessThanOrEqual(1 + 1e-9);
        expect(Math.abs(m[k] - prev[k]), `menit ${t} ${k}`).toBeLessThan(0.03);
      }
      prev = m;
    }
  });
});

describe("butir di dunia", () => {
  it("pembagian jenis mengikuti SHARE dan berjumlah semua butir", () => {
    expect(Object.values(SHARE).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const count = 3600;
    const n = { lamp: 0, dew: 0, motes: 0, fireflies: 0 };
    for (let i = 0; i < count; i++) n[kindOf(i, count)]++;
    for (const k of KINDS) expect(Math.abs(n[k] / count - SHARE[k]), k).toBeLessThan(0.002);
    // tier Low (±540 butir) tetap punya semua jenis
    const low = new Set(Array.from({ length: 540 }, (_, i) => kindOf(i, 540)));
    expect(low.size).toBe(4);
  });

  it("kunang-kunang melayang di atas tanah atau muka air, di cincin sebarannya; jenis lain dihitung shader", () => {
    const line = riverLine();
    const ground = (x: number, z: number) => Math.max(terrainHeight(x, z), waterLevel(x, z, line) ?? -Infinity);
    let s = 11;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    let yard = 0;
    for (let i = 0; i < 600; i++) {
      const seed = [rand(), rand(), rand(), rand()] as const;
      const [x, y, z] = placeParticle("fireflies", seed, ground);
      const lift = y - ground(x, z);
      expect(lift).toBeGreaterThanOrEqual(SPREAD.fireflies.h[0] - 1e-9);
      expect(lift).toBeLessThanOrEqual(SPREAD.fireflies.h[1] + 1e-9);
      const near = seed[3] < YARD.share;
      const [r0, r1] = near ? YARD.r : SPREAD.fireflies.r;
      const r = Math.hypot(x, z);
      expect(r).toBeGreaterThanOrEqual(r0 - 1e-9);
      expect(r).toBeLessThanOrEqual(r1 + 1e-9);
      if (near) yard++;
    }
    // sebagian kunang-kunang di halaman pendapa (tampak di prolog dan gong), sisanya di sawah dan tepi sungai
    expect(yard / 600).toBeGreaterThan(0.22);
    expect(yard / 600).toBeLessThan(0.38);
    for (const k of ["lamp", "dew", "motes"] as const) expect(placeParticle(k, [0.1, 0.2, 0.3, 0.4], () => 5)).toEqual([0, 0, 0]);
  });

  it("ruang udara embun dan debu emas: embun setinggi mata dan lebih rendah, debu emas di sekitar dan di atasnya", () => {
    const top = (k: "dew" | "motes") => NEAR[k].lift + NEAR[k].box[1] / 2;
    expect(NEAR.dew.lift).toBeLessThanOrEqual(0);
    expect(NEAR.dew.lift).toBeLessThan(NEAR.motes.lift);
    expect(top("dew")).toBeLessThan(top("motes"));
    expect(top("motes")).toBeGreaterThan(3);
    expect(NEAR.edge).toBeGreaterThan(0.5);
    expect(NEAR.edge).toBeLessThan(1);
    // kotak di depan kamera, tetapi kamera tetap di dalamnya (selalu ada butir dekat yang melintas di depan lensa)
    for (const k of ["dew", "motes"] as const) {
      expect(NEAR[k].ahead).toBeGreaterThan(0);
      expect(NEAR[k].ahead).toBeLessThan((NEAR[k].box[2] / 2) * NEAR.edge);
    }
  });
});
