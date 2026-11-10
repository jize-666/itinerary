import { describe, expect, it } from "vitest";
import { BEZIER, type EaseName } from "@/engine/motion/tokens";
import { bezier, ease, framesBetween, styleAt, valueAt } from "@/engine/slides/timeline";

describe("lintasan angka", () => {
  const fade = [
    [0, 1],
    [0.3, 0],
  ] as const;

  it("linear di antara titik kunci, ditahan di luar rentang", () => {
    expect(valueAt(fade, 0)).toBe(1);
    expect(valueAt(fade, 0.15)).toBeCloseTo(0.5);
    expect(valueAt(fade, 0.3)).toBe(0);
    expect(valueAt(fade, 0.9)).toBe(0);
    expect(valueAt([[0.4, 12]], 0.1)).toBe(12);
    expect(valueAt([], 0.5)).toBe(0);
  });

  it("lompatan (dua titik di posisi sama) memakai nilai sesudahnya tepat di titik itu", () => {
    const cut = [
      [0, 1],
      [0.5, 1],
      [0.5, 0],
      [1, 0],
    ] as const;
    expect(valueAt(cut, 0.49)).toBe(1);
    expect(valueAt(cut, 0.51)).toBe(0);
  });

  it("gaya hanya berisi opacity & transform", () => {
    expect(styleAt({ opacity: fade, y: [[0, 0], [1, -40]], unit: "%" }, 0.15)).toEqual({ opacity: "0.5", transform: "translate3d(0, -6%, 0)" });
    expect(styleAt({ x: [[0, 0], [1, -300]], scale: [[0, 1], [1, 0.9]] }, 1)).toEqual({ transform: "translate3d(-300px, 0, 0) scale(0.9)" });
    expect(styleAt({ opacity: fade }, 0)).toEqual({ opacity: "1" });
  });
});

describe("keyframe untuk sebagian transisi", () => {
  const track = { opacity: [[0, 1], [0.3, 0]] as const, y: [[0, 0], [0.5, -10]] as const, unit: "%" as const };

  it("transisi penuh memuat semua titik kunci", () => {
    expect(framesBetween(track, 0, 1)).toEqual([
      { offset: 0, opacity: "1", transform: "translate3d(0, 0, 0)" },
      { offset: 0.3, opacity: "0", transform: "translate3d(0, -6%, 0)" },
      { offset: 0.5, opacity: "0", transform: "translate3d(0, -10%, 0)" },
      { offset: 1, opacity: "0", transform: "translate3d(0, -10%, 0)" },
    ]);
  });

  it("melanjutkan dari posisi jari: mulai dari nilai di titik itu, titik kunci sisanya tetap ada", () => {
    const f = framesBetween(track, 0.4, 1);
    expect(f[0]).toEqual({ offset: 0, opacity: "0", transform: "translate3d(0, -8%, 0)" });
    expect(f.map((k) => k.offset)).toEqual([0, 0.167, 1]);
  });

  it("kembali ke asal: keyframe berjalan mundur dengan offset tetap menaik", () => {
    const f = framesBetween(track, 0.4, 0);
    expect(f.map((k) => k.offset)).toEqual([0, 0.25, 1]);
    expect(f[0]!.opacity).toBe("0");
    expect(f.at(-1)).toEqual({ offset: 1, opacity: "1", transform: "translate3d(0, 0, 0)" });
  });

  it("ruas kosong (sudah di tujuan) tetap memberi satu keadaan yang sah", () => {
    expect(framesBetween(track, 1, 1)).toEqual([{ offset: 0, opacity: "0", transform: "translate3d(0, -10%, 0)" }]);
  });
});

describe("kurva easing di JS = kurva CSS", () => {
  it("cocok dengan nilai acuan cubic-bezier CSS `ease`", () => {
    const cssEase = bezier(0.25, 0.1, 0.25, 1);
    expect(cssEase(0.5)).toBeCloseTo(0.8024, 3);
    expect(cssEase(0)).toBe(0);
    expect(cssEase(1)).toBe(1);
  });

  it("semua kurva token: mulai 0, berakhir 1, tidak pernah turun", () => {
    for (const name of Object.keys(BEZIER) as EaseName[]) {
      const f = ease(name);
      let prev = 0;
      for (let i = 0; i <= 100; i++) {
        const v = f(i / 100);
        expect(v, `${name} @ ${i}`).toBeGreaterThanOrEqual(prev - 1e-4);
        prev = v;
      }
      expect(f(0)).toBe(0);
      expect(f(1)).toBe(1);
    }
  });

  it("kurva in-out simetris; kurva out sudah lewat separuh di tengah waktu", () => {
    for (const name of ["power3InOut", "expoInOut", "sineInOut"] as const) {
      const f = ease(name);
      expect(f(0.5)).toBeCloseTo(0.5, 3);
      expect(f(0.2) + f(0.8)).toBeCloseTo(1, 3);
    }
    expect(ease("expoOut")(0.5)).toBeGreaterThan(0.9);
    expect(ease("linear")(0.37)).toBe(0.37);
  });
});
