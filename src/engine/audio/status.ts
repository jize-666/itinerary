/**
 * Status audio yang dibaca UI global (toggle speaker di layout), tanpa membawa kode mesin audio.
 * Mesinnya (AudioEngine) hanya dimuat halaman yang memulai suara (gerbang); Today yang ringan tidak ikut mengunduhnya.
 */
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
  playSfx(name: ClickSound | SceneSound, opts: { gain?: number; delay?: number; duck?: boolean }): unknown;
  /** Unduh dan urai lebih dulu, supaya bunyi pertama tidak terlambat. */
  preload(name: SceneSound): void;
};

/** Sama dengan CLICK_LEVEL di catalog.ts (disalin supaya modul ini tetap tanpa kode mesin). */
const CLICK_GAIN = 0.45;
/** Sama dengan SFX_LEVEL di catalog.ts. */
const SCENE_GAIN = 0.9;

export const INITIAL_AUDIO: AudioState = { started: false, enabled: false };
let state: AudioState = INITIAL_AUDIO;
let control: AudioControl | null = null;
const listeners = new Set<() => void>();

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
    control?.setEnabled(on);
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
};
