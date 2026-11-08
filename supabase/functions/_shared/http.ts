/**
 * CORS + respons JSON. Origin bukan rahasia, jadi daftarnya ditulis di kode.
 * Tambahkan domain produksi di sini saat Tugas 13 (atau set secret ALLOWED_ORIGINS, dipisah koma).
 */
export const DEFAULT_ORIGINS = ["http://localhost:3000", "http://localhost:4173"];

export function allowedOrigins(env: string | undefined): string[] {
  const extra = (env ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, content-type, if-none-match";
    h["Access-Control-Expose-Headers"] = "etag, retry-after";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

export function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

/** IP klien dari header gateway Supabase. Hanya dipakai untuk di-HMAC, tidak pernah disimpan mentah. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
