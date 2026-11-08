import { fromB64url, timingSafeEqual, toB64url, utf8 } from "./b64.ts";

/**
 * Kode akses (kode booking) → hash PBKDF2-SHA256 yang disimpan sebagai secret Edge Function
 * (ACCESS_GUEST_HASH / ACCESS_TEAM_HASH). Kode asli tidak pernah ada di repo maupun di bundle klien.
 * Format: pbkdf2-sha256$<iterasi>$<salt b64url>$<hash b64url>
 */
export const PBKDF2_ITERATIONS = 210_000;
const PREFIX = "pbkdf2-sha256";

/** Pemaaf untuk tamu: huruf besar/kecil, spasi, tanda hubung, dan karakter lebar penuh dianggap sama. */
export function normalizeCode(raw: string): string {
  return raw.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Kode yang wajar: 6–32 karakter alfanumerik setelah dinormalisasi. */
export const isPlausibleCode = (normalized: string) => normalized.length >= 6 && normalized.length <= 32;

async function derive(normalized: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", utf8(normalized), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashCode(raw: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(normalizeCode(raw), salt, iterations);
  return `${PREFIX}$${iterations}$${toB64url(salt)}$${toB64url(hash)}`;
}

/** true kalau kode cocok dengan hash tersimpan. Hash rusak/kosong → false (bukan error). */
export async function verifyCode(raw: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored) return false;
  const [prefix, iterStr, saltStr, hashStr] = stored.trim().split("$");
  const iterations = Number(iterStr);
  const salt = fromB64url(saltStr ?? "");
  const expected = fromB64url(hashStr ?? "");
  if (prefix !== PREFIX || !Number.isInteger(iterations) || iterations < 10_000 || iterations > 2_000_000 || !salt || !expected || expected.length !== 32) return false;
  const actual = await derive(normalizeCode(raw), salt, iterations);
  return timingSafeEqual(actual, expected);
}
