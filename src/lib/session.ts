import { FUNCTIONS_URL } from "./config";
import { deviceStore, isStandalone, persistentStore } from "./device-store";

/**
 * Sesi di perangkat (PRD FR-03): token dari verify-access disimpan selama tab terbuka, jadi kode cukup dimasukkan
 * sekali per tab; tab baru atau browser yang dibuka ulang memintanya lagi. Aplikasi Home Screen tetap ingat
 * (lihat device-store.ts). Token ditandatangani server; klien hanya membaca role & exp untuk UI, keputusan akses
 * tetap di server.
 */
export type Role = "guest" | "team";
export type Session = Readonly<{ token: string; role: Role; exp: number }>;
export const SESSION_KEY = "lakon.session";
/** Salinan trip-data terakhir untuk Today offline (lihat src/lib/trip.ts). Ikut dihapus bersama sesi. */
export const TRIP_KEY = "lakon.trip";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const nowSec = () => Math.floor(Date.now() / 1000);

export function parseSession(raw: unknown, now = nowSec()): Session | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.token !== "string" || s.token.length < 10 || s.token.length > 1024) return null;
  if (s.role !== "guest" && s.role !== "team") return null;
  if (typeof s.exp !== "number" || s.exp <= now) return null;
  return { token: s.token, role: s.role, exp: s.exp };
}

export function readSession(store: Pick<Storage, "getItem"> | undefined = deviceStore(), now = nowSec()): Session | null {
  try {
    const raw = store?.getItem(SESSION_KEY);
    return raw ? parseSession(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

/** `app` = disimpan oleh aplikasi Home Screen: tanda bahwa sesi di penyimpanan permanen ini memang boleh menetap. */
export function writeSession(s: Session, store: Pick<Storage, "setItem"> | undefined = deviceStore(), app = isStandalone()) {
  try {
    store?.setItem(SESSION_KEY, JSON.stringify(app ? { ...s, app: 1 } : s));
  } catch {
    /* tidak diingat: tamu diminta kode lagi lain kali */
  }
}

export function clearSession(store: Pick<Storage, "removeItem"> | undefined = deviceStore()) {
  try {
    store?.removeItem(SESSION_KEY);
    store?.removeItem(TRIP_KEY);
  } catch {
    /* abaikan */
  }
}

/**
 * Sesi yang dulu disimpan permanen oleh tab browser (sebelum 11 Nov 2026) tidak dipakai lagi: dihapus bersama salinan
 * trip-nya, supaya data tamu tidak tertinggal di perangkat. Sesi milik aplikasi Home Screen (bertanda `app`)
 * dibiarkan, karena di Android penyimpanan itu dipakai bersama tab browser. Di aplikasi Home Screen sendiri, sesi
 * lama diberi tanda supaya tetap berlaku.
 */
export function sweepLegacy(local: Store | undefined = persistentStore(), standalone = isStandalone()) {
  try {
    const raw = local?.getItem(SESSION_KEY);
    let saved: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      saved = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      /* isi rusak: diperlakukan sebagai sesi lama */
    }
    const app = saved?.app === 1;
    if (standalone) {
      if (saved && !app) local?.setItem(SESSION_KEY, JSON.stringify({ ...saved, app: 1 }));
      return;
    }
    if (!app) {
      local?.removeItem(SESSION_KEY);
      local?.removeItem(TRIP_KEY);
    }
  } catch {
    /* abaikan */
  }
}

// ---- store untuk React. "unknown" = belum dibaca (render server/hidrasi), supaya tidak berkedip. ----
export const UNKNOWN = "unknown" as const;
export type SessionSnapshot = Session | null | typeof UNKNOWN;
let current: Session | null | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
export const sessionStore = {
  get: (): SessionSnapshot => {
    if (current === undefined) {
      sweepLegacy();
      current = readSession();
    }
    return current;
  },
  getServer: (): SessionSnapshot => UNKNOWN,
  set(s: Session) {
    current = s;
    writeSession(s);
    emit();
  },
  clear() {
    current = null;
    clearSession();
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ---- API ----
export type AccessResult =
  | { kind: "ok"; session: Session }
  | { kind: "wrong"; remaining: number }
  | { kind: "locked"; retryAfter: number }
  | { kind: "ended" }
  | { kind: "offline" }
  | { kind: "server" };

const TIMEOUT_MS = 20_000;
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export async function verifyAccess(code: string, f: typeof fetch = fetch, base = FUNCTIONS_URL): Promise<AccessResult> {
  let res: Response;
  try {
    res = await f(`${base}/verify-access`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { kind: "offline" };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    const session = parseSession(body);
    return session ? { kind: "ok", session } : { kind: "server" };
  }
  if (res.status === 401) return { kind: "wrong", remaining: num(body.remaining, 0) };
  if (res.status === 429) return { kind: "locked", retryAfter: Math.max(1, num(body.retryAfter, 30)) };
  if (res.status === 410) return { kind: "ended" };
  return { kind: "server" };
}

export type TripResult<T> = { kind: "ok"; data: T; etag?: string } | { kind: "same" } | { kind: "unauthorized" } | { kind: "offline" } | { kind: "server" };

/** `etag` dari unduhan sebelumnya → server menjawab 304 ("same") bila datanya belum berubah. */
export async function fetchTrip<T>(token: string, f: typeof fetch = fetch, base = FUNCTIONS_URL, etag?: string): Promise<TripResult<T>> {
  let res: Response;
  try {
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (etag) headers["if-none-match"] = etag;
    res = await f(`${base}/trip-data`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { kind: "offline" };
  }
  if (res.status === 304) return etag ? { kind: "same" } : { kind: "server" };
  if (res.status === 401) return { kind: "unauthorized" };
  if (!res.ok) return { kind: "server" };
  try {
    return { kind: "ok", data: (await res.json()) as T, etag: res.headers.get("etag") ?? undefined };
  } catch {
    return { kind: "server" };
  }
}
