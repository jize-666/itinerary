import { describe, expect, it } from "vitest";
import type { Slide } from "@/engine/slides/build-slides";
import { PASS, passCenter, passCloseness, passLift, passShot, passWanted } from "@/engine/stage/pass";
import { blendShot, projectPoint, shotFor, type Vec3 } from "@/engine/stage/shots";
import { VIEW } from "@/engine/motion/view";

const slide = (kind: string) => ({ kind }) as unknown as Slide;

/** Jarak titik `p` ke ruas `a`–`b`. */
function segDist(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const t = Math.max(0, Math.min(1, (ap[0]! * ab[0]! + ap[1]! * ab[1]! + ap[2]! * ab[2]!) / (ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2)));
  return Math.hypot(ap[0]! - ab[0]! * t, ap[1]! - ab[1]! * t, ap[2]! - ab[2]! * t);
}

/** Jarak kamera ke tiket (tali di atas kait sampai balok, dan kartu di bawah kait) saat kait diangkat `lift`. */
function clearance(cam: Vec3, lift: number): number {
  const hook: Vec3 = [PASS.hook[0], PASS.hook[1] + lift, PASS.hook[2]];
  const top: Vec3 = [hook[0], Math.max(PASS.beam, hook[1]), hook[2]];
  const bottom: Vec3 = [hook[0], hook[1] - 0.25, hook[2]];
  return Math.min(segDist(cam, hook, top), segDist(cam, bottom, hook) - 0.045);
}

describe("tiket 3D: shot dan lintasan kamera", () => {
  for (const aspect of [16 / 10, 1, 9 / 19.5]) {
    it(`kartu utuh di layar dan di atas tengah (aspek ${aspect.toFixed(2)})`, () => {
      const shot = passShot(aspect);
      const c = passCenter();
      const at = projectPoint(shot, aspect, c);
      expect(at.depth).toBeGreaterThan(0.25);
      expect(at.y).toBeGreaterThan(0.1);
      // keempat sudut kartu masuk layar
      for (const [dx, dy] of [[-0.037, -0.075], [0.037, -0.075], [-0.037, 0.075], [0.037, 0.075]] as const) {
        const q = projectPoint(shot, aspect, [c[0] + dx, c[1] + dy, c[2]]);
        expect(Math.abs(q.x)).toBeLessThan(0.95);
        expect(Math.abs(q.y)).toBeLessThan(0.95);
      }
    });
  }

  // epilog, kartu kepulangan, dan tiket satu bab ("slide"); tiket → credits berganti bab ("wipe"), "slide" ikut diuji
  const paths: [string, string, "in" | "out", "slide" | "wipe"][] = [
    ["daycard", "pass", "in", "slide"],
    ["epilogue", "pass", "in", "slide"],
    ["pass", "credits", "out", "wipe"],
    ["pass", "credits", "out", "slide"],
  ];
  for (const aspect of [16 / 10, 9 / 19.5]) {
    for (const [a, b, dir, kind] of paths) {
      it(`kamera tidak menembus tiket atau talinya: ${a} → ${b}, ${kind} (aspek ${aspect.toFixed(2)})`, () => {
        const [sa, sb] = [shotFor(slide(a), { aspect }), shotFor(slide(b), { aspect })];
        let worst = Infinity;
        for (let i = 0; i <= 400; i++) {
          const p = i / 400;
          const shot = blendShot(sa, sb, p, kind);
          const c = dir === "in" ? p : 1 - p;
          // di slide tiket kamera memang dekat kartu (±0,4 m); yang diperiksa adalah perjalanan menuju dan darinya
          if (c > 0.97) continue;
          // geser parallax dan dorongan gulir terbesar ikut dihitung sebagai jarak aman
          const margin = VIEW.shiftX * Math.min(1, shot.focus / 2.5) + VIEW.push * Math.min(shot.focus, 12) * 0.2;
          worst = Math.min(worst, clearance(shot.pos as Vec3, passLift(c)) - margin);
        }
        expect(worst).toBeGreaterThan(0.05);
      });
    }
  }
});

describe("tiket 3D: kedekatan, penurunan, dan pemasangan", () => {
  it("kedekatan mengikuti kemajuan gulir ke dan dari slide tiket", () => {
    expect(passCloseness({ from: 10, to: 10, p: 0 }, 10)).toBe(1);
    expect(passCloseness({ from: 9, to: 10, p: 0.3 }, 10)).toBeCloseTo(0.3);
    expect(passCloseness({ from: 10, to: 11, p: 0.3 }, 10)).toBeCloseTo(0.7);
    expect(passCloseness({ from: 3, to: 4, p: 0.5 }, 10)).toBe(0);
    expect(passCloseness({ from: 10, to: 10, p: 0 }, -1)).toBe(0);
  });
  it("tiket tergantung tinggi di awal perpindahan dan tepat di tempatnya saat tiba", () => {
    expect(passLift(0)).toBeCloseTo(PASS.drop);
    expect(passLift(PASS.descend)).toBeCloseTo(PASS.drop);
    expect(passLift(1)).toBe(0);
    for (let c = 0; c < 1; c += 0.05) expect(passLift(c + 0.05)).toBeLessThanOrEqual(passLift(c) + 1e-12);
  });
  it("dipasang dua slide sebelumnya, dilepas lebih dari tiga slide", () => {
    expect(passWanted({ from: 8, to: 8, p: 0 }, 10, false)).toBe(true);
    expect(passWanted({ from: 7, to: 7, p: 0 }, 10, false)).toBe(false);
    expect(passWanted({ from: 7, to: 7, p: 0 }, 10, true)).toBe(true);
    expect(passWanted({ from: 6, to: 6, p: 0 }, 10, true)).toBe(false);
    expect(passWanted({ from: 0, to: 0, p: 0 }, -1, true)).toBe(false);
  });
});
