import { describe, expect, it } from "vitest";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import { axisBetween, buildFilm, chapterAt, dayPanels, daySlug, indexForHash, type PanelSlide, transitionKind } from "@/engine/slides/build-slides";
import type { DayView, StopView, TripView } from "@/lib/trip";

const L = (en: string, id = en) => ({ en, id });
const stop = (id: string, start: string, extra: Partial<StopView> = {}): StopView => ({ id, start, title: L(id), ...extra });

/** Data tiruan sekecil mungkin (bentuk lama: tanpa kind/slug/theme/prolog). */
const minimal = (): TripView => ({
  role: "guest",
  trip: { title: L("A Lakon"), days: [{ n: 1, date: "2027-04-08", title: L("One"), subtitle: L("Sub"), stops: [stop("walk", "08:00")] }] },
});

/** Data tiruan lengkap: kedatangan, dua bab, kepulangan. */
function full(): TripView {
  const day = (n: number, kind: string, slug: string, theme: string, stops: StopView[]): DayView => ({ n, date: `2027-04-0${7 + n}`, kind, slug, theme, title: L(`Day ${n}`), subtitle: L("Sub"), stops });
  return {
    role: "guest",
    trip: {
      title: L("A Lakon"),
      route: { label: L("A → B"), legs: ["AAA", "BBB"] },
      prologue: {
        kicker: L("Prologue"),
        headline: L("Headline"),
        intro: L("Intro"),
        facts: [
          { id: "one", title: L("One"), body: L("Body") },
          { id: "two", title: L("Two"), body: L("Body") },
        ],
        phrases: [{ jv: "Matur nuwun", en: "Thank you", id: "Terima kasih" }],
      },
      epilogue: { title: L("Bye"), body: L("Thanks") },
      days: [
        day(0, "arrival", "arrival", "travel", [stop("land", "17:00", { kind: "transfer", phase: "dusk" }), stop("supper", "19:00", { kind: "food" })]),
        day(1, "chapter", "day-1", "royal", [
          stop("drive", "06:00", { kind: "transfer", phase: "dawn" }),
          stop("palace", "08:00", { kind: "sight", phase: "day", panel: "photo" }),
          stop("nap", "13:00", { kind: "rest" }),
          stop("pray", "14:00", { kind: "prayer" }),
          stop("lake", "17:00", { kind: "nature", phase: "dusk" }),
          stop("ride", "20:00", { kind: "ride", phase: "night" }),
        ]),
        day(2, "chapter", "day-2", "lawu", [stop("tea", "05:00", { kind: "nature", phase: "dawn" })]),
        day(3, "departure", "departure", "travel", [stop("fly", "08:00", { kind: "transfer", phase: "day" })]),
      ],
    },
    private: { contacts: [{ label: L("Host"), whatsapp: "0800 0000 0001" }, { label: L("Nobody") }] },
  };
}

describe("data → slide", () => {
  it("urutan cerita: prolog → bab → epilog → credits", () => {
    const film = buildFilm(full());
    expect(film.slides.map((s) => s.id)).toEqual([
      "hero",
      "headline",
      "intro",
      "fact-one",
      "fact-two",
      "route",
      "team",
      "phrases",
      "card-arrival",
      "day-1/title",
      "day-1/intro",
      "day-1/palace",
      "day-1/lake",
      "day-1/ride",
      "day-1/gong",
      "day-2/title",
      "day-2/intro",
      "day-2/tea",
      "day-2/gong",
      "epilogue",
      "card-departure",
      "pass",
      "credits",
    ]);
    expect(film.chapters.map((c) => [c.id, c.first, c.last])).toEqual([
      ["prologue", 0, 8],
      ["day-1", 9, 14],
      ["day-2", 15, 18],
      ["epilogue", 19, 21],
      ["credits", 22, 22],
    ]);
  });

  it("id slide unik, dan tiap slide tahu babnya", () => {
    const film = buildFilm(full());
    expect(new Set(film.slides.map((s) => s.id)).size).toBe(film.slides.length);
    film.slides.forEach((s, i) => expect(chapterAt(film, i)?.id).toBe(s.chapter));
  });

  it("istirahat, transfer, dan ibadah dilebur ke panel tetangga; tidak ada stop yang hilang", () => {
    const day = full().trip.days[1]!;
    const panels = dayPanels(day);
    expect(panels.map((p) => [p.lead.map((s) => s.id), p.stop.id, p.then.map((s) => s.id)])).toEqual([
      [["drive"], "palace", ["nap", "pray"]],
      [[], "lake", []],
      [[], "ride", []],
    ]);
    const seen = panels.flatMap((p) => [...p.lead, p.stop, ...p.then]).map((s) => s.id);
    expect(seen).toEqual(day.stops.map((s) => s.id));
  });

  it("hari yang isinya hanya transfer/istirahat tetap tampil sebagai panel", () => {
    const day: DayView = { n: 4, date: "2027-04-11", title: L("Go"), subtitle: L("Home"), stops: [stop("pack", "07:00", { kind: "rest" }), stop("fly", "09:00", { kind: "transfer" })] };
    expect(dayPanels(day).map((p) => p.stop.id)).toEqual(["pack", "fly"]);
  });

  it("langit mengikuti fase stop; kartu judul dan gong punya langit sendiri", () => {
    const film = buildFilm(full());
    const sky = (id: string) => film.slides.find((s) => s.id === id)?.sky;
    expect([sky("day-1/title"), sky("day-1/intro"), sky("day-1/palace"), sky("day-1/lake"), sky("day-1/ride"), sky("day-1/gong")]).toEqual(["gate", "day", "day", "dusk", "night", "night"]);
    expect(sky("card-arrival")).toBe("dusk");
  });

  it("gong penutup hari menunjuk ke bab berikutnya; yang terakhir tidak", () => {
    const film = buildFilm(full());
    const gongs = film.slides.filter((s) => s.kind === "gong");
    expect(gongs.map((g) => (g.kind === "gong" ? g.next?.n : null))).toEqual([2, undefined]);
  });

  it("penghitung rute: jumlah bab dan panel; kontak tanpa nomor tidak ditampilkan", () => {
    const film = buildFilm(full());
    expect(film.slides.find((s) => s.kind === "route")).toMatchObject({ days: 2, stops: 4 });
    const team = film.slides.find((s) => s.kind === "team");
    expect(team?.kind === "team" && team.contacts.map((c) => c.label.en)).toEqual(["Host"]);
  });

  it("data lama tanpa prolog, slug, atau kind tetap menjadi film utuh", () => {
    const film = buildFilm(minimal());
    expect(film.slides.map((s) => s.id)).toEqual(["hero", "day-1/title", "day-1/intro", "day-1/walk", "day-1/gong", "pass", "credits"]);
    expect(film.chapters.map((c) => c.id)).toEqual(["prologue", "day-1", "epilogue", "credits"]);
    expect(daySlug({ n: 7, date: "", title: L("x"), subtitle: L("y"), stops: [], slug: "Bad Slug!" })).toBe("day-7");
  });

  it("tanpa hari sama sekali tetap tidak rusak", () => {
    const film = buildFilm({ role: "guest", trip: { title: L("Empty"), days: [] } });
    expect(film.slides.map((s) => s.kind)).toEqual(["hero", "pass", "credits"]);
  });
});

