/**
 * Token gerak (docs/design/motion-tokens.md, disetujui host lewat prototipe Framer 8 Nov 2026).
 * Satu sumber: komponen JS memakai nilai di sini, CSS memakai variabel --ease-* / --dur-* yang sama di globals.css.
 */
export const EASE = {
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  power3Out: "cubic-bezier(0.33, 1, 0.68, 1)",
  expoInOut: "cubic-bezier(0.87, 0, 0.13, 1)",
  sineInOut: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

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

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** expo.out untuk animasi berbasis JS (hitung naik). */
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
