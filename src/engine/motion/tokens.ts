/**
 * Token gerak (docs/design/motion-tokens.md, disetujui host lewat prototipe Framer 8 Nov 2026).
 * Satu sumber: komponen JS memakai nilai di sini, CSS memakai variabel --ease-* / --dur-* yang sama di globals.css.
 */
export const EASE = {
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  power3Out: "cubic-bezier(0.33, 1, 0.68, 1)",
  expoInOut: "cubic-bezier(0.87, 0, 0.13, 1)",
  sineInOut: "cubic-bezier(0.45, 0, 0.55, 1)",
  power3InOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** Titik kendali kurva yang sama, untuk dihitung di JS (kemajuan transisi yang dibaca panggung 3D). */
export const BEZIER = {
  linear: [0, 0, 1, 1],
  expoOut: [0.16, 1, 0.3, 1],
  power3Out: [0.33, 1, 0.68, 1],
  expoInOut: [0.87, 0, 0.13, 1],
  sineInOut: [0.45, 0, 0.55, 1],
  power3InOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseName = keyof typeof BEZIER;
export const easeCss = (name: EaseName) => (name === "linear" ? "linear" : `cubic-bezier(${BEZIER[name].join(", ")})`);

export const MOTION = {
  /** bayang: bayangan wayang di kelir menajam lalu dibalik ke sisi bercat (CSS: k-bayang, 1,6 dtk, 70 ms dari tengah) */
  bayang: { dur: 1600, stagger: 70 },
  /** canting: garis emas digambar per kata (dasar + per huruf), lalu warna meresap */
  canting: { base: 260, perChar: 55 },
  /** gamelan: ketukan per kata, jeda sebelum aksen tiap empat ketuk, tunggu sebelum gong (kata terakhir) */
  gamelan: { beat: 150, hold: 70, gongWait: 140 },
  /** benang: benang emas lewat di bawah teks, satu huruf tiap 38 ms */
  benang: { perChar: 38 },
  /** stagger.item: kotak kode, stop itinerary */
  item: { dur: 600, stagger: 80 },
  /** num.odometer → hitung naik */
  count: { dur: 1800 },
  /** letterbox: bilah masuk dari atas & bawah */
  letterbox: { dur: 800 },
  /** jeda dari kode benar sampai sambutan (kotak menyala → menyatu jadi benang → kilat blencong) */
  unlock: { dur: 1150 },
} as const;

/**
 * Navigasi slide film (PRD §7.0a & §9). Durasi dalam ms, ambang dalam pecahan transisi (0–1).
 * Nilai awal dari PRD; dikalibrasi lagi di perangkat nyata.
 */
export const SLIDE = {
  /** transisi sesama bab: kamera/lapisan */
  dur: 1100,
  /** transisi antar bab: sapuan gunungan */
  wipeDur: 1600,
  /** Calm mode: crossfade */
  calmDur: 450,
  /** scrub dilepas di bawah ambang: kembali ke slide asal */
  returnDur: 400,
  /** scrub dilepas di atas ambang: sisa perjalanan paling cepat segini */
  releaseMin: 300,
  /** teks slide baru mulai masuk setelah transisi dimulai */
  textIn: 450,
  /** roda/trackpad diabaikan sampai transisi sejauh ini (ekor inersia) */
  holdUntil: 0.8,
  /** scrub dilepas di sini atau lebih → lanjut */
  scrubCommit: 0.35,
  /** ada langkah menunggu → sisa transisi dipercepat */
  hurryRate: 1.8,
} as const;

/** Ambang gerakan (PRD §9 "Ambang gerakan"). px dan ms. */
export const INPUT = {
  /** roda: akumulasi sebanyak ini = satu langkah */
  wheelThreshold: 50,
  /** jeda tanpa event roda yang mengakhiri satu gerakan */
  wheelGap: 160,
  /** dorongan baru searah saat ekor inersia masih berjalan: paling cepat segini setelah langkah terakhir */
  wheelRefire: 450,
  /** satu "baris" roda (deltaMode garis, Firefox) dalam px */
  wheelLine: 40,
  /** jari bergerak sejauh ini sebelum dianggap geser (bukan ketuk) */
  touchSlop: 10,
  /** geser cepat sejauh ini = satu langkah */
  swipeMin: 40,
  /** ... asalkan selesai dalam waktu ini */
  swipeMaxMs: 320,
  /** atau dilepas dengan kecepatan ini (px/ms) */
  flickVelocity: 0.45,
  /** jarak jari untuk satu slide penuh, sebagai pecahan tinggi layar (slide vertikal) */
  scrubSpan: 0.6,
} as const;

/**
 * Langit & matahari film mengikuti jam stop (src/engine/slides/sky.ts). Menit, kecuali disebut lain.
 * Lapisan langit: malam → subuh → siang → senja → malam, dihitung dari jam matahari terbit/terbenam hari itu.
 */
export const SKY = {
  /** subuh mulai merona sekian menit sebelum matahari terbit */
  dawnLead: 75,
  /** subuh penuh sekian menit sebelum terbit, bertahan sampai `dawnHold` sesudahnya */
  dawnFull: 15,
  dawnHold: 45,
  /** langit siang penuh sekian menit sesudah terbit (sebelum jadwal pertama setelah sarapan: sejak itu cukup satu lapisan langit yang digambar) */
  dayFull: 150,
  /** senja mulai merona sekian menit sebelum terbenam */
  duskLead: 190,
  /** senja penuh sekian menit sebelum terbenam, bertahan sampai `duskHold` sesudahnya */
  duskFull: 30,
  duskHold: 5,
  /** malam penuh sekian menit sesudah terbenam */
  nightFull: 70,
  /** sarapan = panel makan pertama hari itu yang mulai sebelum jam ini (10:00) */
  breakfastBefore: 600,
  /** tanpa sarapan di data: matahari tampak penuh sekian menit sesudah terbit */
  sunAppear: 60,
  /** matahari mulai memudar sekian menit sebelum terbenam, hilang sekian menit sesudahnya */
  sunsetLead: 15,
  sunsetLag: 10,
  /** di bawah ketinggian ini (0 = cakrawala, 1 = puncak) matahari menghangat jadi jingga dan membesar */
  warmBelow: 0.6,
  sunSwell: 0.3,
  /** slide berlangit "siang" tanpa jam (kartu kedatangan): matahari diam di titik busur ini (0 = terbit, 1 = terbenam) */
  stillSun: 0.78,
  /** busur antara dua stop dicuplik sebanyak ini supaya lintasannya melengkung, bukan garis lurus */
  samples: 8,
} as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** expo.out untuk animasi berbasis JS (hitung naik). */
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
