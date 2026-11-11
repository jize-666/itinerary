import { describe, expect, it } from "vitest";
import { Trip } from "@content/schema";
import { trip as soloInput } from "@content/trips/solo/trip";
import { buildFilm, type PanelSlide } from "@/engine/slides/build-slides";
import { type DayLight, dayLight, minutesOf, SKY_LAYERS, skyAt, skyCovered, type SkyKey, skyPath, type SkyState, skyState, STILL } from "@/engine/slides/sky";
import type { TripView } from "@/lib/trip";

const at = (hhmm: string) => minutesOf(hhmm)!;
/** Hari contoh: terbit 05:35, terbenam 17:40, sarapan 07:00, jadwal pertama sesudahnya 08:30. */
const LIGHT: DayLight = { sunrise: at("05:35"), sunset: at("17:40"), sunFrom: at("07:00"), sunFull: at("08:30") };

/** Kadar tiap warna yang benar-benar terlihat sesudah lapisan ditumpuk (malam di dasar); jumlahnya selalu 1. */
function visible(s: SkyState) {
  let rest = 1;
  const out: Record<string, number> = {};
  for (const k of [...SKY_LAYERS].reverse()) {
    out[k] = rest * s[k];
    rest *= 1 - s[k];
  }
  out.night = rest;
  return out;
}

/** Keadaan di posisi `p` pada lintasan, linear di antara titik kunci (persis cara Timeline memutarnya). */
function sample(keys: readonly SkyKey[], p: number): SkyState {
  const i = Math.max(1, keys.findIndex(([k]) => k >= p));
  const [pa, a] = keys[i - 1]!;
  const [pb, b] = keys[i]!;
  const w = pb === pa ? 1 : (p - pa) / (pb - pa);
  const mix = (x: number, y: number) => x + (y - x) * w;
  return {
    dawn: mix(a.dawn, b.dawn),
    day: mix(a.day, b.day),
    dusk: mix(a.dusk, b.dusk),
    gate: mix(a.gate, b.gate),
    sun: { u: mix(a.sun.u, b.sun.u), v: mix(a.sun.v, b.sun.v), opacity: mix(a.sun.opacity, b.sun.opacity), warm: mix(a.sun.warm, b.sun.warm), scale: mix(a.sun.scale, b.sun.scale) },
  };
}

describe("jam & cahaya hari", () => {
  it("membaca jam HH:MM", () => {
    expect(minutesOf("07:30")).toBe(450);
    expect(minutesOf("5:05")).toBe(305);
    expect(minutesOf("24:00")).toBeNull();
    expect(minutesOf("pagi")).toBeNull();
    expect(minutesOf(undefined)).toBeNull();
  });

  it("matahari mulai tampak dari jadwal pertama setelah sarapan", () => {
    const day = { sunrise: "05:35", sunset: "17:40" };
    const stops = [
      { start: "05:15", kind: "nature" },
      { start: "06:45", kind: "food" },
      { start: "08:15", kind: "sight" },
      { start: "12:45", kind: "food" },
    ];
    expect(dayLight(day, stops)).toEqual({ sunrise: 335, sunset: 1060, sunFrom: at("06:45"), sunFull: at("08:15") });
  });

  it("tanpa sarapan di data: mengikuti jam terbit; tanpa jam terbit/terbenam: tidak ada cahaya berjam", () => {
    expect(dayLight({ sunrise: "05:35", sunset: "17:40" }, [{ start: "08:00" }, { start: "13:00", kind: "food" }])).toEqual({ sunrise: 335, sunset: 1060, sunFrom: 335, sunFull: 395 });
    expect(dayLight({}, [{ start: "07:00", kind: "food" }])).toBeNull();
    expect(dayLight({ sunrise: "18:00", sunset: "06:00" }, [])).toBeNull();
  });
});

