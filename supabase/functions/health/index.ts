/**
 * Keep-alive (PRD §12.5): dipanggil GitHub Actions tiap 2–3 hari supaya project free tier tidak di-pause.
 * Menyentuh database dengan query paling ringan. Tidak mengembalikan data apa pun.
 */
import { rest } from "../_shared/db.ts";
import { json } from "../_shared/http.ts";

Deno.serve(async () => {
  const t0 = Date.now();
  try {
    await rest("trip_content?select=trip_id&limit=1");
    return json({ ok: true, ms: Date.now() - t0 }, 200);
  } catch (e) {
    console.error("health", e);
    return json({ ok: false }, 503);
  }
});
