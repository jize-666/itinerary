import { describe, expect, it } from "vitest";
import { breath, GONG, gongDepth, gongFront, gongHum, gongSection, gongSwing, heartbeat, MALLET_HAND, MALLET_HIT, MALLET_REST, malletPose, ripple, RIPPLES, STRIKE, strikeFlare, strikeHeat, SWING } from "@/engine/stage/gong";
import type { Vec3 } from "@/engine/stage/shots";

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("profil badan gong", () => {
  it("mulai di puncak pencu pada sumbu, melebar sampai jari-jari gong, lalu bau melengkung ke belakang", () => {
    const front = gongFront(56);
    expect(front).toHaveLength(57);
    expect(front[0]).toEqual([0, 0.112]);
    const rMax = Math.max(...front.map((p) => p[0]));
    expect(rMax).toBeCloseTo(GONG.radius, 3);
    // pencu adalah titik paling depan; tepi bau paling belakang
    expect(Math.max(...front.map((p) => p[1]))).toBeCloseTo(0.112, 3);
    expect(front[front.length - 1]![1]).toBeCloseTo(-0.238, 3);
  });

  it("titik berjarak sama sepanjang busur (tanpa segi yang renggang di lengkung pencu)", () => {
    const front = gongFront(56);
    const steps = front.slice(1).map((p, i) => Math.hypot(p[0] - front[i]![0], p[1] - front[i]![1]));
    const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
    for (const s of steps) expect(Math.abs(s - mean)).toBeLessThan(mean * 0.12);
  });

  it("penampang: muka lalu punggung setebal dinding, normal ternormalisasi dan menghadap ke luar", () => {
    const { points, normals } = gongSection(56);
    expect(points).toHaveLength(57 + 29);
    expect(points[points.length - 1]![0]).toBe(0);
    expect(normals[0]).toEqual([0, 1]);
    expect(normals[normals.length - 1]).toEqual([0, -1]);
    for (const n of normals) expect(Math.hypot(n[0], n[1])).toBeCloseTo(1, 5);
    // muka menghadap penonton (+z) di rai, punggung menghadap ke belakang
    expect(normals[20]![1]).toBeGreaterThan(0.9);
    expect(normals[normals.length - 12]![1]).toBeLessThan(-0.9);
    // punggung pusat pencu berada tepat setebal dinding di belakang mukanya
    expect(points[0]![1] - points[points.length - 1]![1]).toBeCloseTo(GONG.thick, 3);
    for (const p of points) expect(p[0]).toBeGreaterThanOrEqual(0);
  });

  it("gongDepth mengikuti titik-titik profil", () => {
    expect(gongDepth(0)).toBeCloseTo(0.112, 4);
    expect(gongDepth(0.3)).toBeCloseTo(0, 3);
    expect(gongDepth(GONG.pencu)).toBeCloseTo(0.011, 3);
    expect(gongDepth(0.452)).toBeCloseTo(-0.027, 3);
    // pencu menonjol, rai nyaris datar
    expect(gongDepth(0.05)).toBeGreaterThan(gongDepth(0.2) + 0.08);
    expect(gongDepth(-1)).toBeCloseTo(0.112, 4);
    expect(Number.isFinite(gongDepth(9))).toBe(true);
  });
});

