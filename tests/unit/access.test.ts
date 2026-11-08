import { describe, expect, it } from "vitest";
import { hashCode, isPlausibleCode, normalizeCode, verifyCode } from "../../supabase/functions/_shared/code.ts";
import { expiryFor, signToken, verifyToken } from "../../supabase/functions/_shared/token.ts";
import { failDelayMs, LOCK_MS, rateState, WINDOW_MS } from "../../supabase/functions/_shared/rate.ts";
import { allowedOrigins, corsHeaders } from "../../supabase/functions/_shared/http.ts";
import { isComplete, resolveConfig } from "../../supabase/functions/_shared/config.ts";

const SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";
const FAST = 10_000; // iterasi kecil khusus tes; produksi 210k

describe("kode akses", () => {
  it("normalisasi pemaaf: huruf kecil, spasi, tanda hubung, lebar penuh", () => {
    expect(normalizeCode(" solo-7a 2k ")).toBe("SOLO7A2K");
    expect(normalizeCode("ＳＯＬＯ７Ａ２Ｋ")).toBe("SOLO7A2K");
    expect(isPlausibleCode("ABC")).toBe(false);
    expect(isPlausibleCode("SOLO7A2K")).toBe(true);
  });

  it("hash cocok untuk kode yang sama walau ditulis beda, salah untuk kode lain", async () => {
    const stored = await hashCode("SOLO-7A2K", FAST);
    expect(stored).toMatch(/^pbkdf2-sha256\$10000\$[\w-]{22}\$[\w-]{43}$/);
    expect(await verifyCode("solo 7a2k", stored)).toBe(true);
    expect(await verifyCode("SOLO7A2X", stored)).toBe(false);
  });

  it("salt acak: dua hash dari kode sama berbeda", async () => {
    expect(await hashCode("SOLO7A2K", FAST)).not.toBe(await hashCode("SOLO7A2K", FAST));
  });

  it("hash rusak atau kosong → false, tidak melempar error", async () => {
    for (const bad of [undefined, "", "sha256$abc", "pbkdf2-sha256$1$AAAA$BBBB", "pbkdf2-sha256$10000$!!$??"]) {
      expect(await verifyCode("SOLO7A2K", bad)).toBe(false);
    }
  });
});

describe("token sesi", () => {
  const now = 1_800_000_000;
  const base = { role: "guest" as const, trip: "solo-2027", iat: now };

  it("berlaku sampai akhir trip + 30 hari (WIB)", () => {
    expect(new Date(expiryFor("2027-04-11") * 1000).toISOString()).toBe("2027-05-11T16:59:59.000Z");
  });

  it("token valid terbaca dengan role yang benar", async () => {
    const t = await signToken({ ...base, role: "team", exp: now + 60 }, SECRET);
    const v = await verifyToken(t, SECRET, now);
    expect(v).toEqual({ ok: true, payload: { v: 1, role: "team", trip: "solo-2027", iat: now, exp: now + 60 } });
  });

  it("menolak token kedaluwarsa", async () => {
    const t = await signToken({ ...base, exp: now - 1 }, SECRET);
    expect(await verifyToken(t, SECRET, now)).toEqual({ ok: false, reason: "expired" });
  });

  it("menolak token yang diubah (guest → team) atau ditandatangani secret lain", async () => {
    const t = await signToken({ ...base, exp: now + 60 }, SECRET);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ v: 1, ...base, role: "team", exp: now + 60 })).toString("base64url");
    expect(await verifyToken(`${forged}.${sig}`, SECRET, now)).toEqual({ ok: false, reason: "bad_signature" });
    expect(await verifyToken(`${body}.${sig}`, "secret-lain-yang-juga-panjangnya-32-karakter", now)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("menolak token yang bentuknya rusak", async () => {
    for (const bad of ["", "abc", "a.b.c", "!!.??", "x".repeat(2000)]) {
      expect((await verifyToken(bad, SECRET, now)).ok).toBe(false);
    }
  });
});

describe("rate limit", () => {
  const now = Date.parse("2027-04-07T10:00:00Z");
  const ago = (ms: number, ok = false) => ({ at: new Date(now - ms).toISOString(), ok });

  it("belum terkunci setelah 4 kali salah", () => {
    const s = rateState([ago(1000), ago(2000), ago(3000), ago(4000)], now);
    expect(s).toMatchObject({ fails: 4, locked: false, remaining: 1 });
  });

  it("5 kali salah → terkunci 30 detik sejak salah terakhir", () => {
    const s = rateState([ago(1000), ago(2000), ago(3000), ago(4000), ago(5000)], now);
    expect(s).toMatchObject({ fails: 5, locked: true, retryAfterSec: 29 });
    expect(rateState([ago(LOCK_MS + 1), ago(LOCK_MS + 2), ago(LOCK_MS + 3), ago(LOCK_MS + 4), ago(LOCK_MS + 5)], now).locked).toBe(false);
  });

  it("kode benar mereset hitungan; salah di luar jendela 15 menit tidak dihitung", () => {
    expect(rateState([ago(1000), ago(2000, true), ago(3000), ago(4000), ago(5000), ago(6000)], now).fails).toBe(1);
    expect(rateState([ago(1000), ago(WINDOW_MS + 1), ago(WINDOW_MS + 2)], now).fails).toBe(1);
  });

  it("jeda bertingkat 250 ms → 2 dtk", () => {
    expect([1, 2, 3, 4, 5, 9].map(failDelayMs)).toEqual([250, 500, 1000, 2000, 2000, 2000]);
  });
});

describe("CORS", () => {
  it("hanya origin terdaftar yang diberi izin", () => {
    const allowed = allowedOrigins("https://lakon.example.com, ");
    expect(corsHeaders("https://lakon.example.com", allowed)["Access-Control-Allow-Origin"]).toBe("https://lakon.example.com");
    expect(corsHeaders("http://localhost:4173", allowed)["Access-Control-Allow-Origin"]).toBe("http://localhost:4173");
    expect(corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(corsHeaders(null, allowed)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});

describe("sumber secret akses (Vault / Secret dashboard)", () => {
  const vault = { guestHash: "pbkdf2-g", teamHash: "pbkdf2-t", tokenSecret: SECRET };

  it("Vault saja sudah cukup", () => {
    expect(resolveConfig({}, vault)).toEqual(vault);
  });

  it("Secret dashboard menang per kunci", () => {
    expect(resolveConfig({ guestHash: "pbkdf2-override" }, vault)).toEqual({ ...vault, guestHash: "pbkdf2-override" });
  });

  it("belum lengkap atau kunci token terlalu pendek → null", () => {
    expect(resolveConfig({}, { ...vault, teamHash: null })).toBeNull();
    expect(resolveConfig({}, { ...vault, tokenSecret: "pendek" })).toBeNull();
    expect(resolveConfig({ guestHash: "  " }, { teamHash: "x", tokenSecret: SECRET })).toBeNull();
  });

  it("isComplete hanya benar bila ketiganya terisi", () => {
    expect(isComplete(vault)).toBe(true);
    expect(isComplete({ guestHash: "a", teamHash: "b" })).toBe(false);
  });
});
