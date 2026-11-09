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
  /** Buka tirai bila sedang tertutup (dipanggil halaman tujuan saat tampil). */
  async open() {
    if (state === "open" || state === "opening") return;
    set("opening");
    await wait(MOTION.letterbox.dur + 100);
    set("open");
  },
};
