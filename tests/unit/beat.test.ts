import { describe, expect, it } from "vitest";
import { type Beat, beatStep, hasStrikeBeat } from "@/engine/slides/beat";
import { buildFilm, type Slide } from "@/engine/slides/build-slides";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import type { TripView } from "@/lib/trip";

/**
 * Tahap gong di slide judul (Tugas 7b, permintaan host 14 Nov): langkah maju pertama di judul hari dan hero prolog
 * mengeluarkan teks dan menabuh gong tanpa pindah slide; mundur mengembalikan teks; langkah berikutnya pindah slide.
 */
const film = buildFilm({ role: "guest", trip: Trip.parse(soloInput), manifest: {} } as unknown as TripView);
const of = (kind: Slide["kind"]) => film.slides.filter((s) => s.kind === kind);

/** Jalankan urutan langkah pada satu slide; null di hasil = langkah diteruskan ke perpindahan slide. */
function walk(slide: Slide | undefined, dirs: (1 | -1)[]) {
  let beat: Beat = 0;
  return dirs.map((d) => {
    const next = beatStep(slide, beat, d);
    if (next !== null) beat = next;
    return next;
  });
}

describe("tahap gong di slide judul (beat.ts)", () => {
  it("berlaku untuk hero prolog dan judul semua hari (jawaban host: \"berlaku semua\"), tidak untuk slide lain", () => {
    const titles = of("title");
    expect(titles.length).toBeGreaterThanOrEqual(3);
    for (const s of [...of("hero"), ...titles]) expect(hasStrikeBeat(s)).toBe(true);
    for (const kind of ["headline", "intro", "dayintro", "panel", "gong", "epilogue", "pass", "credits"] as const) {
      for (const s of of(kind)) expect(hasStrikeBeat(s), s.id).toBe(false);
    }
    expect(hasStrikeBeat(undefined)).toBe(false);
  });

  it("maju: tahap 0 → 1 (teks keluar, gong ditabuh), maju lagi diteruskan ke perpindahan slide", () => {
    expect(walk(of("title")[0], [1, 1])).toEqual([1, null]);
    expect(walk(of("hero")[0], [1, 1])).toEqual([1, null]);
  });

  it("mundur saat teks sudah keluar: teks kembali (tahap 0) tanpa pindah slide; mundur lagi pindah slide", () => {
    expect(walk(of("title")[1], [1, -1, -1])).toEqual([1, 0, null]);
  });

  it("mundur di tahap 0 diteruskan (slide sebelumnya); maju-mundur-maju menabuh lagi", () => {
    expect(walk(of("title")[0], [-1])).toEqual([null]);
    expect(walk(of("title")[0], [1, -1, 1])).toEqual([1, 0, 1]);
  });

  it("slide tanpa tahap: semua langkah diteruskan", () => {
    for (const kind of ["dayintro", "gong", "panel"] as const) expect(walk(of(kind)[0], [1, -1, 1])).toEqual([null, null, null]);
  });
});
