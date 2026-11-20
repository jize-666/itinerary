/** Keadaan kain batik: progres torehan dan kadar tiap tahap (0–1). Murni data, tanpa DOM atau three. */
export type BatikState = {
  /** Progres torehan 0–1 (dab dan bidang dengan waktu ≤ progres sudah di kain). */
  draw: number;
  /** Kadar celup nila 0–1 (kain turun ke bak dari tepi bawah; 1 = seluruh kain sudah terendam). */
  nila: number;
  /** Malam tembok dikerok 0–1. */
  kerok: number;
  /** Kadar celup soga 0–1. */
  soga: number;
  /** Malam dilorod 0–1. */
  lorod: number;
};

export const EMPTY_STATE: BatikState = { draw: 0, nila: 0, kerok: 0, soga: 0, lorod: 0 };