describe("tabuh (malletPose)", () => {
  it("diam: menggantung tegak di cantolan, di luar garis waktu pukulan, tanpa menyentuh bibir gong", () => {
    for (const p of [-1, STRIKE.rest, 99]) {
      const m = malletPose(p, 0);
      expect(m.squash).toBe(1);
      expect(m.hand).toEqual(MALLET_REST);
      expect(m.head[1]).toBeLessThan(MALLET_REST[1] - 0.5);
      // tegak: kepala nyaris tepat di bawah titik gantung
      expect(Math.hypot(m.head[0] - MALLET_REST[0], m.head[2] - MALLET_REST[2])).toBeLessThan(0.02);
      // bantalan (jari-jari 7,5 cm) di luar bibir gong
      expect(Math.hypot(m.head[0], m.head[1] - GONG.y) - 0.075).toBeGreaterThan(GONG.radius);
    }
    expect(MALLET_REST[0]).toBeGreaterThan(MALLET_HAND[0]);
    // goyang pelan, tidak sampai menyentuh gong
    const a = malletPose(-1, 0).head;
    const b = malletPose(-1, 1.2).head;
    expect(dist(a, b)).toBeGreaterThan(0);
    expect(dist(a, b)).toBeLessThan(0.03);
  });

  it("siap dipukul: tabuh terangkat sedikit, hanya saat diam", () => {
    expect(malletPose(-1, 0, 1).head[1]).toBeGreaterThan(malletPose(-1, 0, 0).head[1] + 0.1);
    expect(malletPose(0.45, 0, 1).head).toEqual(malletPose(0.45, 0, 0).head);
  });

  it("tepat saat kontak kepala tabuh ada di depan pencu, datang dari kanan depan", () => {
    const hit = malletPose(STRIKE.impact, 0);
    expect(dist(hit.head, MALLET_HIT)).toBeLessThan(1e-9);
    const before = malletPose(STRIKE.impact - 0.001, 0).head;
    const v: Vec3 = [hit.head[0] - before[0], hit.head[1] - before[1], hit.head[2] - before[2]];
    const l = Math.hypot(v[0], v[1], v[2]);
    // bergerak ke kiri dan masuk ke gong (−z), nyaris mendatar
    expect(v[0] / l).toBeLessThan(-0.3);
    expect(v[2] / l).toBeLessThan(-0.8);
    expect(Math.abs(v[1] / l)).toBeLessThan(0.2);
    // kepala (jari-jari ±7,5 cm, gepeng) menyentuh puncak pencu, tidak menembusnya
    expect(MALLET_HIT[2] - gongDepth(Math.hypot(MALLET_HIT[0], MALLET_HIT[1] - GONG.y))).toBeGreaterThan(0.05);
  });

  it("ancang-ancang mengangkat kepala tabuh ke kanan depan, lalu ayunan makin cepat sampai kontak", () => {
    const top = malletPose(STRIKE.load, 0).head;
    expect(top[1]).toBeGreaterThan(MALLET_HIT[1] + 0.25);
    expect(top[0]).toBeGreaterThan(MALLET_HAND[0] + 0.3);
    const span = STRIKE.impact - STRIKE.hold;
    const d1 = dist(malletPose(STRIKE.hold, 0).head, malletPose(STRIKE.hold + span / 2, 0).head);
    const d2 = dist(malletPose(STRIKE.hold + span / 2, 0).head, malletPose(STRIKE.impact, 0).head);
    expect(d2).toBeGreaterThan(d1 * 3);
  });

  it("bantalan tergencet hanya sesaat sesudah kontak", () => {
    expect(malletPose(STRIKE.impact, 0).squash).toBeCloseTo(0.82, 5);
    expect(malletPose(STRIKE.impact + 0.06, 0).squash).toBe(1);
    expect(malletPose(STRIKE.impact - 0.001, 0).squash).toBe(1);
  });

  it("gerak bersambung: tidak ada lompatan di batas antar fase, dan kembali tepat ke posisi diam", () => {
    // di tiap batas fase, sikap sesaat sebelum dan sesudahnya nyaris sama
    for (const edge of [0, STRIKE.load, STRIKE.hold, STRIKE.impact, STRIKE.bounce, STRIKE.rest]) {
      const [a, b] = [malletPose(edge - 1e-6, 0.5), malletPose(edge + 1e-6, 0.5)];
      expect(dist(a.head, b.head)).toBeLessThan(2e-4);
      expect(dist(a.hand, b.hand)).toBeLessThan(2e-4);
    }
    // kecepatan tertinggi kepala tabuh (tepat sebelum kontak) ±28 m/dtk model: < 13 cm per 1/240 dtk
    const dt = 1 / 240;
    let prev = malletPose(-dt, 0.5);
    let worst = 0;
    for (let p = 0; p <= STRIKE.rest + dt; p += dt) {
      const m = malletPose(p, 0.5);
      worst = Math.max(worst, dist(m.head, prev.head));
      prev = m;
    }
    expect(worst).toBeLessThan(0.13);
  });
});

