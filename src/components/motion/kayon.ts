/** Siluet gunungan (kayon), viewBox 0 0 120 200: dipakai sapuan antar bab di film dan penjaga gerbang di home. */
export const KAYON = "M60 3C62 14 70 26 78 40C90 58 103 80 103 104C103 124 95 140 84 152V160L96 166V176H90V184H30V176H24V166L36 160V152C25 140 17 124 17 104C17 80 30 58 42 40C50 26 58 14 60 3Z";

/** Dahan pohon hayat: [tinggi pangkal, jangkauan]; makin pendek ke puncak supaya tetap di dalam tatahan. */
export const BRANCHES: readonly [y: number, reach: number][] = [
  [112, 27],
  [97, 24],
  [82, 19],
  [67, 13],
  [52, 7],
];

/** Gapura di kaki kayon. */
export const KAYON_GATE = "M40 160H80M48 160V139H72V160M60 139V160M44 139H76L71 131H49ZM50 131L60 122L70 131M40 160V148M80 160V148M38 148H42M78 148H82";

/** Satu pasang dahan berpilin kiri-kanan pada tinggi `y`. */
export const branchPath = (y: number, reach: number) =>
  `M60 ${y}C${60 + reach * 0.32} ${y - 2} ${60 + reach * 0.7} ${y - 7} ${60 + reach} ${y - 15}c2.6-3 6.4-.6 4.4 2.6M60 ${y}C${60 - reach * 0.32} ${y - 2} ${60 - reach * 0.7} ${y - 7} ${60 - reach} ${y - 15}c-2.6-3-6.4-.6-4.4 2.6`;
