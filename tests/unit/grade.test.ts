import { describe, expect, it } from "vitest";
import { type DayLight, skyAt, type SkyKey, type SkyState, STILL } from "@/engine/slides/sky";
import { skyAlong } from "@/engine/stage/cue";
import { applyGrade, GRADE, type Grade, gradeOf, type GradePhase, luma, NEUTRAL, phaseOf, phaseWeights } from "@/engine/stage/grade";
import type { RGB } from "@/engine/stage/mood";

/**
 * Grading warna per fase (Tugas 8.2 + 8.3, host 18 Nov: "kerjakan tugas 8.2 + 8.3 dulu"): satu sumber dengan langit,
 * mulus mengikuti jam dan gulir, dan tidak menggencet gambar.
 */
const LIGHT: DayLight = { sunrise: 335, sunset: 1060, sunFrom: 335, sunFull: 365 };
/** Abu tengah tampilan (sRGB ±0,46 = 18 % linear): grading bekerja pada nilai yang tampak di layar. */
const GRAY: RGB = [0.46, 0.46, 0.46];
const dist = (a: Grade, b: Grade) => {
  const v = (x: RGB, y: RGB) => Math.max(...x.map((n, i) => Math.abs(n - y[i]!)));
  return Math.max(v(a.slope, b.slope), v(a.offset, b.offset), v(a.power, b.power), Math.abs(a.sat - b.sat), v(a.shadow, b.shadow), v(a.high, b.high));
};

describe("fase grading dari keadaan langit", () => {
  it("langit tanpa jam: tiap slide diam mendapat fasenya sendiri", () => {
    const want: Record<keyof typeof STILL, GradePhase> = { gate: "gate", night: "night", dawn: "dawn", day: "day", dusk: "dusk" };
    for (const [sky, phase] of Object.entries(want)) expect(phaseOf(STILL[sky as keyof typeof STILL]), sky).toBe(phase);
    expect(gradeOf(STILL.gate)).toEqual(GRADE.gate);
    expect(gradeOf(STILL.night)).toEqual(GRADE.night);
  });

  it("bobot fase selalu berjumlah 1 dan masing-masing 0–1, sepanjang hari", () => {
    for (let t = 0; t < 24 * 60; t += 7) {
      const w = phaseWeights(skyAt(t, LIGHT));
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      expect(sum, `menit ${t}`).toBeCloseTo(1, 9);
      for (const v of Object.values(w)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("mengikuti jam: subuh sebelum matahari tinggi, siang di tengah hari, senja menjelang terbenam, malam sesudahnya", () => {
    expect(phaseOf(skyAt(LIGHT.sunrise - 10, LIGHT))).toBe("dawn");
    expect(phaseOf(skyAt(12 * 60, LIGHT))).toBe("day");
    expect(phaseOf(skyAt(LIGHT.sunset - 15, LIGHT))).toBe("dusk");
    expect(phaseOf(skyAt(23 * 60, LIGHT))).toBe("night");
  });

  it("mulus sepanjang jam: tiap menit grading hanya bergeser sedikit (tanpa lompatan)", () => {
    let prev = gradeOf(skyAt(0, LIGHT));
    for (let t = 1; t < 24 * 60; t++) {
      const g = gradeOf(skyAt(t, LIGHT));
      expect(dist(prev, g), `menit ${t}`).toBeLessThan(0.02);
      prev = g;
    }
  });

  it("mulus mengikuti gulir: sepanjang transisi gerbang → malam → subuh → siang, tiap 1 % kemajuan bergeser sedikit", () => {
    const stops: [SkyState, SkyState][] = [
      [STILL.gate, STILL.night],
      [STILL.night, STILL.dawn],
      [STILL.dawn, skyAt(9 * 60, LIGHT)],
      [skyAt(9 * 60, LIGHT), skyAt(17 * 60 + 20, LIGHT)],
    ];
    for (const [a, b] of stops) {
      const path: SkyKey[] = [
        [0, a],
        [1, b],
      ];
      let prev = gradeOf(skyAlong(path, 0));
      for (let i = 1; i <= 100; i++) {
        const g = gradeOf(skyAlong(path, i / 100));
        expect(dist(prev, g)).toBeLessThan(0.05);
        prev = g;
      }
    }
  });
});

describe("rupa grading", () => {
  it("arah warna: malam biru, senja dan gerbang hangat, siang hampir netral dan lebih jenuh", () => {
    const tone = (g: Grade) => applyGrade(GRAY, g);
    const night = tone(GRADE.night);
    const dusk = tone(GRADE.dusk);
    const gate = tone(GRADE.gate);
    const day = tone(GRADE.day);
    expect(night[2]).toBeGreaterThan(night[0]);
    expect(dusk[0]).toBeGreaterThan(dusk[2]);
    expect(gate[0]).toBeGreaterThan(gate[2]);
    expect(Math.abs(day[0] - day[2])).toBeLessThan(0.03);
    expect(GRADE.day.sat).toBeGreaterThan(1);
    expect(GRADE.night.sat).toBeLessThan(1);
  });

  it("sorotan menghangat saat matahari rendah (pagi/sore), tidak saat matahari tinggi", () => {
    const morning = gradeOf(skyAt(LIGHT.sunFull + 20, LIGHT));
    const noon = gradeOf(skyAt(12 * 60, LIGHT));
    expect(morning.high[0] - morning.high[2]).toBeGreaterThan(noon.high[0] - noon.high[2]);
  });

  it("tidak menggencet gambar: abu tengah tiap fase tetap dalam ±12 %, hitam dan putih tetap dekat ujungnya", () => {
    for (const [phase, g] of Object.entries(GRADE)) {
      const y = luma(applyGrade(GRAY, g));
      expect(y / 0.46, phase).toBeGreaterThan(0.88);
      expect(y / 0.46, phase).toBeLessThan(1.12);
      expect(luma(applyGrade([0, 0, 0], g)), phase).toBeLessThan(0.03);
      expect(luma(applyGrade([1, 1, 1], g)), phase).toBeGreaterThan(0.92);
    }
  });

  it("nada gelap hanya bergeser sedikit di tiap fase (percobaan pertama: rona bayangan dibesarkan kurva gamma)", () => {
    for (const [phase, g] of Object.entries(GRADE)) {
      for (const c of [[0.02, 0.02, 0.02], [0.08, 0.07, 0.06], [0.15, 0.15, 0.2]] as RGB[]) {
        const out = applyGrade(c, g);
        for (let i = 0; i < 3; i++) expect(Math.abs(out[i]! - c[i]!), `${phase} ${c} kanal ${i}`).toBeLessThan(0.04);
      }
    }
  });

  it("keluaran selalu 0–1 dan netral tidak mengubah warna", () => {
    for (const g of [...Object.values(GRADE), gradeOf(skyAt(LIGHT.sunFull + 20, LIGHT))]) {
      for (const c of [[0, 0, 0], [1, 1, 1], [1, 0, 0], [0.02, 0.4, 0.9], [0.5, 0.5, 0.5]] as RGB[]) {
        for (const v of applyGrade(c, g)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(applyGrade([0.3, 0.6, 0.1], NEUTRAL).map((v) => +v.toFixed(6))).toEqual([0.3, 0.6, 0.1]);
  });
});
