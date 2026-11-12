/**
 * Pesan kecil dari lapisan DOM film ke panggung 3D, supaya komponen film tidak perlu mengimpor three.
 * Murni: tanpa DOM, tanpa three. Panggung mendaftarkan gong-nya saat hidup dan melepasnya saat dibongkar.
 */

/** Memulai satu pukulan. Mengembalikan detik sampai tabuh mengenai gong, atau `null` bila pukulan sebelumnya belum selesai. */
type Striker = () => number | null;

let striker: Striker | null = null;
let ready = false;
let kayon = false;
let sweep = false;

export const stageBus = {
  /** Panggung 3D: daftarkan gong. Mengembalikan pembatal. */
  bindGong(fn: Striker): () => void {
    striker = fn;
    return () => {
      if (striker === fn) striker = null;
    };
  },
  /**
   * Minta gong dipukul. Angka = pukulan dimulai, hantamannya sekian detik lagi; "busy" = pukulan sebelumnya
   * belum selesai; "flat" = tidak ada gong 3D (film 2,5D), pemanggil mengurus sendiri bunyi dan riaknya.
   */
  strikeGong(): number | "busy" | "flat" {
    if (!striker) return "flat";
    return striker() ?? "busy";
  },
  /** Kursor atau fokus ada di atas gong: tabuh terangkat sedikit, tanda siap dipukul. */
  setReady(on: boolean) {
    ready = on;
  },
  ready: () => ready,
  /** Panggung 3D: gunungan siap dipakai (teksturnya sudah di GPU) atau tidak lagi (panggung dibongkar). */
  setKayon(on: boolean) {
    kayon = on;
    if (!on) sweep = false;
  },
  kayon: () => kayon,
  /**
   * Lapisan DOM, saat merencanakan transisi: `wanted` = transisi ini sapuan antar bab. Mengembalikan true bila
   * gunungan 3D yang menyapu (lapisan DOM lalu tidak menggambar bayangan kayonnya sendiri). Transisi lain
   * mencabutnya, jadi panggung dan DOM selalu sepakat siapa yang menggambar sapuan.
   */
  claimSweep(wanted: boolean): boolean {
    sweep = wanted && kayon;
    return sweep;
  },
  sweep: () => sweep,
};
