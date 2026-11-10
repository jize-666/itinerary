/**
 * Logika Today (PRD §7.6, FR-30/31): sebelum/selama/setelah trip, hari ke-N, kartu Now/Next, dan hitung mundur.
 *
 * Semua dihitung dari instan absolut (ms sejak epoch) dan jam dinding WIB. WIB = UTC+7 tetap, tanpa DST,
 * jadi tidak ada satu pun pemanggilan getter "lokal" (getHours, getDate, …): hasilnya sama berapa pun
 * zona waktu HP tamu. Pergantian hari terjadi tepat di 00.00 WIB.
 */

export const TRIP_TZ = "Asia/Jakarta";
const WIB_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
/** Lama sebuah stop tanpa jam selesai yang tidak diikuti stop lain di hari itu. */
export const DEFAULT_STOP_MS = 60 * MIN_MS;

export type Slot = { start: string; end?: string };
export type DayLike<S extends Slot = Slot> = { n: number; date: string; stops: readonly S[] };
type StopOf<D extends DayLike> = D["stops"][number];
export type TripPhase = "before" | "during" | "after";

/** Instan dari tanggal (YYYY-MM-DD) + jam (HH:MM) WIB. */
export const wibInstant = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+07:00`);

/** Jam dinding WIB untuk sebuah instan: tanggal YYYY-MM-DD dan menit sejak 00.00. */
export function wibClock(at: number): { date: string; minutes: number } {
  const d = new Date(at + WIB_MS);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** Selisih hari kalender (to − from), keduanya YYYY-MM-DD. */
export const calendarDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** Satu stop yang sudah ditempatkan di garis waktu absolut. */
export type Timed<D extends DayLike = DayLike> = { stop: StopOf<D>; day: D; startAt: number; endAt: number };

const byDate = <D extends { date: string }>(days: readonly D[]) => [...days].sort((a, b) => a.date.localeCompare(b.date));
const byStart = <S extends Slot>(stops: readonly S[]) => [...stops].sort((a, b) => a.start.localeCompare(b.start));

/**
 * Semua stop, urut waktu. Jam selesai lebih kecil dari jam mulai berarti lewat tengah malam.
 * Tanpa jam selesai: berlangsung sampai stop berikutnya di hari itu, atau satu jam bila ia yang terakhir.
 */
export function timeline<D extends DayLike>(days: readonly D[]): Timed<D>[] {
  return byDate(days).flatMap((day) => {
    const stops: StopOf<D>[] = byStart(day.stops);
    return stops.map((stop, i): Timed<D> => {
      const startAt = wibInstant(day.date, stop.start);
      const next = stops[i + 1];
      let endAt: number;
      if (stop.end) {
        endAt = wibInstant(day.date, stop.end);
        if (endAt <= startAt) endAt += DAY_MS;
      } else endAt = next ? Math.max(startAt + MIN_MS, wibInstant(day.date, next.start)) : startAt + DEFAULT_STOP_MS;
      return { stop, day, startAt, endAt };
    });
  });
}

export type TodayState<D extends DayLike = DayLike> = {
  phase: TripPhase;
  /** Tanggal hari ini di Solo. */
  date: string;
  /** Hari trip yang tanggalnya hari ini (null sebelum/sesudah trip, atau di tanggal tanpa jadwal). */
  day: D | null;
  /** Hari yang paling pas ditampilkan di timeline: hari stop yang sedang berlangsung, atau stop berikutnya, atau hari ini. */
  focus: D | null;
  /** Stop yang sedang berlangsung. Kalau ada yang tumpang tindih, yang paling akhir dimulai. */
  now: Timed<D> | null;
  /** Stop berikutnya yang belum dimulai (bisa di hari berikutnya). */
  next: Timed<D> | null;
  /** ms sampai stop berikutnya dimulai. */
  msToNext: number | null;
  /** ms sampai stop sekarang selesai. */
  msLeftNow: number | null;
  /** Kemajuan stop sekarang, 0..1. */
  progress: number | null;
  /** Hari kalender sampai hari pertama trip (0 = hari ini, negatif = sudah lewat). */
  daysToStart: number;
  /** Stop berikutnya jatuh di hari kalender yang berbeda dari hari ini. */
  nextIsLater: boolean;
};

export function todayState<D extends DayLike>(days: readonly D[], at: number = Date.now()): TodayState<D> {
  const sorted = byDate(days);
  const { date } = wibClock(at);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const phase: TripPhase = !first || !last || date < first.date ? "before" : date > last.date ? "after" : "during";
  const day = phase === "during" ? (sorted.find((d) => d.date === date) ?? null) : null;

  const line = timeline(sorted);
  let now: Timed<D> | null = null;
  let next: Timed<D> | null = null;
  for (const t of line) {
    if (t.startAt <= at && at < t.endAt && (!now || t.startAt >= now.startAt)) now = t;
    if (t.startAt > at && !next) next = t;
  }

  // yang sedang berlangsung, lalu yang berikutnya (malam hari → jadwal besok), lalu hari ini
  const focus = phase === "after" ? null : (now?.day ?? next?.day ?? day);
  return {
    phase,
    date,
    day,
    focus,
    now,
    next,
    msToNext: next ? next.startAt - at : null,
    msLeftNow: now ? now.endAt - at : null,
    progress: now ? Math.min(1, Math.max(0, (at - now.startAt) / (now.endAt - now.startAt))) : null,
    daysToStart: first ? calendarDiff(date, first.date) : 0,
    nextIsLater: next ? next.day.date !== date : false,
  };
}

/** Pecah durasi jadi hari/jam/menit, dibulatkan KE ATAS ke menit (59 dtk tersisa tetap terbaca "1 menit"). */
export function durationParts(ms: number): { d: number; h: number; m: number } {
  const total = Math.max(0, Math.ceil(ms / MIN_MS));
  return { d: Math.floor(total / 1440), h: Math.floor((total % 1440) / 60), m: total % 60 };
}

/** ms sampai pergantian menit berikutnya: dipakai supaya hitung mundur berdetak tepat di detik ke-0. */
export const msToNextMinute = (at: number = Date.now()) => MIN_MS - (at % MIN_MS);
