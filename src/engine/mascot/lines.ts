/**
 * Ucapan Clawd, maskot pemandu (arahan host 15 Nov: "teks bubble nya? perkenalan dulu, nama dia clawd"). Dua bahasa
 * mengikuti sakelar EN | ID. Teks tanpa emoji supaya tetap tergambar dengan huruf piksel.
 */
import type { Lang } from "@/engine/i18n/lang";
import type { Line } from "./behavior";

export const MASCOT_NAME = "Clawd";

type Text = Readonly<{ en: string; id: string }>;

/** Perkenalan, diucapkan berurutan saat Clawd pertama muncul. */
export const INTRO: readonly Text[] = [
  { en: "Hi! I'm Clawd.", id: "Halo! Aku Clawd." },
  { en: "I'll be your guide for this whole trip.", id: "Aku pemandumu selama perjalanan ini." },
  { en: "Swipe or scroll to move along. I'll point out the fun stuff.", id: "Geser atau gulir untuk maju. Hal-hal seru akan kutunjukkan." },
  { en: "Tap me anytime. Just... not too much!", id: "Klik aku kapan saja. Asal jangan kebanyakan, ya!" },
];

/** Kunci ucapan: reaksi dari `behavior.ts` ditambah "istirahat" (mulai mengantuk). */
export type SpeechKey = Line | "rest";

/** Ucapan spontan; tiap kunci punya beberapa variasi yang digilir supaya tidak terdengar berulang. */
export const SAY: Readonly<Record<SpeechKey, readonly Text[]>> = {
  tap: [
    { en: "Hm? What's up?", id: "Hm? Ada apa?" },
    { en: "Yes? I'm right here.", id: "Ya? Aku di sini." },
    { en: "Hehe, that tickles!", id: "Hehe, geli!" },
  ],
  happy: [
    { en: "Hehe, thank you!", id: "Hehe, makasih!" },
    { en: "Yay! Again, again!", id: "Asyik! Lagi, lagi!" },
  ],
  love: [
    { en: "Aww, you're the sweetest!", id: "Aww, kamu baik banget!" },
    { en: "Best travel buddy ever!", id: "Teman jalan terbaik!" },
  ],
  angry: [
    { en: "Hey! Stop poking me!", id: "Hei! Jangan dipencet terus!" },
    { en: "Ow! Easy there!", id: "Aduh! Pelan-pelan dong!" },
  ],
  calm: [
    { en: "Okay... I'm calm now.", id: "Oke... aku sudah tenang." },
    { en: "Hmph. You're forgiven.", id: "Hmph. Kumaafkan, deh." },
  ],
  rest: [{ en: "Yawn... I'll rest for a bit.", id: "Hoaam... aku istirahat sebentar, ya." }],
  wake: [
    { en: "Huh! I wasn't sleeping!", id: "Eh! Aku nggak tidur kok!" },
    { en: "Yawn... is it morning already?", id: "Hoaam... sudah pagi, ya?" },
  ],
  gong: [
    { en: "Whoa! That startled me!", id: "Wah! Kaget aku!" },
    { en: "That gong is loud!", id: "Gongnya keras, ya!" },
  ],
};

/** Teks satu ucapan dalam bahasa `lang`. */
export const textOf = (t: Text, lang: Lang) => t[lang] || t.en;
