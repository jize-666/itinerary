import { describe, expect, it } from "vitest";
import {
  breath,
  cameraKick,
  createStrikes,
  FX,
  GONG,
  GONG_SCALE,
  gongDepth,
  gongFront,
  gongHum,
  gongSection,
  gongSpot,
  gongSwing,
  heartbeat,
  KICK,
  kickSize,
  MALLET_HAND,
  MALLET_HIT,
  MALLET_REST,
  malletPose,
  ripple,
  RIPPLES,
  STRIKE,
  strikeFlare,
  strikeHeat,
  strikeLight,
  SWING,
} from "@/engine/stage/gong";
import { buildFilm } from "@/engine/slides/build-slides";
import { projectPoint, shotFor, type Vec3 } from "@/engine/stage/shots";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import type { TripView } from "@/lib/trip";

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

describe("pencatat pukulan (createStrikes)", () => {
  it("belum dipukul: tabuh diam, tidak ada efek, panggung tidak sibuk", () => {
    const s = createStrikes().at(10);
    expect(s.st).toBeLessThan(0);
    expect(s.p).toBeGreaterThan(STRIKE.rest);
    expect([s.swing, s.hum, s.heat, s.flare, s.breath, s.count]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(s.fx).toEqual([-1, -1]);
    expect(s.kick).toEqual({ back: 0, up: 0, side: 0, roll: 0 });
    expect(s.busy).toBe(false);
  });

  it("satu pukulan: ayunan tabuh dulu, hantaman `STRIKE.impact` detik kemudian, lalu semua efek berjalan dan habis", () => {
    const k = createStrikes();
    expect(k.strike(100)).toBe(true);
    const swing = k.at(100.3);
    expect(swing.p).toBeCloseTo(0.3, 9);
    expect(swing.st).toBeLessThan(0); // tabuh masih di udara
    expect(swing.count).toBe(0);
    expect(kickSize(swing.kick)).toBe(0); // kamera baru terhentak saat tabuh kena, bukan saat diayun
    expect(swing.busy).toBe(true);
    const hit = k.at(100 + STRIKE.impact + 0.05);
    expect(hit.st).toBeCloseTo(0.05, 9);
    expect(hit.count).toBe(1);
    expect(hit.heat).toBeGreaterThan(1.8);
    expect(hit.flare).toBeGreaterThan(0.9);
    expect(hit.fx[0]).toBeCloseTo(0.05, 9);
    expect(hit.fx[1]).toBe(-1);
    expect(hit.swing).toBeGreaterThan(0); // terdorong ke belakang dulu
    expect(hit.kick).toEqual(cameraKick(hit.st));
    expect(hit.kick.back).toBeGreaterThan(0); // kamera ikut terdorong mundur
    const late = k.at(100 + STRIKE.impact + STRIKE.tail + 0.1);
    expect(late.busy).toBe(false);
    expect(late.count).toBe(1);
    expect(Math.abs(late.swing)).toBeLessThan(SWING.amp * 0.06);
  });

  it("pukulan ditolak selama tabuh belum kembali menggantung", () => {
    const k = createStrikes();
    expect(k.strike(5)).toBe(true);
    expect(k.strike(5 + STRIKE.rest - 0.01)).toBe(false);
    expect(k.strike(5 + STRIKE.rest)).toBe(true);
    expect(k.at(5 + STRIKE.rest + STRIKE.impact + 0.01).count).toBe(2);
  });

  it("pukulan beruntun: lajur efek bergantian, ayunan dan panas dijumlahkan tanpa lompatan", () => {
    const k = createStrikes();
    k.strike(0);
    const t2 = STRIKE.rest;
    const before = k.at(t2 + STRIKE.impact - 1e-6);
    k.strike(t2);
    // memulai ayunan tabuh tidak mengubah apa pun pada gong
    const begun = k.at(t2 + 1e-6);
    expect(begun.swing).toBeCloseTo(k.at(t2 - 1e-6).swing, 5);
    expect(begun.p).toBeCloseTo(0, 5);
    const after = k.at(t2 + STRIKE.impact + 1e-6);
    // tepat saat hantaman kedua: ayunan bersambung, panas bertambah, riak pukulan pertama masih di lajurnya
    expect(after.swing).toBeCloseTo(before.swing, 4);
    for (const key of ["back", "up", "side", "roll"] as const) expect(after.kick[key]).toBeCloseTo(before.kick[key], 5);
    expect(after.heat).toBeGreaterThan(before.heat + 1.5);
    expect(after.fx[0]).toBeCloseTo(STRIKE.rest, 4);
    expect(after.fx[1]).toBeCloseTo(0, 4);
    expect(after.st).toBeCloseTo(0, 4);
    k.strike(t2 * 2);
    const third = k.at(t2 * 2 + STRIKE.impact + 0.2);
    expect(third.fx[0]).toBeCloseTo(0.2, 6); // pukulan ketiga kembali ke lajur 0
    expect(third.count).toBe(3);
    expect(third.heat).toBeLessThanOrEqual(2.6);
  });

  it("dipukul terus-menerus: hantaman lama dilupakan tanpa lompatan, jumlah pukulan tetap utuh", () => {
    const k = createStrikes();
    for (let i = 0; i < 14; i++) {
      const t = i * STRIKE.rest;
      const before = k.at(t);
      expect(k.strike(t)).toBe(true);
      const after = k.at(t);
      // memulai pukulan baru (dan membuang hantaman yang sudah lama) tidak menggeser gong maupun kamera
      expect(Math.abs(after.swing - before.swing)).toBeLessThan(SWING.amp * 0.012);
      expect(Math.abs(after.kick.back - before.kick.back)).toBeLessThan(KICK.back * 1e-6);
      expect(Math.abs(after.kick.up - before.kick.up)).toBeLessThan(KICK.up * 1e-6);
    }
    const s = k.at(13 * STRIKE.rest + STRIKE.impact + 0.1);
    expect(s.count).toBe(14);
    expect(Number.isFinite(s.swing)).toBe(true);
    // ayunan bandul yang dijumlahkan tetap terbatas
    expect(Math.abs(s.swing)).toBeLessThan(SWING.amp * 2.5);
  });
});

describe("hentakan dan getar kamera (cameraKick)", () => {
  const KEYS = ["back", "up", "side", "roll"] as const;
  /** Cuplikan rapat 0–4 detik sesudah hantaman. */
  const trace = Array.from({ length: 4001 }, (_, i) => ({ st: i / 1000, ...cameraKick(i / 1000) }));

  it("diam sebelum dan tepat saat kena, dan mulai tanpa sentakan (simpangan dan kecepatan awal nol)", () => {
    expect(cameraKick(-0.2)).toEqual({ back: 0, up: 0, side: 0, roll: 0 });
    expect(kickSize(cameraKick(0))).toBe(0);
    const peak = Math.max(...trace.map(kickSize));
    // 1 ms sesudah kena masih < 0,2% puncak; getar lama langsung muncul dengan simpangan penuh
    expect(kickSize(cameraKick(0.001))).toBeLessThan(peak * 0.002);
    // frame pertama di 60 fps: baru seperempat jalan
    expect(kickSize(cameraKick(1 / 60))).toBeLessThan(peak * 0.3);
    expect(kickSize(cameraKick(1 / 60))).toBeGreaterThan(0);
  });

  it("hentakan: kamera terdorong mundur ±1% jaraknya dalam ±0,1 dtk, berayun balik sekali, lalu tenang", () => {
    const top = trace.reduce((a, b) => (b.back > a.back ? b : a));
    const low = trace.reduce((a, b) => (b.back < a.back ? b : a));
    expect(top.back).toBeGreaterThan(0.007);
    expect(top.back).toBeLessThan(0.013);
    expect(top.st).toBeGreaterThan(0.04);
    expect(top.st).toBeLessThan(0.14);
    // ayunan balik (kamera maju sedikit) jauh lebih kecil dari hentakannya
    expect(low.st).toBeGreaterThan(top.st);
    expect(-low.back).toBeGreaterThan(top.back * 0.1);
    expect(-low.back).toBeLessThan(top.back * 0.4);
    for (const p of trace) if (p.st >= 1.5) expect(Math.abs(p.back)).toBeLessThan(top.back * 0.01);
  });

  it("getar: bolak-balik di dalam batasnya, kecil di layar, dan habis dalam ±1,5 detik", () => {
    for (const p of trace) {
      expect(Math.abs(p.up)).toBeLessThanOrEqual(KICK.up);
      expect(Math.abs(p.side)).toBeLessThanOrEqual(KICK.side);
      expect(Math.abs(p.roll)).toBeLessThanOrEqual(KICK.roll);
    }
    for (const key of ["up", "side", "roll"] as const) {
      const values = trace.map((p) => p[key]);
      expect(Math.max(...values)).toBeGreaterThan(KICK[key] * 0.3);
      expect(Math.min(...values)).toBeLessThan(-KICK[key] * 0.3);
      for (const p of trace) if (p.st >= 1.5) expect(Math.abs(p[key])).toBeLessThan(KICK[key] * 0.02);
    }
    // paling jauh ±1% tinggi layar (setengah tinggi layar = 1)
    expect(KICK.up).toBeLessThanOrEqual(0.02);
    expect(KICK.side).toBeLessThanOrEqual(KICK.up);
  });

  it("halus di laju frame mana pun: geseran per frame kecil dan tidak pernah berbalik arah mendadak", () => {
    for (const fps of [120, 60, 30]) {
      for (let phase = 0; phase < 8; phase++) {
        const at = (i: number) => cameraKick(phase / 8 / fps + i / fps);
        let prev = cameraKick(0);
        let prevStep = { back: 0, up: 0, side: 0, roll: 0 };
        for (let i = 0; i < fps * 3; i++) {
          const k = at(i);
          for (const key of KEYS) {
            const step = k[key] - prev[key];
            // per frame paling banyak sepertiga simpangan terbesar di 30 fps, seperenam di 60 fps
            expect(Math.abs(step)).toBeLessThan((KICK[key] * 20) / fps);
            // percepatan terbatas: langkah tidak berubah lebih dari ±(2π·5 Hz)² × simpangan per frame kuadrat
            expect(Math.abs(step - prevStep[key])).toBeLessThan((KICK[key] * 1500) / (fps * fps));
            prevStep = { ...prevStep, [key]: step };
          }
          prev = k;
        }
      }
    }
  });

  it("getarnya pelan: di bawah 5 Hz, jadi satu gelombang terbagi atas ≥ 12 frame di 60 fps", () => {
    for (const hz of [KICK.upHz, KICK.sideHz, KICK.rollHz]) expect(hz).toBeLessThanOrEqual(5);
    expect(KICK.backHz).toBeLessThan(2);
  });
});

describe("cahaya dan api saat dipukul", () => {
  it("kilatan: tertinggi saat kena, padam dalam ±1,5 detik", () => {
    expect(strikeLight(-1)).toBe(0);
    expect(strikeLight(0)).toBeGreaterThan(2);
    expect(strikeLight(0.3)).toBeLessThan(strikeLight(0.1));
    expect(strikeLight(1.6)).toBeLessThan(0.03);
  });

  it("bunga api dan lidah api terakhir padam sebelum efek dianggap selesai", () => {
    expect(FX.sparks).toBeLessThanOrEqual(FX.end);
    expect(FX.emit + FX.flame).toBeLessThanOrEqual(FX.end + 1e-9);
    expect(breath(FX.end)).toBe(0);
    for (let i = 0; i < RIPPLES; i++) expect(ripple(i, FX.end).opacity).toBeLessThan(0.02);
  });
});

describe("letak gong di layar (gongSpot)", () => {
  const film = buildFilm({ role: "guest", trip: Trip.parse(soloInput) as unknown as TripView["trip"] });
  const slide = film.slides.find((s) => s.kind === "gong")!;

  it("projectPoint: titik pandang jatuh di tengah layar, kanan dan atas sesuai arah kamera", () => {
    const shot = { pos: [0, 1, 5] as Vec3, look: [0, 1, 0] as Vec3, fov: 40 };
    const c = projectPoint(shot, 16 / 9, [0, 1, 0]);
    expect(c.x).toBeCloseTo(0, 9);
    expect(c.y).toBeCloseTo(0, 9);
    expect(c.depth).toBeCloseTo(5, 9);
    expect(projectPoint(shot, 16 / 9, [1, 1, 0]).x).toBeGreaterThan(0);
    expect(projectPoint(shot, 16 / 9, [0, 2, 0]).y).toBeGreaterThan(0);
    // tepi atas layar pada jarak 5 m: tinggi = 5 × tan(20°)
    expect(projectPoint(shot, 16 / 9, [0, 1 + 5 * Math.tan((20 * Math.PI) / 180), 0]).y).toBeCloseTo(1, 6);
    expect(projectPoint(shot, 16 / 9, [0, 1, 9]).depth).toBeLessThan(0); // di belakang kamera
  });

  it("layar lebar dan layar tegak: gong di atas teks, dekat tengah, dan bidang sentuhnya muat di layar", () => {
    for (const aspect of [16 / 9, 4 / 3, 393 / 852]) {
      const g = gongSpot(shotFor(slide, { aspect }), aspect);
      expect(g.x).toBeGreaterThan(40);
      expect(g.x).toBeLessThan(60);
      // layar lebar: paruh atas; layar tegak: sedikit di bawah tengah (kamera mendongak), teks tetap di bawahnya
      expect(g.y).toBeGreaterThan(18);
      expect(g.y).toBeLessThan(aspect > 1 ? 50 : 58);
      expect(g.d).toBeGreaterThan(aspect > 1 ? 12 : 24);
      expect(g.d).toBeLessThan(70);
      // garis tengah bidang sentuh ≈ garis tengah gong di layar (dilebihkan 6%)
      const shot = shotFor(slide, { aspect });
      const [l, r] = [projectPoint(shot, aspect, [-GONG.radius * GONG_SCALE, GONG.y * GONG_SCALE, 0]), projectPoint(shot, aspect, [GONG.radius * GONG_SCALE, GONG.y * GONG_SCALE, 0])];
      const seen = ((r.x - l.x) / 2) * 100;
      expect(g.d).toBeGreaterThan(seen * 0.95);
      expect(g.d).toBeLessThan(seen * 1.25);
    }
  });

  it("bingkai slide gong memuat kedua naga dan ruang untuk semburan apinya, juga saat kamera terhentak dan bergetar", () => {
    // ayunan balik hentakan: kamera maju paling banyak ±0,4 × hentakan, jadi gambar membesar sebanyak itu
    const zoom = 1 + KICK.back * 0.4;
    for (const aspect of [16 / 9, 4 / 3, 393 / 852]) {
      const shot = shotFor(slide, { aspect });
      for (const side of [-1, 1]) {
        // mulut naga: ujung palang, di atas gayor; api menyembur ke luar dan naik ±0,5 m
        const mouth = projectPoint(shot, aspect, [side * 1.3 * GONG_SCALE, (GONG.barY + 0.45) * GONG_SCALE, 0]);
        const flame = projectPoint(shot, aspect, [side * 1.65 * GONG_SCALE, (GONG.barY + 0.75) * GONG_SCALE, 0.2]);
        for (const p of [mouth, flame]) {
          // simpangan getar dihitung dalam setengah tinggi layar; mendatar = dibagi aspek
          expect(Math.abs(p.x) * zoom + KICK.side / aspect + KICK.roll).toBeLessThan(1);
          expect(p.y * zoom + KICK.up + KICK.roll).toBeLessThan(1);
          expect(p.depth).toBeGreaterThan(0);
        }
      }
    }
  });
});
