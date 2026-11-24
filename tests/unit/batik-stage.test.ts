import { describe, expect, it } from "vitest";
import { kawungUkel, RIVER_BAND, riverCenter } from "@/engine/canting/motif";
import { DAB, traceMotif } from "@/engine/canting/trace";
import type { Film, Slide } from "@/engine/slides/build-slides";
import { batikShot, batikTravel, CLOTH, clothPoint, gongCloth, hasBatikWorld, PROCESS, processAt } from "@/engine/stage/batik";

const ASPECT = 1.6;

/** Film tiruan: judul, pembuka, 3 panel, gong (Hari 3), epilog. */
function film(): Film {
  const day = { n: 3 };
  const s = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({ id, kind, scene: id, theme: "batik", sky: "day", day, ...extra }) as unknown as Slide;
  const slides = [
    s("day-3/title", "title"),
    s("day-3/intro", "dayintro", { panels: 3 }),
    s("day-3/a", "panel", { n: 1, of: 3, scene: "day-3/gallery" }),
    s("day-3/b", "panel", { n: 2, of: 3, scene: "day-3/gallery" }),
    s("day-3/c", "panel", { n: 3, of: 3, scene: "day-3/gallery" }),
    s("day-3/gong", "gong"),
    { ...s("epilogue", "epilogue"), theme: "travel" } as Slide,
  ];
  return { slides, chapters: [{ id: "day-3", kind: "day", first: 0, last: 5 }] };
}
const at = (i: number) => ({ from: i, to: i, p: 0 });
const move = (from: number, to: number, p: number) => ({ from, to, p });

describe("kawung bersungai (film Hari 3)", () => {
  const plain = kawungUkel({ aspect: ASPECT });
  const river = kawungUkel({ aspect: ASPECT, river: { lanterns: 29 } });
  const riverStrokes = river.strokes.filter((s) => s.part === "river");

  it("tanpa opsi sungai, motif tetap sama dengan 11.1/11.2", () => {
    expect(JSON.stringify(kawungUkel({ aspect: ASPECT, river: undefined }))).toBe(JSON.stringify(plain));
    expect(plain.strokes.some((s) => s.part === "river")).toBe(false);
  });
  it("sungai = dua tepi berkelok dan satu lampion (cincin + cecek) per tempat singgah", () => {
    const lines = riverStrokes.filter((s) => s.kind === "line");
    const dots = riverStrokes.filter((s) => s.kind === "dot");
    expect(dots).toHaveLength(29);
    expect(lines).toHaveLength(2 + 29);
  });
  it("sungai tinggal di tepi bawah kain dan di dalam kain", () => {
    const lo = RIVER_BAND.y - RIVER_BAND.swing * 1.3 - RIVER_BAND.half - 0.008;
    for (const s of riverStrokes) {
      const pts = s.kind === "line" ? s.pts : s.kind === "dot" ? [s.at] : s.poly;
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(ASPECT);
        expect(y).toBeGreaterThan(lo);
        expect(y).toBeLessThan(0.985);
      }
    }
  });
  it("tidak ada guratan lain yang menyentuh alur sungai (sungai menukik di bawah medalion)", () => {
    const top = (x: number) => riverCenter(x, ASPECT) - RIVER_BAND.half;
    for (const s of river.strokes) {
      if (s.part === "river") continue;
      const pad = s.kind === "line" ? s.width / 2 : s.kind === "dot" ? s.r : 0;
      const pts = s.kind === "line" ? s.pts : s.kind === "dot" ? [s.at] : s.poly;
      for (const [x, y] of pts) expect(y + pad).toBeLessThan(top(x) - 0.004);
    }
  });
  it("pinggiran bawah lurus diganti sungai", () => {
    const flatBottom = (m: typeof plain) => m.strokes.filter((s) => s.part === "border" && s.kind === "line" && s.pts.every((p) => p[1] > 0.9));
    expect(flatBottom(plain).length).toBeGreaterThan(0);
    expect(flatBottom(river)).toHaveLength(0);
  });
  it("garis tengah sungai berkelok, menukik di bawah medalion, dan tetap dekat tepi bawah", () => {
    const ys = Array.from({ length: 101 }, (_, i) => riverCenter((i / 100) * ASPECT, ASPECT));
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(RIVER_BAND.swing);
    expect(riverCenter(ASPECT / 2, ASPECT)).toBeCloseTo(RIVER_BAND.dip, 3);
    for (const y of ys) {
      expect(y).toBeGreaterThan(RIVER_BAND.y - RIVER_BAND.swing * 1.3 - 1e-9);
      expect(y).toBeLessThanOrEqual(RIVER_BAND.dip + 1e-9);
    }
  });
});

