/**
 * Lapisan input film (PRD §7.0a, §9 "Ambang gerakan"): mengubah roda/trackpad, sentuhan, dan keyboard
 * menjadi langkah slide. Bagian yang memutuskan (WheelGestures, TouchTracker, keyAction) murni dan dites
 * dengan jejak event tiruan; `bindInput` hanya menyambungkannya ke DOM.
 */
import { INPUT } from "@/engine/motion/tokens";
import type { Dir } from "./controller";

// ---------------------------------------------------------------------------------------------------------------
// Roda & trackpad
// ---------------------------------------------------------------------------------------------------------------

export type WheelSample = {
  /** Waktu event (ms). Pakai `event.timeStamp`, bukan waktu handler: saat thread utama sibuk, event datang telat. */
  t: number;
  /** Geseran sepanjang sumbu aktif dalam px; + = menuju slide berikutnya. */
  delta: number;
  /** Roda bertakik (mouse biasa): satu takik = satu gerakan, berapa pun besar deltanya. */
  notch: boolean;
};

type WheelLike = { deltaX: number; deltaY: number; deltaMode: number; timeStamp: number; shiftKey?: boolean; wheelDeltaY?: number; wheelDeltaX?: number };

/** Ubah WheelEvent menjadi sampel satu sumbu. `allowX`: geser menyamping ikut dihitung (di dalam gallery). */
export function wheelSample(e: WheelLike, allowX: boolean, pageSize = 800): WheelSample {
  const unit = e.deltaMode === 1 ? INPUT.wheelLine : e.deltaMode === 2 ? pageSize : 1;
  const dx = e.deltaX * unit;
  const dy = e.deltaY * unit;
  // Shift+roda di Windows/Linux tiba sebagai deltaX; tetap dianggap geser vertikal di luar gallery
  const useX = dy === 0 ? allowX || !!e.shiftKey : allowX && Math.abs(dx) > Math.abs(dy);
  const delta = useX ? dx : dy;
  const legacy = useX ? e.wheelDeltaX : e.wheelDeltaY;
  // Mouse bertakik: satuan garis/halaman, atau wheelDelta kelipatan 120 (trackpad melaporkan −3 × delta)
  const notch = e.deltaMode !== 0 || (typeof legacy === "number" && legacy !== 0 && Math.abs(legacy) % 120 === 0);
  return { t: e.timeStamp, delta, notch };
}

/** Konstanta bentuk amplop (heuristik; dikalibrasi lagi di perangkat nyata). Kecepatan dalam px/ms. */
const WHEEL = {
  /** dt terkecil untuk menghitung kecepatan (event beruntun dalam satu frame) */
  minDt: 8,
  /** dt anggapan untuk event pertama sebuah gerakan */
  firstDt: 16,
  /** penghalusan kecepatan per sampel */
  smooth: 0.5,
  /** dianggap mulai meluruh saat kecepatan turun ke bagian ini dari puncaknya */
  decayAt: 0.6,
  /** dorongan baru: kecepatan ≥ dasar × rasio ... */
  riseRatio: 3,
  /** ... dan ≥ dasar + sekian px/ms */
  riseAbs: 0.35,
  /** setelah jeda: masih ekor yang sama bila kecepatan rata-rata ≥ bagian ini dari kecepatan sebelum jeda */
  gapKeep: 0.25,
  /** ekor inersia tidak dianggap berlanjut lebih lama dari ini */
  tailMax: 2500,
} as const;

type WheelPhase = "idle" | "armed" | "rising" | "decay";

/**
 * Mengenali GERAKAN dari aliran event roda, supaya satu gesekan trackpad (berikut ekor inersianya yang bisa
 * berlangsung lebih dari satu detik) hanya menghasilkan satu langkah, sementara gesekan kedua yang disengaja
 * tetap dikenali walau ekor gesekan pertama belum habis.
 *
 * Caranya: setelah satu langkah dipicu, detektor "terkunci" dan mengikuti amplop kecepatan (px/ms):
 * naik sampai puncak → meluruh. Langkah baru hanya dipicu oleh
 *  (a) jeda tanpa event (gerakan berakhir), lalu akumulasi ≥ ambang lagi;
 *  (b) arah berbalik (inersia tidak pernah berbalik arah);
 *  (c) kecepatan yang naik lagi dengan jelas di atas dasar peluruhannya (dorongan baru).
 * Jeda yang ternyata hanya thread utama tersendat (event digabung browser) dikenali dari kecepatan rata-rata
 * selama jeda yang masih sejalan dengan peluruhan, dan tidak dianggap gerakan baru.
 */
