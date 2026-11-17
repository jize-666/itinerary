/**
 * Tahap di dalam satu slide (Tugas 7b, permintaan host 14 Nov: "pas fase sebelum masuk galery … harusnya ini fase
 * yang pas untuk menabuh gong, ketika teks out, kamera masih berada di tempatnya").
 *
 * Di slide judul hari dan hero prolog, langkah maju pertama tidak memindah slide: teks judul keluar (tersedot ke
 * gong), gong ditabuh, dan kamera tetap di shot-nya. Langkah maju berikutnya baru pindah slide. Mundur saat teks
 * sudah keluar mengembalikan teks tanpa memukul; mundur sekali lagi pindah ke slide sebelumnya.
 * Tiba di slide ini dari arah mana pun selalu mulai dari tahap 0 (teks tampil), jadi tidak ada slide tanpa teks
 * yang ditemui tamu saat mundur.
 *
 * Murni: tanpa DOM. Sutradara (`director.ts`) memegang tahapnya; lapisan DOM dan panggung 3D hanya membacanya.
 */
import type { Slide } from "./build-slides";

/** 0 = teks tampil; 1 = teks sudah keluar dan gong sudah ditabuh. */
export type Beat = 0 | 1;

/** Slide yang punya tahap gong: judul hari dan hero prolog (jawaban host 14 Nov: "berlaku semua"). */
export const hasStrikeBeat = (slide: Slide | undefined): boolean => slide?.kind === "title" || slide?.kind === "hero";

/**
 * Langkah `dir` di slide `slide` pada tahap `beat`: tahap berikutnya bila langkah ini dipakai tahap (slide tidak
 * pindah), atau null bila langkah diteruskan ke perpindahan slide.
 */
export function beatStep(slide: Slide | undefined, beat: Beat, dir: 1 | -1): Beat | null {
  if (!hasStrikeBeat(slide)) return null;
  if (dir > 0 && beat === 0) return 1;
  if (dir < 0 && beat === 1) return 0;
  return null;
}
