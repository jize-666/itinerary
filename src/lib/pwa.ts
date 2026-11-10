/**
 * PWA (PRD FR-33/36): mendaftarkan service worker dan menangkap prompt "Install app" Android.
 * Versi build ikut di URL service worker, jadi tiap deploy memasang cache baru dan membuang yang lama.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

// Didaftarkan saat modul dimuat (sebelum hidrasi selesai), supaya event yang datang awal tidak terlewat.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export const installPrompt = {
  get: () => deferred,
  getServer: () => null,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async prompt(): Promise<boolean> {
    const e = deferred;
    if (!e) return false;
    deferred = null;
    emit();
    await e.prompt();
    return (await e.userChoice).outcome === "accepted";
  },
};

/** Sudah dibuka dari Home Screen? */
export function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

let started = false;
export function startPwa() {
  if (started || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  started = true;
  if (process.env.NODE_ENV !== "production") return; // dev server: tanpa cache supaya HMR tidak tertahan
  const register = () => navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { scope: "/" }).catch(() => undefined);
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
