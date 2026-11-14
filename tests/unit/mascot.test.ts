import { describe, expect, it } from "vitest";
import { MASCOT, MascotBehavior } from "@/engine/mascot/behavior";
import { approachFace, BLINK, blinkOpen, FACES, faceOf, MOODS } from "@/engine/mascot/face";
import { JourneyController } from "@/engine/mascot/journey";
import { MOTION_DUR, poseAt } from "@/engine/mascot/pose";

/**
 * Maskot pemandu (permintaan host 15 Nov). Perilaku diadaptasi dari tes paket coral-assistant
 * (`tests/behavior.test.ts`), ditambah suasana hati "sayang" dan ucapan berupa kunci teks.
 */
describe("perilaku maskot: klik, spam, diam", () => {
  it("tiga klik pelan → senang, baru sesudah jendela 300 ms; lalu kembali netral", () => {
    const b = new MascotBehavior(0);
    [0, 500, 1000].forEach((t) => b.tap(t));
    expect(b.tick(1299).mood).not.toBe("happy");
    expect(b.tick(1300).mood).toBe("happy");
    expect(b.tick(3600).mood).toBe("neutral");
  });

  it("enam klik pelan berturut-turut → sayang (mata hati)", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    [0, 600, 1200].forEach((t) => b.tap(t));
    b.tick(1600);
    [1800, 2400, 3000].forEach((t) => b.tap(t));
    expect(b.tick(3300).mood).toBe("love");
    expect(said).toContain("love");
  });

  it("spam lima klik → marah (mengalahkan senang), habis sesudah 6 dtk, dan tidak bisa marah lagi selama jeda", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    [0, 400, 800, 900, 1000].forEach((t) => b.tap(t));
    expect(b.tick(1100).mood).toBe("angry");
    expect(said).toContain("angry");
    expect(b.tick(1000 + MASCOT.angryFor + 100).mood).toBe("neutral");
    expect(said).toContain("calm");
    [7200, 7300, 7400, 7500, 7600].forEach((t) => b.tap(t));
    expect(b.tick(7700).mood).not.toBe("angry");
    const later = 1000 + MASCOT.angryFor + MASCOT.angryCooldown + 500;
    [0, 100, 200, 300, 400].forEach((d) => b.tap(later + d));
    expect(b.tick(later + 400).mood).toBe("angry");
  });

  it("menggeser slide/kamera memutus rangkaian klik", () => {
    const b = new MascotBehavior(0);
    b.tap(0);
    b.tap(500);
    b.cameraInteraction(700);
    b.tap(1000);
    expect(b.tick(1500).mood).not.toBe("happy");
  });

  it("diam 30 dtk → mengantuk, 60 dtk → tidur (menunggu perjalanan selesai); klik pertama membangunkan", () => {
    let rests = 0;
    const said: string[] = [];
    const b = new MascotBehavior(0, { onRest: () => rests++, onSpeech: (l) => said.push(l) });
    expect(b.tick(MASCOT.sleepyAfter - 1).mood).toBe("neutral");
    expect(b.tick(MASCOT.sleepyAfter).mood).toBe("sleepy");
    expect(rests).toBe(1);
    b.setTraveling(true);
    expect(b.tick(MASCOT.sleepAfter).mood).toBe("sleepy");
    b.setTraveling(false);
    expect(b.tick(MASCOT.sleepAfter + 1000).mood).toBe("sleeping");
    expect(b.tick(MASCOT.sleepAfter + 1000).motion).toBe("sleep");
    b.tap(62000);
    const s = b.tick(62001);
    expect(s.mood).toBe("curious");
    expect(s.motion).toBe("wake");
    expect(said).toContain("wake");
  });

  it("mode pemandu menahan tidur dan ucapan spontan", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    b.setGuiding(true, 0);
    b.tap(500);
    b.gong(5000);
    expect(said).toEqual([]);
    expect(b.tick(100000).mood).not.toBe("sleeping");
  });

  it("gong dipukul: terkejut lalu senang; terbang mendahului gerakan lain", () => {
    const b = new MascotBehavior(0);
    b.setTraveling(true);
    b.gong(100);
    expect(b.tick(101).motion).toBe("fly");
    expect(b.tick(101).mood).toBe("surprised");
    b.setTraveling(false);
    expect(b.tick(1300).mood).toBe("happy");
  });

  it("tab tersembunyi membekukan jam emosi dan mengatur ulang hitungan diam", () => {
    const b = new MascotBehavior(0);
    b.setMood("happy", 100, 2000);
    b.visibility(true, 1100);
    expect(b.tick(999999).mood).toBe("happy");
    b.visibility(false, 101100);
    expect(b.tick(102099).mood).toBe("happy");
    expect(b.tick(102100).mood).toBe("neutral");
    expect(b.tick(120000).mood).not.toBe("sleepy");
  });
});

