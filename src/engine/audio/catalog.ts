/**
 * Katalog audio. Gendhing adalah rekaman gamelan Solo milik host (diolah lewat scripts/audio/build-audio.sh).
 * File statis di public/audio: tidak memuat data trip maupun data pribadi.
 */
export const BEDS = {
  /** Sambutan: diputar sekali saat tamu menekan "Begin the lakon" (suara menyala), lalu bersambung ke keraton. */
  "kebo-giro": "/audio/gamelan/kebo-giro.mp3",
  /** Latar bab: tenang & berwibawa dengan gong berkala, diulang tanpa jeda (crossfade). */
  keraton: "/audio/gamelan/keraton.mp3",
  /** Momen murka & penutup: rapat, diakhiri gong. */
  gendhing: "/audio/gamelan/gendhing.mp3",
} as const;

export const SFX = {
  gong: "/audio/sfx/gong-ageng.mp3",
  "api-naga": "/audio/sfx/api-naga.mp3",
  "gunungan-balik": "/audio/sfx/gunungan-balik.mp3",
  "keris-bangkit": "/audio/sfx/keris-bangkit.mp3",
  /** Klik tombol (src/components/motion/PressFx.tsx). pop/click: paket SFX bebas lisensi dari host (izin kreator lewat DM);
   *  tok: ketukan keprak dalang (ElevenLabs, paket gratis). Masing-masing < 4 KB. */
  "ui-pop": "/audio/sfx/ui-pop.mp3",
  "ui-click": "/audio/sfx/ui-click.mp3",
  "ui-tok": "/audio/sfx/ui-tok.mp3",
} as const;

export type BedName = keyof typeof BEDS;
export type SfxName = keyof typeof SFX;

/** Gendhing diletakkan di bawah visual; efek suara di atasnya. */
export const BED_LEVEL = 0.55;
export const SFX_LEVEL = 0.9;
/** Klik tombol cukup lirih di bawah gendhing; tidak merendahkan gendhing. */
export const CLICK_LEVEL = 0.45;
/** Saat efek besar berbunyi (gong), gendhing direndahkan sebentar. */
export const DUCK_LEVEL = 0.32;
