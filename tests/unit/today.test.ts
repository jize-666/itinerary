import { afterEach, describe, expect, it } from "vitest";
import { trip } from "../../content/trips/solo/trip";
import { calendarDiff, DEFAULT_STOP_MS, durationParts, msToNextMinute, timeline, todayState, wibClock, wibInstant } from "@/engine/today/schedule";

/** Instan dari jam dinding WIB, ditulis apa adanya supaya skenario mudah dibaca. */
const wib = (iso: string) => Date.parse(`${iso}+07:00`);
const MIN = 60_000;
const days = trip.days;
const ids = (s: ReturnType<typeof todayState>) => ({ now: (s.now?.stop as { id?: string } | undefined)?.id ?? null, next: (s.next?.stop as { id?: string } | undefined)?.id ?? null });

describe("jam dinding WIB", () => {
  it("pergantian hari tepat di 00.00 WIB (= 17.00 UTC)", () => {
    expect(wibClock(Date.parse("2027-04-07T16:59:59Z"))).toEqual({ date: "2027-04-07", minutes: 23 * 60 + 59 });
    expect(wibClock(Date.parse("2027-04-07T17:00:00Z"))).toEqual({ date: "2027-04-08", minutes: 0 });
    expect(wibInstant("2027-04-08", "00:00")).toBe(Date.parse("2027-04-07T17:00:00Z"));
  });

  it("selisih kalender", () => {
    expect(calendarDiff("2026-11-09", "2027-04-07")).toBe(149);
    expect(calendarDiff("2027-04-07", "2027-04-07")).toBe(0);
    expect(calendarDiff("2027-04-12", "2027-04-11")).toBe(-1);
  });
});

describe("todayState dengan data trip Solo", () => {
  it("1 · jauh sebelum trip: hitung mundur & stop pertama sebagai berikutnya", () => {
    const s = todayState(days, wib("2026-11-09T21:00:00"));
    expect(s.phase).toBe("before");
    expect(s.daysToStart).toBe(149);
    expect(s.day).toBeNull();
    expect(s.focus?.n).toBe(0);
    expect(ids(s)).toEqual({ now: null, next: "fly-tjq-cgk-soc" });
    expect(s.nextIsLater).toBe(true);
  });

  it("2 · malam sebelum berangkat 23.59 WIB masih 'before', 00.00 sudah 'during' Hari 0", () => {
    const eve = todayState(days, wib("2027-04-06T23:59:00"));
    expect(eve.phase).toBe("before");
    expect(eve.daysToStart).toBe(1);
    const midnight = todayState(days, wib("2027-04-07T00:00:00"));
    expect(midnight.phase).toBe("during");
    expect(midnight.day?.n).toBe(0);
    expect(midnight.daysToStart).toBe(0);
    expect(ids(midnight)).toEqual({ now: null, next: "fly-tjq-cgk-soc" });
    expect(midnight.nextIsLater).toBe(false);
  });

  it("3 · Hari 1 pukul 10.45: sekarang Pasar Klewer, berikutnya tengkleng 45 menit lagi", () => {
    const s = todayState(days, wib("2027-04-08T10:45:00"));
    expect(s.day?.n).toBe(1);
    expect(ids(s)).toEqual({ now: "pasar-klewer", next: "tengkleng" });
    expect(s.msToNext).toBe(45 * MIN);
    expect(s.msLeftNow).toBe(45 * MIN);
    expect(s.progress).toBeCloseTo(0.25);
  });

  it("4 · batas tepat: 11.30 sudah tengkleng (mulai inklusif, selesai eksklusif)", () => {
    expect(ids(todayState(days, wib("2027-04-08T11:29:59")))).toEqual({ now: "pasar-klewer", next: "tengkleng" });
    expect(ids(todayState(days, wib("2027-04-08T11:30:00")))).toEqual({ now: "tengkleng", next: "pasar-gede" });
  });

  it("5 · jeda di antara stop: tidak ada 'sekarang', berikutnya De Tjolomadoe", () => {
    const s = todayState(days, wib("2027-04-08T15:20:00"));
    expect(ids(s)).toEqual({ now: null, next: "de-tjolomadoe" });
    expect(s.msToNext).toBe(10 * MIN);
    expect(s.progress).toBeNull();
  });

  it("6 · malam Hari 1 pukul 23.00: berikutnya berangkat ke Lawu besok 04.00, jadwal besok yang disorot", () => {
    const s = todayState(days, wib("2027-04-08T23:00:00"));
    expect(s.day?.n).toBe(1);
    expect(s.focus?.n).toBe(2);
    expect(ids(s)).toEqual({ now: null, next: "depart-lawu" });
    expect(s.nextIsLater).toBe(true);
    expect(s.msToNext).toBe(5 * 60 * MIN);
  });

  it("7 · subuh Hari 2 pukul 00.30: hari sudah berganti ke Hari 2", () => {
    const s = todayState(days, wib("2027-04-09T00:30:00"));
    expect(s.day?.n).toBe(2);
    expect(s.nextIsLater).toBe(false);
    expect(ids(s).next).toBe("depart-lawu");
  });

  it("8 · stop opsional yang tumpang tindih: yang paling akhir dimulai menjadi 'sekarang'", () => {
    // Hari 3: makan malam 19.00–20.30, Ngarsopuro 20.30–22.00
    expect(ids(todayState(days, wib("2027-04-10T20:30:00")))).toEqual({ now: "ngarsopuro-night", next: "last-breakfast" });
  });

  it("9 · hari kepulangan setelah stop terakhir: masih 'during', tanpa sekarang/berikutnya", () => {
    const s = todayState(days, wib("2027-04-11T13:00:00"));
    expect(s.phase).toBe("during");
    expect(s.day?.n).toBe(4);
    expect(s.focus?.n).toBe(4);
    expect(ids(s)).toEqual({ now: null, next: null });
    expect(s.msToNext).toBeNull();
  });

  it("10 · sehari setelah trip: 'after'", () => {
    const s = todayState(days, wib("2027-04-12T00:00:00"));
    expect(s.phase).toBe("after");
    expect(s.focus).toBeNull();
    expect(s.daysToStart).toBe(-5);
  });
});

