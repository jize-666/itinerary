import { describe, expect, it } from "vitest";
import { createGate, GATE, gateCamera, gatePose, logTop, plantSize } from "@/engine/stage/gate";
import { GENI, KAYON, kayonHalfWidth } from "@/engine/stage/gunungan";

const WIDE = 16 / 9;
const TALL = 393 / 852;
const LAST = 30;
const still = { x: 0, y: 0 };

/** Gerbang pembuka yang sudah siap di slide pertama. */
function readyHead(t = 0) {
  const g = createGate();
  g.arm();
  g.setReady(true);
  expect(g.snapshot(t).phase).toBe("head");
  return g;
}

describe("gunungan pembuka: menunggu panggung", () => {
  it("dijanjikan: layar menunggu (teks prolog tersembunyi) sampai gunungan siap, lalu tertancap penuh", () => {
    const g = createGate();
    g.arm();
    expect(g.snapshot(0).phase).toBe("wait");
    expect(g.planted(0)).toBe(1);
    g.setReady(true);
    expect(g.snapshot(0)).toEqual({ phase: "head", end: "head", face: "agung" });
  });

  it("panggung tidak jadi hidup: dilepas, film dibuka tanpa gerbang (juga bila tamu sudah menggulir)", () => {
    const g = createGate();
    g.arm();
    g.disarm();
    expect(g.snapshot(0).phase).toBe("off");
    const h = createGate();
    h.arm();
    expect(h.step(1, 0, LAST, 0)).toBe(true); // langkah itu dipakai untuk membuka, bukan pindah slide
    expect(h.snapshot(0).phase).toBe("off");
    // panggung baru siap sesudahnya: gunungan tidak muncul lagi
    h.setReady(true);
    expect(h.snapshot(1).phase).toBe("off");
  });

  it("film tidak lagi di slide pertama (lompat lewat hash/titik bab): pembuka dilepas", () => {
    const g = createGate();
    g.arm();
    g.follow(4, false, LAST, 0);
    g.setReady(true);
    expect(g.snapshot(0).phase).toBe("off");
  });
});

describe("gunungan pembuka: dicabut dan ditancapkan", () => {
  it("gulir maju di slide pertama mencabutnya (slide tidak pindah); teks prolog muncul di tengah jalan", () => {
    const g = readyHead();
    expect(g.step(1, 0, LAST, 10)).toBe(true);
    expect(g.planted(10)).toBe(1);
    const mid = 10 + GATE.dur * 0.6;
    expect(g.planted(mid)).toBeLessThan(1 - GATE.textAt);
    expect(g.snapshot(mid).phase).toBe("off");
    expect(g.snapshot(10 + GATE.dur * 0.2).phase).toBe("head");
    expect(g.planted(10 + GATE.dur)).toBe(0);
    // sesudah tercabut, gulir maju berikutnya memindah slide seperti biasa
    expect(g.step(1, 0, LAST, 20)).toBe(false);
  });

  it("geraknya mulus: berubah sedikit demi sedikit tiap frame, pelan di awal dan di akhir", () => {
    const g = readyHead();
    g.step(1, 0, LAST, 0);
    let prev = 1;
    let biggest = 0;
    for (let t = 0; t <= GATE.dur + 0.05; t += 1 / 60) {
      const v = g.planted(t);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      biggest = Math.max(biggest, prev - v);
      prev = v;
    }
    expect(biggest).toBeLessThan(0.025);
    expect(1 - g.planted(1 / 60)).toBeLessThan(0.002);
  });

  it("mundur di slide pertama menancapkannya lagi; mundur di tengah cabutan membaliknya tanpa lompatan", () => {
    const g = readyHead();
    g.step(1, 0, LAST, 0);
    const t = GATE.dur * 0.4;
    const v = g.planted(t);
    expect(g.step(-1, 0, LAST, t)).toBe(true);
    expect(g.planted(t)).toBeCloseTo(v, 9);
    expect(g.planted(t + GATE.dur)).toBe(1);
    // tercabut habis, lalu mundur lagi: ditancapkan dari kanan
    g.step(1, 0, LAST, 10);
    expect(g.step(-1, 0, LAST, 20)).toBe(true);
    expect(g.planted(20 + GATE.dur)).toBe(1);
    expect(g.end()).toBe("head");
  });

  it("mundur saat tertancap: tidak dipakai (mentok di ujung film seperti biasa)", () => {
    const g = readyHead();
    expect(g.step(-1, 0, LAST, 0)).toBe(false);
  });

  it("film pindah slide lewat jalan lain saat tertancap: gunungan ikut dicabut", () => {
    const g = readyHead();
    g.follow(0, true, LAST, 5);
    expect(g.planted(5 + GATE.dur)).toBe(0);
  });

  it("geser jari: cabutan mengikuti jari; dilepas sebelum ambang kembali tertancap, sesudahnya tercabut habis", () => {
    const g = readyHead();
    expect(g.scrubStart(0, 0)).toBe(true);
    g.scrubTo(0.2);
    expect(g.planted(0)).toBeCloseTo(0.8, 9);
    g.scrubTo(-0.3); // jari ditarik ke arah lain: tidak lebih dari tertancap
    expect(g.planted(0)).toBe(1);
    g.scrubTo(GATE.commit * 0.5);
    g.scrubEnd(0, 1);
    expect(g.planted(1 + GATE.dur)).toBe(1);
    expect(g.scrubStart(0, 5)).toBe(true);
    g.scrubTo(GATE.commit + 0.05);
    g.scrubEnd(0, 6);
    expect(g.planted(6 + GATE.dur)).toBe(0);
    // dikibas maju walau baru sedikit: tercabut
    const h = readyHead();
    h.scrubStart(0, 0);
    h.scrubTo(0.05);
    h.scrubEnd(1, 0);
    expect(h.planted(GATE.dur)).toBe(0);
  });

  it("geser jari hanya berlaku untuk pembuka yang tertancap di slide pertama", () => {
    expect(readyHead().scrubStart(3, 0)).toBe(false);
    const g = createGate();
    g.setReady(true);
    expect(g.scrubStart(0, 0)).toBe(false);
  });

  it("panggung dibongkar (Calm, konteks hilang): gunungan hilang seketika, teks kembali", () => {
    const g = readyHead();
    g.setReady(false);
    expect(g.snapshot(0).phase).toBe("off");
    expect(g.planted(0)).toBe(0);
  });
});

