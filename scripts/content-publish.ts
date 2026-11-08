/**
 * `pnpm content:publish`: validasi (sama seperti content:check), lalu unggah ke tabel `trip_content`.
 *
 * Dua mode:
 *  1. `.env.local` berisi SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → upsert langsung lewat REST.
 *  2. Tanpa env → menulis `.publish/trip_content.sql` (di-gitignore) untuk dijalankan di SQL editor Supabase
 *     atau lewat connector. Hanya data non-privat; trip_private tidak pernah disentuh skrip ini.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { trip } from "../content/trips/solo/trip";
import manifest from "../content/trips/solo/photos/manifest.json";
import { validateTrip } from "../content/validate";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* opsional */
}

const { issues, trip: parsed, manifest: parsedManifest } = validateTrip(trip, manifest);
const errors = issues.filter((i) => i.level === "error");
if (!parsed || !parsedManifest || errors.length) {
  for (const e of errors) console.error(`✖ ${e.where}: ${e.message}`);
  console.error("Konten belum valid. Jalankan `pnpm content:check`.");
  process.exit(1);
}

const lastDay = parsed.days.at(-1);
if (!lastDay) throw new Error("trip tanpa hari");
const payload = JSON.stringify({ content: parsed, manifest: parsedManifest });
const row = {
  trip_id: parsed.id,
  content: parsed,
  manifest: parsedManifest,
  ends_on: lastDay.date,
  checksum: createHash("sha256").update(payload).digest("hex"),
  published_at: new Date().toISOString(),
};

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && key) {
  const res = await fetch(`${url}/rest/v1/trip_content?on_conflict=trip_id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error(`Gagal publish: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log(`Terbit: ${row.trip_id} · checksum ${row.checksum.slice(0, 12)} · berakhir ${row.ends_on}`);
} else {
  const tag = "$lakon$";
  const lit = (v: unknown) => {
    const s = JSON.stringify(v);
    if (s.includes(tag)) throw new Error("konten memuat penanda dollar-quote");
    return `${tag}${s}${tag}::jsonb`;
  };
  const sql = `insert into public.trip_content (trip_id, content, manifest, ends_on, checksum, published_at)
values ('${row.trip_id}', ${lit(row.content)}, ${lit(row.manifest)}, '${row.ends_on}', '${row.checksum}', now())
on conflict (trip_id) do update set content = excluded.content, manifest = excluded.manifest, ends_on = excluded.ends_on,
  checksum = excluded.checksum, published_at = excluded.published_at;
insert into public.trip_private (trip_id) values ('${row.trip_id}') on conflict (trip_id) do nothing;
`;
  mkdirSync(".publish", { recursive: true });
  writeFileSync(".publish/trip_content.sql", sql);
  console.log(`SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY tidak ada → SQL ditulis ke .publish/trip_content.sql (${(sql.length / 1024).toFixed(1)} KB, checksum ${row.checksum.slice(0, 12)})`);
}
