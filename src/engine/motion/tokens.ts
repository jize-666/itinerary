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
  /** text.flip3d: per huruf rotateX −100° → 0, blur 8 → 0 */
  flipChar: { dur: 1100, stagger: 60 },
  /** text.blurRise: per kata naik 0,6em, blur 10 → 0 */
  blurRise: { dur: 750, stagger: 55 },
  /** text.curtain: per kata naik 115% di dalam mask + skewY 8° → 0 */
  curtain: { dur: 950, stagger: 62 },
  /** text.scramble: glif acak tiap 45 ms, huruf terkunci tiap 20–50 ms */
  scramble: { tick: 45, lockMin: 20, lockMax: 50 },
  /** stagger.item: kotak kode, stop itinerary */
  item: { dur: 600, stagger: 80 },
  /** num.odometer → hitung naik */
  count: { dur: 1800 },
  /** letterbox: bilah masuk dari atas & bawah */
  letterbox: { dur: 800 },
  /** jeda dari kode benar sampai sambutan (kotak menyala → menyatu jadi benang → kilat blencong) */
  unlock: { dur: 1150 },
} as const;

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789·•";
export const randomGlyph = (rnd = Math.random) => GLYPHS[Math.floor(rnd() * GLYPHS.length)]!;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** expo.out untuk animasi berbasis JS (hitung naik). */
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
