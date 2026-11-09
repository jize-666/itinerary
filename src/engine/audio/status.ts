/**
 * Status audio yang dibaca UI global (toggle speaker di layout), tanpa membawa kode mesin audio.
 * Mesinnya (AudioEngine) hanya dimuat halaman yang memulai suara (gerbang); Today yang ringan tidak ikut mengunduhnya.
 */
export type AudioState = Readonly<{
  /** Tamu sudah memilih di gerbang ("Begin with gamelan" / "Begin quietly"). */
  started: boolean;
  /** Suara menyala (toggle). */
  enabled: boolean;
}>;

/** Bagian mesin yang dipakai toggle. Dipanggil sinkron di handler klik (kebijakan autoplay iOS). */
export type AudioControl = { setEnabled(on: boolean): void };

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
};
