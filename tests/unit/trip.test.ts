import { describe, expect, it } from "vitest";
import { clearTripCache, guestShortName, loadTrip, type TripView } from "@/lib/trip";

const ok = (body: unknown) => {
  let calls = 0;
  const f = (async () => {
    calls++;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls: () => calls };
};
const view = (role: "guest" | "team", short?: string) => ({ role, trip: { title: { en: "T", id: "T" }, days: [] }, private: { party: { short } } }) as TripView;

describe("trip-data dibagi gerbang & Today", () => {
  it("satu unduhan per token, unduh ulang bila diminta atau token berganti", async () => {
    clearTripCache();
    const a = ok(view("guest", "Mira"));
    await loadTrip("tok-1", false, a.f);
    await loadTrip("tok-1", false, a.f);
    expect(a.calls()).toBe(1);
    await loadTrip("tok-1", true, a.f);
    expect(a.calls()).toBe(2);
    await loadTrip("tok-2", false, a.f);
    expect(a.calls()).toBe(3);
  });

  it("gagal tidak di-cache", async () => {
    clearTripCache();
    let calls = 0;
    const flaky = (async () => {
      calls++;
      if (calls === 1) throw new TypeError("offline");
      return new Response(JSON.stringify(view("guest")), { status: 200 });
    }) as unknown as typeof fetch;
    expect((await loadTrip("tok", false, flaky)).kind).toBe("offline");
    await Promise.resolve();
    expect((await loadTrip("tok", false, flaky)).kind).toBe("ok");
  });

  it("nama sapaan hanya untuk peran tamu", () => {
    expect(guestShortName(view("guest", " Mira "))).toBe("Mira");
    expect(guestShortName(view("team", "Mira"))).toBeNull();
    expect(guestShortName(view("guest"))).toBeNull();
  });
});

describe("hitung mundur ke Solo (kalender WIB)", () => {
  it("menghitung hari menurut tanggal di Solo, bukan zona perangkat", async () => {
    const { daysUntil, todayWib } = await import("@/lib/trip");
    // 9 Nov 2026 20:00 UTC = 10 Nov 03:00 WIB
    const t = new Date(Date.UTC(2026, 10, 9, 20, 0));
    expect(todayWib(t)).toBe("2026-11-10");
    expect(daysUntil("2027-04-07", t)).toBe(148);
    expect(daysUntil("2026-11-11", t)).toBe(1);
    expect(daysUntil("2026-11-10", t)).toBe(0);
    expect(daysUntil("2026-11-09", t)).toBe(-1);
  });
});
