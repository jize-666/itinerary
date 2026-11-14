/**
 * Pesan kecil dari lapisan DOM film ke panggung 3D, supaya komponen film tidak perlu mengimpor three.
 * Murni: tanpa DOM, tanpa three. Panggung mendaftarkan gong-nya saat hidup dan melepasnya saat dibongkar.
 */

import { clampZoom, GONG_ZOOM, gongStep, orbitFromDrag, zoomByPinch, zoomByWheel } from "@/engine/motion/view";
import { createGate, type GateSnapshot } from "./gate";

/** Jam gerbang gunungan (detik): satu jam untuk lapisan DOM dan panggung 3D. */
const clock = () => (typeof performance === "undefined" ? Date.now() : performance.now()) / 1000;
const gate = createGate();
const OFF: GateSnapshot = { phase: "off", end: null, face: "agung" };
let gateSnap: GateSnapshot = OFF;
const gateListeners = new Set<() => void>();
/** Kabari pendengar DOM bila fase, ujung, atau muka gerbang berganti. */
function emitGate() {
  const s = gate.snapshot(clock());
  if (s.phase === gateSnap.phase && s.end === gateSnap.end && s.face === gateSnap.face) return;
  gateSnap = s;
  for (const fn of gateListeners) fn();
}
/** Jalankan satu perintah gerbang lalu kabari DOM. */
function act<T>(fn: (t: number) => T): T {
  const r = fn(clock());
  emitGate();
  return r;
}

/**
 * Memulai satu pukulan. Mengembalikan detik sampai tabuh mengenai gong, atau `null` bila pukulan sebelumnya belum
 * selesai. `kick` = kamera ikut terhentak (gong penutup hari); false di slide judul, tempat kamera harus diam.
 */
type Striker = (kick: boolean) => number | null;

let striker: Striker | null = null;
let ready = false;
let kayon = false;
/**
 * Penonton sedang diam di slide yang gongnya bisa didekati dan dikitari, dengan panggung 3D hidup: "gong" = slide gong
 * penutup hari (zoom, kitar, dan dua tahap gulir), "title" = judul hari dan hero prolog (zoom dan kitar; langkah
 * pertama di sana sudah dipakai tahap gong, beat.ts), null = slide lain.
 */
export type GongPlace = "gong" | "title" | null;
let place: GongPlace = null;
/** Target zoom gong (0 = bidikan biasa, 1 = dekat); panggung menghaluskannya. */
let zoom = 0;
let pinchFrom = 0;
/** Target sudut kitar kamera (derajat, ±ORBIT.max), sudut yang sedang tampil, dan apakah sedang diseret. */
let orbit = 0;
let orbitShown = 0;
let orbitFrom = 0;
let orbiting = false;

