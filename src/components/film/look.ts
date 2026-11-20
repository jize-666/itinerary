/**
 * Sumber arah pandang film, satu untuk panggung 3D dan film 2,5D (aturan host 13 Nov: kamera parallax di semua
 * objek): kursor mouse di desktop, kemiringan HP (giroskop) di HP. Hasilnya dihaluskan dan bebas laju frame.
 *
 * - Di iPhone, izin sensor gerak hanya boleh diminta dari sentuhan: diminta pada sentuhan, sampai tamu menjawab.
 *   Sentuhan yang ditolak Safari sebagai bukan gesture (geser) tidak dihitung; jawaban tamu diingat selama halaman
 *   hidup, juga saat pindah film → Today. Ditolak atau tidak ada sensor: arah pandang tetap 0 (hanya kursor).
 * - Getar tangan di bawah `VIEW.still` tidak dianggap gerak, jadi panggung boleh beristirahat saat HP diam.
 * - Mouse lebih diutamakan: selama kursor baru bergerak, kemiringan diabaikan.
 * - `prefers-reduced-motion: reduce` = tanpa parallax.
 *
 * Dipakai bersama lewat hitungan pemakai: `startLook()` memasang pendengar pada pemakai pertama, pelepas terakhir
 * mencabutnya.
 */
import { approach, type Look, pointerLook, recenterBase, tiltLook, VIEW } from "@/engine/motion/view";

type Orientation = { beta: number; gamma: number };
type PermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };

const state = {
  tx: 0,
  ty: 0,
  x: 0,
  y: 0,
  /** Saat target terakhir berubah nyata (ms, performance.now). */
  changed: -1e9,
  /** Saat kursor mouse terakhir bergerak. */
  mouse: -1e9,
  base: null as Orientation | null,
  lastTilt: 0,
  /** Saat penghalus terakhir dimajukan (ms): beberapa pemakai di frame yang sama tidak melajukannya dua kali. */
  lastStep: 0,
};
let users = 0;
/** Jawaban tamu atas izin sensor gerak; bertahan selama halaman hidup (juga saat pindah film → Today). */
let permission: "granted" | "denied" | null = null;
/** Permintaan izin sedang menunggu jawaban (dua sentuhan cepat = satu permintaan). */
let asking = false;
/** Penerima jawaban izin: pemasangan yang hidup saat jawaban datang (bisa berganti film → Today selama menunggu). */
let answered: ((granted: boolean) => void) | null = null;
let unbind: (() => void) | null = null;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function target(x: number, y: number, now: number) {
  if (Math.abs(x - state.tx) > VIEW.still || Math.abs(y - state.ty) > VIEW.still) state.changed = now;
  state.tx = x;
  state.ty = y;
}

function bind(): () => void {
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || reduced()) return;
    const now = performance.now();
    state.mouse = now;
    const l = pointerLook(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    target(l.x, l.y, now);
  };
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null || reduced()) return;
    const now = performance.now();
    if (now - state.mouse < 2000) return;
    const dt = state.lastTilt ? (now - state.lastTilt) / 1000 : 0;
    state.lastTilt = now;
    state.base = state.base ? recenterBase(state.base, e.beta, e.gamma, dt) : { beta: e.beta, gamma: e.gamma };
    const angle = screen.orientation?.angle ?? 0;
    const l = tiltLook(e.beta, e.gamma, state.base, angle);
    target(l.x, l.y, now);
  };
  const listenTilt = () => window.addEventListener("deviceorientation", onTilt, { passive: true });
  // iPhone: izin diminta dari sentuhan; lainnya: langsung didengarkan
  const api = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as unknown as PermissionApi | undefined;
  const needsAsk = typeof api?.requestPermission === "function";
  const onTouch = () => {
    if (permission || asking) return;
    asking = true;
    api!.requestPermission!().then(
      (s) => {
        asking = false;
        permission = s === "granted" ? "granted" : "denied";
        answered?.(permission === "granted");
      },
      // Safari menolak tanpa dialog bila sentuhan itu bukan gesture yang sah (mis. geser slide):
      // jangan dianggap jawaban tamu, minta lagi di sentuhan berikutnya (laporan host 20 Nov)
      () => {
        asking = false;
      },
    );
  };
  const onAnswer = (granted: boolean) => {
    window.removeEventListener("touchend", onTouch);
    if (granted) listenTilt();
  };
  answered = onAnswer;
  if (!needsAsk || permission === "granted") listenTilt();
  else if (!permission) window.addEventListener("touchend", onTouch, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  return () => {
    if (answered === onAnswer) answered = null;
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("deviceorientation", onTilt);
    window.removeEventListener("touchend", onTouch);
  };
}

/** Mulai memakai arah pandang. Mengembalikan pelepas. */
export function startLook(): () => void {
  if (users++ === 0) unbind = bind();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--users === 0) {
      unbind?.();
      unbind = null;
      Object.assign(state, { tx: 0, ty: 0, x: 0, y: 0, base: null, lastTilt: 0, lastStep: 0 });
    }
  };
}

/** Arah pandang yang dihaluskan, dimajukan sampai sekarang (aman dipanggil beberapa pemakai di frame yang sama). */
export function stepLook(now = performance.now()): Look {
  const dt = state.lastStep ? Math.min(0.1, Math.max(0, (now - state.lastStep) / 1000)) : 0;
  state.lastStep = now;
  state.x = approach(state.x, state.tx, dt, VIEW.ease);
  state.y = approach(state.y, state.ty, dt, VIEW.ease);
  return { x: state.x, y: state.y };
}

/** Arah pandang masih bergerak (target baru berubah, atau penghalus belum sampai): layar perlu digambar. */
export function lookMoving(now = performance.now()): boolean {
  return now - state.changed < 900 || Math.abs(state.x - state.tx) > 0.002 || Math.abs(state.y - state.ty) > 0.002;
}
