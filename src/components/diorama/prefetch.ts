let started = false;
/** Unduh chunk maket (three + adegan) di waktu senggang, sekali saja; gagal diam-diam (dimuat lagi saat masuk). */
export function prefetchDiorama() {
  if (started || typeof window === "undefined") return;
  started = true;
  const go = () => void import("./Diorama").catch(() => {});
  const w = window as Window & { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 3000 });
  else setTimeout(go, 1500);
}
