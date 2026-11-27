/**
 * Tiket 3D di slide `pass` (Tugas 12b): letak tiket di pendapa, shot kamera, dan seberapa tinggi tiket masih
 * tergantung selama perpindahan slide. Murni: tanpa DOM, tanpa three.
 *
 * Tiket bertali dari Codex (`src/engine/pass3d`) berukuran asli: kartu 74 × 150 mm, kait di ujung tali 106 mm, kartu
 * diam ±0,17 m di bawah kait. Tiket digantung ±3,3 m di depan gong ageng, sedikit ke kanan, supaya gong tampak redup di
 * belakangnya tanpa memenuhi layar. Tali di atas kait naik lurus ke atap (bagian yang tidak disimulasikan).
 *
 * Kamera datang ke slide ini dari shot lanskap (kartu kepulangan) atau orbit (epilog) lewat lintasan melengkung di atas
 * gong, dan pergi ke credits lewat jalan yang sama. Supaya kamera tidak menembus tiket atau talinya, tiket baru turun
 * dari kegelapan atap di bagian akhir perpindahan dan naik lagi di awal kepergian (`passLift`), mengikuti kemajuan
 * gulir (aturan host: kedalaman yang mengikuti gulir, berhenti saat gulir berhenti).
 */
import type { Cursor } from "./cue";
import { plantSize } from "./gate";
import { fitFov, projectPoint, rayThrough, type Shot, skyStretch, type Vec3 } from "./shots";

export const PASS = {
  /** Kait tiket saat diam (dunia, m). */
  hook: [0.62, 1.84, 3.3] as Vec3,
  /** Pusat kartu yang diam, di bawah kait (m). */
  hang: 0.17,
  /** Ujung atas tali yang tidak disimulasikan: balok tumpang sari. */
  beam: 4.3,
  /** Setinggi apa tiket masih tergantung saat perpindahan baru dimulai (m). */
  drop: 1.8,
  /** Tiket mulai turun sesudah kedekatan ini (0–1); sebelumnya kamera masih melintas di atas gong. */
  descend: 0.72,
  /** Bagian tinggi layar yang diisi kartu (layar mendatar) dan bagian lebar layar (layar tegak). */
  fillHeight: 0.48,
  /** Layar tegak: batas tinggi kartu, supaya kartu tidak masuk ke bilah atas (layar 9:16 yang pendek). */
  fillHeightTall: 0.42,
  fillWidth: 0.46,
  /** Letak pusat kartu di layar (NDC, + = atas) di layar mendatar dan tegak: tombol slide ada di bawahnya. */
  screenY: 0.22,
  screenYTall: 0.28,
  /** Arah kamera dari kartu (derajat): sedikit dari kanan dan atas, supaya tebal kartu tampak saat berayun. */
  az: 9,
  el: 4,
  fov: 30,
} as const;

const RAD = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Pusat kartu yang diam (dunia). */
export const passCenter = (lift = 0): Vec3 => [PASS.hook[0], PASS.hook[1] - PASS.hang + lift, PASS.hook[2]];

/** Shot slide tiket: kartu mengisi ±42% tinggi layar mendatar atau ±50% lebar layar tegak, di atas tombol slide. */
export function passShot(aspect: number): Shot {
  const fov = fitFov(PASS.fov, aspect);
  const half = Math.tan((fov * RAD) / 2);
  const fillH = aspect < 1 ? PASS.fillHeightTall : PASS.fillHeight;
  const d = Math.max(0.15 / (2 * fillH * half), 0.074 / (2 * PASS.fillWidth * half * Math.max(aspect, 0.3)));
  const c = passCenter();
  const [az, el] = [PASS.az * RAD, PASS.el * RAD];
  const pos: Vec3 = [c[0] + d * Math.sin(az) * Math.cos(el), c[1] + d * Math.sin(el), c[2] + d * Math.cos(az) * Math.cos(el)];
  // bidik di bawah kartu supaya kartu tampak di atas tengah layar
  const look: Vec3 = [c[0], c[1] - (aspect < 1 ? PASS.screenYTall : PASS.screenY) * half * d, c[2]];
  const focus = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
  // blencong diredupkan: gong di belakang tidak menyala terang; tiket mendapat bagiannya sendiri (stage.ts)
  return { pos, look, fov, lamp: 0.55, dim: 0.04, focus, dof: 0, rig: "orbit", sky: skyStretch(pos, look, fov) };
}

/** Kedekatan film ke slide tiket (1 = di slide tiket, 0 = satu slide atau lebih dari sana), mengikuti kemajuan gulir. */
export function passCloseness(cursor: Cursor, index: number): number {
  if (index < 0) return 0;
  if (cursor.from === index && cursor.to === index) return 1;
  if (cursor.to === index) return clamp(cursor.p, 0, 1);
  if (cursor.from === index) return 1 - clamp(cursor.p, 0, 1);
  return 0;
}