describe("tidak bergantung pada zona waktu perangkat", () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it("11 · hasil sama persis di HP ber-zona UTC+8, Eropa, Amerika, +14, dan −11", () => {
    const moments = ["2027-04-06T23:59:00", "2027-04-07T00:00:00", "2027-04-08T10:45:00", "2027-04-08T23:00:00", "2027-04-11T13:00:00", "2027-04-12T00:00:00"].map(wib);
    const summary = (at: number) => {
      const s = todayState(days, at);
      return { ...ids(s), phase: s.phase, date: s.date, day: s.day?.n, focus: s.focus?.n, msToNext: s.msToNext, daysToStart: s.daysToStart, nextIsLater: s.nextIsLater };
    };
    process.env.TZ = "Asia/Jakarta";
    const base = moments.map(summary);
    const localHours = new Set<number>();
    for (const tz of ["Asia/Makassar", "Europe/London", "America/Los_Angeles", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
      process.env.TZ = tz;
      localHours.add(new Date(moments[2]!).getHours()); // bukti zona "perangkat" memang berganti
      expect(moments.map(summary), tz).toEqual(base);
    }
    expect(localHours.size).toBeGreaterThan(3);
  });
});

describe("garis waktu", () => {
  const D = (date: string, stops: { start: string; end?: string; id: string }[], n = 1) => ({ n, date, stops });

  it("12 · stop lewat tengah malam tetap 'sekarang' setelah tanggal berganti", () => {
    const ds = [D("2027-01-01", [{ id: "late", start: "22:00", end: "01:00" }]), D("2027-01-02", [{ id: "brunch", start: "10:00" }], 2)];
    const s = todayState(ds, wib("2027-01-02T00:30:00"));
    expect(s.day?.n).toBe(2);
    expect(s.focus?.n).toBe(1); // stop yang masih berlangsung milik hari kemarin
    expect(ids(s)).toEqual({ now: "late", next: "brunch" });
    expect(s.msLeftNow).toBe(30 * MIN);
  });

  it("13 · tanpa jam selesai: sampai stop berikutnya, atau satu jam untuk stop terakhir", () => {
    const line = timeline([D("2027-01-01", [{ id: "b", start: "09:30" }, { id: "a", start: "08:00" }])]);
    expect(line.map((t) => t.stop.id)).toEqual(["a", "b"]);
    expect(line[0]!.endAt - line[0]!.startAt).toBe(90 * MIN);
    expect(line[1]!.endAt - line[1]!.startAt).toBe(DEFAULT_STOP_MS);
  });

  it("14 · hari tidak berurutan di data tetap diurutkan; tanggal kosong di tengah trip tetap 'during'", () => {
    const ds = [D("2027-01-03", [{ id: "c", start: "09:00" }], 3), D("2027-01-01", [{ id: "a", start: "09:00" }], 1)];
    const s = todayState(ds, wib("2027-01-02T12:00:00"));
    expect(s.phase).toBe("during");
    expect(s.day).toBeNull();
    expect(s.focus?.n).toBe(3);
    expect(ids(s)).toEqual({ now: null, next: "c" });
  });

  it("15 · trip kosong tidak melempar error", () => {
    const s = todayState([], wib("2027-01-01T00:00:00"));
    expect(s.phase).toBe("before");
    expect(s.now).toBeNull();
    expect(s.next).toBeNull();
  });
});

describe("hitung mundur", () => {
  it("dibulatkan ke atas ke menit", () => {
    expect(durationParts(59_000)).toEqual({ d: 0, h: 0, m: 1 });
    expect(durationParts(45 * MIN)).toEqual({ d: 0, h: 0, m: 45 });
    expect(durationParts(5 * 60 * MIN + 1)).toEqual({ d: 0, h: 5, m: 1 });
    expect(durationParts(26 * 60 * MIN)).toEqual({ d: 1, h: 2, m: 0 });
    expect(durationParts(-5)).toEqual({ d: 0, h: 0, m: 0 });
  });

  it("berdetak tepat di pergantian menit", () => {
    expect(msToNextMinute(Date.parse("2027-04-08T03:00:00Z"))).toBe(MIN);
    expect(msToNextMinute(Date.parse("2027-04-08T03:00:59.250Z"))).toBe(750);
  });
});
