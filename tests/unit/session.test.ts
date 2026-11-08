import { describe, expect, it } from "vitest";
import { CODE_GROUPS, CODE_LENGTH, normalizeCode } from "@/lib/code";
import { clearSession, fetchTrip, parseSession, readSession, SESSION_KEY, verifyAccess, writeSession } from "@/lib/session";
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
    clearSession(s);
    expect(readSession(s, 1_000)).toBeNull();
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