/** Tinggi tambahan kait di atas letak diamnya (m) pada kedekatan `c`: tiket turun dari atap di akhir perpindahan. */
export const passLift = (c: number): number => PASS.drop * (1 - smoothstep(PASS.descend, 1, c));

/** Tiket 3D dipasang bila film sejauh ≤ 2 slide dari slide tiket, dan dilepas bila lebih jauh dari 3 slide. */
export function passWanted(cursor: Cursor, index: number, mounted: boolean): boolean {
  if (index < 0) return false;
  const away = Math.min(Math.abs(cursor.from - index), Math.abs(cursor.to - index));
  return away <= (mounted ? 3 : 2);
}

/**
 * Tiket tamu di samping gunungan penutup (PRD: tiket juga di epilog, tergantung saat gong terakhir dan gunungan
 * tertancap lagi). Kamera di sana adalah shot kayon, jadi letak kartu dipatok di layar (NDC) lalu dicari kait di
 * dunia yang jatuh tepat di titik itu. `fill` = bagian tinggi layar yang diisi kartu.
 */
export const TAIL = {
  /** Layar mendatar: kelir kosong ada di kiri gunungan. */
  wide: { x: -0.56, y: 0.1, fill: 0.34 },
  /** Layar tegak: gunungan memenuhi lebar, satu-satunya ruang kosong di pojok kiri atas di samping pucuknya. */
  tall: { x: -0.68, y: 0.45, fill: 0.19 },
  /** Tinggi kait saat gunungan belum tertancap (m): kartu di atas bingkai. */
  lift: 1.1,
  /** Tiket mulai turun saat gunungan tertancap sebanyak ini. */
  from: 0.35,
  /** Ruang ayun di sekeliling kartu (kali ukuran kartu) dan jarak aman dari gunungan (NDC). */
  swing: 1.2,
  gap: 0.04,
} as const;

/** Lebar kartu dibanding tingginya (74 × 150 mm). */
const CARD_RATIO = 0.074 / 0.15;

/** Letak pusat kartu di layar (NDC) dan bagian tinggi layar yang diisinya, untuk layar `aspect`. */
export function tailTarget(aspect: number): { x: number; y: number; fill: number } {
  if (aspect < 1) return { ...TAIL.tall };
  const { y } = TAIL.wide;
  let x: number = TAIL.wide.x;
  let fill: number = TAIL.wide.fill;
  // lebar gunungan di layar (NDC): setengah lebarnya 0,7 × tinggi / aspek; kartu tidak boleh menyentuhnya
  const gun = (0.7 * plantSize(aspect)) / aspect;
  const half = (f: number) => (f * CARD_RATIO * TAIL.swing) / aspect;
  const limit = -gun - TAIL.gap;
  if (x + half(fill) > limit) {
    // layar hampir persegi: kartu di tengah pita kosong di kiri gunungan, dikecilkan bila pita sempit
    const edge = -0.97;
    fill = Math.min(fill, (((limit - edge) / 2) * aspect) / (CARD_RATIO * TAIL.swing));
    x = (edge + limit) / 2;
  }
  return { x, y, fill };
}

/**
 * Kait tali untuk shot kayon `kayon`: pusat kartu yang diam (kait turun `PASS.hang`) jatuh di `tailTarget` dari
 * kamera tanpa parallax, pada jarak yang membuat kartu setinggi `fill` layar. `dist` = jarak kamera ke kartu (m).
 */
export function tailHook(kayon: Shot, aspect: number): { hook: Vec3; dist: number } {
  const t = tailTarget(aspect);
  const dist = 0.15 / (2 * t.fill * Math.tan((kayon.fov * RAD) / 2));
  const dir = rayThrough(kayon, aspect, t.x, t.y);
  const at = (s: number): Vec3 => [kayon.pos[0] + dir[0] * s, kayon.pos[1] + dir[1] * s, kayon.pos[2] + dir[2] * s];
  // `dist` diukur sejajar arah pandang, bukan sepanjang sinar
  const s = dist / Math.max(1e-6, projectPoint(kayon, aspect, at(1)).depth);
  const c = at(s);
  return { hook: [c[0], c[1] + PASS.hang, c[2]], dist };
}

/** Tinggi tambahan kait (m) saat gunungan tertancap sebanyak `planted`: turun mengikuti gulir, naik lagi saat dicabut. */
export const tailLift = (planted: number): number => TAIL.lift * (1 - smoothstep(TAIL.from, 1, planted));
