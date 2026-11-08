import { PhotoManifest, Trip, type PhotoEntry } from "./schema";

export type Issue = { level: "error" | "warning"; where: string; message: string };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Validasi konten di luar bentuk schema: urutan & tumpang tindih jam, urutan tanggal,
 * id unik, foto ada di manifest, panjang teks panel, dan daftar fakta [V] yang belum dicek.
 */
export function validateTrip(rawTrip: unknown, rawManifest: unknown): { issues: Issue[]; trip?: Trip; manifest?: PhotoEntry[] } {
  const issues: Issue[] = [];
  const t = Trip.safeParse(rawTrip);
  const m = PhotoManifest.safeParse(rawManifest);
  if (!t.success) for (const e of t.error.issues) issues.push({ level: "error", where: `trip.${e.path.join(".")}`, message: e.message });
  if (!m.success) for (const e of m.error.issues) issues.push({ level: "error", where: `manifest.${e.path.join(".")}`, message: e.message });
  if (!t.success || !m.success) return { issues };

  const trip = t.data;
  const manifest = m.data;
  const photoIds = new Set(manifest.map((p) => p.id));
  const seen = new Set<string>();

  trip.days.forEach((day, di) => {
    if (day.n !== di) issues.push({ level: "error", where: `day ${day.n}`, message: `urutan hari harus ${di}` });
    if (di > 0) {
      const prev = trip.days[di - 1];
      if (prev && day.date !== addDays(prev.date, 1)) issues.push({ level: "error", where: `day ${day.n}`, message: `tanggal ${day.date} tidak berurutan setelah ${prev.date}` });
    }
    day.stops.forEach((s, si) => {
      const where = `day ${day.n} › ${s.id}`;
      if (seen.has(s.id)) issues.push({ level: "error", where, message: "id stop dipakai lebih dari sekali" });
      seen.add(s.id);
      if (s.end && toMin(s.end) <= toMin(s.start)) issues.push({ level: "error", where, message: `jam selesai ${s.end} harus setelah jam mulai ${s.start}` });
      const next = day.stops[si + 1];
      if (next && toMin(next.start) < toMin(s.start)) issues.push({ level: "error", where, message: `stop berikutnya (${next.id}) mulai lebih awal` });
      if (next && s.end && toMin(s.end) > toMin(next.start)) issues.push({ level: "error", where, message: `bertabrakan dengan ${next.id} (${s.end} > ${next.start})` });
      if (s.photo && !photoIds.has(s.photo)) issues.push({ level: "error", where, message: `foto "${s.photo}" tidak ada di manifest` });
      if (s.panel === "photo" && !s.photo) issues.push({ level: "warning", where, message: "panel foto belum punya foto (sourcing Tugas 6)" });
      for (const lang of ["en", "id"] as const) if (s.why[lang].length > 160) issues.push({ level: "error", where, message: `why.${lang} lebih dari 160 karakter` });
      if (s.kind === "food" && !s.food) issues.push({ level: "error", where, message: "stop makanan wajib punya penanda food (halal, manis, pisang)" });
      if (s.verify.length && !s.verifiedAt) issues.push({ level: "warning", where, message: `${s.verify.length} fakta [V] belum diverifikasi` });
    });
  });
  for (const p of manifest) if (p.license.startsWith("CC-BY-NC")) issues.push({ level: "warning", where: `manifest › ${p.id}`, message: "lisensi NC: boleh (non-komersial), tetap catat" });
  return { issues, trip, manifest };
}
