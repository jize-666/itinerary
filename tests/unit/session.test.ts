import { afterEach, describe, expect, it, vi } from "vitest";
import { CODE_GROUPS, CODE_LENGTH, normalizeCode } from "@/lib/code";
import { deviceStore, isStandalone } from "@/lib/device-store";
import { clearSession, fetchTrip, parseSession, readSession, SESSION_KEY, sweepLegacy, TRIP_KEY, verifyAccess, writeSession } from "@/lib/session";
import { normalizeCode as serverNormalize } from "../../supabase/functions/_shared/code.ts";

describe("kode di gerbang", () => {
  it("normalisasi klien sama persis dengan server", () => {
    for (const raw of ["dev-8ehpbz", " TIM 5ABC9X ", "ｄｅｖ－１２３", "a.b,c/d", "ŞOLO-7", ""]) expect(normalizeCode(raw)).toBe(serverNormalize(raw));
  });
  it("kelompok kotak menjumlah ke panjang kode", () => {
    expect(CODE_LENGTH).toBe(9);
    expect(CODE_GROUPS.reduce((a, b) => a + b, 0)).toBe(CODE_LENGTH);
  });
});

describe("sesi di perangkat (FR-03)", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };
  const good = { token: "abc.def-ghijk", role: "guest" as const, exp: 2_000 };

  it("simpan, baca, hapus", () => {
    const s = mem();
    writeSession(good, s);
    expect(readSession(s, 1_000)).toEqual(good);
    s.setItem(TRIP_KEY, "{}");
    clearSession(s);
    expect(readSession(s, 1_000)).toBeNull();
    expect(s.m.has(TRIP_KEY)).toBe(false); // salinan Today offline ikut hilang saat ganti kode
  });

  it("aplikasi Home Screen menandai sesinya; tab browser tidak", () => {
    const tab = mem();
    writeSession(good, tab, false);
    expect(JSON.parse(tab.m.get(SESSION_KEY)!)).toEqual(good);
    const app = mem();
    writeSession(good, app, true);
    expect(JSON.parse(app.m.get(SESSION_KEY)!)).toEqual({ ...good, app: 1 });
    expect(readSession(app, 1_000)).toEqual(good); // tanda itu tidak ikut ke sesi yang dibaca
  });

  describe("sesi permanen lama (sebelum 11 Nov 2026)", () => {
    it("tab browser: sesi lama dan salinan trip-nya dihapus", () => {
      const local = mem();
      local.setItem(SESSION_KEY, JSON.stringify(good));
      local.setItem(TRIP_KEY, "{}");
      sweepLegacy(local, false);
      expect([...local.m.keys()]).toEqual([]);
    });

    it("tab browser: salinan trip tanpa sesi juga dihapus; isi rusak dihapus", () => {
      const orphan = mem();
      orphan.setItem(TRIP_KEY, "{}");
      sweepLegacy(orphan, false);
      expect(orphan.m.size).toBe(0);
      const broken = mem();
      broken.setItem(SESSION_KEY, "{bukan json");
      sweepLegacy(broken, false);
      expect(broken.m.size).toBe(0);
    });

    it("tab browser: sesi milik aplikasi Home Screen dibiarkan (Android berbagi penyimpanan)", () => {
      const local = mem();
      writeSession(good, local, true);
      local.setItem(TRIP_KEY, "{}");
      sweepLegacy(local, false);
      expect(readSession(local, 1_000)).toEqual(good);
      expect(local.m.has(TRIP_KEY)).toBe(true);
    });

    it("aplikasi Home Screen: sesi lama tetap berlaku dan diberi tanda", () => {
      const local = mem();
      local.setItem(SESSION_KEY, JSON.stringify(good));
      local.setItem(TRIP_KEY, "{}");
      sweepLegacy(local, true);
      expect(JSON.parse(local.m.get(SESSION_KEY)!)).toEqual({ ...good, app: 1 });
      expect(local.m.has(TRIP_KEY)).toBe(true);
      sweepLegacy(local, false); // lalu dibuka di tab: tidak ikut terhapus
      expect(readSession(local, 1_000)).toEqual(good);
    });
  });

  describe("tempat penyimpanan menurut cara dibuka", () => {
    afterEach(() => vi.unstubAllGlobals());
    const fakeWindow = (standalone: boolean, ios = false) => {
      const session = mem();
      const local = mem();
      vi.stubGlobal("window", { matchMedia: (q: string) => ({ matches: standalone && !ios && q.includes("standalone") }), sessionStorage: session, localStorage: local });
      vi.stubGlobal("navigator", { standalone: standalone && ios });
      return { session, local };
    };

    it("tab browser → sessionStorage (tab baru meminta kode lagi)", () => {
      const w = fakeWindow(false);
      expect(isStandalone()).toBe(false);
      expect(deviceStore()).toBe(w.session);
    });

    it("dibuka dari Home Screen → localStorage (Android dan iOS)", () => {
      const android = fakeWindow(true);
      expect(isStandalone()).toBe(true);
      expect(deviceStore()).toBe(android.local);
      const ios = fakeWindow(true, true);
      expect(isStandalone()).toBe(true);
      expect(deviceStore()).toBe(ios.local);
    });

    it("tanpa window (render server) atau penyimpanan diblokir → tidak ada penyimpanan", () => {
      expect(deviceStore()).toBeUndefined();
      vi.stubGlobal("window", {
        matchMedia: () => ({ matches: false }),
        get sessionStorage(): Storage {
          throw new Error("diblokir");
        },
      });
      expect(deviceStore()).toBeUndefined();
    });
  });

  it("kedaluwarsa, rusak, atau peran asing → null", () => {
    const s = mem();
    writeSession(good, s);
    expect(readSession(s, 2_000)).toBeNull();
    s.m.set(SESSION_KEY, "{bukan json");
    expect(readSession(s, 1_000)).toBeNull();
    expect(parseSession({ ...good, role: "admin" }, 1_000)).toBeNull();
    expect(parseSession({ ...good, token: "x" }, 1_000)).toBeNull();
    expect(parseSession(null)).toBeNull();
  });
});

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const offline = (async () => {
  throw new TypeError("Failed to fetch");
}) as unknown as typeof fetch;

