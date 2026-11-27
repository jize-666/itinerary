import { MOTION, prefersReducedMotion } from "./tokens";

/**
 * Tirai antar-halaman ala bioskop (token `letterbox`): bilah nila menutup dari atas & bawah dengan garis emas
 * di tengah, halaman berganti, lalu bilah membuka. Satu instans di layout, dipanggil dari mana saja.
 */
export type CurtainState = "open" | "closing" | "closed" | "opening";
let state: CurtainState = "open";
const listeners = new Set<() => void>();
const set = (s: CurtainState) => {
  state = s;
  listeners.forEach((fn) => fn());
};
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/**
 * Tahan: halaman tujuan yang berat saat mulai (maket 3D: unduh chunk, bangun adegan, kompilasi shader) menahan tirai
 * tertutup sampai bingkai pertamanya tergambar, supaya animasi membuka tidak ikut patah. Selalu ada batas waktu:
 * tirai tidak boleh tertahan selamanya.
 */
export const HOLD_MAX_MS = 5000;
/** Dari klik sampai halaman tujuan sempat memasang tahanannya sendiri (chunk rute belum tentu sudah ada). */
export const HOLD_NAV_MS = 9000;
/** Rute yang berat saat mulai dan menahan tirai sendiri (maket 3D). */
export const heavyRoute = (path: string) => /^\/diorama(\/|$)/.test(path);
const holds = new Map<string, ReturnType<typeof setTimeout>>();
let wantOpen = false;

export const curtain = {
  get: () => state,
  getServer: (): CurtainState => "open",
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Tutup tirai; selesai saat layar tertutup penuh. */
  async close() {
    if (prefersReducedMotion()) return;
    set("closing");
    await wait(MOTION.letterbox.dur);
    set("closed");
  },
  /** Tahan tirai tetap tertutup untuk kunci ini; lepas sendiri sesudah `maxMs` (bawaan `HOLD_MAX_MS`). */
  hold(key: string, maxMs = HOLD_MAX_MS) {
    clearTimeout(holds.get(key));
    // habis waktu: lepas lalu buka (kalau halaman tujuan tidak pernah datang, tirai tidak tertinggal tertutup)
    holds.set(
      key,
      setTimeout(() => {
        curtain.release(key);
        void curtain.open();
      }, maxMs),
    );
    listeners.forEach((fn) => fn());
  },
  /** Lepas tahanan; bila itu yang terakhir dan ada yang meminta membuka, tirai dibuka. */
  release(key: string) {
    if (!holds.has(key)) return;
    clearTimeout(holds.get(key));
    holds.delete(key);
    listeners.forEach((fn) => fn());
    if (!holds.size && wantOpen) void curtain.open();
  },
  holding: () => holds.size > 0,
  /** Buka tirai bila sedang tertutup (dipanggil halaman tujuan saat tampil). Ditunda selama ada tahanan. */
  async open() {
    if (holds.size) {
      wantOpen = true;
      return;
    }
    wantOpen = false;
    if (state === "open" || state === "opening") return;
    set("opening");
    await wait(MOTION.letterbox.dur + 100);
    set("open");
  },
};
