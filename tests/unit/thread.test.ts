import { describe, expect, it } from "vitest";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import { buildFilm } from "@/engine/slides/build-slides";
import { galleryShot, projectPoint } from "@/engine/stage/shots";
import { terrainHeight, TERRAIN_DEFAULT } from "@/engine/stage/terrain";
import { arcLengths, currentKnot, drawnAt, filmPosition, galleryStrands, groundHit, pointAt, shownAt, THREAD } from "@/engine/stage/thread";
import type { TripView } from "@/lib/trip";

/** Benang emas (Tugas 8.1): tergelar di tanah gallery, satu simpul per tempat singgah, tergambar mengikuti gulir. */
const film = buildFilm({ role: "guest", trip: Trip.parse(soloInput), manifest: {} } as unknown as TripView);
const WIDE = { aspect: 16 / 9, horizon: -0.46 };
const TALL = { aspect: 390 / 844, horizon: -0.46 };

describe("benang gallery", () => {
  for (const [name, frame] of [
    ["layar lebar", WIDE],
    ["HP tegak", TALL],
  ] as const) {
    it(`${name}: satu benang per bab hari, simpul tepat di bawah kartu panelnya (tengah layar, pita tanah)`, () => {
      const strands = galleryStrands(film, frame);
      const days = film.chapters.filter((c) => c.kind === "day" && film.slides.slice(c.first, c.last + 1).some((s) => s.kind === "panel"));
      expect(strands.map((s) => s.id)).toEqual(days.map((d) => d.id));
      for (const strand of strands) {
        const panels = film.slides.flatMap((s, i) => (s.chapter === strand.id && s.kind === "panel" ? [i] : []));
        expect(strand.knots).toHaveLength(panels.length);
        panels.forEach((i, j) => {
          const slide = film.slides[i]!;
          const drift = slide.kind === "panel" && slide.of > 1 ? (slide.n - 1) / (slide.of - 1) : 0;
          const p = projectPoint(galleryShot(drift, frame), frame.aspect, strand.knots[j]!.pos);
          expect(p.depth).toBeGreaterThan(2);
          expect(Math.abs(p.x)).toBeLessThan(0.02);
          expect(p.y).toBeCloseTo(THREAD.knotY, 1);
        });
      }
    });
  }

  it("benang dibentangkan rendah: manik melayang, benang melengkung turun di antaranya, ujungnya menyentuh tanah, tanpa lompatan", () => {
    for (const strand of galleryStrands(film, WIDE)) {
      const above = (p: readonly number[]) => p[1]! - terrainHeight(p[0]!, p[2]!, TERRAIN_DEFAULT);
      for (const p of strand.points) {
        expect(above(p)).toBeGreaterThanOrEqual(THREAD.endLift - 1e-6);
        expect(above(p)).toBeLessThanOrEqual(THREAD.knotLift + 1e-6);
      }
      for (const k of strand.knots) expect(above(k.pos)).toBeCloseTo(THREAD.knotLift, 5);
      // titik terendah di antara dua manik pertama: turun sejauh `sag`
      const [a, b] = [strand.knots[0]!, strand.knots[1]!];
      const between = strand.points.filter((_, i) => strand.at[i]! > a.at && strand.at[i]! < b.at);
      expect(Math.min(...between.map(above))).toBeCloseTo(THREAD.knotLift - THREAD.sag, 2);
      expect(above(strand.points[0]!)).toBeCloseTo(THREAD.endLift, 5);
      expect(above(strand.points[strand.points.length - 1]!)).toBeCloseTo(THREAD.endLift, 5);
      for (let i = 1; i < strand.points.length; i++) {
        const [a, b] = [strand.points[i - 1]!, strand.points[i]!];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.5);
      }
      expect(strand.at[0]).toBe(0);
      expect(strand.at[strand.at.length - 1]).toBe(1);
      for (let i = 1; i < strand.at.length; i++) expect(strand.at[i]!).toBeGreaterThanOrEqual(strand.at[i - 1]!);
    }
  });

  it("tergambar mengikuti gulir: nol di intro hari, tepat sampai simpul panel yang tampil, maju di tengah geseran", () => {
    const strand = galleryStrands(film, WIDE)[0]!;
    const panels = film.slides.flatMap((s, i) => (s.chapter === strand.id && s.kind === "panel" ? [i] : []));
    const intro = film.slides.findIndex((s) => s.chapter === strand.id && s.kind === "dayintro");
    expect(drawnAt(strand, intro)).toBe(0);
    panels.forEach((i, j) => expect(drawnAt(strand, i)).toBeCloseTo(strand.knots[j]!.at, 6));
    // di tengah geseran panel 1 → 2: tepat di tengah kedua simpul
    const mid = drawnAt(strand, filmPosition({ from: panels[0]!, to: panels[1]!, p: 0.5 }));
    expect(mid).toBeCloseTo((strand.knots[0]!.at + strand.knots[1]!.at) / 2, 6);
    // mundur: ujung benang ikut mundur
    expect(drawnAt(strand, filmPosition({ from: panels[1]!, to: panels[0]!, p: 0.25 }))).toBeLessThan(strand.knots[1]!.at);
    expect(drawnAt(strand, panels[panels.length - 1]! + 1)).toBe(1);
    expect(drawnAt(strand, 9999)).toBe(1);
    // manik yang sedang tampil: panel terdekat dengan letak film
    expect(currentKnot(strand, panels[2]!)).toBe(strand.knots[2]!.at);
    expect(currentKnot(strand, filmPosition({ from: panels[2]!, to: panels[3]!, p: 0.7 }))).toBe(strand.knots[3]!.at);
    expect(currentKnot(strand, intro)).toBe(-1);
  });

  it("tampak hanya di babnya sendiri, memudar di tepinya", () => {
    const [a, b] = galleryStrands(film, WIDE);
    expect(shownAt(a!, a!.span[0])).toBe(1);
    expect(shownAt(a!, a!.span[1])).toBe(1);
    expect(shownAt(a!, a!.span[1] + THREAD.fade / 2)).toBeGreaterThan(0);
    expect(shownAt(a!, a!.span[1] + THREAD.fade / 2)).toBeLessThan(1);
    expect(shownAt(a!, b!.span[0])).toBe(0);
    expect(shownAt(b!, a!.span[1])).toBe(0);
  });
});

describe("alat bantu benang", () => {
  it("sinar ke tanah: titik pertama yang menyentuh permukaan; ke langit: tidak ada", () => {
    const hit = groundHit([0, 4, -6], [0, -0.4, -0.92], TERRAIN_DEFAULT, 0)!;
    expect(hit[1]).toBeCloseTo(terrainHeight(hit[0], hit[2]), 3);
    expect(groundHit([0, 4, -6], [0, 0.5, -0.86])).toBeNull();
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