describe("sesudah hantaman", () => {
  it("gong terdorong ke belakang dulu, berayun seperti bandul, lalu meluruh", () => {
    expect(gongSwing(-1)).toBe(0);
    expect(gongSwing(0)).toBe(0);
    expect(gongSwing(0.1)).toBeGreaterThan(0);
    const peak = gongSwing(SWING.period / 4);
    expect(peak).toBeGreaterThan(0.04);
    expect(peak).toBeLessThanOrEqual(SWING.amp);
    // setengah periode kemudian berbalik ke depan
    expect(gongSwing((SWING.period * 3) / 4)).toBeLessThan(-0.02);
    // simpangan terjauh pusat gong ±3–4 cm
    expect(peak * (GONG.pivot - GONG.y)).toBeGreaterThan(0.03);
    expect(peak * (GONG.pivot - GONG.y)).toBeLessThan(0.04);
    expect(Math.abs(gongSwing(STRIKE.tail + 6))).toBeLessThan(0.0005);
  });

  it("dengung jauh lebih kecil dari ayunan dan habis dalam beberapa detik", () => {
    let max = 0;
    for (let st = 0; st < 3; st += 1 / 600) max = Math.max(max, Math.abs(gongHum(st)));
    expect(max).toBeGreaterThan(0.0004);
    expect(max).toBeLessThan(0.0008);
    expect(Math.abs(gongHum(4))).toBeLessThan(1e-5);
    expect(gongHum(-1)).toBe(0);
  });

  it("panas, kilatan, dan napas api: nol sebelum kena, tertinggi saat kena, lalu padam", () => {
    expect(strikeHeat(-0.1)).toBe(0);
    expect(strikeFlare(-0.1)).toBe(0);
    expect(strikeHeat(0)).toBeCloseTo(2.2, 5);
    expect(strikeFlare(0)).toBe(1);
    expect(strikeHeat(1)).toBeLessThan(strikeHeat(0.5));
    expect(strikeHeat(STRIKE.tail)).toBeLessThan(0.001);
    expect(strikeFlare(STRIKE.tail)).toBeLessThan(0.001);
    expect(breath(-0.1)).toBe(0);
    expect(breath(0)).toBe(0);
    expect(breath(0.2)).toBeGreaterThan(0.8);
    expect(breath(1.8)).toBe(0);
    for (let st = 0; st < 2; st += 0.05) expect(breath(st)).toBeLessThanOrEqual(1);
  });

  it("riak menyusul satu per satu, melebar dari pencu, lalu hilang", () => {
    expect(RIPPLES).toBe(4);
    expect(ripple(0, 0)).toEqual({ radius: 0, opacity: 0 });
    expect(ripple(1, 0.1).opacity).toBe(0);
    expect(ripple(1, 0.2).opacity).toBeGreaterThan(0);
    const [a, b] = [ripple(0, 0.3), ripple(0, 1.2)];
    expect(b.radius).toBeGreaterThan(a.radius);
    expect(b.opacity).toBeLessThan(a.opacity);
    for (let i = 0; i < RIPPLES; i++) {
      const end = ripple(i, 1.7 + i * 0.16);
      expect(end.opacity).toBeCloseTo(0, 9);
      // riak tetap di dalam muka gong
      expect(end.radius).toBeLessThan(1);
    }
  });
});

describe("jantung gong (heartbeat)", () => {
  it("denyut ganda tiap 2,1 detik: deg kuat, deg lemah, lalu hening", () => {
    expect(heartbeat(0)).toBeCloseTo(1, 3);
    expect(heartbeat(0.3)).toBeCloseTo(0.65, 2);
    expect(heartbeat(1.2)).toBeLessThan(0.001);
    expect(heartbeat(2.1)).toBeCloseTo(heartbeat(0), 6);
    expect(heartbeat(-2.1 + 0.3)).toBeCloseTo(heartbeat(0.3), 6);
    for (let t = 0; t < 4.2; t += 0.01) {
      expect(heartbeat(t)).toBeGreaterThanOrEqual(0);
      expect(heartbeat(t)).toBeLessThanOrEqual(1.01);
    }
  });
});
