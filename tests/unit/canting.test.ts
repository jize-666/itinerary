import { describe, expect, it } from "vitest";
import { kawungUkel, polygonArea, type Pt } from "@/engine/canting/motif";
import { DAB, traceMotif } from "@/engine/canting/trace";
import { readCantingOptions, tahapState } from "@/engine/canting/options";
import { CLOTH_TILT, fitDistance } from "@/engine/canting/frame";

const ASPECT = 1.6;
const motif = kawungUkel({ aspect: ASPECT });
const E = 1e-9;
const inside = (p: Pt, pad = 0) => p[0] >= -pad - E && p[0] <= ASPECT + pad + E && p[1] >= -pad - E && p[1] <= 1 + pad + E;

describe("kawungUkel", () => {
  it("is deterministic", () => {
    expect(JSON.stringify(kawungUkel({ aspect: ASPECT }))).toBe(JSON.stringify(kawungUkel({ aspect: ASPECT })));
  });
  it("keeps every point inside the cloth", () => {
    for (const s of motif.strokes) {
      if (s.kind === "line") for (const p of s.pts) expect(inside(p)).toBe(true);
      else if (s.kind === "dot") {
        for (const [dx, dy] of [[s.r, 0], [-s.r, 0], [0, s.r], [0, -s.r]] as const) {
          expect(inside([s.at[0] + dx, s.at[1] + dy])).toBe(true);
        }
      } else for (const p of s.poly) expect(inside(p)).toBe(true);
    }
  });
  it("has non-degenerate fills and lines", () => {
    for (const s of motif.strokes) {
      if (s.kind === "fill") expect(Math.abs(polygonArea(s.poly))).toBeGreaterThan(1e-6);
      if (s.kind === "line" && s.closed) expect(s.pts.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("is four-way mirror symmetric in the kawung field", () => {
    const cents: Pt[] = [];
    for (const s of motif.strokes) {
      if (s.kind !== "fill" || s.part !== "field") continue;
      let x = 0;
      let y = 0;
      for (const p of s.poly) {
        x += p[0];
        y += p[1];
      }
      cents.push([x / s.poly.length, y / s.poly.length]);
    }
    expect(cents.length).toBeGreaterThan(0);
    const [cx, cy] = motif.center;
    const has = (x: number, y: number) => cents.some((c) => Math.abs(c[0] - x) < 1e-6 && Math.abs(c[1] - y) < 1e-6);
    for (const [x, y] of cents) {
      expect(has(2 * cx - x, y)).toBe(true);
      expect(has(x, 2 * cy - y)).toBe(true);
    }
  });
});

describe("traceMotif", () => {
  const trace = traceMotif(motif);
  const ps = Array.from({ length: 101 }, (_, i) => i / 100);
  it("orders dab times inside [0, 1]", () => {
    let prev = 0;
    for (let i = 0; i < trace.count; i++) {
      const t = trace.dabs[i * DAB + 4]!;
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t).toBeLessThanOrEqual(1);
      prev = t;
    }
    expect(trace.dabs.length).toBe(trace.count * DAB);
  });
  it("counts dabs monotonically up to all of them", () => {
    expect(trace.countAt(1)).toBe(trace.count);
    const counts = ps.map((p) => trace.countAt(p));
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
  });
  it("has ordered phases and fill times", () => {
    expect(trace.phases.lines).toBeGreaterThan(0);
    expect(trace.phases.lines).toBeLessThan(trace.phases.isen);
    expect(trace.phases.isen).toBeLessThan(1);
    for (const f of trace.fills) {
      expect(f.t0).toBeGreaterThanOrEqual(0);
      expect(f.t1).toBeGreaterThanOrEqual(f.t0);
      expect(f.t1).toBeLessThanOrEqual(1);
    }
  });
  it("keeps the pen tip on the cloth", () => {
    for (const p of ps) expect(inside(trace.tipAt(p).at)).toBe(true);
  });
  it("is deterministic when scrubbing forward and backward", () => {
    const forward = ps.map((p) => trace.countAt(p));
    const backward = [...ps].reverse().map((p) => trace.countAt(p)).reverse();
    expect(backward).toEqual(forward);
  });
});

describe("options", () => {
  it("reads query options", () => {
    expect(readCantingOptions("")).toEqual({ quality: undefined, tahap: undefined, draw: undefined, showFps: false });
    expect(readCantingOptions("?q=medium&tahap=soga&draw=0.4&fps")).toEqual({
      quality: "medium",
      tahap: "soga",
      draw: 0.4,
      showFps: true,
    });
  });
  it("clamps draw and ignores junk", () => {
    expect(readCantingOptions("?draw=7").draw).toBe(1);
    expect(readCantingOptions("?draw=-2").draw).toBe(0);
    expect(readCantingOptions("?draw=abc").draw).toBeUndefined();
    expect(readCantingOptions("?draw=").draw).toBeUndefined();
    expect(readCantingOptions("?q=ultra&tahap=x").quality).toBeUndefined();
    expect(readCantingOptions("?q=ultra&tahap=x").tahap).toBeUndefined();
  });
  it("maps tahap to state", () => {
    expect(tahapState("malam")).toEqual({ draw: 1, nila: 0, kerok: 0, soga: 0, lorod: 0 });
    expect(tahapState("malam", 0.3).draw).toBe(0.3);
    expect(tahapState("nila", 0.3)).toEqual({ draw: 1, nila: 1, kerok: 0, soga: 0, lorod: 0 });
    expect(tahapState("soga")).toEqual({ draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 0 });
    expect(tahapState("lorod")).toEqual({ draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 1 });
    expect(tahapState(undefined)).toEqual(tahapState("lorod"));
  });
});

describe("fitDistance", () => {
  const fov = 30;
  function project(d: number, viewAspect: number, margin: number) {
    const tanV = Math.tan((fov * Math.PI) / 360);
    const tanH = tanV * viewAspect;
    let worst = 0;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = (sx * ASPECT) / 2;
        const y = sy / 2;
        const yy = y * Math.cos(CLOTH_TILT);
        const z = -y * Math.sin(CLOTH_TILT);
        const depth = d - z;
        worst = Math.max(worst, Math.abs(x) / (depth * tanH), Math.abs(yy) / (depth * tanV));
      }
    }
    return { worst, limit: 1 - margin };
  }
  it("keeps the whole tilted cloth in view with the margin", () => {
    for (const a of [0.45, 0.75, 1, 1.6, 2.2]) {
      const d = fitDistance(fov, a, ASPECT, 1, 0.07);
      const { worst, limit } = project(d, a, 0.07);
      expect(worst).toBeLessThanOrEqual(limit + 1e-9);
      expect(worst).toBeGreaterThan(limit - 1e-6); // tight on the limiting side
    }
  });
  it("moves back for narrower views", () => {
    expect(fitDistance(fov, 0.5, ASPECT, 1, 0.07)).toBeGreaterThan(fitDistance(fov, 1, ASPECT, 1, 0.07));
    expect(fitDistance(fov, 1, ASPECT, 1, 0.07)).toBeGreaterThan(fitDistance(fov, 2, ASPECT, 1, 0.07));
  });
});