export class WheelGestures {
  private phase: WheelPhase = "idle";
  private lastT = -Infinity;
  private acc = 0;
  private against = 0;
  private v = 0;
  private peak = 0;
  private floor = 0;
  private rise = 0;
  private firedDir: Dir = 1;
  private firedAt = -Infinity;

  /** Kembalikan arah langkah bila sampel ini memulai gerakan baru, selain itu 0. */
  push(s: WheelSample): Dir | 0 {
    if (!Number.isFinite(s.delta) || !Number.isFinite(s.t)) return 0;
    const dt = s.t - this.lastT;
    this.lastT = s.t;
    if (s.delta === 0) return 0;
    const dir: Dir = s.delta > 0 ? 1 : -1;
    const mag = Math.abs(s.delta);
    const locked = this.phase === "rising" || this.phase === "decay";

    if (dt >= INPUT.wheelGap) {
      const gapV = mag / dt;
      const sameInertia = locked && !s.notch && dir === this.firedDir && s.t - this.firedAt < WHEEL.tailMax && gapV >= this.v * WHEEL.gapKeep && gapV <= this.v * 2;
      if (sameInertia) {
        // event yang digabung selama thread utama tersendat: masih ekor yang sama
        this.v = gapV;
        if (this.phase === "decay") this.floor = Math.min(this.floor, gapV);
        this.rise = 0;
        return 0;
      }
      this.phase = "idle";
      this.acc = 0;
      this.v = mag / WHEEL.firstDt;
    } else {
      const inst = mag / Math.max(WHEEL.minDt, dt);
      this.v += (inst - this.v) * WHEEL.smooth;
    }

    if (this.phase === "idle" || this.phase === "armed") {
      if (this.phase === "armed" && Math.sign(this.acc) !== dir) this.acc = 0;
      this.phase = "armed";
      this.acc += s.delta;
      return s.notch || Math.abs(this.acc) >= INPUT.wheelThreshold ? this.fire(dir, s.t) : 0;
    }

    if (dir !== this.firedDir) {
      // berbalik arah: pasti disengaja, tapi tetap harus cukup jauh (bukan getaran jari)
      this.against += mag;
      return s.notch || this.against >= INPUT.wheelThreshold ? this.fire(dir, s.t) : 0;
    }
    this.against = 0;

    if (this.phase === "rising") {
      this.peak = Math.max(this.peak, this.v);
      if (this.v <= this.peak * WHEEL.decayAt) {
        this.phase = "decay";
        this.floor = this.v;
        this.rise = 0;
      }
      return 0;
    }

    // decay: ikuti dasar peluruhan; dorongan baru = kecepatan naik jelas di atasnya, dua sampel berturut-turut
    if (this.v <= this.floor) {
      this.floor = this.v;
      this.rise = 0;
      return 0;
    }
    if (this.v >= Math.max(this.floor * WHEEL.riseRatio, this.floor + WHEEL.riseAbs)) this.rise++;
    else this.rise = 0;
    return this.rise >= 2 && s.t - this.firedAt >= INPUT.wheelRefire ? this.fire(dir, s.t) : 0;
  }

  reset() {
    this.phase = "idle";
    this.lastT = -Infinity;
    this.acc = 0;
    this.against = 0;
  }

