import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GENI, KAYON, SWEEP, VEIL, kayonHalfWidth, kayonSize, murkaRage, sweepPose, veilAt } from "@/engine/stage/gunungan";

const WIDE = 16 / 9;
const TALL = 393 / 852;

describe("gunungan: ukuran lembaran", () => {
  it("hampir setinggi layar lebar, dan dibatasi lebar di layar tegak", () => {
    expect(kayonSize(WIDE)).toBe(0.94);
    const tall = kayonSize(TALL);
    expect(tall).toBeLessThan(0.94);
    // di layar tegak lembarannya tidak lebih lebar dari layar
    expect(kayonHalfWidth(tall, TALL)).toBeLessThanOrEqual(1);
    expect(kayonHalfWidth(tall, TALL)).toBeGreaterThan(0.9);
  });

  it("garis dasar dan mata barong cocok dengan gambar yang dipanggang (kanvas 1400×2000)", () => {
    const paint = readFileSync("scripts/assets/gunungan-paint.js", "utf8");
    const num = (re: RegExp) => Number(re.exec(paint)?.[1]);
    const [w, h, cx] = [num(/const W = (\d+)/), num(/H = (\d+), CX/), num(/CX = (\d+)/)];
    const base = num(/BASE = (\d+)/);
    const ky = num(/\bKY = (\d+)/);
    const [dx, dy] = [num(/KALA_EYES = \[\[CX - (\d+)/), num(/KALA_EYES = \[\[CX - \d+, KY - (\d+)/)];
    expect(KAYON.aspect).toBeCloseTo(w / h, 6);
    expect(KAYON.base).toBeCloseTo((h - base) / h, 6);
    expect(KAYON.eyes[0][0]).toBeCloseTo((cx - dx) / w, 3);
    expect(KAYON.eyes[1][0]).toBeCloseTo((cx + dx) / w, 3);
    for (const eye of KAYON.eyes) expect(eye[1]).toBeCloseTo(1 - (ky - dy) / h, 3);
  });

  it("tokoh yang tidak dibakar api geni: elips barong memuat kedua mata, semua elips di dalam lembaran", () => {
    const [u, v, ru, rv] = KAYON.spare[0];
    for (const [x, y] of KAYON.eyes) expect(Math.hypot((x - u) / ru, (y - v) / rv)).toBeLessThan(0.75);
    for (const [eu, ev, eru, erv] of KAYON.spare) {
      expect(eu - eru).toBeGreaterThan(0);
      expect(eu + eru).toBeLessThan(1);
      expect(ev - erv).toBeGreaterThan(KAYON.base);
      expect(ev + erv).toBeLessThan(1);
    }
  });
});

describe("gunungan: sapuan antar bab", () => {
  it("maju memperlihatkan muka Agung dari kiri ke kanan; mundur memperlihatkan muka Murka dari kanan ke kiri", () => {
    const [a, b] = [sweepPose(0.25, 1, WIDE, 0), sweepPose(0.75, 1, WIDE, 0)];
    expect(a.face).toBe("agung");
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(0);
    const [c, d] = [sweepPose(0.25, -1, WIDE, 0), sweepPose(0.75, -1, WIDE, 0)];
    expect(c.face).toBe("murka");
    expect(c.x).toBeGreaterThan(0);
    expect(d.x).toBeLessThan(0);
  });

  it("mulai dan berakhir di luar layar dan tidak terlihat, di layar lebar maupun tegak", () => {
    for (const aspect of [WIDE, TALL]) {
      for (const dir of [1, -1] as const) {
        for (const p of [0, 1]) {
          const pose = sweepPose(p, dir, aspect, 0);
          expect(Math.abs(pose.x) - kayonHalfWidth(pose.size, aspect)).toBeGreaterThan(1);
          expect(pose.veil).toBe(0);
          expect(pose.glow).toBe(0);
        }
      }
    }
  });

  it("di tengah: lembaran di tengah layar, menghadap penonton, dan tabir menutup seluruh layar", () => {
    const mid = sweepPose(0.5, 1, WIDE, 0);
    expect(mid.x).toBeCloseTo(0, 6);
    expect(mid.yaw).toBeCloseTo(0, 6);
    expect(mid.veil).toBe(1);
    // kamera dipotong dan langit berganti di p 0,42–0,58: selama itu tidak ada bagian layar yang terbuka.
    // Tepat di kedua batas, tepi layar tertutup 99,98% (inti tabir habis 0,011 NDC sebelum tepi): tidak terlihat.
    for (const p of [0.42, 0.43, 0.46, 0.5, 0.54, 0.57, 0.58]) {
      for (const dir of [1, -1] as const) {
        const pose = sweepPose(p, dir, WIDE, 0);
        for (const x of [-1, -0.5, 0, 0.5, 1]) {
          if (p > 0.425 && p < 0.575) expect(veilAt(x, pose.veilX)).toBe(1);
          else expect(veilAt(x, pose.veilX)).toBeGreaterThan(0.999);
        }
      }
    }
  });

  it("tabir bergerak sejauh VEIL.travel dan meninggalkan layar di kedua ujung", () => {
    expect(sweepPose(0, 1, WIDE, 0).veilX).toBeCloseTo(-VEIL.travel, 6);
    expect(sweepPose(1, 1, WIDE, 0).veilX).toBeCloseTo(VEIL.travel, 6);
    for (const x of [-1, 0, 1]) {
      expect(veilAt(x, -VEIL.travel)).toBe(0);
      expect(veilAt(x, VEIL.travel)).toBe(0);
    }
  });

  it("geraknya menerus: tidak ada lompatan letak, putaran, miring, atau lentur", () => {
    for (const dir of [1, -1] as const) {
      let prev = sweepPose(0, dir, WIDE, 0);
      for (let i = 1; i <= 200; i++) {
        const pose = sweepPose(i / 200, dir, WIDE, 0);
        expect(Math.abs(pose.x - prev.x)).toBeLessThan(0.03);
        expect(Math.abs(pose.yaw - prev.yaw)).toBeLessThan(0.02);
        // laju ease sinus curam di kedua ujung, saat lembaran masih di luar layar
        if (i > 4 && i < 197) {
          expect(Math.abs(pose.roll - prev.roll)).toBeLessThan(0.02);
          expect(Math.abs(pose.bend - prev.bend)).toBeLessThan(0.05);
        }
        prev = pose;
      }
    }
  });

  it("berpaling ke tengah layar saat masuk dan keluar, dalam batas SWEEP", () => {
    for (const dir of [1, -1] as const) {
      for (let i = 0; i <= 40; i++) {
        const pose = sweepPose(i / 40, dir, WIDE, 1.234);
        expect(Math.abs(pose.yaw)).toBeLessThanOrEqual(SWEEP.yaw + SWEEP.flutter + 1e-9);
        expect(Math.abs(pose.roll)).toBeLessThanOrEqual(SWEEP.roll + 1e-9);
        expect(Math.abs(pose.bend)).toBeLessThanOrEqual(SWEEP.bend + 1e-9);
      }
      // masuk: muka berpaling ke arah gerak (ke tengah layar); keluar: berpaling balik
      expect(Math.sign(sweepPose(0.1, dir, WIDE, 0).yaw)).toBe(dir);
      expect(Math.sign(sweepPose(0.9, dir, WIDE, 0).yaw)).toBe(-dir);
    }
  });

  it("kibasan dalang hanya di sekitar tengah sapuan", () => {
    const t = 0.25 / SWEEP.flutterHz; // seperempat getar: simpangan terbesar
    for (const p of [0.05, 0.15, 0.85, 0.95]) expect(sweepPose(p, 1, WIDE, t).yaw).toBeCloseTo(sweepPose(p, 1, WIDE, 0).yaw, 9);
    expect(sweepPose(0.5, 1, WIDE, t).yaw).toBeCloseTo(SWEEP.flutter, 6);
  });

});

describe("gunungan: api geni di muka Murka", () => {
  it("menyala begitu lembaran masuk, penuh di tengah, padam di kedua ujung, tanpa lompatan", () => {
    expect(murkaRage(0)).toBe(0);
    expect(murkaRage(1)).toBe(0);
    expect(murkaRage(0.5)).toBeCloseTo(GENI.peak, 9);
    let prev = 0;
    for (let i = 1; i <= 200; i++) {
      const r = murkaRage(i / 200);
      expect(Math.abs(r - prev)).toBeLessThan(0.02);
      if (i / 200 <= 0.4) expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
    // sudah menyala saat lembaran masih masuk layar (sebelum tabir menutup penuh)
    expect(murkaRage(0.3)).toBeGreaterThan(GENI.peak * 0.6);
  });

  it("pada kadar terbesar garis bakar sudah melewati kepala barong, dan lidah apinya menjilat melewati pucuk", () => {
    const line = GENI.peak * GENI.reach;
    expect(line).toBeGreaterThan(KAYON.spare[0][1] + KAYON.spare[0][3]);
    expect(line).toBeLessThan(1);
    expect(line + GENI.flame).toBeGreaterThan(1);
  });
});