describe("verify-access dari klien", () => {
  it("memetakan setiap jawaban server", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(await verifyAccess("X", reply(200, { token: "tok.en-1234567", role: "team", exp }), "")).toEqual({ kind: "ok", session: { token: "tok.en-1234567", role: "team", exp } });
    expect(await verifyAccess("X", reply(401, { error: "wrong_code", remaining: 3 }), "")).toEqual({ kind: "wrong", remaining: 3 });
    expect(await verifyAccess("X", reply(429, { error: "locked", retryAfter: 22 }), "")).toEqual({ kind: "locked", retryAfter: 22 });
    expect(await verifyAccess("X", reply(410, { error: "trip_ended" }), "")).toEqual({ kind: "ended" });
    expect(await verifyAccess("X", reply(503, { error: "not_configured" }), "")).toEqual({ kind: "server" });
    expect(await verifyAccess("X", reply(200, { token: "x" }), "")).toEqual({ kind: "server" });
    expect(await verifyAccess("X", offline, "")).toEqual({ kind: "offline" });
  });
});

describe("trip-data dari klien", () => {
  it("memetakan 200 / 401 / galat / offline", async () => {
    expect(await fetchTrip("t", reply(200, { role: "guest" }), "")).toEqual({ kind: "ok", data: { role: "guest" } });
    expect(await fetchTrip("t", reply(401, { error: "expired" }), "")).toEqual({ kind: "unauthorized" });
    expect(await fetchTrip("t", reply(500, {}), "")).toEqual({ kind: "server" });
    expect(await fetchTrip("t", offline, "")).toEqual({ kind: "offline" });
  });
});
