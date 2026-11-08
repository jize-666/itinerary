/**
 * Rate limit percobaan kode (FR-05): jeda bertingkat, dan setelah 5 kali salah berturut-turut → terkunci 30 detik.
 * Setiap salah berikutnya mengunci ulang 30 detik. Kode benar mereset hitungan.
 */
export const MAX_FAILS = 5;
export const LOCK_MS = 30_000;
export const WINDOW_MS = 15 * 60_000;

export type Attempt = { at: string; ok: boolean };
export type RateState = { fails: number; locked: boolean; retryAfterSec: number; remaining: number };

/** `attempts` diurutkan terbaru dulu. Hanya salah berturut-turut sejak benar terakhir, dalam 15 menit, yang dihitung. */
export function rateState(attempts: Attempt[], now = Date.now()): RateState {
  let fails = 0;
  let lastFail = 0;
  for (const a of attempts) {
    const t = Date.parse(a.at);
    if (Number.isNaN(t) || now - t > WINDOW_MS) break;
    if (a.ok) break;
    fails++;
    lastFail = Math.max(lastFail, t);
  }
  const lockedUntil = fails >= MAX_FAILS ? lastFail + LOCK_MS : 0;
  const locked = lockedUntil > now;
  return { fails, locked, retryAfterSec: locked ? Math.ceil((lockedUntil - now) / 1000) : 0, remaining: Math.max(0, MAX_FAILS - fails) };
}

/** Jeda sebelum menjawab "kode salah": 250 ms, 500 ms, 1 s, 2 s, lalu tetap 2 s. */
export const failDelayMs = (failsIncludingThis: number) => Math.min(2_000, 250 * 2 ** Math.max(0, failsIncludingThis - 1));