describe("urutan torehan bersungai", () => {
  const trace = traceMotif(kawungUkel({ aspect: ASPECT, river: { lanterns: 29 } }));
  it("sungai digores paling awal, lalu nglowong, ngisen, nembok", () => {
    expect(trace.phases.river).toBeGreaterThan(0);
    expect(trace.phases.river).toBeLessThan(0.15);
    expect(trace.phases.river).toBeLessThan(trace.phases.lines);
    expect(trace.phases.lines).toBeLessThan(trace.phases.isen);
  });
  it("semua dab sebelum akhir sungai ada di pita sungai, dan cucuk menyusurinya", () => {
    const n = trace.countAt(trace.phases.river);
    expect(n).toBeGreaterThan(100);
    const lo = RIVER_BAND.y - RIVER_BAND.swing * 1.3 - RIVER_BAND.half - 0.01;
    for (let i = 0; i < n; i++) expect(trace.dabs[i * DAB + 1]!).toBeGreaterThan(lo);
    for (const p of [0.001, trace.phases.river * 0.3, trace.phases.river * 0.7]) expect(trace.tipAt(p).at[1]).toBeGreaterThan(lo);
  });
  it("motif tanpa sungai: fase sungai 0, urutan lama tidak berubah", () => {
    const a = traceMotif(kawungUkel({ aspect: ASPECT }));
    expect(a.phases.river).toBe(0);
    expect(a.phases.lines).toBeGreaterThan(0);
  });
});

describe("proses kain sepanjang Hari 3", () => {
  const river = 0.05;
  const of = 9;
  it("kosong di awal pembuka hari, sungai selesai di panel pertama", () => {
    expect(processAt(0, of, river)).toEqual({ draw: 0, nila: 0, kerok: 0, soga: 0, lorod: 0 });
    expect(processAt(1, of, river).draw).toBeCloseTo(river, 6);
  });
  it("kawung selesai sepertiga hari, lalu nila, kerok, soga; tanpa lorod (lorod di gong)", () => {
    expect(processAt(of * PROCESS.draw, of, river).draw).toBeCloseTo(1, 6);
    expect(processAt(of * PROCESS.draw, of, river).nila).toBe(0);
    expect(processAt(of * PROCESS.nila, of, river).nila).toBeCloseTo(1, 6);
    expect(processAt(of * PROCESS.soga, of, river)).toEqual({ draw: 1, nila: 1, kerok: 1, soga: 1, lorod: 0 });
    expect(processAt(of, of, river).lorod).toBe(0);
  });
  it("naik searah dan deterministik: maju lalu mundur memberi kain yang sama", () => {
    let prev = processAt(0, of, river);
    for (let q = 0; q <= of; q += 0.05) {
      const s = processAt(q, of, river);
      for (const k of ["draw", "nila", "kerok", "soga"] as const) expect(s[k]).toBeGreaterThanOrEqual(prev[k] - 1e-12);
      prev = s;
      expect(processAt(q, of, river)).toEqual(s);
    }
  });
});

describe("kursor dunia batik", () => {
  const f = film();
  it("hanya pembuka hari dan panel", () => {
    expect(f.slides.map((s) => hasBatikWorld(s))).toEqual([false, true, true, true, true, false, false]);
    expect(batikTravel(f, at(0))).toBeNull();
    expect(batikTravel(f, at(5))).toBeNull();
  });
  it("letak hari dan kadar dunia", () => {
    expect(batikTravel(f, at(1))).toMatchObject({ q: 0, of: 3, amount: 1, depth: 0 });
    expect(batikTravel(f, at(3))).toMatchObject({ q: 2, amount: 1 });
    const mid = batikTravel(f, move(2, 3, 0.5))!;
    expect(mid.q).toBeCloseTo(1.5, 6);
    expect(mid.depth).toBeCloseTo(1, 6);
    // dari judul (pendapa) masuk ke pembuka hari: dunia muncul mengikuti gulir
    expect(batikTravel(f, move(0, 1, 0.25))!.amount).toBeCloseTo(0.25, 6);
    // dari panel terakhir ke gong: dunia surut
    expect(batikTravel(f, move(4, 5, 0.75))).toMatchObject({ q: 3, amount: 0.25 });
  });
});