describe("perjalanan maskot", () => {
  it("tujuan baru mulai dari letak terkini dan menolak token lama", () => {
    const j = new JourneyController([0, 0, 0]);
    const old = j.move({ to: [5, 0, 0], duration: 2000, arcHeight: 1, id: "gong" }, 0);
    j.update(900);
    const current = [...j.position];
    j.move({ to: [-3, 1, 2], duration: 1000, id: "latest" }, 900);
    expect(j.current?.from).toEqual(current);
    expect(j.isCurrent(old)).toBe(false);
    expect(j.update(1900)?.id).toBe("latest");
    expect(j.position).toEqual([-3, 1, 2]);
  });

  it("gerak dikurangi: tanpa lengkung; batal = tetap di tempat", () => {
    const j = new JourneyController();
    j.move({ to: [2, 0, 0], duration: 2000, arcHeight: 2 }, 0, true);
    j.update(90);
    expect(j.position[1]).toBe(0);
    j.cancel(90);
    const frozen = [...j.position];
    j.update(5000);
    expect(j.position).toEqual(frozen);
  });
});

describe("wajah dan pose maskot", () => {
  it("delapan suasana hati, masing-masing berbeda; netral = mata titik, alis, pipi (foto acuan)", () => {
    expect(MOODS).toHaveLength(8);
    const n = FACES.neutral;
    expect([n.sx, n.sy, n.happy, n.heart, n.brows]).toEqual([1, 1, 0, 0, 1]);
    expect(n.cheeks).toBeGreaterThan(0.5);
    expect(FACES.happy.happy).toBe(1);
    expect(FACES.love.heart).toBe(1);
    expect(FACES.sleeping.sy).toBeLessThan(0.2);
    expect(FACES.surprised.sy).toBeGreaterThan(1.2);
    expect(FACES.angry.browAngle).toBeGreaterThan(0);
    expect(new Set(MOODS.map((m) => JSON.stringify(FACES[m]))).size).toBe(8);
  });

  it("pergantian ekspresi halus: separuh jalan sesudah ±τ·ln2, sampai tujuan tanpa melewati", () => {
    let f = faceOf("neutral");
    const to = faceOf("surprised");
    f = approachFace(f, to, 0.12 * Math.LN2, 0.12);
    expect(f.sy).toBeCloseTo((1 + to.sy) / 2, 6);
    for (let i = 0; i < 60; i++) f = approachFace(f, to, 1 / 30, 0.12);
    expect(f.sy).toBeCloseTo(to.sy, 3);
    expect(f.sy).toBeLessThanOrEqual(to.sy);
  });

  it("kedipan: tertutup sampai 6,5% lalu terbuka lagi dalam 0,16 dtk", () => {
    expect(blinkOpen(10, 10)).toBeCloseTo(1, 6);
    expect(blinkOpen(10 + BLINK.close, 10)).toBeCloseTo(BLINK.min, 6);
    expect(blinkOpen(10 + BLINK.close + BLINK.open + 0.01, 10)).toBe(1);
    expect(blinkOpen(9.9, 10)).toBe(1);
  });

  it("gerakan sekali jalan kembali ke melayang sesudah durasinya; semua pose berhingga", () => {
    for (const [m, dur] of Object.entries(MOTION_DUR)) {
      const after = poseAt(m as keyof typeof MOTION_DUR, 100 + dur! + 0.1, 100);
      const hover = poseAt("hover", 100 + dur! + 0.1, 0);
      expect(after, m).toEqual(hover);
    }
    for (const m of ["hover", "greet", "fly", "point", "happy", "angry", "sleep", "wake", "surprised", "look", "talk"] as const) {
      for (let t = 0; t < 3; t += 0.37) {
        const p = poseAt(m, 50 + t, 50);
        const nums = [p.bob, p.tiltX, p.tiltZ, p.spin, p.stretch, ...p.armL, ...p.armR, ...p.legs];
        expect(nums.every(Number.isFinite), `${m} ${t}`).toBe(true);
        expect(p.stretch).toBeGreaterThan(0.6);
      }
    }
  });
});
