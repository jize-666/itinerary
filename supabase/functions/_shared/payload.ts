import type { Role } from "./token.ts";

/**
 * Menyusun respons trip-data per peran (FR-04).
 * Prinsip whitelist: tamu hanya menerima `trip_content` + kolom `trip_private.guest`.
 * Kolom `trip_private.team` (teamNote, estCost, catatan medis, kontak tamu) hanya dibaca kalau role = team.
 */
type Json = Record<string, unknown>;
type StopLike = Json & { id: string };
type DayLike = Json & { stops: StopLike[] };
export type ContentRow = { trip_id: string; content: Json & { days: DayLike[] }; manifest: unknown[]; checksum: string; published_at: string };
export type PrivateRow = { guest: Json; team: Json; updated_at: string } | null;

export type TeamStop = { teamNote?: string; estCost?: number };
const TEAM_ONLY_KEYS = ["teamNote", "estCost"] as const;

const asRecord = (v: unknown): Record<string, Json> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, Json>) : {});

export function buildTripPayload(row: ContentRow, priv: PrivateRow, role: Role) {
  const guest = asRecord(priv?.guest);
  const guestStops = asRecord(guest.stops);
  const team = role === "team" ? asRecord(priv?.team) : {};
  const teamStops = asRecord(team.stops);

  const days = row.content.days.map((d) => ({
    ...d,
    stops: d.stops.map((s) => {
      const out: Json = { ...s };
      for (const k of TEAM_ONLY_KEYS) delete out[k];
      const g = guestStops[s.id];
      if (g) out.private = g;
      if (role === "team") {
        const t = teamStops[s.id] as TeamStop | undefined;
        if (t?.teamNote !== undefined) out.teamNote = t.teamNote;
        if (t?.estCost !== undefined) out.estCost = t.estCost;
      }
      return out;
    }),
  }));

  const { stops: _gs, ...guestInfo } = guest;
  const body: Json = { role, trip: { ...row.content, days }, manifest: row.manifest, private: guestInfo, publishedAt: row.published_at };
  if (role === "team") {
    const { stops: _ts, ...teamInfo } = team;
    body.team = teamInfo;
  }
  return body;
}

/** ETag beda per peran & per versi data, supaya cache Today ikut berganti saat H-5 revisi. */
export const etagFor = (row: ContentRow, priv: PrivateRow, role: Role) => `"${row.checksum.slice(0, 16)}-${(priv?.updated_at ?? "0").replace(/\D/g, "").slice(0, 14)}-${role}"`;
