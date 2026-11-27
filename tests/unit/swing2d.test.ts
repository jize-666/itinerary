import { describe, expect, it } from "vitest";
import { Swing2D, SWING } from "@/engine/pass3d/swing2d";
import type { PassSignal } from "@/engine/stage/bus";

const run = (s: Swing2D, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) s.step(dt);
};
/** Detik sampai status berhenti bergerak (resting/flipped), atau Infinity. */
const settleTime = (s: Swing2D, max = 12, dt = 1 / 60) => {
  for (let t = 0; t < max; t += dt) {
    s.step(dt);
    if (s.status === "resting" || s.status === "flipped") return t;
  }
  return Infinity;
};
const make = (roll0 = 0) => {
  const events: PassSignal[] = [];
  return { s: new Swing2D(roll0, (e) => events.push(e)), events };
};
/** Sentuh sekali (grab + lepas jauh dari ketukan) supaya status keluar dari "ready". */
const poke = (s: Swing2D) => {
  s.grab(0, 100, 150);
  s.drag(40, 90);
  s.step(0.4);
  s.release();
};

describe("swing2d: bandul kartu 2,5D", () => {
  it("deterministik: masukan sama, hasil sama", () => {
    const a = make(0.4).s;
    const b = make(0.4).s;
    for (const s of [a, b]) {
      s.setLook(0.3, -0.2, 1 / 60);
      run(s, 1.3);
      s.flip();
      run(s, 0.7);
    }
    expect(a.state).toEqual(b.state);
  });

  it("ayunan 0,4 rad bergoyang beberapa kali lalu diam dalam ±4 dtk", () => {
    const { s } = make(0.4);
    poke(s); // sentuh dulu supaya status melaporkan resting
    s.roll = 0.4;
    s.rollVel = 0;
    let crossings = 0;
    let prev = s.roll;
    let t = 0;
    for (; t < 8 && s.status !== "resting"; t += 1 / 60) {
      s.step(1 / 60);
      if (prev * s.roll < 0) crossings++;
      prev = s.roll;
    }
    expect(crossings).toBeGreaterThanOrEqual(3);
    expect(t).toBeLessThan(4.2);
    expect(s.status).toBe("resting");
    expect(s.roll).toBe(0);
  });

  it("frekuensi alami sekitar 0,85 Hz", () => {
    const { s } = make(0.2);
    const up: number[] = [];
    let prev = s.roll;
    for (let t = 0; t < 4; t += 1 / 240) {
      s.step(1 / 240);
      if (prev < 0 && s.roll >= 0) up.push(t);
      prev = s.roll;
    }
    expect(up.length).toBeGreaterThanOrEqual(2);
    const period = up[1]! - up[0]!;
    expect(1 / period).toBeGreaterThan(0.75);
    expect(1 / period).toBeLessThan(0.95);
  });

  it("stabil untuk dt 1/30 sampai 1/120 dan lonjakan 0,5 dtk (dijepit)", () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
      const { s } = make(0.4);
      run(s, 3, dt);
      expect(Number.isFinite(s.roll + s.pitch + s.yaw)).toBe(true);
      expect(Math.abs(s.roll)).toBeLessThan(0.45);
    }
    const { s } = make(0.4);
    s.step(0.5);
    s.step(Number.NaN);
    s.step(-3);
    s.setLook(Number.NaN, Infinity, 0.5);
    s.drag(Number.NaN, 5);
    run(s, 2);
    expect(Number.isFinite(s.roll + s.pitch + s.yaw + s.rollVel)).toBe(true);
    expect(Math.abs(s.roll)).toBeLessThan(0.5);
  });

  it("dt 1/30 dan 1/120 memberi ayunan yang hampir sama", () => {
    const a = make(0.4).s;
    const b = make(0.4).s;
    run(a, 1.5, 1 / 30);
    run(b, 1.5, 1 / 120);
    expect(Math.abs(a.roll - b.roll)).toBeLessThan(0.02);
  });

  it("menyeret: roll mengikuti sudut penunjuk, status dragging", () => {
    const { s, events } = make();
    s.grab(0, 100, 150);
    expect(s.status).toBe("dragging");
    expect(events[0]).toEqual({ type: "grab", kind: "card" });
    // penunjuk ke kanan-bawah titik putar: bawah kartu ke kanan, roll negatif (rotate() CSS searah jarum jam)
    s.drag(50, 100);
    run(s, 1);
    const angle = Math.atan2(-50, 100);
    expect(s.roll).toBeCloseTo(angle, 1);
    expect(s.status).toBe("dragging");
    s.drag(-50, 100);
    run(s, 1);
    expect(s.roll).toBeCloseTo(-angle, 1);
  });

  it("dilepas saat bergerak: tetap berayun, lalu diam; kabar release membawa laju", () => {
    const { s, events } = make();
    s.grab(0, 100, 150);
    for (let i = 1; i <= 12; i++) {
      s.drag(i * 8, 100);
      s.step(1 / 60);
    }
    s.release();
    expect(s.status).toBe("swinging");
    expect(Math.abs(s.rollVel)).toBeGreaterThan(0.3);
    const rel = events.find((e) => e.type === "release");
    expect(rel).toBeTruthy();
    s.step(0.3);
    expect(s.status).toBe("swinging");
    expect(settleTime(s)).toBeLessThan(6);
    expect(events.at(-1)).toEqual({ type: "rest", back: false });
    expect(s.status).toBe("resting");
  });

  it("sentilan kuat ≈ 1–2 m/s, lepas pelan ≈ 0,1–0,4 m/s", () => {
    const flick = make();
    flick.s.grab(0, 100, 150);
    for (let i = 1; i <= 8; i++) {
      flick.s.drag(i * 22, 100);
      flick.s.step(1 / 60);
    }
    flick.s.release();
    const fast = flick.events.find((e) => e.type === "release") as Extract<PassSignal, { type: "release" }>;
    expect(fast.speed).toBeGreaterThan(0.9);
    expect(fast.speed).toBeLessThan(2.4);

    const soft = make();
    soft.s.grab(0, 100, 150);
    for (let i = 1; i <= 30; i++) {
      soft.s.drag(i * 0.7, 100);
      soft.s.step(1 / 60);
    }
    soft.s.release();
    const slow = soft.events.find((e) => e.type === "release") as Extract<PassSignal, { type: "release" }>;
    expect(slow.speed).toBeGreaterThan(0.05);
    expect(slow.speed).toBeLessThan(0.45);
  });

  it("ketukan singkat (< 250 ms, < 8 px) membalik ke π, ketukan lagi kembali ke 0", () => {
    const { s, events } = make();
    s.grab(10, 100, 150);
    s.step(0.1);
    s.release();
    expect(events.map((e) => e.type).filter((t) => t !== "swing-speed")).toEqual(["grab", "flip"]);
    expect(events.find((e) => e.type === "flip")).toEqual({ type: "flip", back: true });
    run(s, 4);
    expect(s.status).toBe("flipped");
    expect(s.yaw).toBeCloseTo(Math.PI, 3);
    s.grab(10, 100, 150);
    s.step(0.1);
    s.release();
    run(s, 4);
    expect(s.status).toBe("resting");
    expect(s.yaw).toBeCloseTo(0, 3);
    expect(events.filter((e) => e.type === "rest").map((e) => (e as { back: boolean }).back)).toEqual([true, false]);
  });

  it("tekan lama atau bergeser jauh bukan ketukan", () => {
    const slow = make();
    slow.s.grab(0, 100, 150);
    slow.s.step(0.5);
    slow.s.release();
    expect(slow.events.some((e) => e.type === "flip")).toBe(false);
    const far = make();
    far.s.grab(0, 100, 150);
    far.s.drag(30, 100);
    far.s.step(0.1);
    far.s.release();
    expect(far.events.some((e) => e.type === "flip")).toBe(false);
  });

  it("flip(): yaw sedikit melewati sasaran, lalu diam di π", () => {
    const { s } = make();
    poke(s);
    run(s, 5);
    s.flip();
    let peak = 0;
    for (let t = 0; t < 4; t += 1 / 120) {
      s.step(1 / 120);
      peak = Math.max(peak, s.yaw);
    }
    expect(peak).toBeGreaterThan(Math.PI);
    expect(peak).toBeLessThan(Math.PI * 1.25);
    expect(s.yaw).toBeCloseTo(Math.PI, 3);
  });

  it("pandang memiringkan keseimbangan dalam batas ±6° roll dan ±4° pitch", () => {
    const { s } = make();
    s.setLook(1, 1, 0);
    run(s, 8);
    expect(s.roll).toBeCloseTo(SWING.leanRoll, 3);
    expect(s.pitch).toBeCloseTo(SWING.leanPitch, 3);
    s.setLook(-5, 9, 1 / 60);
    run(s, 8);
    expect(s.roll).toBeCloseTo(-SWING.leanRoll, 3);
    expect(s.pitch).toBeCloseTo(SWING.leanPitch, 3);
    expect((SWING.leanRoll * 180) / Math.PI).toBeCloseTo(6, 5);
    expect((SWING.leanPitch * 180) / Math.PI).toBeCloseTo(4, 5);
  });

  it("pandang yang bergeser cepat menyentak kartu", () => {
    const { s } = make();
    s.setLook(0, 0, 0);
    s.setLook(0.8, 0, 1 / 60);
    expect(Math.abs(s.rollVel)).toBeGreaterThan(0.1);
  });

  it("masih diam sebelum disentuh = ready; selesai ayun masuk tanpa kabar rest", () => {
    const { s, events } = make(0.2);
    expect(s.status).toBe("ready");
    run(s, 6);
    expect(s.status).toBe("ready");
    expect(s.active).toBe(false);
    expect(events.some((e) => e.type === "rest")).toBe(false);
  });

  it("kabar swing-speed dibatasi ≤ 10 per dtk dan berskala m/dtk", () => {
    const { s, events } = make(0.4);
    poke(s);
    events.length = 0;
    s.roll = 0.4;
    s.rollVel = 0;
    run(s, 2, 1 / 120);
    const speeds = events.filter((e): e is Extract<PassSignal, { type: "swing-speed" }> => e.type === "swing-speed");
    expect(speeds.length).toBeGreaterThan(5);
    expect(speeds.length).toBeLessThanOrEqual(21);
    const top = Math.max(...speeds.map((e) => e.speed));
    // 0,4 rad pada ≈ 5,3 rad/dtk ≈ 2 rad/dtk puncak × 0,25 m ≈ 0,5 m/dtk
    expect(top).toBeGreaterThan(0.2);
    expect(top).toBeLessThan(0.9);
    for (const e of speeds) expect(e.angularSpeed).toBeGreaterThanOrEqual(e.speed / SWING.armLength - 1e-9);
  });
});
