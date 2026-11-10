/**
 * Unit film (slide atau kartu gallery) yang sudah "hidup": reveal teksnya boleh berjalan.
 * Lapisan slide dipasang lebih dulu dalam keadaan tersembunyi supaya transisi bisa langsung mulai; animasi masuk
 * teksnya baru dijalankan ketika penonton benar-benar tiba (±450 ms setelah transisi dimulai, PRD §9).
 */
export type LiveStore = {
  has(id: string): boolean;
  /** Tandai hidup; boleh ditunda (ms). Mengembalikan pembatal. */
  add(id: string, delay?: number): () => void;
  subscribe(fn: () => void): () => void;
  clear(): void;
};

export function createLiveStore(): LiveStore {
  const live = new Set<string>();
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const emit = () => listeners.forEach((fn) => fn());
  const mark = (id: string) => {
    if (live.has(id)) return;
    live.add(id);
    emit();
  };
  return {
    has: (id) => live.has(id),
    add(id, delay = 0) {
      if (delay <= 0) {
        mark(id);
        return () => {};
      }
      const timer = setTimeout(() => {
        timers.delete(timer);
        mark(id);
      }, delay);
      timers.add(timer);
      return () => {
        clearTimeout(timer);
        timers.delete(timer);
      };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    clear() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      live.clear();
      emit();
    },
  };
}