describe("langit pada satu jam", () => {
  it("matahari belum tampak saat sarapan, tampak penuh di jadwal berikutnya, hilang sesudah terbenam", () => {
    expect(skyAt(at("07:00"), LIGHT).sun.opacity).toBe(0);
    expect(skyAt(at("07:45"), LIGHT).sun.opacity).toBeCloseTo(0.5, 2);
    expect(skyAt(at("08:30"), LIGHT).sun.opacity).toBe(1);
    expect(skyAt(at("12:00"), LIGHT).sun.opacity).toBe(1);
    expect(skyAt(at("17:00"), LIGHT).sun.opacity).toBe(1);
    expect(skyAt(at("19:00"), LIGHT).sun.opacity).toBe(0);
  });

  it("letak matahari mengikuti jam: bergeser timur → barat, tertinggi di tengah hari, rendah dan hangat menjelang terbenam", () => {
    const hours = ["08:30", "10:30", "11:30", "12:45", "15:30", "17:00"].map((h) => skyAt(at(h), LIGHT).sun);
    const us = hours.map((s) => s.u);
    expect([...us].sort((a, b) => a - b)).toEqual(us);
    expect(new Set(us).size).toBe(us.length);
    const noon = skyAt((LIGHT.sunrise + LIGHT.sunset) / 2, LIGHT).sun;
    expect(noon.v).toBe(0);
    expect(noon.u).toBe(0.5);
    for (const s of hours) expect(s.v).toBeGreaterThanOrEqual(noon.v);
    const late = skyAt(at("17:00"), LIGHT).sun;
    expect(late.v).toBeGreaterThan(0.7);
    expect(late.warm).toBeGreaterThan(0.5);
    expect(late.scale).toBeGreaterThan(1);
    expect(skyAt(at("12:00"), LIGHT).sun.warm).toBe(0);
  });

  it("warna langit mengikuti jam yang sama: malam, subuh, siang, senja, malam", () => {
    const main = (h: string) => Object.entries(visible(skyAt(at(h), LIGHT))).sort((a, b) => b[1] - a[1])[0]![0];
    expect(["03:30", "05:20", "07:00", "09:00", "12:00", "14:00", "17:00", "17:45", "19:00", "21:00"].map(main)).toEqual(["night", "dawn", "dawn", "day", "day", "day", "dusk", "dusk", "night", "night"]);
    // pagi makin terang, sore makin jingga: bertahap, bukan sekali ganti
    expect(visible(skyAt(at("07:00"), LIGHT)).day).toBeGreaterThan(0.2);
    expect(visible(skyAt(at("15:30"), LIGHT)).dusk).toBeGreaterThan(0.2);
    expect(visible(skyAt(at("15:30"), LIGHT)).dusk).toBeLessThan(0.6);
  });
});

