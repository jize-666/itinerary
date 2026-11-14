/**
 * Data pratinjau dari trip klien yang sebenarnya (Solo, 7–11 April 2027), bukan data tiruan e2e. Aturan host 14 Nov:
 * "kalo record preview pake akun client aja yang april".
 *
 * Pemakaian: `pnpm -s exec tsx scripts/preview/client-data.ts <keluaran.json> [guest|team]`, lalu berikan berkasnya ke
 * perekam (`record-film.cjs`, `record-today.cjs`, `record-flow.cjs`, `record-home.cjs`). Simpan keluarannya di luar
 * repo (scratchpad).
 *
 * Isinya disusun persis seperti respons Edge Function `trip-data`: konten yang diterbitkan (`content/trips/solo`,
 * divalidasi seperti `content:check`) lewat `buildTripPayload` yang sama. Data privat (nama asli, WhatsApp, alamat,
 * jam jemput) hanya ada di Supabase `trip_private` dan tidak bisa dibaca dari sini tanpa kode booking klien; yang
 * diisi di sini pengganti netral ("Your Name", nomor contoh), sesuai aturan privasi di `docs/handoff/FABLE-5.2.md`.
 */
import { writeFileSync } from "node:fs";
import manifest from "../../content/trips/solo/photos/manifest.json";
import { trip } from "../../content/trips/solo/trip";
import { validateTrip } from "../../content/validate";
import { buildTripPayload, type ContentRow } from "../../supabase/functions/_shared/payload";

const [out, role = "guest"] = process.argv.slice(2);
if (!out || (role !== "guest" && role !== "team")) {
  console.error("Pemakaian: tsx scripts/preview/client-data.ts <keluaran.json> [guest|team]");
  process.exit(1);
}

const { trip: content, manifest: photos, issues } = validateTrip(trip, manifest);
if (!content || !photos) {
  for (const i of issues) console.error(`✖ ${i.where}: ${i.message}`);
  process.exit(1);
}

const L = (en: string, id: string) => ({ en, id });
/** Pengganti data privat: bukan data asli tamu. */
const guest = {
  party: { name: "Your Name", short: "Your Name", size: 1, greeting: L("Welcome. This lakon was written for you.", "Selamat datang. Lakon ini ditulis untuk Anda.") },
  lodging: { name: "Your stay", address: "Jl. Contoh No. 1, Surakarta", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Surakarta" },
  contacts: [
    { label: L("Host", "Host"), whatsapp: "0800 0000 0001" },
    { label: L("Guide", "Pemandu"), phone: "0800 0000 0002" },
  ],
};

const row: ContentRow = { trip_id: content.id, content: content as unknown as ContentRow["content"], manifest: photos, checksum: "preview", published_at: new Date().toISOString() };
const payload = buildTripPayload(row, { guest, team: {}, updated_at: row.published_at }, role);
writeFileSync(out, JSON.stringify(payload));
console.log(`${out}: trip ${content.id}, ${content.days.length} hari, ${content.days.reduce((a, d) => a + d.stops.length, 0)} stop (data privat diganti pengganti netral)`);