  private fire(dir: Dir, t: number): Dir {
    this.phase = "rising";
    this.firedDir = dir;
    this.firedAt = t;
    this.peak = this.v;
    this.acc = 0;
    this.against = 0;
    this.rise = 0;
    return dir;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Sentuhan
// ---------------------------------------------------------------------------------------------------------------

export type Axis = "x" | "y";
/** Jendela pengukur kecepatan jari, dan lama diam yang membatalkan sentakan (ms). */
const TOUCH = { velocityWindow: 100, restMs: 90 } as const;
type Pt = { x: number; y: number; t: number };

/**
 * Satu jari di layar: mengunci sumbu setelah bergerak melewati `touchSlop`, melaporkan geseran bertanda
 * (+ = menuju slide berikutnya: jari ke atas atau ke kiri), dan saat dilepas menilai apakah itu sentakan.
 */
export class TouchTracker {
  axis: Axis | null = null;
  private readonly origin: Pt;
  private last: Pt;
  private readonly trail: Pt[];

  constructor(x: number, y: number, t: number) {
    this.origin = { x, y, t };
    this.last = this.origin;
    this.trail = [this.origin];
  }

  /** Geseran bertanda dalam px sepanjang sumbu terkunci; null selama masih dianggap ketukan. */
  move(x: number, y: number, t: number): number | null {
    this.last = { x, y, t };
    this.trail.push(this.last);
    while (this.trail.length > 2 && t - this.trail[0]!.t > TOUCH.velocityWindow) this.trail.shift();
    if (!this.axis) {
      const dx = Math.abs(x - this.origin.x);
      const dy = Math.abs(y - this.origin.y);
      if (Math.max(dx, dy) < INPUT.touchSlop) return null;
      this.axis = dx > dy ? "x" : "y";
    }
    return this.signed();
  }

  /** + = menuju slide berikutnya. */
  signed(): number {
    if (!this.axis) return 0;
    return this.axis === "x" ? this.origin.x - this.last.x : this.origin.y - this.last.y;
  }

  /** Sentakan saat dilepas: kecepatan akhir yang tinggi, atau geser pendek yang cepat. */
  end(t: number): Dir | 0 {
    if (!this.axis) return 0;
    const from = this.trail[0]!;
    const span = Math.max(1, this.last.t - from.t);
    const moved = this.axis === "x" ? from.x - this.last.x : from.y - this.last.y;
    // jari berhenti dulu sebelum diangkat → bukan sentakan
    const velocity = t - this.last.t > TOUCH.restMs ? 0 : moved / span;
    if (Math.abs(velocity) >= INPUT.flickVelocity) return velocity > 0 ? 1 : -1;
    const total = this.signed();
    if (Math.abs(total) >= INPUT.swipeMin && t - this.origin.t <= INPUT.swipeMaxMs) return total > 0 ? 1 : -1;
    return 0;
  }

  /**
   * Tarikan panjang, secepat atau selambat apa pun: arahnya bila jari sudah menempuh `min` px sepanjang sumbunya.
   * Dipakai di slide yang tidak men-scrub (judul hari, gong penutup, Calm mode), supaya tarikan pelan yang jelas
   * disengaja tetap satu langkah; di slide yang men-scrub keputusan tetap pada ambang 35% dan sentakan.
   */
  reach(min: number): Dir | 0 {
    const total = this.signed();
    return Math.abs(total) >= min ? (total > 0 ? 1 : -1) : 0;
  }
}

/** Tarikan sepanjang ini (bagian dari tinggi/lebar layar, paling sedikit 2 × `swipeMin`) = satu langkah tanpa scrub. */
export const LONG_DRAG = 0.18;
export const longDragPx = (size: number) => Math.max(INPUT.swipeMin * 2, size * LONG_DRAG);

// ---------------------------------------------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------------------------------------------

export type KeyAction = { type: "step"; dir: Dir } | { type: "edge"; to: "first" | "last" } | null;
type KeyLike = { key: string; shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; repeat?: boolean };

/**
 * Panah / spasi / PageDown = satu slide. Tombol yang ditahan (repeat) diabaikan: satu tekanan = satu slide.
 * `onControl`: fokus sedang di tombol/tautan, jadi Spasi & Enter milik tombol itu.
 */
export function keyAction(e: KeyLike, onControl = false): KeyAction {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return null;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowRight":
    case "PageDown":
      return { type: "step", dir: 1 };
    case "ArrowUp":
    case "ArrowLeft":
    case "PageUp":
      return { type: "step", dir: -1 };
    case " ":
    case "Spacebar":
      return onControl ? null : { type: "step", dir: e.shiftKey ? -1 : 1 };
    case "Home":
      return { type: "edge", to: "first" };
    case "End":
      return { type: "edge", to: "last" };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Sambungan ke DOM
// ---------------------------------------------------------------------------------------------------------------

export type InputHandlers = {
  /** Sumbu transisi dari slide sekarang ke arah `dir` ("x" di dalam gallery). null = tidak ada slide di arah itu. */
  axisFor(dir: Dir): Axis | null;
  /** Jarak jari (px) untuk satu slide penuh pada transisi ke arah `dir`. */
  spanFor(dir: Dir): number;
  step(dir: Dir, source: "wheel" | "key" | "touch"): void;
  edge(to: "first" | "last"): void;
  /** Jari mulai men-scrub ke arah `dir`. */
  scrubStart(dir: Dir): void;
  scrub(signed: number): void;
  scrubEnd(flick: Dir | 0): void;
  /** false = jari ke arah `dir` tidak men-scrub (Calm mode, slide gong 3D, tahap judul): geser dinilai saat dilepas. */
  canScrub(dir: Dir): boolean;
  /** true = input film sedang dimatikan (sheet detail terbuka). */
  paused(): boolean;
  /**
   * Zoom objek di slide ini (slide gong 3D): Ctrl+roda / cubit trackpad (`amount` = deltaY) atau tombol + / −
   * (`amount` = +1 mendekat, −1 menjauh). true = dipakai; false = biarkan perilaku bawaan (zoom browser).
   */
  zoom?(kind: "wheel" | "key", amount: number): boolean;
  /** Cubit dua jari mulai: true = dipakai untuk zoom objek (jari tidak lagi dibaca sebagai geser slide). */
  pinchStart?(): boolean;
  /** Cubit berlangsung: jarak jari sekarang ÷ jarak awal. */
  pinch?(ratio: number): void;
  /**
   * Seret mendatar di slide yang objeknya bisa dikitari (gong 3D di judul hari, hero, gong penutup): mouse, jari, atau
   * geser dua jari trackpad. `orbitStart` true = dipakai (slide tidak ikut terseret); `orbit` menerima jarak seret
   * (px, + = ke kanan) sejak mulai dan lebar layar; `orbitEnd` saat dilepas.
   */
  orbitStart?(): boolean;
  orbit?(dx: number, width: number): void;
  orbitEnd?(): void;
};

const CONTROL = "a[href], button, input, select, textarea, summary, [role='button'], [contenteditable='true']";
/** Area yang di-scroll biasa (sheet detail, credits): geseran di dalamnya bukan untuk pindah slide. */
const SCROLLER = "[data-scroll], dialog";

const within = (target: EventTarget | null, selector: string) => target instanceof Element && target.closest(selector) !== null;

/** Pasang semua pendengar pada `root`. Mengembalikan fungsi pelepas. */
export function bindInput(root: HTMLElement, h: InputHandlers): () => void {
  const wheel = new WheelGestures();
  /** Geser dua jari trackpad mendatar yang sedang mengitari objek: jarak terkumpul (px) dan pengakhirnya. */
  let wheelOrbit: { dx: number; timer: ReturnType<typeof setTimeout> | null } | null = null;
  const endWheelOrbit = () => {
    if (!wheelOrbit) return;
    if (wheelOrbit.timer) clearTimeout(wheelOrbit.timer);
    wheelOrbit = null;
    h.orbitEnd?.();
  };

  const onWheel = (e: WheelEvent) => {
    // ctrl+roda (dan cubit trackpad, yang tiba sebagai ctrl+roda): zoom objek bila slide ini punya, selain itu zoom browser
    if (e.ctrlKey) {
      if (!h.paused() && h.zoom?.("wheel", e.deltaY)) e.preventDefault();
      return;
    }
    if (h.paused() || within(e.target, SCROLLER)) return;
    e.preventDefault(); // tanpa scroll bawaan dan tanpa gestur "kembali" trackpad
    const allowX = h.axisFor(1) === "x" || h.axisFor(-1) === "x";
    // geser dua jari mendatar di luar gallery: mengitari objek (bila slide ini punya), lepas sesudah jeda singkat
    const unit = e.deltaMode === 1 ? INPUT.wheelLine : e.deltaMode === 2 ? root.clientWidth : 1;
    if (!allowX && !e.shiftKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) && (wheelOrbit || h.orbitStart?.())) {
      wheelOrbit ??= { dx: 0, timer: null };
      wheelOrbit.dx -= e.deltaX * unit; // jari ke kanan = deltaX negatif = seret ke kanan
      h.orbit?.(wheelOrbit.dx, root.clientWidth);
      if (wheelOrbit.timer) clearTimeout(wheelOrbit.timer);
      wheelOrbit.timer = setTimeout(endWheelOrbit, INPUT.wheelGap);
      return;
    }
    const dir = wheel.push(wheelSample(e, allowX, root.clientHeight));
    if (dir) h.step(dir, "wheel");
  };

  const onKey = (e: KeyboardEvent) => {
    if (h.paused() || e.defaultPrevented || within(e.target, "input, select, textarea, [contenteditable='true'], dialog")) return;
    // + / − : zoom objek di slide ini (tanpa Ctrl/Cmd, yang tetap zoom browser)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_")) {
      if (h.zoom?.("key", e.key === "-" || e.key === "_" ? -1 : 1)) e.preventDefault();
      return;
    }
    const action = keyAction(e, within(e.target, CONTROL));
    if (!action) return;
    e.preventDefault();
    if (action.type === "step") h.step(action.dir, "key");
    else h.edge(action.to);
  };

  // ---- sentuhan (pointer events; mouse tidak men-scrub) ----
  let touch: { id: number; tracker: TouchTracker; scrubbing: boolean; dragged: boolean; orbiting: boolean; x0: number } | null = null;

  const signedProgress = (px: number): number => {
    const dir: Dir = px >= 0 ? 1 : -1;
    const axis = h.axisFor(dir);
    if (!axis || axis !== touch?.tracker.axis) return 0; // tidak ada slide ke arah itu, atau sumbunya lain
    return px / Math.max(1, h.spanFor(dir));
  };

  // ---- cubit dua jari: zoom objek (slide gong 3D). Jari kedua membatalkan geser slide yang sedang dibaca. ----
  const fingers = new Map<number, { x: number; y: number }>();
  let pinch: { from: number } | null = null;
  const spread = () => {
    const [a, b] = [...fingers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const onFinger = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || h.paused()) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size !== 2 || pinch || !h.pinchStart) return;
    if (!h.pinchStart()) return;
    pinch = { from: Math.max(1, spread()) };
    if (touch?.scrubbing) h.scrubEnd(0);
    if (touch?.orbiting) h.orbitEnd?.();
    touch = null;
  };
  const onFingerMove = (e: PointerEvent) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    f.x = e.clientX;
    f.y = e.clientY;
    if (pinch && fingers.size === 2) h.pinch?.(spread() / pinch.from);
  };
  const onFingerUp = (e: PointerEvent) => {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinch = null;
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || !e.isPrimary || touch || pinch || h.paused() || within(e.target, SCROLLER)) return;
    touch = { id: e.pointerId, tracker: new TouchTracker(e.clientX, e.clientY, e.timeStamp), scrubbing: false, dragged: false, orbiting: false, x0: e.clientX };
  };

  const onMove = (e: PointerEvent) => {
    if (!touch || pinch || e.pointerId !== touch.id) return;
    const px = touch.tracker.move(e.clientX, e.clientY, e.timeStamp);
    if (px === null) return;
    if (!touch.dragged) {
      touch.dragged = true;
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* pointer sudah dilepas */
      }
      // scrub hanya bila jari searah sumbu transisi; selain itu gerakan dinilai saat dilepas. Geser mendatar di luar
      // gallery mengitari objek bila slide ini punya.
      const dir: Dir = px >= 0 ? 1 : -1;
      if (h.canScrub(dir) && h.axisFor(dir) === touch.tracker.axis) {
        touch.scrubbing = true;
        h.scrubStart(dir);
      } else if (touch.tracker.axis === "x" && h.axisFor(dir) !== "x" && h.orbitStart?.()) touch.orbiting = true;
    }
    if (touch.scrubbing) h.scrub(signedProgress(px));
    else if (touch.orbiting) h.orbit?.(e.clientX - touch.x0, root.clientWidth);
  };

  const finish = (e: PointerEvent, cancelled: boolean) => {
    if (!touch || e.pointerId !== touch.id) return;
    const { tracker, scrubbing, dragged, orbiting } = touch;
    touch = null;
    if (!dragged) return; // ketukan: biarkan klik berjalan
    if (orbiting) return h.orbitEnd?.();
    const flick = cancelled ? 0 : tracker.end(e.timeStamp);
    if (scrubbing) return h.scrubEnd(flick);
    // geser yang tidak di-scrub (sentakan, atau tarikan pelan yang cukup panjang): vertikal selalu memajukan slide,
    // menyamping hanya di gallery
    const size = tracker.axis === "x" ? root.clientWidth : root.clientHeight;
    const step = flick || (cancelled ? 0 : tracker.reach(longDragPx(size)));
    if (step && (tracker.axis === "y" || h.axisFor(step) === "x")) h.step(step, "touch");
  };
  const onUp = (e: PointerEvent) => finish(e, false);
  const onCancel = (e: PointerEvent) => finish(e, true);

  // ---- seret mouse mendatar: mengitari objek (slide yang punya). Klik tanpa seret tetap klik. ----
  let mouse: { id: number; x0: number; y0: number; orbiting: boolean } | null = null;
  const onMouseDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || h.paused() || within(e.target, SCROLLER) || within(e.target, "a[href], input, select, textarea")) return;
    mouse = { id: e.pointerId, x0: e.clientX, y0: e.clientY, orbiting: false };
  };
  const onMouseMove = (e: PointerEvent) => {
    if (!mouse || e.pointerId !== mouse.id) return;
    const dx = e.clientX - mouse.x0;
    if (!mouse.orbiting) {
      if (Math.abs(dx) < INPUT.touchSlop || Math.abs(dx) < Math.abs(e.clientY - mouse.y0)) return;
      if (!h.orbitStart?.()) {
        mouse = null;
        return;
      }
      mouse.orbiting = true;
      root.dataset.orbiting = "";
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* tombol sudah dilepas */
      }
    }
    h.orbit?.(dx, root.clientWidth);
  };
  const onMouseUp = (e: PointerEvent) => {
    if (!mouse || e.pointerId !== mouse.id) return;
    const { orbiting } = mouse;
    mouse = null;
    if (!orbiting) return;
    delete root.dataset.orbiting;
    swallowUntil = e.timeStamp + 350; // seret yang dilepas di atas tombol bukan klik
    h.orbitEnd?.();
  };

  // setelah menggeser, klik yang menyusul (di kartu/tombol tempat jari mendarat) tidak dijalankan
  let swallowUntil = 0;
  const onUpCapture = (e: PointerEvent) => {
    if (touch?.dragged && e.pointerId === touch.id) swallowUntil = e.timeStamp + 350;
  };
  const onClickCapture = (e: MouseEvent) => {
    if (e.timeStamp < swallowUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  root.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  root.addEventListener("pointerdown", onDown, { passive: true });
  root.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerdown", onFinger, { passive: true });
  root.addEventListener("pointermove", onFingerMove, { passive: true });
  root.addEventListener("pointerup", onFingerUp, { passive: true });
  root.addEventListener("pointercancel", onFingerUp, { passive: true });
  root.addEventListener("pointerup", onUpCapture, { capture: true, passive: true });
  root.addEventListener("pointerup", onUp, { passive: true });
  root.addEventListener("pointercancel", onCancel, { passive: true });
  root.addEventListener("click", onClickCapture, { capture: true });
  root.addEventListener("pointerdown", onMouseDown, { passive: true });
  root.addEventListener("pointermove", onMouseMove, { passive: true });
  root.addEventListener("pointerup", onMouseUp, { passive: true });
  root.addEventListener("pointercancel", onMouseUp, { passive: true });
  return () => {
    endWheelOrbit();
    root.removeEventListener("pointerdown", onMouseDown);
    root.removeEventListener("pointermove", onMouseMove);
    root.removeEventListener("pointerup", onMouseUp);
    root.removeEventListener("pointercancel", onMouseUp);
    root.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerdown", onFinger);
    root.removeEventListener("pointermove", onFingerMove);
    root.removeEventListener("pointerup", onFingerUp);
    root.removeEventListener("pointercancel", onFingerUp);
    root.removeEventListener("pointerup", onUpCapture, { capture: true });
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onCancel);
    root.removeEventListener("click", onClickCapture, { capture: true });
  };
}
