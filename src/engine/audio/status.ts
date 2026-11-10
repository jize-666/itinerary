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

/** Bagian mesin yang dipakai UI global. setEnabled dipanggil sinkron di handler klik (kebijakan autoplay iOS). */
export type AudioControl = {
  setEnabled(on: boolean): void;
  playSfx(name: ClickSound, opts: { gain?: number; duck?: boolean }): unknown;
};

/** Sama dengan CLICK_LEVEL di catalog.ts (disalin supaya modul ini tetap tanpa kode mesin). */
const CLICK_GAIN = 0.45;

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
};