describe("lintasan antar slide", () => {
  const lit = (h: string) => ({ sky: "day" as const, clock: at(h), light: LIGHT });

  it("berawal dan berakhir tepat di langit kedua stop", () => {
    const keys = skyPath(lit("08:30"), lit("10:30"));
    expect(keys[0]).toEqual([0, skyAt(at("08:30"), LIGHT)]);
    expect(keys[keys.length - 1]).toEqual([1, skyAt(at("10:30"), LIGHT)]);
    const ps = keys.map(([p]) => p);
    expect([...ps].sort((a, b) => a - b)).toEqual(ps);
  });

  it("tanpa lompatan: di tiap pasangan stop berurutan, warna dan matahari berubah sedikit demi sedikit", () => {
    const day = ["07:00", "08:30", "10:30", "11:30", "12:45", "15:30", "17:00", "19:00", "20:00"];
    const STEPS = 400;
    for (let i = 1; i < day.length; i++) {
      for (const [a, b] of [
        [day[i - 1]!, day[i]!],
        [day[i]!, day[i - 1]!],
      ] as const) {
        const keys = skyPath(lit(a), lit(b));
        let prev = sample(keys, 0);
        for (let k = 1; k <= STEPS; k++) {
          const next = sample(keys, k / STEPS);
          const [va, vb] = [visible(prev), visible(next)];
          for (const name of Object.keys(va)) expect(Math.abs(va[name]! - vb[name]!), `${a}→${b} ${name} @${k}`).toBeLessThan(0.02);
          expect(Math.abs(next.sun.u - prev.sun.u), `${a}→${b} u @${k}`).toBeLessThan(0.01);
          expect(Math.abs(next.sun.v - prev.sun.v), `${a}→${b} v @${k}`).toBeLessThan(0.02);
          expect(Math.abs(next.sun.opacity - prev.sun.opacity), `${a}→${b} opacity @${k}`).toBeLessThan(0.02);
          prev = next;
        }
      }
    }
  });

  it("busur tetap melengkung di antara dua stop (bukan garis lurus)", () => {
    const keys = skyPath(lit("08:30"), lit("15:30"));
    const top = Math.min(...keys.map(([, s]) => s.sun.v));
    expect(top).toBeLessThan(0.02);
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  it("stop yang sama jamnya: langit diam", () => {
    expect(skyPath(lit("08:30"), lit("08:30"))).toHaveLength(1);
  });

  it("dari/ke gerbang hanya lapisan gerbang yang berubah; matahari muncul di tempat", () => {
    const [[, from], [, to]] = skyPath({ sky: "gate" }, lit("10:30")) as [SkyKey, SkyKey];
    const target = skyAt(at("10:30"), LIGHT);
    expect(from).toEqual({ ...target, gate: 1 });
    expect(to).toEqual(target);
    const [[, night], [, noon]] = skyPath({ sky: "night" }, lit("12:00")) as [SkyKey, SkyKey];
    expect(night.sun).toEqual({ ...noon.sun, opacity: 0 });
  });

  it("langit tetap (tanpa jam): satu crossfade, lapisan tertutup tidak ikut berkedip", () => {
    const [[, from], [, to]] = skyPath({ sky: "dawn" }, { sky: "night" }) as [SkyKey, SkyKey];
    expect([from.dawn, to.dawn]).toEqual([1, 0]);
    expect(skyState({ sky: "day" })).toBe(STILL.day);
    expect(STILL.day.sun.opacity).toBe(1);
    expect(STILL.gate.sun.opacity).toBe(0);
  });
});

describe("lapisan yang tertutup penuh tidak digambar", () => {
  const lit = (h: string) => ({ sky: "day" as const, clock: at(h), light: LIGHT });
  const covered = (keys: readonly SkyKey[]) => [...skyCovered(keys)].sort();

  it("saat diam: semua yang berada di bawah lapisan penuh teratas", () => {
    expect(covered([[0, STILL.gate]])).toEqual(["dawn", "day", "dusk", "night", "sun"]);
    expect(covered([[0, STILL.night]])).toEqual([]);
    expect(covered([[0, STILL.day]])).toEqual(["dawn", "night"]);
    expect(covered([[0, skyAt(at("07:00"), LIGHT)]])).toEqual(["night"]); // subuh penuh, siang baru sebagian
    expect(covered([[0, skyAt(at("12:00"), LIGHT)]])).toEqual(["dawn", "night"]);
    expect(covered([[0, skyAt(at("15:30"), LIGHT)]])).toEqual(["dawn", "night"]); // senja sebagian di atas siang penuh
  });

  it("selama transisi: hanya yang tertutup di sepanjang lintasan", () => {
    expect(covered(skyPath(lit("10:30"), lit("12:45")))).toEqual(["dawn", "night"]);
    // 07:00 → 08:30: subuh penuh lalu siang penuh bergantian menutup malam; subuh sendiri masih terlihat di awal
    expect(covered(skyPath(lit("07:00"), lit("08:30")))).toEqual(["night"]);
    // sesudah itu siang sudah penuh: cukup satu lapisan langit yang digambar
    expect(covered(skyPath(lit("08:30"), lit("10:30")))).toEqual(["dawn", "night"]);
    // senja → malam: malam tersingkap
    expect(covered(skyPath(lit("17:00"), lit("19:00")))).toEqual([]);
    // gerbang → gerbang: hanya gerbang yang digambar; gerbang → siang: gerbang memudar, yang di bawahnya harus ada
    expect(covered(skyPath({ sky: "gate" }, { sky: "gate" }))).toContain("sun");
    expect(covered(skyPath({ sky: "gate" }, lit("12:00")))).toEqual(["dawn", "night"]);
  });

  it("yang dinyatakan tertutup memang tak terlihat di titik mana pun pada lintasan", () => {
    const day = ["07:00", "08:30", "10:30", "11:30", "12:45", "15:30", "17:00", "19:00", "20:00"];
    for (let i = 1; i < day.length; i++) {
      const keys = skyPath(lit(day[i - 1]!), lit(day[i]!));
      const off = skyCovered(keys);
      for (let k = 0; k <= 200; k++) {
        const seen = visible(sample(keys, k / 200));
        for (const name of off) if (name !== "sun") expect(seen[name], `${day[i - 1]}→${day[i]} ${name} @${k}`).toBeLessThan(1e-9);
      }
    }
  });
});

describe("konten Solo: tiap panel membawa jamnya", () => {
  const solo = Trip.parse(soloInput);
  const film = buildFilm({ role: "guest", trip: solo as unknown as TripView["trip"] });
  const panelsOf = (chapter: string) => film.slides.filter((s): s is PanelSlide => s.kind === "panel" && s.chapter === chapter);

  it("jam panel = jam mulai stop; intro hari memakai jam panel pertama", () => {
    for (const chapter of ["day-1", "day-2", "day-3"]) {
      const panels = panelsOf(chapter);
      for (const p of panels) expect(p.clock, p.id).toBe(minutesOf(p.stop.start));
      const intro = film.slides.find((s) => s.id === `${chapter}/intro`)!;
      expect(intro.clock).toBe(panels[0]!.clock);
      expect(skyPath(intro, panels[0]!)).toHaveLength(1);
    }
  });

  it("di tiap hari matahari tak tampak sampai sarapan, lalu tampak di jadwal berikutnya dan seterusnya sampai sore", () => {
    for (const chapter of ["day-1", "day-2", "day-3"]) {
      const panels = panelsOf(chapter);
      const breakfast = panels.findIndex((p) => p.stop.kind === "food");
      const sunset = panels[0]!.light!.sunset;
      panels.forEach((p, i) => {
        const sun = skyState(p).sun;
        if (i <= breakfast) expect(sun.opacity, p.id).toBe(0);
        else if (p.clock! <= sunset - 30) expect(sun.opacity, p.id).toBe(1);
        else if (p.clock! > sunset + 30) expect(sun.opacity, p.id).toBe(0);
      });
      expect(skyState(panels[breakfast + 1]!).sun.opacity).toBe(1);
    }
  });

  it("slide tanpa jam tetap memakai langit fasenya", () => {
    expect(film.slides.find((s) => s.id === "hero")?.clock).toBeUndefined();
    expect(film.slides.find((s) => s.kind === "gong")?.clock).toBeUndefined();
    expect(film.slides.find((s) => s.kind === "daycard")?.clock).toBeUndefined();
  });
});
