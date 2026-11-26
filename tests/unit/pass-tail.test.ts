import { describe, expect, it } from "vitest";
import { plantSize } from "@/engine/stage/gate";
import { PASS, TAIL, tailHook, tailLift, tailTarget } from "@/engine/stage/pass";
import { kayonShot, projectPoint, type Vec3 } from "@/engine/stage/shots";

const ASPECTS: [string, number][] = [
  ["16:9", 16 / 9],
  ["4:3", 4 / 3],
  ["9:16", 9 / 16],
  ["9:19.5", 9 / 19.5],
];
const CARD = { w: 0.074, h: 0.15 };

/** Pusat kartu yang diam: kait turun `PASS.hang`. */
const rest = (hook: Vec3, lift = 0): Vec3 => [hook[0], hook[1] - PASS.hang + lift, hook[2]];

describe("tiket penutup: kait di samping gunungan", () => {
  for (const [name, aspect] of ASPECTS) {
    describe(name, () => {
      const shot = kayonShot({ aspect });
      const { hook, dist } = tailHook(shot, aspect);
      const target = tailTarget(aspect);

      it("pusat kartu jatuh di titik layar yang dituju", () => {
        const at = projectPoint(shot, aspect, rest(hook));
        expect(at.x).toBeCloseTo(target.x, 2);
        expect(at.y).toBeCloseTo(target.y, 2);
        expect(at.depth).toBeCloseTo(dist, 2);
      });

      it("jarak masuk akal dan kartu mengisi bagian tinggi layar yang diminta", () => {
        expect(dist).toBeGreaterThan(0.3);
        expect(dist).toBeLessThan(2);
        const top = projectPoint(shot, aspect, [hook[0], hook[1] - PASS.hang + CARD.h / 2, hook[2]]);
        const bottom = projectPoint(shot, aspect, [hook[0], hook[1] - PASS.hang - CARD.h / 2, hook[2]]);
        expect((top.y - bottom.y) / 2).toBeCloseTo(target.fill, 1);
      });

      it("kartu utuh plus ruang ayun 20% di layar, di bawah bilah atas", () => {
        const c = rest(hook);
        for (const sx of [-1, 1])
          for (const sy of [-1, 1]) {
            const q = projectPoint(shot, aspect, [c[0] + (sx * CARD.w * TAIL.swing) / 2, c[1] + (sy * CARD.h * TAIL.swing) / 2, c[2]]);
            expect(Math.abs(q.x)).toBeLessThan(0.97);
            expect(q.y).toBeLessThan(0.8);
            expect(q.y).toBeGreaterThan(-0.97);
          }
      });

      it("jauh dari titik Clawd", () => {
        const [cx, cy] = aspect >= 1 ? [0.5, -0.42] : [0.52, -0.5];
        const at = projectPoint(shot, aspect, rest(hook));
        expect(Math.hypot(at.x - cx, at.y - cy)).toBeGreaterThan(0.6);
      });

      if (aspect >= 1) {
        it("tidak menyentuh persegi gunungan", () => {
          const size = plantSize(aspect);
          const halfW = (0.7 * size) / aspect;
          const c = rest(hook);
          const right = projectPoint(shot, aspect, [c[0] + (CARD.w * TAIL.swing) / 2, c[1], c[2]]);
          expect(right.x).toBeLessThan(-halfW);
        });
      }
    });
  }

  it("lift: turun mengikuti gulir, 0 saat tertancap, di atas bingkai sampai 0,35", () => {
    expect(tailLift(1)).toBe(0);
    let prev = Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = tailLift(i / 20);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
    expect(tailLift(0)).toBeCloseTo(TAIL.lift, 6);
    expect(tailLift(0.35)).toBeCloseTo(TAIL.lift, 6);
    for (const [, aspect] of ASPECTS) {
      const shot = kayonShot({ aspect });
      const { hook } = tailHook(shot, aspect);
      for (const p of [0, 0.2, 0.35]) {
        const bottom = projectPoint(shot, aspect, [hook[0], hook[1] - PASS.hang - CARD.h / 2 + tailLift(p), hook[2]]);
        expect(bottom.y).toBeGreaterThan(1);
      }
    }
  });
});
