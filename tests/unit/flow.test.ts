/**
 * Model aliran malam canting (Tugas 11.2, PRD §4 dan §8): lebar garis turun saat tangan cepat, malam melebar dan
 * menetes saat tangan diam, malam habis memicu celup ulang, malam di nyamplung mendingin.
 */
import { describe, expect, it } from "vitest";
import { createFlow, dip, FLOW, hold, move, press, release, type FlowDab, type FlowState } from "@/engine/canting/flow";

/** Goresan lurus dari (x0, y) ke kanan sepanjang `len` dengan kecepatan `speed` (tinggi kain/dtk), sampel tiap 16 ms. */
function line(s0: FlowState, tool: "klowong" | "cecek" | "tembok", speed: number, len = 0.3, x0 = 0.3, y = 0.5, t0 = 1000) {
  let out = press(s0, x0, y, t0, tool);
  let s = out.state;
  const dabs: FlowDab[] = [...out.dabs];
  const events = [...out.events];
  const steps = Math.ceil(len / (speed * 0.016));
  for (let i = 1; i <= steps; i++) {
    const t = t0 + i * 16;
    out = move(s, x0 + Math.min(len, speed * (t - t0) * 0.001), y, t);
    s = out.state;
    dabs.push(...out.dabs);
    events.push(...out.events);
  }
  return { state: release(s), dabs, events };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("aliran malam canting", () => {
  it("tangan cepat = garis klowong lebih tipis daripada tangan pelan", () => {
    const slow = line(createFlow(0), "klowong", 0.08);
    const fast = line(createFlow(0), "klowong", 1.2);
    expect(mean(fast.dabs.map((d) => d.r))).toBeLessThan(mean(slow.dabs.map((d) => d.r)) * 0.8);
    expect(fast.events).toContain("fast");
    expect(slow.events).not.toContain("fast");
  });

  it("dab rapat tanpa celah walau pointer melompat jauh dalam satu kejadian", () => {
    let s = press(createFlow(0), 0.2, 0.5, 1000, "klowong").state;
    const out = move(s, 0.6, 0.5, 1016); // 0,4 tinggi kain dalam 16 ms
    s = out.state;
    expect(out.dabs.length).toBeGreaterThan(20);
    for (let i = 1; i < out.dabs.length; i++) {
      const a = out.dabs[i - 1]!;
      const b = out.dabs[i]!;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(FLOW.klowong.spacing * Math.max(a.r, b.r) * 1.05 + 1e-9);
    }
    expect(out.dabs.at(-1)!.x).toBeGreaterThan(0.59);
  });

  it("tangan diam: malam melebar (mbleber) lalu menetes satu kali", () => {
    const p = press(createFlow(0), 0.5, 0.5, 1000, "klowong");
    const r0 = p.dabs[0]!.r;
    const spread = hold(p.state, 1000 + FLOW.stillMs + FLOW.spreadMs * 0.6);
    expect(spread.events).toContain("spread");
    expect(Math.max(...spread.dabs.map((d) => d.r))).toBeGreaterThan(r0 * 1.4);
    const drip = hold(spread.state, 1000 + FLOW.dripMs + 50);
    expect(drip.events).toContain("drip");
    const again = hold(drip.state, 1000 + FLOW.dripMs + 900);
    expect(again.events).not.toContain("drip");
    // melebar tidak tanpa batas
    expect(Math.max(...again.dabs.map((d) => d.r), 0)).toBeLessThanOrEqual(r0 * FLOW.spreadMax * 1.01 + FLOW.dripR);
  });

  it("bergerak lagi sesudah diam: tidak melebar terus di titik lama", () => {
    let s = press(createFlow(0), 0.5, 0.5, 1000, "klowong").state;
    s = hold(s, 1000 + FLOW.stillMs + 200).state;
    s = move(s, 0.56, 0.5, 1400).state;
    const after = hold(s, 1420);
    expect(after.dabs).toHaveLength(0);
  });

  it("malam habis memicu celup ulang; sesudah dicelup malam keluar lagi", () => {
    const long = line(createFlow(0), "tembok", 0.4, 3.5);
    expect(long.events).toContain("empty");
    expect(long.events.filter((e) => e === "empty")).toHaveLength(1);
    expect(long.state.malam).toBe(0);
    const dry = press(long.state, 0.5, 0.5, 9000, "klowong");
    expect(dry.dabs).toHaveLength(0);
    expect(dry.events).toContain("empty");
    const wet = press(dip(release(dry.state), 9100), 0.5, 0.5, 9200, "klowong");
    expect(wet.dabs.length).toBeGreaterThan(0);
    expect(wet.state.malam).toBeGreaterThan(0.99);
  });

  it("satu nyamplung penuh cukup untuk garis klowong beberapa kali lebar kain", () => {
    const run = line(createFlow(0), "klowong", 0.25, 2.5);
    expect(run.events).not.toContain("empty");
    expect(run.state.malam).toBeGreaterThan(0);
  });

  it("malam menipis sebelum habis: garis mengecil di ujung nyamplung", () => {
    const run = line(createFlow(0), "klowong", 0.25, 6);
    const live = run.dabs.filter((d) => d.r > 0);
    const head = mean(live.slice(0, 40).map((d) => d.r));
    const tail = mean(live.slice(-15).map((d) => d.r));
    expect(tail).toBeLessThan(head * 0.8);
  });

  it("malam di nyamplung mendingin: garis lebih tipis lama sesudah dicelup", () => {
    const fresh = line(createFlow(0), "klowong", 0.2, 0.2, 0.3, 0.5, 1000);
    const cold = line(createFlow(0), "klowong", 0.2, 0.2, 0.3, 0.5, 1000 + FLOW.coolS * 1000 * 2);
    expect(mean(cold.dabs.map((d) => d.r))).toBeLessThan(mean(fresh.dabs.map((d) => d.r)) * 0.92);
    expect(dip(createFlow(0), 5000).heat).toBe(1);
  });

  it("canting cecek: ketukan = satu titik, diseret = titik berjarak", () => {
    const tap = press(createFlow(0), 0.4, 0.4, 1000, "cecek");
    expect(tap.dabs).toHaveLength(1);
    const drag = line(createFlow(0), "cecek", 0.3, 0.3);
    expect(drag.dabs.length).toBeGreaterThan(5);
    for (let i = 1; i < drag.dabs.length; i++) {
      const gap = Math.hypot(drag.dabs[i]!.x - drag.dabs[i - 1]!.x, drag.dabs[i]!.y - drag.dabs[i - 1]!.y);
      expect(gap).toBeGreaterThan(FLOW.cecek.r * FLOW.cecek.gap * 0.6);
    }
  });

  it("canting tembok lebih lebar dan lebih boros malam daripada klowong", () => {
    const k = line(createFlow(0), "klowong", 0.25, 0.4);
    const tb = line(createFlow(0), "tembok", 0.25, 0.4);
    expect(mean(tb.dabs.map((d) => d.r))).toBeGreaterThan(mean(k.dabs.map((d) => d.r)) * 3);
    expect(tb.state.malam).toBeLessThan(k.state.malam);
  });

  it("deterministik: masukan sama, keluaran sama", () => {
    const a = line(createFlow(0), "cecek", 0.5, 0.5);
    const b = line(createFlow(0), "cecek", 0.5, 0.5);
    expect(a).toEqual(b);
  });

  it("tanpa press, move dan hold tidak menorehkan apa pun", () => {
    const s = createFlow(0);
    expect(move(s, 0.5, 0.5, 100).dabs).toHaveLength(0);
    expect(hold(s, 5000).dabs).toHaveLength(0);
  });
});
