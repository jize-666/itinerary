/**
 * Data trip → urutan slide film (PRD §7, Tugas 18). Murni: seluruh isi datang dari respons trip-data,
 * tidak ada nama tempat atau teks itinerary di sini (FR-01).
 *
 * Urutan: prolog (hero, pembuka, fakta kota, rute, tim, frasa Jawa, kartu kedatangan) → tiap bab hari
 * (kartu judul, intro, gallery menyamping, gong penutup) → epilog (penutup, kartu kepulangan, tiket) → credits.
 *
 * Gallery: semua stop tampil (permintaan tamu: tanpa kejutan tersembunyi). Stop bertipe istirahat, transfer,
 * dan ibadah tidak mendapat panel sendiri; mereka dilebur sebagai catatan di panel tetangganya supaya satu hari
 * tetap ±8–9 panel.
 */
import type { Contact, DayView, FactView, PhraseView, StopView, TripView } from "@/lib/trip";
import { type DayLight, dayLight, type Sky, skyClock } from "./sky";

export type { Sky };
export type Theme = "travel" | "royal" | "lawu" | "batik";

type Base = {
  /** Unik dan stabil selama data sama (kunci React, penanda e2e). */
  id: string;
  /** Bab tempat slide ini berada (id bab = hash URL). */
  chapter: string;
  /** Slide ber-`scene` sama dirender satu lapisan yang menetap (gallery); perpindahan di dalamnya menyamping. */
  scene: string;
  sky: Sky;
  /**
   * Jam slide ini (menit sejak 00:00) dan cahaya harinya. Bila ada, langit dan matahari dihitung dari jam
   * (src/engine/slides/sky.ts) dan `sky` hanya jadi cadangan; tanpa keduanya, `sky` yang dipakai.
   */
  clock?: number;
  light?: DayLight;
  /** false = warna langit mengikuti jam, tetapi matahari hanya digambar di gallery (intro hari). */
  sun?: false;
  theme: Theme;
};

export type Slide = Base &
  (
    | { kind: "hero" }
    | { kind: "headline" }
    | { kind: "intro" }
    | { kind: "fact"; fact: FactView; n: number; of: number }
    | { kind: "route"; days: number; stops: number }
    | { kind: "team"; contacts: Contact[] }
    | { kind: "phrases"; phrases: PhraseView[] }
    /** Kartu ringkas hari kedatangan / kepulangan. */
    | { kind: "daycard"; day: DayView }
    | { kind: "title"; day: DayView }
    | { kind: "dayintro"; day: DayView; panels: number }
    /** `lead`/`then`: stop yang dilebur sebelum/sesudah panel ini. */
    | { kind: "panel"; day: DayView; stop: StopView; lead: StopView[]; then: StopView[]; n: number; of: number }
    | { kind: "gong"; day: DayView; next?: DayView }
    | { kind: "epilogue" }
    | { kind: "pass" }
    | { kind: "credits" }
  );
export type SlideKind = Slide["kind"];
export type PanelSlide = Extract<Slide, { kind: "panel" }>;

export type Chapter = {
  /** Hash URL tanpa "#": prologue, day-1, …, epilogue, credits. */
  id: string;
  kind: "prologue" | "day" | "epilogue" | "credits";
  day?: DayView;
  first: number;
  last: number;
};

export type Film = { slides: Slide[]; chapters: Chapter[] };

const MERGED_KINDS = new Set(["rest", "transfer", "prayer"]);
const THEMES = new Set<string>(["travel", "royal", "lawu", "batik"]);
const SKIES = new Set<string>(["dawn", "day", "dusk", "night"]);

const themeOf = (d: DayView): Theme => (d.theme && THEMES.has(d.theme) ? (d.theme as Theme) : "travel");
const skyOf = (s: StopView | undefined, fallback: Sky): Sky => (s?.phase && SKIES.has(s.phase) ? s.phase : fallback);
/** Hari tanpa `kind` (data lama) dianggap bab penuh. */
const isChapter = (d: DayView) => !d.kind || d.kind === "chapter";
export const daySlug = (d: DayView) => (d.slug && /^[a-z0-9-]+$/.test(d.slug) ? d.slug : `day-${d.n}`);

type Panel = { stop: StopView; lead: StopView[]; then: StopView[] };
/** Omit yang tetap membedakan anggota union (Omit biasa meleburnya). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Slide sebelum diberi bab; `scene` bawaan = id slide. */
type SlideInput = DistributiveOmit<Slide, "chapter" | "scene"> & { scene?: string };

/** Bagi stop sehari menjadi panel gallery + catatan yang dilebur. Tidak ada stop yang hilang. */
export function dayPanels(day: DayView): Panel[] {
  const own = (s: StopView) => !s.kind || !MERGED_KINDS.has(s.kind);
  if (!day.stops.some(own)) return day.stops.map((stop) => ({ stop, lead: [], then: [] }));
  const panels: Panel[] = [];
  let lead: StopView[] = [];
  for (const stop of day.stops) {
    if (own(stop)) {
      panels.push({ stop, lead, then: [] });
      lead = [];
    } else if (panels.length) panels[panels.length - 1]!.then.push(stop);
    else lead.push(stop);
  }
  return panels;
}

