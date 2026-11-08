/**
 * GET (Authorization: Bearer <token>) → data trip yang difilter per peran (PRD FR-01, FR-04).
 * Token tamu: kolom trip_private.team bahkan tidak di-SELECT. Token tim: lengkap dengan teamNote & estCost.
 * ETag + If-None-Match → 304, supaya Today hemat kuota saat online dan tetap jalan dari cache saat offline.
 */
import { rest } from "../_shared/db.ts";
import { allowedOrigins, corsHeaders, json } from "../_shared/http.ts";
import { buildTripPayload, type ContentRow, etagFor, type PrivateRow } from "../_shared/payload.ts";
import { verifyToken } from "../_shared/token.ts";

const ORIGINS = allowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), ORIGINS);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405, { ...cors, Allow: "GET, OPTIONS" });

  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret || secret.length < 32) return json({ error: "not_configured" }, 503, cors);

  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m?.[1]) return json({ error: "no_token" }, 401, cors);
  const v = await verifyToken(m[1], secret);
  if (!v.ok) return json({ error: v.reason === "expired" ? "expired" : "bad_token" }, 401, cors);
  const { role, trip } = v.payload;

  try {
    const id = encodeURIComponent(trip);
    const privCols = role === "team" ? "guest,team,updated_at" : "guest,updated_at";
    const [rows, privs] = await Promise.all([
      rest<ContentRow[]>(`trip_content?select=trip_id,content,manifest,checksum,published_at&trip_id=eq.${id}`),
      rest<Array<{ guest: Record<string, unknown>; team?: Record<string, unknown>; updated_at: string }>>(`trip_private?select=${privCols}&trip_id=eq.${id}`),
    ]);
    const row = rows[0];
    if (!row) return json({ error: "not_published" }, 404, cors);
    const p = privs[0];
    const priv: PrivateRow = p ? { guest: p.guest, team: role === "team" ? (p.team ?? {}) : {}, updated_at: p.updated_at } : null;

    const etag = etagFor(row, priv, role);
    const cache = { ...cors, ETag: etag, "Cache-Control": "private, no-cache" };
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: cache });
    return json(buildTripPayload(row, priv, role), 200, cache);
  } catch (e) {
    console.error("trip-data", e);
    return json({ error: "server_error" }, 500, cors);
  }
});
