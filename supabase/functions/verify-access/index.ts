/**
 * POST { code } → { token, role, exp }   (PRD FR-02, FR-03, FR-05)
 * Kode dinormalisasi → PBKDF2 → dibandingkan waktu-konstan dengan ACCESS_GUEST_HASH dan ACCESS_TEAM_HASH.
 * Percobaan dicatat di access_attempts (IP di-HMAC), jeda bertingkat, 5 kali salah → terkunci 30 detik.
 */
import { hmac, toB64url } from "../_shared/b64.ts";
import { isPlausibleCode, normalizeCode, verifyCode } from "../_shared/code.ts";
import { rest } from "../_shared/db.ts";
import { allowedOrigins, clientIp, corsHeaders, json } from "../_shared/http.ts";
import { type Attempt, failDelayMs, LOCK_MS, MAX_FAILS, rateState, WINDOW_MS } from "../_shared/rate.ts";
import { expiryFor, type Role, signToken } from "../_shared/token.ts";

const TRIP_ID = Deno.env.get("TRIP_ID") ?? "solo-2027";
const ORIGINS = allowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), ORIGINS);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, { ...cors, Allow: "POST, OPTIONS" });

  const guestHash = Deno.env.get("ACCESS_GUEST_HASH");
  const teamHash = Deno.env.get("ACCESS_TEAM_HASH");
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!guestHash || !teamHash || !secret || secret.length < 32) {
    console.error("verify-access: secret ACCESS_GUEST_HASH / ACCESS_TEAM_HASH / TOKEN_SECRET belum lengkap");
    return json({ error: "not_configured" }, 503, cors);
  }

  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code : "";
  } catch {
    return json({ error: "bad_request" }, 400, cors);
  }
  if (code.length > 128) return json({ error: "bad_request" }, 400, cors);

  try {
    const ipHash = toB64url(await hmac(secret, `ip:${clientIp(req)}`)).slice(0, 22);
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const attempts = await rest<Attempt[]>(`access_attempts?select=at,ok&ip_hash=eq.${ipHash}&at=gte.${since}&order=at.desc&limit=20`);
    const state = rateState(attempts);
    if (state.locked) return json({ error: "locked", retryAfter: state.retryAfterSec }, 429, { ...cors, "Retry-After": String(state.retryAfterSec) });

    const normalized = normalizeCode(code);
    let role: Role | null = null;
    if (isPlausibleCode(normalized)) {
      // Kedua hash selalu dihitung, supaya lama respons tidak membedakan kode tamu dan kode tim.
      const [isGuest, isTeam] = await Promise.all([verifyCode(normalized, guestHash), verifyCode(normalized, teamHash)]);
      role = isTeam ? "team" : isGuest ? "guest" : null;
    }

    await rest("access_attempts", { method: "POST", body: JSON.stringify({ ip_hash: ipHash, ok: role !== null, role }), prefer: "return=minimal" });
    if (Math.random() < 0.05) {
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
      rest(`access_attempts?at=lt.${dayAgo}`, { method: "DELETE", prefer: "return=minimal" }).catch((e) => console.error("cleanup", e));
    }

    if (!role) {
      const fails = state.fails + 1;
      await sleep(failDelayMs(fails));
      const remaining = Math.max(0, MAX_FAILS - fails);
      if (remaining === 0) return json({ error: "locked", retryAfter: LOCK_MS / 1000 }, 429, { ...cors, "Retry-After": String(LOCK_MS / 1000) });
      return json({ error: "wrong_code", remaining }, 401, cors);
    }

    const rows = await rest<{ ends_on: string }[]>(`trip_content?select=ends_on&trip_id=eq.${encodeURIComponent(TRIP_ID)}`);
    const endsOn = rows[0]?.ends_on;
    if (!endsOn) return json({ error: "not_published" }, 503, cors);
    const now = Math.floor(Date.now() / 1000);
    const exp = expiryFor(endsOn);
    if (exp <= now) return json({ error: "trip_ended" }, 410, cors);
    const token = await signToken({ role, trip: TRIP_ID, iat: now, exp }, secret);
    return json({ token, role, exp }, 200, cors);
  } catch (e) {
    console.error("verify-access", e);
    return json({ error: "server_error" }, 500, cors);
  }
});
