import { describe, expect, it } from "vitest";
import { MASCOT, MascotBehavior } from "@/engine/mascot/behavior";
import { BLINK, BLINKABLE, blinkOpen, EXPRESSION_OF, EXPRESSIONS, expressionFor, FaceTrack, GREET_WINK, MOODS } from "@/engine/mascot/face";
import { Follow, JELLY, Jelly } from "@/engine/mascot/jelly";
import { JourneyController } from "@/engine/mascot/journey";
import { MOTION_DUR, poseAt } from "@/engine/mascot/pose";

/**
 * Maskot pemandu (permintaan host 15 Nov). Perilaku diadaptasi dari tes paket coral-assistant
 * (`tests/behavior.test.ts`), ditambah suasana hati "sayang" dan ucapan berupa kunci teks. Rupa dan ekspresi dari
 * `claude-3d-reference-kit` v4 (arahan host "update maskot").
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

  it("sudah senang: klik pelan berikutnya tidak mengulang ucapan senang, hanya menuju sayang", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    [0, 600, 1200].forEach((t) => b.tap(t));
    b.tick(1600);
    [1800, 2400].forEach((t) => b.tap(t));
    b.tick(2800);
    expect(said.filter((l) => l === "happy")).toHaveLength(1);
    b.tap(3000);
    expect(b.tick(3400).mood).toBe("love");
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

const ALL = ["hover", "greet", "fly", "point", "happy", "angry", "sleep", "wake", "surprised", "look", "talk"] as const;

describe("wajah dan pose maskot (kit Claude v4)", () => {
  it("delapan suasana hati memakai ekspresi kit, masing-masing berbeda", () => {
    expect(MOODS).toHaveLength(8);
    expect(EXPRESSIONS).toHaveLength(12);
    for (const m of MOODS) expect(EXPRESSIONS).toContain(EXPRESSION_OF[m]);
    expect(new Set(MOODS.map((m) => EXPRESSION_OF[m])).size).toBe(8);
    expect(EXPRESSION_OF.sleeping).toBe("blink");
    expect(EXPRESSION_OF.love).toBe("excited");
  });

  it("menyapa sambil senang = mengedip sebelah sebentar", () => {
    expect(expressionFor("happy", "greet", 0)).toBe("happy");
    expect(expressionFor("happy", "greet", GREET_WINK.from)).toBe("wink");
    expect(expressionFor("happy", "greet", GREET_WINK.to)).toBe("happy");
    expect(expressionFor("angry", "greet", 0.8)).toBe("angry");
  });

  it("kedipan: tertutup sampai 6,5% lalu terbuka lagi dalam 0,16 dtk", () => {
    expect(blinkOpen(10, 10)).toBeCloseTo(1, 6);
    expect(blinkOpen(10 + BLINK.close, 10)).toBeCloseTo(BLINK.min, 6);
    expect(blinkOpen(10 + BLINK.close + BLINK.open + 0.01, 10)).toBe(1);
    expect(blinkOpen(9.9, 10)).toBe(1);
  });

  it("pergantian ekspresi disembunyikan di tengah kedipan: berganti tepat saat mata tertutup", () => {
    const f = new FaceTrack("neutral", 0, () => 0.99);
    expect(f.update(0.5, "neutral")).toEqual({ expression: "neutral", open: 1 });
    const start = f.update(1, "happy");
    expect(start.expression).toBe("neutral");
    expect(start.open).toBeCloseTo(1, 6);
    const mid = f.update(1 + BLINK.close * 0.5, "happy");
    expect(mid.expression).toBe("neutral");
    expect(mid.open).toBeLessThan(0.6);
    const shut = f.update(1 + BLINK.close, "happy");
    expect(shut.expression).toBe("happy");
    expect(shut.open).toBeCloseTo(BLINK.min, 6);
    expect(f.update(1 + BLINK.close + BLINK.open + 0.01, "happy")).toEqual({ expression: "happy", open: 1 });
  });

  it("frame jarang (HP lambat) tetap berganti ekspresi sesudah mata tertutup, tanpa terulang tertunda", () => {
    const f = new FaceTrack("neutral", 0, () => 0.99);
    expect(f.update(1, "happy").expression).toBe("neutral");
    expect(f.update(1.4, "happy").expression).toBe("happy");
    expect(f.update(2.4, "angry").expression).toBe("happy");
    expect(f.update(3.4, "angry").expression).toBe("angry");
  });

  it("kedip acak hanya di ekspresi bermata terbuka, dan mati di mode gerak dikurangi", () => {
    const closedEyes = new FaceTrack("happy", 0, () => 0);
    const open = new FaceTrack("neutral", 0, () => 0);
    let minClosed = 1;
    let minOpen = 1;
    let minStill = 1;
    const still = new FaceTrack("neutral", 0, () => 0);
    for (let t = 0; t < 8; t += 0.01) {
      minClosed = Math.min(minClosed, closedEyes.update(t, "happy").open);
      minOpen = Math.min(minOpen, open.update(t, "neutral").open);
      minStill = Math.min(minStill, still.update(t, "neutral", false).open);
    }
    expect(BLINKABLE).not.toContain("happy");
    expect(minClosed).toBe(1);
    expect(minOpen).toBeLessThan(0.2);
    expect(minStill).toBe(1);
  });

  it("gerakan sekali jalan kembali ke melayang sesudah durasinya; semua pose berhingga", () => {
    for (const [m, dur] of Object.entries(MOTION_DUR)) {
      const after = poseAt(m as keyof typeof MOTION_DUR, 100 + dur! + 0.1, 100);
      const hover = poseAt("hover", 100 + dur! + 0.1, 0);
      expect(after, m).toEqual(hover);
    }
    for (const m of ALL) {
      for (let t = 0; t < 3; t += 0.37) {
        const p = poseAt(m, 50 + t, 50);
        const nums = [p.bob, p.tiltX, p.tiltZ, p.spin, p.stretch, ...p.armL, ...p.armR, ...p.reach, ...p.legs];
        expect(nums.every(Number.isFinite), `${m} ${t}`).toBe(true);
      }
    }
  });

  it("lentur boleh selama bergerak (arahan host 15 Nov), dalam batas: regang 0,8–1,25, lengan 0,9–1,25", () => {
    let lo = 1;
    let hi = 1;
    for (const m of ALL)
      for (let u = 0; u < 3; u += 0.01) {
        const p = poseAt(m, 50 + u, 50);
        lo = Math.min(lo, p.stretch);
        hi = Math.max(hi, p.stretch);
        for (const r of p.reach) {
          expect(r, m).toBeGreaterThanOrEqual(0.9);
          expect(r, m).toBeLessThanOrEqual(1.25);
        }
        expect(p.stretch, m).toBeGreaterThanOrEqual(0.8);
        expect(p.stretch, m).toBeLessThanOrEqual(1.25);
      }
    // memang ada ancang-ancang memampat dan regang memanjang (bukan kaku lagi)
    expect(lo).toBeLessThan(0.9);
    expect(hi).toBeGreaterThan(1.12);
  });

  it("loncatan senang: ancang-ancang memampat sebelum naik, memanjang saat melesat", () => {
    expect(poseAt("happy", 50.12, 50).stretch).toBeLessThan(0.9);
    expect(poseAt("happy", 50.12, 50).bob).toBe(0);
    const up = poseAt("happy", 50.2, 50);
    expect(up.stretch).toBeGreaterThan(1.1);
    expect(up.bob).toBeGreaterThan(0);
  });

  it("melayang tenang tetap bentuk dan ukuran kit: regang ±1%, naik-turun ≤ 3%, lengan 0,15 rad, panjang lengan 1", () => {
    for (let t = 0; t < 6; t += 0.1) {
      const p = poseAt("hover", t, 0);
      expect(Math.abs(p.stretch - 1)).toBeLessThanOrEqual(0.0101);
      expect(p.reach).toEqual([1, 1]);
      expect(Math.abs(p.bob)).toBeLessThanOrEqual(0.03);
      expect(Math.abs(p.tiltZ)).toBeLessThanOrEqual(0.041);
      expect(p.armL[0]).toBeGreaterThan(0.1);
      expect(p.armL[0]).toBeLessThan(0.2);
      expect(Math.max(...p.legs.map(Math.abs))).toBeLessThanOrEqual(0.071);
    }
  });
});

describe("lentur jeli dan sendi yang menyusul (arahan host 15 Nov: gerak lebih fleksibel)", () => {
  const run = (j: Jelly, path: (t: number) => [number, number, number], from: number, to: number, dt = 1 / 60) => {
    for (let t = from; t <= to + 1e-9; t += dt) j.track(path(t), dt);
  };

  it("melesat naik = memampat, berhenti mendadak di atas = memanjang", () => {
    const j = new Jelly();
    run(j, () => [0, 0, 0], 0, 0.1);
    run(j, (t) => [0, (t - 0.1) * 3, 0], 0.1 + 1 / 60, 0.2);
    expect(j.stretch).toBeLessThan(0.99);
    const y = 0.3;
    let maxS = 0;
    for (let i = 0; i < 30; i++) {
      j.track([0, y, 0], 1 / 60);
      maxS = Math.max(maxS, j.stretch);
    }
    expect(maxS).toBeGreaterThan(1.01);
  });

  it("bergerak ke samping: puncak badan tertinggal (lentur berlawanan arah percepatan)", () => {
    const j = new Jelly();
    run(j, () => [0, 0, 0], 0, 0.1);
    run(j, (t) => [(t - 0.1) ** 2 * 4, 0, 0], 0.1 + 1 / 60, 0.3);
    expect(j.shearX).toBeLessThan(-0.005);
  });

  it("sesudah diketuk badan memantul lalu kembali persis ke bentuk kit (bentuk dan ukuran tidak berubah)", () => {
    const j = new Jelly();
    j.kick(0.7, -2.4, 0.3);
    let minS = 1;
    let maxS = 1;
    for (let i = 0; i < 60; i++) {
      j.track([0, 0, 0], 1 / 60);
      minS = Math.min(minS, j.stretch);
      maxS = Math.max(maxS, j.stretch);
    }
    expect(minS).toBeLessThan(0.92);
    expect(maxS).toBeGreaterThan(1.01);
    for (let i = 0; i < 240; i++) j.track([0, 0, 0], 1 / 60);
    expect(j.rest).toBeLessThan(1e-3);
    expect(j.stretch).toBeCloseTo(1, 3);
  });

  it("lonjakan dan pindah tempat tidak membuat badan meledak; frame lambat tetap stabil", () => {
    const j = new Jelly();
    j.track([0, 0, 0], 1 / 60);
    j.track([50, 0, 0], 1 / 60);
    j.track([50, 0, 0], 1 / 60);
    expect(j.rest).toBeLessThan(1e-6);
    for (let i = 0; i < 40; i++) j.track([0, i % 2 ? 0.4 : 0, 0], 0.25);
    expect(Math.abs(j.stretch - 1)).toBeLessThanOrEqual(JELLY.maxStretch);
    expect(Math.abs(j.shearX)).toBeLessThanOrEqual(JELLY.maxShear);
    expect(j.o.every(Number.isFinite)).toBe(true);
  });

  it("sendi menyusul pose dengan pantulan, lalu diam di sudut pose", () => {
    const f = new Follow(1);
    f.step([0], 1 / 60);
    let peak = 0;
    for (let i = 0; i < 30; i++) peak = Math.max(peak, f.step([1], 1 / 60)[0]!);
    expect(peak).toBeGreaterThan(1.02);
    for (let i = 0; i < 240; i++) f.step([1], 1 / 60);
    expect(f.x[0]).toBeCloseTo(1, 4);
    expect(f.snap([0.3])[0]).toBe(0.3);
  });
});
