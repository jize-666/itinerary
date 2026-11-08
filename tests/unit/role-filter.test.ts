import { describe, expect, it } from "vitest";
import { buildTripPayload, type ContentRow, etagFor, type PrivateRow } from "../../supabase/functions/_shared/payload.ts";
import { trip } from "@content/trips/solo/trip";
import { Trip } from "@content/schema";

const row: ContentRow = {
  trip_id: "solo-2027",
  content: Trip.parse(trip) as unknown as ContentRow["content"],
  manifest: [],
  checksum: "abcdef0123456789abcdef",
  published_at: "2026-11-08T00:00:00Z",
};
const firstStop = row.content.days[1]!.stops[0]!.id;

// Data dummy (bukan data asli): penanda unik supaya kebocoran mudah dicari di JSON.
const priv: PrivateRow = {
  guest: { party: { greeting: "DUMMY-GREETING" }, lodging: { name: "DUMMY-LODGING" }, stops: { [firstStop]: { pickup: "DUMMY-PICKUP" } } },
  team: { medical: "DUMMY-MEDICAL", guestContacts: ["DUMMY-PHONE"], stops: { [firstStop]: { teamNote: "DUMMY-TEAMNOTE", estCost: 123456 } } },
  updated_at: "2026-11-08T01:02:03.456Z",
};

describe("filter peran trip-data", () => {
  it("token tamu: tanpa teamNote, estCost, atau isi kolom team", () => {
    const text = JSON.stringify(buildTripPayload(row, priv, "guest"));
    for (const leak of ["teamNote", "estCost", "DUMMY-TEAMNOTE", "123456", "DUMMY-MEDICAL", "DUMMY-PHONE", "\"team\""]) {
      expect(text.includes(leak), `bocor: ${leak}`).toBe(false);
    }
    expect(text).toContain("DUMMY-GREETING");
    expect(text).toContain("DUMMY-PICKUP");
  });

  it("token tim: lengkap dengan teamNote, estCost, dan info tim", () => {
    const body = buildTripPayload(row, priv, "team") as { team: Record<string, unknown>; trip: { days: { stops: Record<string, unknown>[] }[] } };
    const stop = body.trip.days[1]!.stops[0]!;
    expect(stop).toMatchObject({ teamNote: "DUMMY-TEAMNOTE", estCost: 123456, private: { pickup: "DUMMY-PICKUP" } });
    expect(body.team).toEqual({ medical: "DUMMY-MEDICAL", guestContacts: ["DUMMY-PHONE"] });
  });

  it("field tim yang terselip di trip_content tetap dibuang untuk tamu", () => {
    const dirty = structuredClone(row);
    (dirty.content.days[1]!.stops[0] as Record<string, unknown>).teamNote = "SELIPAN";
    expect(JSON.stringify(buildTripPayload(dirty, priv, "guest"))).not.toContain("SELIPAN");
  });

  it("tanpa baris trip_private tetap jalan", () => {
    const body = buildTripPayload(row, null, "team") as { private: unknown; team: unknown };
    expect(body.private).toEqual({});
    expect(body.team).toEqual({});
  });

  it("ETag berbeda per peran dan per versi data privat", () => {
    expect(etagFor(row, priv, "guest")).not.toBe(etagFor(row, priv, "team"));
    expect(etagFor(row, priv, "guest")).not.toBe(etagFor(row, { ...priv!, updated_at: "2026-11-09T00:00:00Z" }, "guest"));
  });
});
