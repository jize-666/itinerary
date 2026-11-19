/**
 * Ucapan Clawd, maskot pemandu (arahan host 15 Nov: "teks bubble nya? perkenalan dulu, nama dia clawd"). Dua bahasa
 * mengikuti sakelar EN | ID. Teks tanpa emoji supaya tetap tergambar dengan huruf piksel.
 */
import type { Lang } from "@/engine/i18n/lang";
import type { Line } from "./behavior";

export const MASCOT_NAME = "Clawd";

/** Satu ucapan dua bahasa; `touch` = ganti untuk layar sentuh ("ketuk", "geser") bila beda dengan tetikus. */
export type Text = Readonly<{ en: string; id: string; touch?: Readonly<{ en: string; id: string }> }>;

/** Perkenalan, diucapkan berurutan saat Clawd pertama muncul. */
export const INTRO: readonly Text[] = [
  { en: "Hi! I'm Clawd.", id: "Halo! Aku Clawd." },
  { en: "I'll be your guide for this whole trip.", id: "Aku pemandumu selama perjalanan ini." },
  {
    en: "Scroll or press the arrow keys to move along. I'll point out the fun stuff.",
    id: "Gulir atau tekan tombol panah untuk maju. Hal-hal seru akan kutunjukkan.",
    touch: { en: "Swipe to move along. I'll point out the fun stuff.", id: "Geser layar untuk maju. Hal-hal seru akan kutunjukkan." },
  },
  { en: "Click me anytime. Just... not too much!", id: "Klik aku kapan saja. Asal jangan kebanyakan, ya!", touch: { en: "Tap me anytime. Just... not too much!", id: "Ketuk aku kapan saja. Asal jangan kebanyakan, ya!" } },
];

/** Tamu yang sudah pernah berkenalan dengan Clawd di perangkat ini. */
export const WELCOME_BACK: readonly Text[] = [{ en: "Welcome back! Clawd here.", id: "Halo lagi! Clawd di sini." }];

/**
 * Petunjuk pemandu di film 3D (M3), menggantikan teks petunjuk lama di layar (arahan host 16 Nov: "jangan lupa untuk
 * menghapus semua text pemandu yang lama, seperti \"click the gong\" dll."). Tiap petunjuk diucapkan sekali per
 * perangkat, saat tamu pertama kali tiba di tempatnya.
 */
export type TipId = "kayon" | "beat" | "zoom" | "gallery" | "phrases" | "gong" | "credits" | "mountain";
export const TIPS: Readonly<Record<TipId, readonly Text[]>> = {
  mountain: [
    {en:"Look along the rows. The first warm light has to clear the ridge.",id:"Coba lihat barisan teh itu. Cahaya pagi baru sampai setelah melewati punggung bukit."},
  ],
  kayon: [
    { en: "This is the gunungan. It opens every wayang show.", id: "Ini gunungan, pembuka setiap pertunjukan wayang." },
    {
      en: "Click it to turn it over, or scroll to pull it out and begin.",
      id: "Klik untuk membaliknya, atau gulir untuk mencabutnya dan mulai.",
      touch: { en: "Tap it to turn it over, or swipe to pull it out and begin.", id: "Ketuk untuk membaliknya, atau geser untuk mencabutnya dan mulai." },
    },
  ],
  beat: [
    {
      en: "See the gong? Scroll once more: the letters fly into it and it rings.",
      id: "Lihat gong itu? Gulir sekali lagi: hurufnya tersedot dan gongnya berbunyi.",
      touch: { en: "See the gong? Swipe once more: the letters fly into it and it rings.", id: "Lihat gong itu? Geser sekali lagi: hurufnya tersedot dan gongnya berbunyi." },
    },
  ],
  zoom: [
    {
      en: "Want a closer look? Ctrl + scroll or the + and - keys zoom in. Drag sideways to circle the gong.",
      id: "Mau lebih dekat? Ctrl + gulir atau tombol + dan - untuk zoom. Seret ke samping untuk mengitari gong.",
      touch: { en: "Want a closer look? Pinch to zoom in, and drag sideways to circle the gong.", id: "Mau lebih dekat? Cubit untuk zoom, dan seret ke samping untuk mengitari gong." },
    },
  ],
  gallery: [
    {
      en: "These are the stops for the day. Scroll to move between them.",
      id: "Ini tempat-tempat hari ini. Gulir untuk pindah tempat.",
      touch: { en: "These are the stops for the day. Swipe to move between them.", id: "Ini tempat-tempat hari ini. Geser untuk pindah tempat." },
    },
    { en: "Click \"The story\" on a card for the details.", id: "Klik \"Ceritanya\" di kartu untuk detailnya.", touch: { en: "Tap \"The story\" on a card for the details.", id: "Ketuk \"Ceritanya\" di kartu untuk detailnya." } },
  ],
  phrases: [
    {
      en: "Click a card to turn it over. Try saying them out loud!",
      id: "Klik kartu untuk membaliknya. Coba ucapkan, ya!",
      touch: { en: "Tap a card to turn it over. Try saying them out loud!", id: "Ketuk kartu untuk membaliknya. Coba ucapkan, ya!" },
    },
  ],
  gong: [
    {
      en: "That's the end of the day. Click the gong to close it!",
      id: "Hari ini selesai. Klik gongnya untuk menutupnya!",
      touch: { en: "That's the end of the day. Tap the gong to close it!", id: "Hari ini selesai. Ketuk gongnya untuk menutupnya!" },
    },
  ],
  credits: [{ en: "Thanks for watching with me. See you on the trip!", id: "Terima kasih sudah menonton bersamaku. Sampai jumpa di perjalanan!" }],
};

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

/** Teks satu ucapan dalam bahasa `lang`; `touch` = layar sentuh. */
export const textOf = (t: Text, lang: Lang, touch = false) => {
  const v = touch && t.touch ? t.touch : t;
  return v[lang] || v.en;
};
