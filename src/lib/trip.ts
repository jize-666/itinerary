import { fetchTrip, type Role, type TripResult } from "./session";

/** Bentuk respons trip-data yang dipakai UI (sisanya dibiarkan apa adanya). */
export type L = { en: string; id: string };
export type Phase = "dawn" | "day" | "dusk" | "night";
export type StopView = { id: string; start: string; end?: string; phase?: Phase; title: L; why?: L; teamNote?: string; estCost?: number };
export type DayView = { n: number; date: string; title: L; subtitle: L; stops: StopView[] };
export type TripView = {
  role: Role;
  trip: { title: L; route?: { label: L; legs: string[] }; days: DayView[] };
  private?: { party?: { name?: string; short?: string; size?: number; greeting?: L } };
};

/**
 * Satu unduhan trip-data per token, dipakai bersama gerbang (sapaan nama) dan Today.
 * Gagal → cache dibuang supaya bisa dicoba lagi; `fresh` memaksa unduh ulang.
 */
let cache: { token: string; p: Promise<TripResult<TripView>> } | null = null;
export function loadTrip(token: string, fresh = false, f?: typeof fetch): Promise<TripResult<TripView>> {
  if (fresh || !cache || cache.token !== token) {
    const p = fetchTrip<TripView>(token, f);
    cache = { token, p };
    p.then((r) => {
      if (r.kind !== "ok" && cache?.p === p) cache = null;
    });
  }
  return cache.p;
}
export const clearTripCache = () => void (cache = null);

/** Tanggal hari ini di Solo (WIB), YYYY-MM-DD. */
export const todayWib = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);

/** Hari tersisa sampai `date` (YYYY-MM-DD) menurut kalender WIB; negatif bila sudah lewat. */
export function daysUntil(date: string, now = new Date()): number {
  const [a, b] = [todayWib(now), date].map((d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
  return Math.round((b! - a!) / 86_400_000);
}

/** Nama sapaan tamu (hanya untuk peran tamu; tim tidak disapa dengan nama tamu). */
export const guestShortName = (t: TripView): string | null => (t.role === "guest" ? t.private?.party?.short?.trim() || null : null);
