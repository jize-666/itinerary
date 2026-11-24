import { describe, expect, it } from "vitest";
import { polylineLength } from "@/engine/canting/motif";
import { GUIDE_KINDS, GUIDE_MARGIN, guide, guideDabs } from "@/engine/canting/guides";

const ASPECTS = [1.6, 1.0];

describe.each(GUIDE_KINDS)("guide %s", (kind) => {
  describe.each(ASPECTS)("aspect %s", (aspect) => {
    const g = guide(kind, aspect);
    const inMargin = (x: number, y: number) =>
      x >= GUIDE_MARGIN && x <= aspect - GUIDE_MARGIN && y >= GUIDE_MARGIN && y <= 1 - GUIDE_MARGIN;

    it("punya garis dan semua titik di dalam batas aman", () => {
      expect(g.kind).toBe(kind);
      expect(g.aspect).toBe(aspect);
      expect(g.paths.length).toBeGreaterThan(0);
      for (const p of g.paths) for (const [x, y] of p.pts) expect(inMargin(x, y)).toBe(true);
      for (const [x, y] of g.dots) expect(inMargin(x, y)).toBe(true);
    });

    it("garis sah: minimal 2 titik, tertutup minimal 3 dan ujung tidak diulang", () => {
      for (const p of g.paths) {
        expect(p.pts.length).toBeGreaterThanOrEqual(2);
        if (p.closed) {
          expect(p.pts.length).toBeGreaterThanOrEqual(3);
          const a = p.pts[0]!;
          const b = p.pts[p.pts.length - 1]!;
          expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
        }
      }
    });

    it("deterministik", () => {
      // panggilan baru tanpa cache tidak ada; bandingkan dengan salinan dalam
      expect(guide(kind, aspect)).toEqual(JSON.parse(JSON.stringify(g)));
      expect(guideDabs(g)).toEqual(guideDabs(guide(kind, aspect)));
    });

    it("dab auto-trace: ada, di dalam kain, dan rapat sepanjang garis", () => {
      const lineR = 0.0042;
      const spacing = 0.35;
      const step = spacing * lineR;
      const { line, dots } = guideDabs(g, { lineR, spacing });
      expect(line.length / 3).toBeGreaterThan(0);
      expect(dots.length / 3).toBe(g.dots.length);
      for (const arr of [line, dots])
        for (let i = 0; i < arr.length; i += 3) {
          expect(arr[i]!).toBeGreaterThanOrEqual(0);
          expect(arr[i]!).toBeLessThanOrEqual(aspect);
          expect(arr[i + 1]!).toBeGreaterThanOrEqual(0);
          expect(arr[i + 1]!).toBeLessThanOrEqual(1);
        }
      // iris dab per garis menurut jumlah yang dihitung dari ruasnya, lalu cek jarak berurutan
      let at = 0;
      for (const { pts, closed } of g.paths) {
        const ring = closed ? [...pts, pts[0]!] : pts;
        let n = 1;
        for (let i = 1; i < ring.length; i++) {
          n += Math.max(1, Math.ceil(Math.hypot(ring[i]![0] - ring[i - 1]![0], ring[i]![1] - ring[i - 1]![1]) / step));
        }
        for (let k = at + 1; k < at + n; k++) {
          const d = Math.hypot(line[k * 3]! - line[(k - 1) * 3]!, line[k * 3 + 1]! - line[(k - 1) * 3 + 1]!);
          expect(d).toBeLessThanOrEqual(step * 1.01);
        }
        at += n;
      }
      expect(at).toBe(line.length / 3);
      if (kind === "kawung") expect(line.length / 3 + dots.length / 3).toBeLessThan(120000);
    });
  });
});

describe("guide parang", () => {
  it("pita diagonal 45° menanjak ke kanan", () => {
    const g = guide("parang", 1.6);
    let total = 0;
    let diagonal = 0;
    for (const p of g.paths) {
      if (p.closed) continue; // belah ketupat tidak dihitung
      for (let i = 1; i < p.pts.length; i++) {
        const dx = p.pts[i]![0] - p.pts[i - 1]![0];
        const dy = p.pts[i]![1] - p.pts[i - 1]![1];
        if (Math.hypot(dx, dy) < 1e-3) continue;
        total++;
        // arah garis (tanpa tanda) dalam [0, π); menanjak ke kanan dengan y ke bawah = 135°
        const a = (((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI) * (180 / Math.PI);
        if (Math.abs(a - 135) <= 25) diagonal++;
      }
    }
    expect(total).toBeGreaterThan(50);
    expect(diagonal / total).toBeGreaterThan(0.9);
    expect(g.paths.some((p) => p.closed)).toBe(true);
  });
});

describe("guide bengawan", () => {
  it("sungai melintang dari kiri ke kanan dan ada lampion tertutup", () => {
    const g = guide("bengawan", 1.6);
    const open = g.paths.filter((p) => !p.closed);
    expect(open.length).toBeGreaterThanOrEqual(2);
    const longest = Math.max(...open.map((p) => polylineLength(p.pts)));
    expect(longest).toBeGreaterThan(1.4);
    expect(g.paths.filter((p) => p.closed).length).toBeGreaterThan(3);
    expect(g.dots.length).toBeGreaterThan(50);
  });
});
