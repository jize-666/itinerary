import { z } from "zod";

/**
 * Schema konten trip (PRD §13.4). Sumber kebenaran tipe untuk data, validator, Edge Function, dan UI.
 * Data privat (nama tamu, nomor WhatsApp, alamat jemput spesifik, catatan tim, estimasi biaya, catatan medis)
 * TIDAK ada di sini: itu disimpan di tabel Supabase `trip_private`.
 */

/** Teks dua bahasa. EN untuk tamu, ID untuk tim lokal. Keduanya wajib. */
export const L = z.object({ en: z.string().trim().min(1), id: z.string().trim().min(1) });
export type L = z.infer<typeof L>;

/** Jam lokal WIB (Asia/Jakarta), format 24 jam HH:MM. */
export const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "format jam harus HH:MM (WIB)");

export const Phase = z.enum(["dawn", "day", "dusk", "night"]);
export const StopKind = z.enum(["sight", "food", "market", "ride", "show", "rest", "transfer", "nature", "workshop", "prayer"]);

export const Food = z.object({
  halal: z.literal(true),
  alcohol: z.literal(false),
  sweet: z.enum(["low", "mid", "high"]),
  banana: z.literal(false),
  note: L.optional(),
});

export const Stop = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id hanya huruf kecil, angka, dan tanda hubung"),
  start: HHMM,
  end: HHMM.optional(),
  phase: Phase,
  kind: StopKind,
  panel: z.enum(["photo", "type", "object"]),
  optional: z.boolean().default(false),
  title: L,
  /** Pengenalan: 1 fakta + 1 rasa. */
  story: L,
  /** Kenapa worth it. Pendek, tampil di panel gallery. */
  why: L,
  tips: L.optional(),
  dressCode: L.optional(),
  /** id foto di manifest. */
  photo: z.string().optional(),
  maps: z.object({ query: z.string().min(3), url: z.url() }).optional(),
  food: Food.optional(),
  planB: L.optional(),
  /** Fakta lapangan bertanda [V] yang wajib diverifikasi sebelum konten dikunci. */
  verify: z.array(z.string().min(3)).default([]),
  verifiedAt: z.iso.date().optional(),
});
export type Stop = z.infer<typeof Stop>;

export const Day = z.object({
  n: z.number().int().min(0).max(9),
  date: z.iso.date(),
  kind: z.enum(["arrival", "chapter", "departure"]),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  theme: z.enum(["travel", "royal", "lawu", "batik"]),
  title: L,
  subtitle: L,
  dressCode: L.optional(),
  sunrise: HHMM.optional(),
  sunset: HHMM.optional(),
  stops: z.array(Stop).min(1),
});
export type Day = z.infer<typeof Day>;

export const Fact = z.object({ id: z.string(), title: L, body: L, verify: z.array(z.string()).default([]) });
export const Phrase = z.object({ jv: z.string().min(1), en: z.string().min(1), id: z.string().min(1), verify: z.boolean().default(true) });
export const InfoCard = z.object({ id: z.string(), title: L, body: L });
export const Emergency = z.object({ label: L, number: z.string().regex(/^[0-9+ ]{3,}$/), verify: z.boolean().default(true) });

export const Trip = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: L,
  city: z.string(),
  timezone: z.literal("Asia/Jakarta"),
  route: z.object({ label: L, legs: z.array(z.string().regex(/^[A-Z]{3}$/)).min(2) }),
  prologue: z.object({ kicker: L, headline: L, intro: L, facts: z.array(Fact).min(1), phrases: z.array(Phrase) }),
  beforeYouGo: z.array(InfoCard).min(1),
  emergency: z.array(Emergency).min(1),
  epilogue: z.object({ title: L, body: L }),
  days: z.array(Day).min(1),
});
export type Trip = z.infer<typeof Trip>;
/** Bentuk yang ditulis di file data (field ber-default boleh dihilangkan). */
export type TripInput = z.input<typeof Trip>;

/** Lisensi foto yang diizinkan (PRD §12.6). Varian ND dilarang karena semua foto di-crop & di-grading. */
export const ALLOWED_LICENSES = ["CC0-1.0", "Unsplash", "Pexels", "Pixabay", "CC-BY-2.0", "CC-BY-3.0", "CC-BY-4.0", "CC-BY-SA-2.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "CC-BY-NC-2.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0", "Permission"] as const;

export const PhotoEntry = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  file: z.string().min(1),
  sourceUrl: z.url(),
  author: z.string().min(1),
  license: z.enum(ALLOWED_LICENSES),
  licenseUrl: z.url().optional(),
  retrievedAt: z.iso.date(),
  edits: z.string().default("crop, color grade"),
  focalPoint: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).default([0.5, 0.5]),
  alt: L,
  /** Bukti izin tertulis disimpan di luar repo; isi catatan singkat di sini. */
  permissionNote: z.string().optional(),
});
export const PhotoManifest = z.array(PhotoEntry);
export type PhotoEntry = z.infer<typeof PhotoEntry>;