export const stageBus = {
  /** Panggung 3D: daftarkan gong. Mengembalikan pembatal. */
  bindGong(fn: Striker): () => void {
    striker = fn;
    return () => {
      if (striker === fn) striker = null;
    };
  },
  /**
   * Minta gong dipukul. Angka = pukulan dimulai, hantamannya sekian detik lagi; "busy" = pukulan sebelumnya
   * belum selesai; "flat" = tidak ada gong 3D (film 2,5D), pemanggil mengurus sendiri bunyi dan riaknya.
   */
  strikeGong(opts: { kick?: boolean } = {}): number | "busy" | "flat" {
    if (!striker) return "flat";
    return striker(opts.kick ?? true) ?? "busy";
  },
  /** Kursor atau fokus ada di atas gong: tabuh terangkat sedikit, tanda siap dipukul. */
  setReady(on: boolean) {
    ready = on;
  },
  ready: () => ready,
  /** Panggung 3D: gunungan siap dipakai (teksturnya sudah di GPU) atau tidak lagi (panggung dibongkar). */
  setKayon(on: boolean) {
    kayon = on;
  },
  kayon: () => kayon,

  // ---- zoom, kitar kamera, dan dua tahap gulir (aturan host 13 Nov; judul dan kitar ±90°: 14 Nov) ----
  /**
   * Panggung 3D, tiap frame: penonton diam di slide gong penutup, di judul hari / hero, atau di slide lain.
   * Meninggalkannya mengembalikan zoom dan kitar ke 0.
   */
  setGongHere(next: GongPlace) {
    place = next;
    if (!next) {
      zoom = 0;
      orbit = 0;
      orbiting = false;
    }
  },
  /** Di slide gong penutup hari (dua tahap gulir; jari tidak men-scrub). */
  gongHere: () => place === "gong",
  /** Di slide yang gongnya bisa di-zoom dan dikitari (gong penutup, judul hari, hero). */
  zoomHere: () => place !== null,
  gongZoom: () => zoom,
  /** Dua tahap gulir: true bila langkah ini dipakai untuk mendekat atau menjauh (slide tidak berpindah). */
  gongStep(dir: 1 | -1): boolean {
    if (place !== "gong") return false;
    const next = gongStep(zoom, dir);
    if (next === null) return false;
    zoom = next;
    return true;
  },
  /** Ctrl+roda / cubit trackpad (`amount` = deltaY) atau tombol + / − (`amount` = ±1). true bila dipakai. */
  gongZoomBy(kind: "wheel" | "key", amount: number): boolean {
    if (!place) return false;
    zoom = kind === "wheel" ? zoomByWheel(zoom, amount) : clampZoom(zoom + amount * GONG_ZOOM.key);
    return true;
  },
  /** Cubit dua jari mulai: true bila zoom gong berlaku (jari tidak lagi dibaca sebagai geser slide). */
  gongPinchStart(): boolean {
    if (!place) return false;
    pinchFrom = zoom;
    return true;
  },
  /** Cubit berlangsung: jarak jari sekarang ÷ jarak awal. */
  gongPinch(ratio: number) {
    if (place) zoom = zoomByPinch(pinchFrom, ratio);
  },
  /** Seret mendatar mulai (mouse, jari, atau trackpad): true bila kamera bisa dikitari di slide ini. */
  orbitStart(): boolean {
    if (!place) return false;
    orbiting = true;
    orbitFrom = orbitShown; // mulai dari sudut yang sedang tampil, juga saat kamera masih kembali ke depan
    orbit = orbitShown;
    return true;
  },
  /** Seret berlangsung: `dx` px sejak mulai, pada layar selebar `width` px. */
  orbitDrag(dx: number, width: number) {
    if (orbiting && place) orbit = orbitFromDrag(orbitFrom, dx, width);
  },
  /** Seret dilepas: kamera kembali pelan ke depan. */
  orbitEnd() {
    orbiting = false;
    orbit = 0;
  },
  orbitGoal: () => orbit,
  orbiting: () => orbiting,
  /** Panggung 3D, tiap frame: sudut kitar yang sedang tampil (seret berikutnya mulai dari sini). */
  setOrbitShown(deg: number) {
    orbitShown = deg;
  },

  // ---- gunungan pembuka dan penutup (gate.ts) ----
  /** Mesin gerbang, dibaca panggung 3D tiap frame (`planted`, `turn`, `rage`, `thud`). */
  gate,
  /** Jam yang dipakai gerbang (detik). */
  clock,
  /** Keadaan untuk lapisan DOM (useSyncExternalStore). */
  gateSnapshot: () => gateSnap,
  gateServer: () => OFF,
  gateSubscribe(fn: () => void) {
    gateListeners.add(fn);
    return () => {
      gateListeners.delete(fn);
    };
  },
  /** Panggung 3D tiap frame (dan pemanggil lain sesudah jam berjalan): fase yang berganti dikabarkan ke DOM. */
  gateTick: emitGate,
  /** Film dibuka di slide pertama dan panggung 3D akan hidup: layar menunggu gunungan. */
  gateArm: () => act(() => gate.arm()),
  /** Film ditutup: gerbang dilupakan. */
  gateReset: () => act(() => gate.reset()),
  /** Detik sampai gunungan selesai ditancapkan (bunyi gong tancep kayon), atau null. */
  gateLandsIn: () => gate.landsIn(clock()),
  /** Panggung tidak jadi hidup atau terlalu lama: film dibuka tanpa gerbang. */
  gateDisarm: () => act(() => gate.disarm()),
  /** Panggung 3D: gunungan siap digambar (tekstur di GPU), atau tidak lagi (panggung dibongkar). */
  gateReady: (on: boolean) => act(() => gate.setReady(on)),
  /** Langkah gulir/geser/panah: true bila dipakai gerbang (slide tidak pindah). */
  gateStep: (dir: 1 | -1, index: number, last: number) => act((t) => gate.step(dir, index, last, t)),
  /** Letak film berubah: gunungan di ujung yang ditinggalkan dicabut. */
  gateFollow: (index: number, moving: boolean, last: number) => act((t) => gate.follow(index, moving, last, t)),
  /** Penutup ditancapkan sendiri (tamu diam di credits). */
  gateAuto: (index: number, last: number) => act((t) => gate.autoTail(index, last, t)),
  /** Klik/tap/Enter pada gunungan: balik muka. true bila dibalik. */
  gateFlip: () => act((t) => gate.flip(t)),
  /** Jari mulai menggeser: true bila gerbang yang digeser. */
  gateScrubStart: (index: number) => act((t) => gate.scrubStart(index, t)),
  gateScrub: (signed: number) => act(() => gate.scrubTo(signed)),
  gateScrubEnd: (flick: number) => act((t) => gate.scrubEnd(flick, t)),
};
