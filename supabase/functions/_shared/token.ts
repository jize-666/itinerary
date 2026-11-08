import { fromB64url, hmac, timingSafeEqual, toB64url, utf8 } from "./b64.ts";

/**
 * Token sesi: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Disimpan di perangkat tamu (FR-03). Berlaku sampai akhir trip + 30 hari.
 * Mengganti TOKEN_SECRET = mencabut semua token.
 */
export type Role = "guest" | "team";
export type TokenPayload = { v: 1; role: Role; trip: string; iat: number; exp: number };

export const GRACE_DAYS = 30;

/** Akhir trip (23:59:59 WIB pada `endsOn`) + 30 hari, dalam detik Unix. */
export function expiryFor(endsOn: string): number {
  const end = Date.parse(`${endsOn}T23:59:59+07:00`);
  if (Number.isNaN(end)) throw new Error(`ends_on tidak valid: ${endsOn}`);
  return Math.floor(end / 1000) + GRACE_DAYS * 86_400;
}

export async function signToken(p: Omit<TokenPayload, "v">, secret: string): Promise<string> {
  const body = toB64url(utf8(JSON.stringify({ v: 1, ...p })));
  return `${body}.${toB64url(await hmac(secret, body))}`;
}

export type VerifyResult = { ok: true; payload: TokenPayload } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyToken(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2 || token.length > 1024) return { ok: false, reason: "malformed" };
  const [body, sig] = parts as [string, string];
  const given = fromB64url(sig);
  if (!given) return { ok: false, reason: "malformed" };
  if (!timingSafeEqual(await hmac(secret, body), given)) return { ok: false, reason: "bad_signature" };
  let p: unknown;
  try {
    p = JSON.parse(new TextDecoder().decode(fromB64url(body) ?? new Uint8Array()));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const t = p as Partial<TokenPayload>;
  if (t.v !== 1 || (t.role !== "guest" && t.role !== "team") || typeof t.trip !== "string" || typeof t.exp !== "number" || typeof t.iat !== "number") return { ok: false, reason: "malformed" };
  if (t.exp <= nowSec) return { ok: false, reason: "expired" };
  return { ok: true, payload: t as TokenPayload };
}