describe("gunungan penutup", () => {
  it("gulir maju di credits menancapkannya dari kiri; mundur mencabutnya lagi", () => {
    const g = createGate();
    g.setReady(true);
    expect(g.step(1, LAST, LAST, 0)).toBe(true);
    expect(g.end()).toBe("tail");
    expect(g.snapshot(GATE.dur * 0.2).phase).toBe("off");
    expect(g.snapshot(GATE.dur).phase).toBe("tail");
    expect(g.step(1, LAST, LAST, 10)).toBe(false); // tertancap: gulir maju tidak dipakai
    expect(g.step(-1, LAST, LAST, 10)).toBe(true);
    expect(g.planted(10 + GATE.dur)).toBe(0);
    expect(g.step(-1, LAST, LAST, 20)).toBe(false); // tercabut: mundur memindah slide seperti biasa
  });

  it("ditancapkan sendiri bila tamu diam di credits, tetapi tidak lagi sesudah tamu mencabutnya", () => {
    const g = createGate();
    g.setReady(true);
    expect(g.autoTail(LAST - 1, LAST, 0)).toBe(false);
    expect(g.autoTail(LAST, LAST, 0)).toBe(true);
    g.step(-1, LAST, LAST, 5);
    expect(g.autoTail(LAST, LAST, 20)).toBe(false);
    // keluar dari credits lalu kembali: boleh lagi
    g.follow(LAST - 1, false, LAST, 21);
    g.follow(LAST, false, LAST, 22);
    expect(g.autoTail(LAST, LAST, 23)).toBe(true);
  });

  it("tanpa panggung 3D tidak ada penutup", () => {
    const g = createGate();
    expect(g.step(1, LAST, LAST, 0)).toBe(false);
    expect(g.autoTail(LAST, LAST, 0)).toBe(false);
  });
});

describe("gunungan: balik muka", () => {
  it("klik membalik ke muka Murka (api geni menyala besar lalu membara), klik lagi kembali ke Agung", () => {
    const g = readyHead();
    expect(g.face()).toBe("agung");
    expect(g.flip(1)).toBe(true);
    expect(g.face()).toBe("murka");
    expect(g.snapshot(1).face).toBe("murka");
    expect(g.turn(1)).toBeCloseTo(0, 9);
    expect(g.turn(4)).toBeCloseTo(Math.PI, 3);
    const flare = Math.max(...[1.2, 1.35, 1.5].map((t) => g.rage(t)));
    expect(flare).toBeGreaterThan(GENI.peak * 0.8);
    expect(g.rage(8)).toBeGreaterThan(GENI.peak * 0.3);
    expect(g.rage(8)).toBeLessThan(flare);
    g.flip(10);
    expect(g.face()).toBe("agung");
    expect(g.turn(14)).toBeCloseTo(2 * Math.PI, 3); // terus berputar ke arah yang sama
    expect(g.rage(14)).toBe(0);
  });

  it("pegasnya lewat sedikit lalu mantap (±8%), tanpa lompatan bila diklik lagi di tengah ayunan", () => {
    const g = readyHead();
    g.flip(0);
    let peak = 0;
    for (let t = 0; t < 2; t += 1 / 120) peak = Math.max(peak, g.turn(t));
    expect(peak / Math.PI - 1).toBeGreaterThan(0.04);
    expect(peak / Math.PI - 1).toBeLessThan(0.12);
    const before = g.turn(0.2);
    const pace = before - g.turn(0.2 - 1 / 60);
    g.flip(0.2);
    // sudut dan lajunya bersambung: langkah frame sesudah klik hampir sama dengan langkah sebelumnya
    expect(g.turn(0.2)).toBeCloseTo(before, 9);
    expect(Math.abs(g.turn(0.2 + 1 / 60) - before - pace)).toBeLessThan(0.12);
  });

  it("hanya saat tertancap penuh", () => {
    const g = readyHead();
    g.step(1, 0, LAST, 0);
    expect(g.flip(0.5)).toBe(false);
    const h = createGate();
    h.setReady(true);
    expect(h.flip(0)).toBe(false);
  });

  it("gunungan yang ditancapkan lagi selalu datang dengan muka Agung", () => {
    const g = readyHead();
    g.flip(0);
    g.step(1, 0, LAST, 5);
    g.step(-1, 0, LAST, 10);
    expect(g.face()).toBe("agung");
    expect(g.turn(20)).toBeCloseTo(0, 6);
  });
});