describe("hash bab & jenis transisi", () => {
  const film = buildFilm(full());
  const at = (id: string) => film.slides.findIndex((s) => s.id === id);

  it("#day-2 membuka slide pertama bab itu; hash asing diabaikan", () => {
    expect(indexForHash(film, "#day-2")).toBe(at("day-2/title"));
    expect(indexForHash(film, "#DAY-1")).toBe(at("day-1/title"));
    expect(indexForHash(film, "credits")).toBe(at("credits"));
    expect(indexForHash(film, "#nope")).toBeNull();
    expect(indexForHash(film, "")).toBeNull();
  });

  it("di dalam gallery bergerak menyamping, selain itu vertikal", () => {
    expect(axisBetween(film.slides[at("day-1/palace")], film.slides[at("day-1/lake")])).toBe("x");
    expect(axisBetween(film.slides[at("day-1/intro")], film.slides[at("day-1/palace")])).toBe("y");
    expect(axisBetween(film.slides[at("day-1/ride")], film.slides[at("day-1/gong")])).toBe("y");
    expect(axisBetween(undefined, film.slides[0])).toBe("y");
  });

  it("antar bab dan lompatan jauh memakai sapuan gunungan", () => {
    expect(transitionKind(film, at("day-1/palace"), at("day-1/lake"))).toBe("inner");
    expect(transitionKind(film, at("hero"), at("headline"))).toBe("slide");
    expect(transitionKind(film, at("card-arrival"), at("day-1/title"))).toBe("wipe");
    expect(transitionKind(film, at("day-1/gong"), at("day-2/title"))).toBe("wipe");
    expect(transitionKind(film, at("hero"), at("intro"))).toBe("wipe");
  });
});

describe("konten Solo yang sebenarnya", () => {
  const solo = Trip.parse(soloInput);
  const film = buildFilm({ role: "guest", trip: solo as unknown as TripView["trip"] });
  const panels = film.slides.filter((s): s is PanelSlide => s.kind === "panel");

  it("enam bab: prolog, tiga hari, epilog, credits", () => {
    expect(film.chapters.map((c) => c.id)).toEqual(["prologue", "day-1", "day-2", "day-3", "epilogue", "credits"]);
  });

  it("tiap hari 5–9 panel, dan jumlah slide tetap dalam ukuran film pendek", () => {
    for (const c of film.chapters.filter((x) => x.kind === "day")) {
      const n = panels.filter((p) => p.chapter === c.id).length;
      expect(n, c.id).toBeGreaterThanOrEqual(5);
      expect(n, c.id).toBeLessThanOrEqual(9);
    }
    expect(film.slides.length).toBeGreaterThanOrEqual(40);
    expect(film.slides.length).toBeLessThanOrEqual(56);
  });

  it("semua stop tampil tepat sekali: sebagai panel, catatan panel, atau kartu kedatangan/kepulangan", () => {
    const shown = [
      ...panels.flatMap((p) => [...p.lead, p.stop, ...p.then]),
      ...film.slides.flatMap((s) => (s.kind === "daycard" ? s.day.stops : [])),
    ].map((s) => s.id);
    const all = solo.days.flatMap((d) => d.stops.map((s) => s.id));
    expect([...shown].sort()).toEqual([...all].sort());
  });

  it("kedatangan dan kepulangan adalah kartu ringkas, bukan bab", () => {
    expect(film.slides.filter((s) => s.kind === "daycard").map((s) => s.chapter)).toEqual(["prologue", "epilogue"]);
  });
});
