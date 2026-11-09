/**
 * Label tombol global di layout (bahasa & suara). Dipisah dari kamus lengkap (strings.ts) supaya chunk layout
 * tidak membawa salinan kedua seluruh kamus; tetap digabung ke STRINGS, jadi translate() & tesnya tidak berubah.
 */
export const CHROME = {
  "lang.label": { en: "Language", id: "Bahasa" },
  "lang.en": { en: "English", id: "Bahasa Inggris" },
  "lang.id": { en: "Indonesian", id: "Bahasa Indonesia" },
  "sound.label": { en: "Gamelan sound", id: "Suara gamelan" },
  "sound.on": { en: "Gamelan on", id: "Gamelan menyala" },
  "sound.off": { en: "Gamelan off", id: "Gamelan mati" },
} as const satisfies Record<string, { en: string; id: string }>;