describe("gunungan pembuka/penutup: pose", () => {
  it("tertancap: di tengah layar, setinggi GATE.size di layar lebar dan selebar layar di layar tegak", () => {
    const p = gatePose(1, "head", WIDE, 0, still, 0, 0);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.size).toBe(GATE.size);
    expect(p.face).toBe("agung");
    expect(p.kelir).toBe(1);
    expect(p.veil).toBe(1);
    expect(p.veilX).toBeCloseTo(0, 9);
    const tall = gatePose(1, "head", TALL, 0, still, 0, 0);
    expect(kayonHalfWidth(tall.size, TALL)).toBeLessThan(0.95);
    expect(kayonHalfWidth(tall.size, TALL)).toBeGreaterThan(0.8);
  });

  it("kaki lembaran di atas gedebog, gedebog di dalam layar", () => {
    for (const aspect of [WIDE, TALL]) {
      const p = gatePose(1, "head", aspect, 0, still, 0, 0);
      const foot = p.y - p.size;
      expect(foot).toBeGreaterThan(p.cut);
      expect(p.cut).toBeGreaterThan(-1 + 0.06);
      expect(p.cut).toBeCloseTo(logTop(plantSize(aspect)), 9);
      // garis dasar daun (tempat tangkai) tidak tertutup gedebog
      expect(p.y - p.size + 2 * p.size * KAYON.base).toBeGreaterThan(p.cut);
    }
  });

  it("tercabut: pembuka keluar di kanan, penutup di kiri, keduanya sampai di luar layar bersama kelirnya", () => {
    for (const aspect of [WIDE, TALL]) {
      const head = gatePose(0, "head", aspect, 0, still, 0, 0);
      const tail = gatePose(0, "tail", aspect, 0, still, 0, 0);
      expect(head.x - kayonHalfWidth(head.size, aspect)).toBeGreaterThan(1);
      expect(tail.x + kayonHalfWidth(tail.size, aspect)).toBeLessThan(-1);
      expect(head.veilX).toBeGreaterThan(2.8);
      expect(tail.veilX).toBeLessThan(-2.8);
    }
  });

  it("dicabut naik dulu dari gedebog, baru disapukan; membesar sedikit (mendekat ke penonton)", () => {
    const a = gatePose(0.85, "head", WIDE, 0, still, 0, 0);
    const planted = gatePose(1, "head", WIDE, 0, still, 0, 0);
    expect(a.y).toBeGreaterThan(planted.y + 0.02);
    expect(Math.abs(a.x)).toBeLessThan(0.05);
    expect(gatePose(0.2, "head", WIDE, 0, still, 0, 0).size).toBeGreaterThan(planted.size * 1.08);
  });

  it("gerak pandang: gunungan bergeser lebih jauh dari kelir dan sedikit berpaling (perspective shift); lampu mengikuti kursor", () => {
    const l = gatePose(1, "head", WIDE, 0, { x: -1, y: 0 }, 0, 0);
    const r = gatePose(1, "head", WIDE, 0, { x: 1, y: 0 }, 0, 0);
    const sheet = Math.abs(r.x - l.x);
    const kelir = Math.abs(r.kelirX - l.kelirX);
    expect(sheet).toBeGreaterThan(kelir * 2);
    expect(kelir).toBeGreaterThan(0);
    expect(r.turn - l.turn).toBeGreaterThan(0.2);
    expect(r.lampX - l.lampX).toBeGreaterThan(0.6);
  });

  it("muka Murka tampak saat sudut balik melewati setengah putaran", () => {
    expect(gatePose(1, "head", WIDE, 0, still, Math.PI, 0).face).toBe("murka");
    expect(gatePose(1, "head", WIDE, 0, still, 2 * Math.PI, 0).face).toBe("agung");
  });

  it("kamera: shot kayon penuh saat tertancap, shot slide saat tercabut, mulus di antaranya", () => {
    expect(gateCamera(1)).toBe(1);
    expect(gateCamera(0)).toBe(0);
    expect(gateCamera(0.5)).toBeCloseTo(0.5, 9);
  });
});
