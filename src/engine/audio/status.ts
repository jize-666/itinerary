/**
 * Status audio yang dibaca UI global (toggle speaker di layout), tanpa membawa kode mesin audio.
 * Mesinnya (AudioEngine) hanya dimuat halaman yang memulai suara (gerbang); Today yang ringan tidak ikut mengunduhnya.
 */
import type { BeepTone } from "@/engine/mascot/beep";

export type AudioState = Readonly<{
  /** Tamu sudah menekan "Begin the lakon" di gerbang. */
  started: boolean;
  /** Suara menyala (toggle). */
  enabled: boolean;
}>;

/** Bunyi klik tombol: pop (utama), click (sekunder), tok (sakelar). */
export type ClickSound = "ui-pop" | "ui-click" | "ui-tok";

/** Bunyi adegan film: pukulan gong ageng, napas api naga gayor, dan gunungan yang dibalik. */
export type SceneSound = "gong" | "api-naga" | "gunungan-balik";

/** Bagian mesin yang dipakai UI global. setEnabled dipanggil sinkron di handler klik (kebijakan autoplay iOS). */
export type AudioControl = {
  setEnabled(on: boolean): void;
  environment?(): {context:AudioContext;output:AudioNode} | null;
  playSfx(name: ClickSound | SceneSound, opts: { gain?: number; delay?: number; duck?: boolean }): unknown;
  /** Unduh dan urai lebih dulu, supaya bunyi pertama tidak terlambat. */
  preload(name: SceneSound): void;
  /** "Biip" Clawd: satu bunyi pendek untuk satu kata di gelembung. */
  playBeep(tone: BeepTone): void;
};

/** Sama dengan CLICK_LEVEL di catalog.ts (disalin supaya modul ini tetap tanpa kode mesin). */
const CLICK_GAIN = 0.45;
/** Sama dengan SFX_LEVEL di catalog.ts. */
const SCENE_GAIN = 0.9;

export const INITIAL_AUDIO: AudioState = { started: false, enabled: false };
let state: AudioState = INITIAL_AUDIO;
let control: AudioControl | null = null;
const listeners = new Set<() => void>();

/**
 * Mesin audio diunduh saat dibutuhkan. Halaman yang dibuka tanpa gerbang (tab dimuat ulang iOS, tautan langsung,
 * Today dari Home Screen) memanaskannya di waktu senggang supaya ketukan speaker pertama tetap di dalam gesture
 * (kebijakan autoplay iOS). Hanya kodenya: berkas suara baru diunduh setelah suara dinyalakan.
 */
let loading: Promise<AudioControl> | null = null;
function loadEngine(): Promise<AudioControl> {
  loading ??= import("./AudioEngine").then((m) => m.getAudio());
  loading.catch(() => (loading = null)); // luring: coba lagi nanti
  return loading;
}

export const audioStatus = {
  get: () => state,
  getServer: () => INITIAL_AUDIO,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Dipanggil mesin audio setiap statusnya berubah. */
  publish(next: AudioState, by: AudioControl) {
    state = next;
    control = by;
    for (const fn of listeners) fn();
  },
  setEnabled(on: boolean) {
    if (control) control.setEnabled(on);
    // belum sempat dipanaskan: muat lalu nyalakan (di iOS bisa butuh ketukan kedua untuk membuka konteks)
    else if (on) void loadEngine().then((c) => c.setEnabled(true), () => {});
  },
  /** Panaskan mesin audio di waktu senggang (tombol speaker tampil tanpa mesin). */
  warm() {
    if (control || loading || typeof window === "undefined") return;
    const go = () => void loadEngine().catch(() => {});
    if ("requestIdleCallback" in window) window.requestIdleCallback(go, { timeout: 2000 });
    else setTimeout(go, 300);
  },
  /** Bunyi klik: hanya setelah lakon dimulai dan gamelan menyala; di-mute → hening. */
  click(sound: ClickSound) {
    if (state.started && state.enabled) void control?.playSfx(sound, { gain: CLICK_GAIN, duck: false });
  },
  /**
   * Bunyi adegan, `delay` detik dari sekarang (pukulan gong berbunyi saat tabuh kena, bukan saat diayun).
   * Syaratnya sama dengan bunyi klik: lakon sudah dimulai dan suara menyala. Gong merendahkan gendhing sebentar.
   */
  scene(sound: SceneSound, delay = 0, level = 1) {
    if (state.started && state.enabled) void control?.playSfx(sound, { gain: SCENE_GAIN * level, delay, duck: sound === "gong" });
  },
  /** Siapkan bunyi adegan sebelum dipakai (tamu sedang menuju slide gong). Hening → tidak mengunduh apa pun. */
  prepare(...sounds: SceneSound[]) {
    if (state.started && state.enabled) for (const s of sounds) control?.preload(s);
  },
  /** Lakon sudah dimulai, suara menyala, dan mesin audio sudah dimuat (bunyi prosedural boleh dibangkitkan). */
  environment: () => state.started && state.enabled ? control?.environment?.() ?? null : null,
  voiceOn: () => state.started && state.enabled && control !== null,
  /** Satu "biip" Clawd. Hening → tidak berbunyi. Pada rekaman pratinjau, `__clawdBeep` ikut menerima nadanya. */
  beep(tone: BeepTone) {
    if (!state.started || !state.enabled) return;
    void control?.playBeep(tone);
    (globalThis as { __clawdBeep?: (t: BeepTone) => void }).__clawdBeep?.(tone);
  },
};
