/**
 * Tempat sesi dan salinan trip disimpan di perangkat (keputusan host 11 Nov 2026):
 * - tab browser biasa → `sessionStorage`: hidup selama tab itu. Tab baru atau browser yang dibuka ulang meminta
 *   kode lagi; muat ulang di tab yang sama tetap masuk.
 * - Today yang dipasang ke Home Screen (standalone) → `localStorage`: tetap ingat, supaya bisa dibuka offline di jalan
 *   (PRD FR-33; verifikasi kode butuh jaringan).
 */
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Sudah dibuka dari Home Screen? */
export function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

const safe = (pick: () => Storage): Store | undefined => {
  try {
    return typeof window !== "undefined" ? pick() : undefined;
  } catch {
    return undefined; // penyimpanan diblokir: tidak diingat, tamu diminta kode lagi
  }
};

/** Penyimpanan permanen perangkat. Hanya aplikasi Home Screen yang menaruh sesi di sini. */
export const persistentStore = (): Store | undefined => safe(() => window.localStorage);

/** Penyimpanan untuk sesi & salinan trip, menurut cara web ini dibuka. */
export const deviceStore = (): Store | undefined => (isStandalone() ? persistentStore() : safe(() => window.sessionStorage));