describe("kain jadi di gong terakhir", () => {
  const f = film();
  it("tergantung penuh di slide gong, tidak di tempat lain", () => {
    expect(gongCloth(f, at(5))).toEqual({ show: 1, lorod: 1 });
    expect(gongCloth(f, at(4)).show).toBe(0);
    expect(gongCloth(f, at(1)).show).toBe(0);
  });
  it("dilorod saat gong didekati, maju dan mundur", () => {
    expect(gongCloth(f, move(4, 5, 0.3))).toEqual({ show: 0.3, lorod: 0.3 });
    expect(gongCloth(f, move(5, 4, 0.3))).toEqual({ show: 0.7, lorod: 0.7 });
    expect(gongCloth(f, move(5, 6, 0.5))).toEqual({ show: 0.5, lorod: 1 });
    expect(gongCloth(f, move(6, 5, 0.5)).lorod).toBe(1);
  });
});

describe("kamera dunia batik", () => {
  /** Tinggi layar (NDC −1…1) titik dunia (x, y, 0) dari bidikan. */
  const ndcY = (shot: ReturnType<typeof batikShot>, y: number, x = 0) => {
    const [px, py, pz] = shot.pos;
    const [ax, ay, az] = shot.aim;
    let fx = ax - px;
    let fy = ay - py;
    let fz = az - pz;
    const fl = Math.hypot(fx, fy, fz);
    fx /= fl;
    fy /= fl;
    fz /= fl;
    // kanan = f × up, atas = kanan × f
    let rx = -fz;
    let rz = fx;
    const rl = Math.hypot(rx, rz);
    rx /= rl;
    rz /= rl;
    const ux = -rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy;
    const dx = x - px;
    const dy = y - py;
    const dz = 0 - pz;
    const depth = dx * fx + dy * fy + dz * fz;
    const up = dx * ux + dy * uy + dz * uz;
    return up / depth / Math.tan((shot.fov * Math.PI) / 360);
  };
  const still = { x: 0, y: 0 };
  it("sungai jatuh di pita bawah layar (di bawah kartu gallery), di layar lebar dan tegak", () => {
    const riverY = clothPoint(ASPECT / 2, RIVER_BAND.y)[1];
    const dipY = clothPoint(ASPECT / 2, RIVER_BAND.dip)[1];
    for (const aspect of [16 / 9, 9 / 19.5]) {
      for (const q of [1, 2, 3]) {
        const shot = batikShot(q, 3, aspect, still, 0);
        expect(ndcY(shot, riverY)).toBeLessThan(-0.6);
        expect(ndcY(shot, dipY)).toBeGreaterThan(-0.98);
      }
    }
  });
  it("gerak pandang menggeser kamera lebih jauh dari bidikan (perspective shift)", () => {
    const a = batikShot(2, 3, 16 / 9, still, 0);
    const b = batikShot(2, 3, 16 / 9, { x: 1, y: 0 }, 0);
    expect(b.pos[0] - a.pos[0]).toBeGreaterThan(b.aim[0] - a.aim[0]);
    expect(b.aim[0] - a.aim[0]).toBeGreaterThan(0);
  });
  it("kedalaman ikut gulir mendekatkan kamera ke kain", () => {
    const a = batikShot(2, 3, 16 / 9, still, 0);
    const b = batikShot(2, 3, 16 / 9, still, 1);
    expect(b.pos[2]).toBeLessThan(a.pos[2]);
  });
  it("bergeser menyamping sepanjang gallery, mulus dari pembuka hari", () => {
    const xs = [1, 2, 3].map((q) => batikShot(q, 3, 16 / 9, still, 0).pos[0]);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[2]!);
    const near = (q: number) => batikShot(q, 3, 16 / 9, still, 0).pos;
    const a = near(0.5);
    const b = near(0.51);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.1);
    for (const v of [...near(0), ...near(3)]) expect(Number.isFinite(v)).toBe(true);
  });
  it("kain berdiri di atas lantai", () => {
    expect(CLOTH.bottom).toBeGreaterThan(0.3);
    expect(clothPoint(0, 1)[1]).toBeCloseTo(CLOTH.bottom, 6);
  });
});
