import { describe, expect, it } from "vitest";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import { buildFilm } from "@/engine/slides/build-slides";
import { arcLevel, carve, hillAt, nearestRiver, RIVER, riverLine, waterLevel } from "@/engine/stage/river";
import { arcLengths, currentKnot, drawnAt, filmPosition, larungRoutes, planeHit, pointAt, riverRing, ROUTE, shownAt } from "@/engine/stage/route";
import { galleryShot, projectPoint } from "@/engine/stage/shots";
import { TERRAIN_DEFAULT, terrainHeight } from "@/engine/stage/terrain";
import type { TripView } from "@/lib/trip";

/** Bengawan Solo dan larung lampion (Tugas 8.1, pilihan host 17 Nov "b aja coba"). */
const film = buildFilm({ role: "guest", trip: Trip.parse(soloInput), manifest: {} } as unknown as TripView);
const WIDE = { aspect: 16 / 9, horizon: -0.46 };
const TALL = { aspect: 390 / 844, horizon: -0.46 };
const panelsOf = (id: string) => film.slides.flatMap((s, i) => (s.chapter === id && s.kind === "panel" ? [i] : []));
const driftOf = (i: number) => {
  const s = film.slides[i]!;
  return s.kind === "panel" && s.of > 1 ? (s.n - 1) / (s.of - 1) : 0;
};

describe("Bengawan Solo", () => {
  it("letaknya mengikuti baris lampion di layar: layar lebar lebih jauh dari pendapa daripada HP tegak", () => {
    const [wide, tall] = [riverRing(WIDE), riverRing(TALL)];
    expect(wide).toBeGreaterThan(tall + 1.5);
    expect(wide).toBeGreaterThan(13);
    expect(tall).toBeGreaterThan(9.5);
    // bentuk yang sama dipakai ulang
    expect(riverLine(wide)).toBe(riverLine(wide));
  });

  it("melengkung di depan kamera gallery pada muka air datar, lalu menjauh ke cakrawala kiri dan kanan", () => {
    const ring = riverRing(WIDE);
    const { points, level } = riverLine(ring);
    const arc = points.flatMap(([x, z], i) => (Math.abs(Math.atan2(x, -z)) < RIVER.arc * 0.9 && Math.hypot(x, z) < ring + 1 ? [level[i]!] : []));
    expect(arc.length).toBeGreaterThan(20);
    for (const l of arc) expect(l).toBeCloseTo(arcLevel(ring), 5);
    const [first, last] = [points[0]!, points[points.length - 1]!];
    expect(Math.hypot(...first)).toBeGreaterThan(150);
    expect(Math.hypot(...last)).toBeGreaterThan(150);
    expect(first[0]).toBeLessThan(0);
    expect(last[0]).toBeGreaterThan(0);
  });

  it("alurnya diukir: di dalam sungai tanah di bawah muka air, di tepinya bibir tebing di atas air (air tidak melayang)", () => {
    const ring = riverRing(WIDE);
    const line = riverLine(ring);
    const shape = { ...TERRAIN_DEFAULT, river: ring };
    for (const az of [0, -0.2, 0.25]) {
      const [x, z] = [ring * Math.sin(az), -ring * Math.cos(az)];
      const n = nearestRiver(x, z, line)!;
      expect(terrainHeight(x, z, shape)).toBeLessThan(n.level);
      expect(waterLevel(x, z, line)).toBeCloseTo(n.level, 6);
      // dari garis tengah, melintang ke kedua tepi (sisi dalam ke arah pendapa, sisi luar tempat tanah asal lebih
      // rendah dari air): bibir tebing tetap di atas air
      const [a, b] = [line.points[n.i]!, line.points[n.i + 1]!];
      const [cx, cz] = [a[0] + (b[0] - a[0]) * n.t, a[1] + (b[1] - a[1]) * n.t];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const [nx, nz] = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      for (const k of [-1, 1]) expect(terrainHeight(cx + nx * k * (n.half + 0.12), cz + nz * k * (n.half + 0.12), shape)).toBeGreaterThan(n.level);
    }
    // jauh dari sungai: tanah tidak berubah
    expect(carve(0, 40, 1.23, line)).toBe(1.23);
    expect(nearestRiver(0, 40, line)).toBeNull();
    expect(waterLevel(0, -5, line)).toBeNull();
    expect(hillAt(5)).toBeCloseTo(0, 9);
  });
});

