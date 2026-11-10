import { describe, expect, it } from "vitest";
import { TRIP_KEY } from "@/lib/session";
import { clearTripCache, guestShortName, loadTrip, peekTrip, readSnapshot, type TripView } from "@/lib/trip";

const ok = (body: unknown) => {
  let calls = 0;
  const f = (async () => {
    calls++;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls: () => calls };
};
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const view = (role: "guest" | "team", short?: string) => ({ role, trip: { title: { en: "T", id: "T" }, days: [] }, private: { party: { short } } }) as TripView;

describe("trip-data dibagi gerbang & Today", () => {
  it("satu unduhan per token, unduh ulang bila diminta atau token berganti", async () => {
    clearTripCache();
    const a = ok(view("guest", "Mira"));
    await loadTrip("tok-1", { f: a.f, store: mem() });
    await loadTrip("tok-1", { f: a.f, store: mem() });
    expect(a.calls()).toBe(1);
    await loadTrip("tok-1", { fresh: true, f: a.f, store: mem() });
    expect(a.calls()).toBe(2);
    await loadTrip("tok-2", { f: a.f, store: mem() });
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
    expect((await loadTrip("tok", { f: flaky, store: mem() })).kind).toBe("offline");
    await Promise.resolve();
    expect((await loadTrip("tok", { f: flaky, store: mem() })).kind).toBe("ok");
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

describe("salinan di perangkat untuk Today offline", () => {
  const seq = (...steps: (number | "offline")[]) => {
    const seen: (string | null)[] = [];
    let i = 0;
    const f = (async (_url: string, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("if-none-match"));
      const step = steps[Math.min(i++, steps.length - 1)];
      if (step === "offline") throw new TypeError("Failed to fetch");
      if (step === 304) return new Response(null, { status: 304 });
      return new Response(JSON.stringify(view("guest", "Mira")), { status: step, headers: { etag: '"v1"' } });
    }) as unknown as typeof fetch;
    return { f, seen };
  };

  it("berhasil → disimpan; offline → salinan terakhir dengan waktu simpan", async () => {
    clearTripCache();
    const store = mem();
    const net = seq(200, "offline");
    const a = await loadTrip("tok", { f: net.f, store, now: () => 1_000 });
    expect(a).toMatchObject({ kind: "ok", stale: false, savedAt: 1_000 });
    const b = await loadTrip("tok", { fresh: true, f: net.f, store, now: () => 9_000 });
    expect(b).toMatchObject({ kind: "ok", stale: true, savedAt: 1_000 });
    expect(b.kind === "ok" && guestShortName(b.data)).toBe("Mira");
    expect(peekTrip("tok", store)).toMatchObject({ savedAt: 1_000, stale: true });
  });

  it("ETag dikirim ulang; 304 memakai salinan dan memperbarui waktunya", async () => {
    clearTripCache();
    const store = mem();
    const net = seq(200, 304);
    await loadTrip("tok", { f: net.f, store, now: () => 1_000 });
    const r = await loadTrip("tok", { fresh: true, f: net.f, store, now: () => 5_000 });
    expect(net.seen).toEqual([null, '"v1"']);
    expect(r).toMatchObject({ kind: "ok", stale: false, savedAt: 5_000 });
    expect(readSnapshot("tok", store)?.savedAt).toBe(5_000);
  });

  it("salinan milik token lain tidak pernah dipakai; token ditolak → salinan dihapus", async () => {
    clearTripCache();
    const store = mem();
    await loadTrip("team-token", { f: seq(200).f, store });
    expect(peekTrip("guest-token", store)).toBeNull();
    expect((await loadTrip("guest-token", { f: seq("offline").f, store })).kind).toBe("offline");
    await loadTrip("team-token", { fresh: true, f: seq(401).f, store });
    expect(store.m.has(TRIP_KEY)).toBe(false);
  });

  it("salinan basi tidak di-cache di memori: percobaan berikutnya ke jaringan lagi", async () => {
    clearTripCache();
    const store = mem();
    const net = seq(200, "offline", 200);
    await loadTrip("tok", { f: net.f, store });
    await loadTrip("tok", { fresh: true, f: net.f, store });
    await Promise.resolve();
    const r = await loadTrip("tok", { f: net.f, store });
    expect(net.seen).toHaveLength(3);
    expect(r).toMatchObject({ stale: false });
  });
});
