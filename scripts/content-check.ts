/**
 * `pnpm content:check`: validasi data trip + manifest foto.
 * Error menghentikan CI (exit 1). Warning dicetak, tidak menghentikan (fakta [V] & foto masih disusun).
 * Flag `--strict` menjadikan warning sebagai error: dipakai saat konten dikunci (H-4).
 */
import { trip } from "../content/trips/solo/trip";
import manifest from "../content/trips/solo/photos/manifest.json";
import { validateTrip } from "../content/validate";

const strict = process.argv.includes("--strict");
const { issues, trip: parsed } = validateTrip(trip, manifest);
const errors = issues.filter((i) => i.level === "error" || strict);
const warnings = issues.filter((i) => i.level === "warning" && !strict);

for (const i of errors) console.error(`✖ ${i.where}: ${i.message}`);
if (warnings.length) {
  const byMsg = new Map<string, number>();
  for (const w of warnings) byMsg.set(w.message.replace(/^\d+ /, "N "), (byMsg.get(w.message.replace(/^\d+ /, "N ")) ?? 0) + 1);
  console.warn(`⚠ ${warnings.length} warning:`);
  for (const [msg, n] of byMsg) console.warn(`  · ${n}× ${msg}`);
}

if (parsed) {
  const stops = parsed.days.reduce((a, d) => a + d.stops.length, 0);
  const vCount = parsed.days.flatMap((d) => d.stops).reduce((a, s) => a + s.verify.length, 0);
  console.log(`trip ${parsed.id}: ${parsed.days.length} hari, ${stops} stop, ${vCount} fakta [V], ${manifest.length} foto di manifest`);
}

if (errors.length) {
  console.error(`\n${errors.length} error. Konten belum valid.`);
  process.exit(1);
}
console.log("OK");