describe("larung lampion di gallery", () => {
  for (const [name, frame] of [
    ["layar lebar", WIDE],
    ["HP tegak", TALL],
  ] as const) {
    it(`${name}: satu perjalanan per bab hari, lampion terapung di tengah alur tepat di bawah kartu panelnya`, () => {
      const routes = larungRoutes(film, frame);
      const days = film.chapters.filter((c) => c.kind === "day" && panelsOf(c.id).length > 0);
      expect(routes.map((r) => r.id)).toEqual(days.map((d) => d.id));
      for (const route of routes) {
        const panels = panelsOf(route.id);
        expect(route.knots).toHaveLength(panels.length);
        panels.forEach((i, j) => {
          const lamp = route.knots[j]!.pos;
          const p = projectPoint(galleryShot(driftOf(i), frame), frame.aspect, lamp);
          expect(p.depth).toBeGreaterThan(2);
          expect(Math.abs(p.x)).toBeLessThan(0.03);
          expect(p.y).toBeGreaterThan(-0.9);
          expect(p.y).toBeLessThan(-0.55);
          expect(lamp[1]).toBeCloseTo(arcLevel(riverRing(frame)), 5);
          const n = nearestRiver(lamp[0], lamp[2], riverLine(riverRing(frame)))!;
          expect(n.d).toBeLessThanOrEqual(ROUTE.keep * n.half + 1e-6);
        });
      }
    });
  }

  it("perahu hanyut di muka air, berlabuh di sisi dekat tiap lampion", () => {
    const route = larungRoutes(film, WIDE)[0]!;
    for (const p of route.points) expect(p[1]).toBeCloseTo(arcLevel(riverRing(WIDE)), 5);
    const panels = panelsOf(route.id);
    route.knots.forEach((k, j) => {
      const berth = pointAt(route, k.at);
      const cam = galleryShot(driftOf(panels[j]!), WIDE).pos;
      expect(Math.hypot(berth[0] - k.pos[0], berth[2] - k.pos[2])).toBeCloseTo(ROUTE.berth, 2);
      expect(Math.hypot(berth[0] - cam[0], berth[2] - cam[2])).toBeLessThan(Math.hypot(k.pos[0] - cam[0], k.pos[2] - cam[2]));
    });
    expect(route.at[0]).toBe(0);
    expect(route.at[route.at.length - 1]).toBe(1);
  });

  it("hanyut mengikuti gulir: di hulu saat intro hari, berlabuh di lampion panel yang tampil, di tengah jalan selama geseran", () => {
    const route = larungRoutes(film, WIDE)[0]!;
    const panels = panelsOf(route.id);
    const intro = film.slides.findIndex((s) => s.chapter === route.id && s.kind === "dayintro");
    expect(drawnAt(route, intro)).toBe(0);
    panels.forEach((i, j) => expect(drawnAt(route, i)).toBeCloseTo(route.knots[j]!.at, 6));
    const mid = drawnAt(route, filmPosition({ from: panels[0]!, to: panels[1]!, p: 0.5 }));
    expect(mid).toBeCloseTo((route.knots[0]!.at + route.knots[1]!.at) / 2, 6);
    expect(drawnAt(route, filmPosition({ from: panels[1]!, to: panels[0]!, p: 0.25 }))).toBeLessThan(route.knots[1]!.at);
    expect(drawnAt(route, panels[panels.length - 1]! + 1)).toBe(1);
    expect(currentKnot(route, panels[2]!)).toBe(route.knots[2]!.at);
    expect(currentKnot(route, filmPosition({ from: panels[2]!, to: panels[3]!, p: 0.7 }))).toBe(route.knots[3]!.at);
    expect(currentKnot(route, intro)).toBe(-1);
  });

  it("tampak hanya di babnya sendiri, memudar di tepinya", () => {
    const [a, b] = larungRoutes(film, WIDE);
    expect(shownAt(a!, a!.span[0])).toBe(1);
    expect(shownAt(a!, a!.span[1])).toBe(1);
    expect(shownAt(a!, a!.span[1] + ROUTE.fade / 2)).toBeGreaterThan(0);
    expect(shownAt(a!, a!.span[1] + ROUTE.fade / 2)).toBeLessThan(1);
    expect(shownAt(a!, b!.span[0])).toBe(0);
    expect(shownAt(b!, a!.span[1])).toBe(0);
  });
});

describe("alat bantu perjalanan", () => {
  it("sinar ke bidang datar: titik potongnya; sinar yang naik: tidak ada", () => {
    expect(planeHit([0, 4, 0], [0, -1, 0], -1)).toEqual([0, -1, 0]);
    expect(planeHit([0, 4, 0], [0, 0.5, -0.86], -1)).toBeNull();
  });

  it("panjang busur ternormalisasi, dan titik di panjang busur mana pun", () => {
    const points = [
      [0, 0, 0],
      [1, 0, 0],
      [3, 0, 0],
    ] as const;
    const at = arcLengths(points);
    expect(at).toEqual([0, 1 / 3, 1]);
    expect(pointAt({ points, at }, 0.5)).toEqual([1.5, 0, 0]);
    expect(pointAt({ points, at }, -1)).toEqual([0, 0, 0]);
    expect(pointAt({ points, at }, 2)).toEqual([3, 0, 0]);
  });

  it("letak film: indeks slide saat diam, pecahan selama transisi", () => {
    expect(filmPosition({ from: 7, to: 7, p: 0 })).toBe(7);
    expect(filmPosition({ from: 7, to: 8, p: 0.25 })).toBe(7.25);
    expect(filmPosition({ from: 8, to: 7, p: 0.25 })).toBe(7.75);
  });
});
