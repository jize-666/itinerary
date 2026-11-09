import { calendarDiff, wibClock } from "@/engine/today/schedule";
import { fetchTrip, type Role, TRIP_KEY } from "./session";

/** Bentuk respons trip-data yang dipakai UI (sisanya dibiarkan apa adanya). */
export type L = { en: string; id: string };
export type Phase = "dawn" | "day" | "dusk" | "night";
export type Food = { halal?: boolean; alcohol?: boolean; sweet?: "low" | "mid" | "high"; banana?: boolean; note?: L };
/** Isi `trip_private.guest.stops[id]`: info jemput & alamat spesifik yang tidak boleh ada di repo. */
export type StopPrivate = { pickup?: string; address?: string; mapsUrl?: string; note?: string };
export type StopView = {
  id: string;
  start: string;
  end?: string;
  phase?: Phase;
  kind?: string;
  optional?: boolean;
  title: L;
  why?: L;
  tips?: L;
  dressCode?: L;
  maps?: { query: string; url: string };
  food?: Food;
  planB?: L;
  private?: StopPrivate;
  teamNote?: string;
  estCost?: number;
};
export type DayView = { n: number; date: string; kind?: string; title: L; subtitle: L; dressCode?: L; sunrise?: string; sunset?: string; stops: StopView[] };
export type Contact = { label: L; whatsapp?: string; phone?: string };
export type Lodging = { name?: string; address?: string; mapsUrl?: string };
export type TripView = {
  role: Role;
  trip: {
    title: L;
    route?: { label: L; legs: string[] };
    beforeYouGo?: { id: string; title: L; body: L }[];
    emergency?: { label: L; number: string }[];
    epilogue?: { title: L; body: L };
    days: DayView[];
  };
  private?: { party?: { name?: string; short?: string; size?: number; greeting?: L }; lodging?: Lodging; contacts?: Contact[] };
  /** Hanya untuk token tim. */
  team?: { medical?: string; partyNote?: string; preferences?: string };
};

/** Hasil memuat trip: `stale` = jaringan gagal, yang tampil salinan terakhir di perangkat (simpanan `savedAt`). */
export type TripLoad<T = TripView> = { kind: "ok"; data: T; savedAt: number; stale: boolean } | { kind: "unauthorized" } | { kind: "offline" } | { kind: "server" };

// ---- salinan di perangkat (Today offline, PRD FR-33) ----
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Snapshot<T> = { token: string; savedAt: number; etag?: string; data: T };
const localStore = (): Store | undefined => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

/** Salinan terakhir untuk token ini saja: kode lain di perangkat yang sama tidak pernah melihat data peran lain. */
export function readSnapshot<T = TripView>(token: string, store: Pick<Storage, "getItem"> | undefined = localStore()): Snapshot<T> | null {
  try {
    const raw = store?.getItem(TRIP_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Snapshot<T>>;
    return s && s.token === token && typeof s.savedAt === "number" && s.data && typeof s.data === "object" ? (s as Snapshot<T>) : null;
  } catch {
    return null;
  }
}

function writeSnapshot<T>(s: Snapshot<T>, store: Pick<Storage, "setItem"> | undefined) {
  try {
    store?.setItem(TRIP_KEY, JSON.stringify(s));
  } catch {
    /* penyimpanan penuh/diblokir: Today tetap jalan selama online */
  }
}

/** Salinan siap tampil (tanpa jaringan) untuk render pertama yang instan. */
export function peekTrip(token: string, store?: Pick<Storage, "getItem">): Extract<TripLoad, { kind: "ok" }> | null {
  const s = readSnapshot(token, store ?? localStore());
  return s ? { kind: "ok", data: s.data, savedAt: s.savedAt, stale: true } : null;
}

type LoadOpts = { fresh?: boolean; f?: typeof fetch; store?: Store; now?: () => number };

/**
 * Satu unduhan trip-data per token, dipakai bersama gerbang (sapaan nama) dan Today.
 * Berhasil → disimpan di perangkat. Jaringan gagal → salinan terakhir (stale). 304 → salinan dipakai, waktunya diperbarui.
 * Gagal & salinan basi tidak di-cache di memori, supaya percobaan berikutnya ke jaringan lagi.
 */
let cache: { token: string; p: Promise<TripLoad> } | null = null;
export function loadTrip(token: string, opts: LoadOpts = {}): Promise<TripLoad> {
  if (!opts.fresh && cache?.token === token) return cache.p;
  const store = opts.store ?? localStore();
  const now = opts.now ?? Date.now;
  const p = (async (): Promise<TripLoad> => {
    const snap = readSnapshot(token, store);
    const r = await fetchTrip<TripView>(token, opts.f, undefined, snap?.etag);
    if (r.kind === "ok") {
      const savedAt = now();
      writeSnapshot({ token, savedAt, etag: r.etag, data: r.data }, store);
      return { kind: "ok", data: r.data, savedAt, stale: false };
    }
    if (r.kind === "same" && snap) {
      const savedAt = now();
      writeSnapshot({ ...snap, savedAt }, store);
      return { kind: "ok", data: snap.data, savedAt, stale: false };
    }
    if (r.kind === "unauthorized") {
      try {
        store?.removeItem(TRIP_KEY);
      } catch {
        /* abaikan */
      }
      return r;
    }
    if (snap) return { kind: "ok", data: snap.data, savedAt: snap.savedAt, stale: true };
    return r.kind === "same" ? { kind: "server" } : r;
  })();
  cache = { token, p };
  p.then((r) => {
    if ((r.kind !== "ok" || r.stale) && cache?.p === p) cache = null;
  });
  return p;
}
export const clearTripCache = () => void (cache = null);

/** Tanggal hari ini di Solo (WIB), YYYY-MM-DD. */
export const todayWib = (now = new Date()) => wibClock(now.getTime()).date;

/** Hari tersisa sampai `date` (YYYY-MM-DD) menurut kalender WIB; negatif bila sudah lewat. */
export const daysUntil = (date: string, now = new Date()) => calendarDiff(todayWib(now), date);

/** Nama sapaan tamu (hanya untuk peran tamu; tim tidak disapa dengan nama tamu). */
export const guestShortName = (t: TripView): string | null => (t.role === "guest" ? t.private?.party?.short?.trim() || null : null);
