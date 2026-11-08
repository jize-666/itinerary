import { describe, expect, it } from "vitest";
import { trip } from "@content/trips/solo/trip";
import manifest from "@content/trips/solo/photos/manifest.json";
import { PhotoEntry, Trip } from "@content/schema";
import { validateTrip } from "@content/validate";

const clone = <T>(v: T): T => structuredClone(v);
const errorsOf = (t: unknown, m: unknown = manifest) => validateTrip(t, m).issues.filter((i) => i.level === "error");

const photo = {
  id: "keraton",
  file: "keraton.avif",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  author: "Someone",
  license: "CC-BY-SA-4.0",
  retrievedAt: "2026-11-08",
  alt: { en: "Palace gate", id: "Gerbang keraton" },
};

describe("data trip Solo", () => {
  it("lolos schema dan validator tanpa error", () => {
    expect(Trip.safeParse(trip).success).toBe(true);
    expect(errorsOf(trip)).toEqual([]);
  });

  it("punya hari 0–4 dengan tanggal berurutan dan tiga bab", () => {
    const t = Trip.parse(trip);
    expect(t.days.map((d) => d.n)).toEqual([0, 1, 2, 3, 4]);
    expect(t.days.filter((d) => d.kind === "chapter").map((d) => d.theme)).toEqual(["royal", "lawu", "batik"]);
  });

  it("semua stop makanan halal, tanpa alkohol, tanpa pisang", () => {
    const foods = Trip.parse(trip).days.flatMap((d) => d.stops).filter((s) => s.kind === "food");
    expect(foods.length).toBeGreaterThan(0);
    for (const s of foods) expect(s.food).toMatchObject({ halal: true, alcohol: false, banana: false });
  });

  it("rute tiket Belitung → Jakarta → Solo", () => {
    expect(trip.route.legs).toEqual(["TJQ", "CGK", "SOC"]);
  });
});

describe("validator", () => {
  it("menangkap jam yang bertabrakan", () => {
    const t = clone(trip);
    const [a, b] = t.days[1]!.stops;
    a!.end = "23:00";
    expect(errorsOf(t).some((e) => e.message.includes(`bertabrakan dengan ${b!.id}`))).toBe(true);
  });

  it("menolak teks EN/ID yang kosong", () => {
    const t = clone(trip);
    t.days[1]!.stops[0]!.story.id = "   ";
    expect(errorsOf(t).some((e) => e.where.includes("story.id"))).toBe(true);
  });

  it("menangkap jam selesai sebelum jam mulai", () => {
    const t = clone(trip);
    const s = t.days[1]!.stops[0]!;
    s.end = s.start;
    expect(errorsOf(t).some((e) => e.message.includes("harus setelah jam mulai"))).toBe(true);
  });

  it("menangkap tanggal yang tidak berurutan", () => {
    const t = clone(trip);
    t.days[2]!.date = "2027-04-20";
    expect(errorsOf(t).some((e) => e.message.includes("tidak berurutan"))).toBe(true);
  });

  it("menangkap stop makanan tanpa penanda food", () => {
    const t = clone(trip);
    const food = t.days.flatMap((d) => d.stops).find((s) => s.kind === "food")!;
    delete (food as { food?: unknown }).food;
    expect(errorsOf(t).some((e) => e.message.includes("wajib punya penanda food"))).toBe(true);
  });

  it("menolak makanan yang tidak halal atau mengandung pisang", () => {
    const t = clone(trip);
    const food = t.days.flatMap((d) => d.stops).find((s) => s.kind === "food")! as { food: Record<string, unknown> };
    food.food.banana = true;
    expect(Trip.safeParse(t).success).toBe(false);
  });

  it("menangkap id stop ganda", () => {
    const t = clone(trip);
    t.days[3]!.stops[0]!.id = t.days[1]!.stops[0]!.id;
    expect(errorsOf(t).some((e) => e.message.includes("lebih dari sekali"))).toBe(true);
  });

  it("menangkap foto yang tidak ada di manifest", () => {
    const t = clone(trip);
    (t.days[1]!.stops[1] as { photo?: string }).photo = "tidak-ada";
    expect(errorsOf(t).some((e) => e.message.includes("tidak ada di manifest"))).toBe(true);
  });

  it("menolak why lebih dari 160 karakter", () => {
    const t = clone(trip);
    t.days[1]!.stops[0]!.why.en = "x".repeat(161);
    expect(errorsOf(t).some((e) => e.message.includes("lebih dari 160"))).toBe(true);
  });
});

describe("manifest foto", () => {
  it("menerima lisensi yang diizinkan", () => {
    expect(PhotoEntry.safeParse(photo).success).toBe(true);
  });

  it("menolak lisensi ND (foto di-crop & di-grading)", () => {
    for (const license of ["CC-BY-ND-4.0", "CC-BY-NC-ND-4.0", "All rights reserved"]) {
      expect(PhotoEntry.safeParse({ ...photo, license }).success).toBe(false);
    }
  });

  it("memberi warning untuk lisensi NC", () => {
    const { issues } = validateTrip(trip, [{ ...photo, license: "CC-BY-NC-4.0" }]);
    expect(issues.some((i) => i.level === "warning" && i.where.includes("keraton") && i.message.includes("NC"))).toBe(true);
  });
});