export function buildFilm(data: TripView): Film {
  const { trip } = data;
  const slides: Slide[] = [];
  const chapters: Chapter[] = [];
  const days = trip.days ?? [];
  const chapterDays = days.filter(isChapter);
  const firstChapterAt = days.findIndex(isChapter);
  const lastChapterAt = days.length - 1 - [...days].reverse().findIndex(isChapter);
  const before = firstChapterAt < 0 ? [] : days.slice(0, firstChapterAt);
  const after = firstChapterAt < 0 ? days : days.slice(lastChapterAt + 1);
  const panelsByDay = new Map(chapterDays.map((d) => [d, dayPanels(d)]));

  const open = (c: Omit<Chapter, "first" | "last">) => chapters.push({ ...c, first: slides.length, last: slides.length });
  const push = (s: SlideInput) => {
    const chapter = chapters[chapters.length - 1]!;
    slides.push({ ...s, chapter: chapter.id, scene: s.scene ?? s.id } as Slide);
    chapter.last = slides.length - 1;
  };

  // ---- prolog ----
  open({ id: "prologue", kind: "prologue" });
  const pro = trip.prologue;
  push({ id: "hero", kind: "hero", sky: "gate", theme: "travel" });
  if (pro?.headline) push({ id: "headline", kind: "headline", sky: "gate", theme: "travel" });
  if (pro?.intro) push({ id: "intro", kind: "intro", sky: "night", theme: "travel" });
  const facts = pro?.facts ?? [];
  facts.forEach((fact, i) => push({ id: `fact-${fact.id}`, kind: "fact", fact, n: i + 1, of: facts.length, sky: "night", theme: "travel" }));
  const panelTotal = [...panelsByDay.values()].reduce((n, p) => n + p.length, 0);
  if (chapterDays.length && (trip.route?.legs?.length ?? 0) >= 2) {
    push({ id: "route", kind: "route", days: chapterDays.length, stops: panelTotal, sky: "night", theme: "travel" });
  }
  const contacts = (data.private?.contacts ?? []).filter((c) => c.label && (c.whatsapp || c.phone));
  if (contacts.length) push({ id: "team", kind: "team", contacts, sky: "night", theme: "travel" });
  if (pro?.phrases?.length) push({ id: "phrases", kind: "phrases", phrases: pro.phrases, sky: "night", theme: "travel" });
  for (const day of before) push({ id: `card-${daySlug(day)}`, kind: "daycard", day, sky: skyOf(day.stops[0], "dusk"), theme: themeOf(day) });

  // ---- bab hari ----
  chapterDays.forEach((day, i) => {
    const slug = daySlug(day);
    const theme = themeOf(day);
    const panels = panelsByDay.get(day)!;
    // langit gallery mengikuti jam tiap stop; intro hari memakai jam panel pertama supaya warna langit tidak berganti saat masuk gallery
    const light = dayLight(day, panels.map((p) => p.stop));
    const timed = (stop: StopView | undefined) => {
      const clock = light && stop ? skyClock(stop, light) : null;
      return light && clock !== null ? { clock, light } : {};
    };
    open({ id: slug, kind: "day", day });
    push({ id: `${slug}/title`, kind: "title", day, sky: "gate", theme });
    push({ id: `${slug}/intro`, kind: "dayintro", day, panels: panels.length, sky: skyOf(panels[0]?.stop, "dawn"), ...timed(panels[0]?.stop), sun: false, theme });
    panels.forEach((p, k) =>
      push({ id: `${slug}/${p.stop.id}`, scene: `${slug}/gallery`, kind: "panel", day, ...p, n: k + 1, of: panels.length, sky: skyOf(p.stop, "day"), ...timed(p.stop), theme }),
    );
    push({ id: `${slug}/gong`, kind: "gong", day, next: chapterDays[i + 1], sky: "night", theme });
  });

  // ---- epilog ----
  open({ id: "epilogue", kind: "epilogue" });
  if (trip.epilogue) push({ id: "epilogue", kind: "epilogue", sky: "night", theme: "travel" });
  for (const day of after) push({ id: `card-${daySlug(day)}`, kind: "daycard", day, sky: skyOf(day.stops[0], "dawn"), theme: themeOf(day) });
  push({ id: "pass", kind: "pass", sky: "gate", theme: "travel" });

  // ---- credits ----
  open({ id: "credits", kind: "credits" });
  push({ id: "credits", kind: "credits", sky: "gate", theme: "travel" });

  return { slides, chapters };
}

/** Letak slide di sepanjang gallery harinya: 0 = panel pertama … 1 = panel terakhir; di luar gallery 0. Dipakai parallax latar. */
export const galleryDrift = (s: Slide | undefined): number => (s?.kind === "panel" && s.of > 1 ? (s.n - 1) / (s.of - 1) : 0);

/** Bab yang memuat slide ke-`index`. */
export function chapterAt(film: Film, index: number): Chapter | undefined {
  return film.chapters.find((c) => index >= c.first && index <= c.last);
}

/** "#day-2" → indeks slide pertama bab itu; null bila hash tidak dikenal. */
export function indexForHash(film: Film, hash: string): number | null {
  const id = decodeURIComponent(hash.replace(/^#/, "")).toLowerCase();
  if (!id) return null;
  return film.chapters.find((c) => c.id === id)?.first ?? null;
}

/** Sumbu perpindahan antara dua slide: menyamping di dalam satu scene (gallery), selain itu vertikal. */
export const axisBetween = (a: Slide | undefined, b: Slide | undefined): "x" | "y" => (a && b && a.scene === b.scene ? "x" : "y");

/** Jenis transisi: di dalam gallery, antar slide dalam satu bab, atau antar bab / lompatan (sapuan gunungan). */
export type TransitionKind = "inner" | "slide" | "wipe";
export function transitionKind(film: Film, from: number, to: number): TransitionKind {
  const a = film.slides[from];
  const b = film.slides[to];
  if (!a || !b) return "slide";
  if (a.scene === b.scene) return "inner";
  return a.chapter !== b.chapter || Math.abs(to - from) > 1 ? "wipe" : "slide";
}
