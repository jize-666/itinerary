/**
 * Shot kamera panggung 3D: tiap slide film punya satu shot (letak kamera, titik pandang, sudut lensa), dan
 * perpindahan slide = perjalanan kamera dari shot asal ke shot tujuan, digerakkan kemajuan transisi yang sama
 * dengan lapisan DOM (`Timeline.progress()`). Murni: tanpa DOM, tanpa three.
 *
 * Dunia (satuan ± meter): lantai pendapa di y = 0, berpusat di titik asal. Gong ageng menggantung di tengah,
 * menghadap +z (ke penonton). Lanskap dan Gunung Lawu ada di arah −z. Shot "orbit" mengitari pusat panggung;
 * shot "vista" berdiri di tepi belakang pendapa dan memandang lanskap (latar gallery).
 */
import { galleryDrift, type Slide, type TransitionKind } from "@/engine/slides/build-slides";

export type Vec3 = readonly [x: number, y: number, z: number];

export type Shot = Readonly<{
  pos: Vec3;
  look: Vec3;
  /** Sudut lensa vertikal (derajat), sudah disesuaikan dengan bentuk layar. */
  fov: number;
  /** Kadar nyala blencong (0–1,6): terang di adegan gong, redup saat memandang lanskap. */
  lamp: number;
  /** Seberapa gelap gambar diturunkan supaya teks di atasnya tetap terbaca (0 = apa adanya). */
  dim: number;
  /** Jarak fokus (untuk depth of field) = jarak kamera ke titik pandang. */
  focus: number;
  /** Kadar depth of field (0–1): hanya gallery (Tugas 7b); berpindah bersama kamera saat transisi. */
  dof: number;
  /** Rumpun shot: orbit mengitari pusat panggung, vista memandang lanskap. Menentukan cara berpindah. */
  rig: "orbit" | "vista";
  /** Pengali ketinggian pada gradien langit (lihat `skyStretch`). */
  sky: number;
}>;

const RAD = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Pusat panggung: titik pandang bawaan shot orbit (kira-kira pencu gong). */
export const STAGE_CENTER: Vec3 = [0, 1.5, 0];
/**
 * Tempat kamera berdiri saat memandang lanskap, dan sejauh apa ia bergeser sepanjang satu hari di gallery. Geseran
 * itu yang memperlihatkan letak Z lanskap (Tugas 7b, "Z-depth positioning"): tanah dekat bergeser lebih jauh dari
 * desa, dan Lawu hampir diam; ±1 m per panel di hari ber-8 panel, searah dengan rel kartu.
 */
export const VISTA = { y: 1.7, z: -5.2, travel: 7.2, far: 60 } as const;

/**
 * Film 2,5D membentangkan gradien langit dari tepi bawah ke tepi atas layar. Kamera 3D hanya melihat sebagian
 * kecil langit (di gallery ±10° di atas cakrawala), jadi ketinggian pada gradien dikalikan supaya tepi atas
 * layar selalu jatuh di ±`SKY_TOP` derajat: langit gelap di atas, terang di cakrawala, pada shot apa pun.
 */
const SKY_TOP = 38;
export function skyStretch(pos: Vec3, look: Vec3, fov: number): number {
  const pitch = Math.asin(clamp((look[1] - pos[1]) / (dist(pos, look) || 1), -1, 1));
  const top = pitch / RAD + fov / 2;
  return clamp(SKY_TOP / Math.max(top, 1), 1, 5);
}

type Orbit = {
  az: number;
  el: number;
  r: number;
  look?: Vec3;
  fov: number;
  lamp?: number;
  dim?: number;
  /** Lebar adegan (m) yang harus muat mendatar. */
  width?: number;
  /** Layar tegak: seberapa jauh titik pandang dinaikkan (bawaan `PORTRAIT_TILT`). */
  tilt?: number;
};

/**
 * Lensa untuk layar tegak: sudut vertikal dilebarkan (sampai batas wajar), sisanya dikejar dengan memundurkan
 * kamera di `orbitShot`, supaya subjek tetap utuh tanpa distorsi lensa lebar.
 */
export function fitFov(fov: number, aspect: number): number {
  if (aspect >= 1.25) return fov;
  const widen = clamp(1.25 / Math.max(aspect, 0.3), 1, 2.4);
  return Math.min(56, fov * Math.pow(widen, 0.55));
}

/** Layar tegak: titik pandang shot orbit dinaikkan sekian × jarak × (1 − aspek). */
const PORTRAIT_TILT = 0.2;

/** Sudut lensa mendatar (rad) dari sudut vertikal (derajat) dan bentuk layar. */
export const hfovOf = (fov: number, aspect: number) => 2 * Math.atan(Math.tan((fov * RAD) / 2) * aspect);

function orbitShot(o: Orbit, aspect: number): Shot {
  const look = o.look ?? STAGE_CENTER;
  const fov = fitFov(o.fov, aspect);
  // layar sempit: mundur sampai `width` muat mendatar
  const need = o.width ? o.width / 2 / Math.tan(hfovOf(fov, aspect) / 2) : 0;
  const r = Math.max(o.r, need);
  const [az, el] = [o.az * RAD, o.el * RAD];
  const pos: Vec3 = [look[0] + r * Math.sin(az) * Math.cos(el), Math.max(0.35, look[1] + r * Math.sin(el)), look[2] + r * Math.cos(az) * Math.cos(el)];
  // layar tegak: kamera mendongak sedikit, supaya lantai tidak memenuhi separuh layar di belakang teks
  const aim: Vec3 = [look[0], look[1] + (o.tilt ?? PORTRAIT_TILT) * r * clamp(1 - aspect, 0, 0.6), look[2]];
  return { pos, look: aim, fov, lamp: o.lamp ?? 1, dim: o.dim ?? 0, focus: dist(pos, look), dof: 0, rig: "orbit", sky: skyStretch(pos, aim, fov) };
}

/**
 * Shot lanskap. `drift` 0–1 = letak di sepanjang gallery (kamera bergeser menyamping); `horizon` = letak
 * cakrawala di layar, 0 = tengah … 1 = tepi bawah (kartu gallery menutupi bagian tengah, jadi cakrawala
 * diturunkan supaya langit dan matahari tampak di atas kartu).
 */
function vistaShot(v: { drift: number; horizon: number; fov: number; lift?: number; lamp?: number; dim?: number; dof?: number }, aspect: number): Shot {
  const fov = fitFov(v.fov, aspect);
  const x = (v.drift - 0.5) * VISTA.travel;
  const pitch = Math.atan(v.horizon * Math.tan((fov * RAD) / 2));
  const pos: Vec3 = [x, VISTA.y + (v.lift ?? 0), VISTA.z];
  const look: Vec3 = [x * 0.35, pos[1] + VISTA.far * Math.tan(pitch), VISTA.z - VISTA.far];
  return { pos, look, fov, lamp: v.lamp ?? 0.25, dim: v.dim ?? 0, focus: 40, dof: v.dof ?? 0, rig: "vista", sky: skyStretch(pos, look, fov) };
}

/** Lensa dan tinggi kamera gallery; dipakai juga untuk menaruh matahari di langit (`sunDirection`). */
export const GALLERY_FOV = 44;
export const GALLERY_LIFT = 2.6;

/** Shot gallery pada letak `drift` (0–1) di sepanjang hari. */
export const galleryShot = (drift: number, frame: Frame): Shot =>
  vistaShot({ drift, horizon: clamp(frame.horizon ?? GALLERY_HORIZON, -0.8, 0.2), fov: GALLERY_FOV, lift: GALLERY_LIFT, dof: 1 }, frame.aspect);

/** Lebar gayor gong beserta naga di kedua ujungnya: yang harus muat di layar pada shot gong. */
const GONG_WIDTH = 3.5;
/** Shot headline di layar tegak: titik pandang digeser ke kanan paling jauh sekian m, ke arah naga yang lebih dekat. */
const HEADLINE_SHIFT = 0.4;

/**
 * Bentuk layar. `horizon` = letak cakrawala di gallery, −1 = tepi atas … 0 = tengah … 1 = tepi bawah layar:
 * tepi bawah lintasan matahari (`.fl-sunbox`), supaya matahari 3D terbit dan terbenam di garis yang sama dengan
 * film 2,5D, yaitu tepat di atas kartu.
 */
export type Frame = Readonly<{ aspect: number; horizon?: number }>;
/** Cakrawala gallery bila ukuran lintasan matahari belum diketahui. */
export const GALLERY_HORIZON = -0.46;

/**
 * Shot slide gong penutup hari: seluruh gayor muat di layar, kedua naga di tepi atas (dengan ruang untuk semburan
 * apinya), gong di atas teks penutup hari. Saat gong kena kamera hanya terhentak mundur dan bergetar sedikit
 * (`cameraKick` di gong.ts), jadi semua yang terjadi saat pukulan harus sudah ada di dalam bingkai ini.
 */
const GONG_SHOT: Orbit = { az: -16, el: -2, r: 9.4, look: [0, 1.3, 0], fov: 32, lamp: 1.5, dim: 0.12, width: 5, tilt: 0.04 };

/**
 * Shot gunungan pembuka dan penutup (gate.ts): pendapa dari depan, sedikit lebih jauh dan lebih rendah dari shot
 * prolog. Saat gunungan dicabut kamera maju dari sini ke shot prolog mengikuti kemajuan cabutan (di HP mengikuti
 * jari): kedalaman ikut gulir. Saat ditancapkan di akhir film kamera kembali ke sini.
 */
export const kayonShot = (frame: Frame): Shot => orbitShot({ az: 0, el: -5, r: 9.8, look: [0, 1.55, 0], fov: 34, lamp: 1.3, width: GONG_WIDTH * 1.2 }, frame.aspect);

/** Shot untuk satu slide pada layar `frame`. */
export function shotFor(slide: Slide, frame: Frame): Shot {
  const aspect = frame.aspect;
  switch (slide.kind) {
    case "hero":
      return orbitShot({ az: 0, el: -2, r: 7.4, look: [0, 1.62, 0], fov: 34, lamp: 1.25, width: GONG_WIDTH }, aspect);
    case "headline":
      // layar tegak (audit host 14 Nov "ke crop"): dari sudut 32° naga kanan lebih dekat ke kamera dan keluar layar.
      // Kamera mundur sampai seluruh gayor dan kedua naga muat, dan titik pandang digeser ke kanan supaya seimbang.
      // Layar lebar tidak berubah (jarak 5,6 m sudah lebih jauh dari yang dibutuhkan lebar itu).
      return orbitShot(
        { az: 32, el: 2, r: 5.6, look: [HEADLINE_SHIFT * clamp((1.2 - aspect) / 0.75, 0, 1), STAGE_CENTER[1], 0], fov: 36, lamp: 1.1, dim: 0.08, width: GONG_WIDTH * 1.15 },
        aspect,
      );
    case "intro":
      return orbitShot({ az: -22, el: 8, r: 9.5, look: [0, 1.4, 0], fov: 38, lamp: 0.9, dim: 0.1, width: 6 }, aspect);
    case "fact": {
      // tiap fakta satu sudut baru: kamera melangkah mengitari panggung dari kiri ke kanan
      const t = slide.of > 1 ? (slide.n - 1) / (slide.of - 1) : 0.5;
      const swing = Math.sin(Math.PI * t);
      return orbitShot({ az: lerp(-58, 58, t), el: 5 + 7 * (1 - swing), r: 6.4 - 1.5 * swing, look: [lerp(0.5, -0.5, t), 1.45, 0], fov: 37, lamp: 0.95, dim: 0.12, width: 3 }, aspect);
    }
    case "route":
      // dari tepi belakang pendapa, tinggi di atas dataran: nanti diorama Solo dan benang emas digambar di sini
      return vistaShot({ drift: 0.5, horizon: -0.18, fov: 42, lift: 5.2, lamp: 0.5, dim: 0.1 }, aspect);
    case "team":
      return orbitShot({ az: 18, el: 3, r: 4.6, look: [-0.5, 1.5, 0], fov: 34, lamp: 1.3, dim: 0.15, width: 2.6 }, aspect);
    case "phrases":
      return orbitShot({ az: -24, el: 6, r: 4.9, look: [0.4, 1.6, 0], fov: 35, lamp: 1.2, dim: 0.15, width: 2.6 }, aspect);
    case "daycard":
      return vistaShot({ drift: 0.72, horizon: 0.3, fov: 40, lift: 0.5, dim: 0.16 }, aspect);
    case "title":
      // gunungan ditancapkan di depan panggung: simetris, rendah, khidmat
      return orbitShot({ az: 0, el: -4, r: 6.6, look: [0, 1.75, 2.4], fov: 30, lamp: 1.4, dim: 0.06, width: 3 }, aspect);
    case "dayintro":
      return vistaShot({ drift: 0, horizon: 0.36, fov: 42, dim: 0.14 }, aspect);
    case "panel":
      // memandang dari atas: lanskap terhampar di balik kartu, langit dan matahari di pita atas
      return galleryShot(galleryDrift(slide), frame);
    case "gong":
      return orbitShot(GONG_SHOT, aspect);
    case "epilogue":
      return orbitShot({ az: 0, el: 14, r: 11, look: [0, 1.8, 0], fov: 36, lamp: 0.8, dim: 0.12, width: 7 }, aspect);
    case "pass":
      return orbitShot({ az: 0, el: 0, r: 6, look: [0, 2.2, 0], fov: 30, lamp: 1, dim: 0.1, width: 2.4 }, aspect);
    case "credits":
      // mendongak ke bintang, membelakangi pendapa
      return vistaShot({ drift: 0.5, horizon: 1.5, fov: 46, lamp: 0.4, dim: 0.1 }, aspect);
  }
}

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Shot di antara `a` dan `b` pada kemajuan transisi `p` (0–1, sudah berkurva dari timeline).
 *  - wipe  : potong di tengah, saat bayangan gunungan menutup layar
 *  - inner : di dalam gallery, kamera bergeser lurus
 *  - slide : dua shot orbit → kamera mengitari panggung (busur, tidak menembus gong);
 *            orbit ↔ vista → kamera naik melewati gayor lalu turun (lintasan melengkung)
 */
export function blendShot(a: Shot, b: Shot, p: number, kind: TransitionKind): Shot {
  if (p <= 0) return a;
  if (p >= 1) return b;
  if (kind === "wipe") return p < 0.5 ? a : b;
  const t = kind === "inner" ? p : smoother(p);
  const look: Vec3 = [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t)];
  const num = { fov: lerp(a.fov, b.fov, t), lamp: lerp(a.lamp, b.lamp, t), dim: lerp(a.dim, b.dim, t), focus: lerp(a.focus, b.focus, t), dof: lerp(a.dof, b.dof, t), sky: lerp(a.sky, b.sky, t) };
  let pos: Vec3;
  if (kind !== "inner" && a.rig === "orbit" && b.rig === "orbit") {
    // koordinat bola terhadap titik pandang masing-masing: sudut ditempuh lewat jalan terpendek
    const sph = (s: Shot) => {
      const d: Vec3 = [s.pos[0] - s.look[0], s.pos[1] - s.look[1], s.pos[2] - s.look[2]];
      const r = Math.hypot(d[0], d[1], d[2]);
      return { r, az: Math.atan2(d[0], d[2]), el: Math.asin(clamp(d[1] / (r || 1), -1, 1)) };
    };
    const [sa, sb] = [sph(a), sph(b)];
    const r = lerp(sa.r, sb.r, t);
    const az = sa.az + wrap(sb.az - sa.az) * t;
    const el = lerp(sa.el, sb.el, t);
    pos = [look[0] + r * Math.sin(az) * Math.cos(el), Math.max(0.35, look[1] + r * Math.sin(el)), look[2] + r * Math.cos(az) * Math.cos(el)];
  } else if (kind !== "inner" && a.rig !== b.rig) {
    // Bézier kuadratik dengan titik kendali di atas tengah lintasan
    const d = dist(a.pos, b.pos);
    const c: Vec3 = [(a.pos[0] + b.pos[0]) / 2, Math.max(a.pos[1], b.pos[1]) + 0.24 * d, (a.pos[2] + b.pos[2]) / 2];
    const u = 1 - t;
    pos = [u * u * a.pos[0] + 2 * u * t * c[0] + t * t * b.pos[0], u * u * a.pos[1] + 2 * u * t * c[1] + t * t * b.pos[1], u * u * a.pos[2] + 2 * u * t * c[2] + t * t * b.pos[2]];
  } else {
    pos = [lerp(a.pos[0], b.pos[0], t), lerp(a.pos[1], b.pos[1], t), lerp(a.pos[2], b.pos[2], t)];
  }
  return { pos, look, ...num, rig: t < 0.5 ? a.rig : b.rig };
}

type Basis = { right: Vec3; up: Vec3; fwd: Vec3 };
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function basisOf(shot: Pick<Shot, "pos" | "look">): Basis {
  const fwd = norm([shot.look[0] - shot.pos[0], shot.look[1] - shot.pos[1], shot.look[2] - shot.pos[2]]);
  const right = norm(cross(fwd, [0, 1, 0]));
  return { right, up: cross(right, fwd), fwd };
}

/** Arah sinar (dunia, ternormalisasi) yang menembus titik layar (`nx`, `ny` dalam NDC, −1…1, y ke atas). */
export function rayThrough(shot: Pick<Shot, "pos" | "look" | "fov">, aspect: number, nx: number, ny: number): Vec3 {
  const { right, up, fwd } = basisOf(shot);
  const h = Math.tan((shot.fov * RAD) / 2);
  const [x, y] = [nx * h * aspect, ny * h];
  return norm([fwd[0] + right[0] * x + up[0] * y, fwd[1] + right[1] * x + up[1] * y, fwd[2] + right[2] * x + up[2] * y]);
}

/** Titik dunia `p` di layar: `x`, `y` dalam NDC (−1…1, y ke atas) dan jaraknya di depan kamera (`depth` ≤ 0 = di belakang). */
export function projectPoint(shot: Pick<Shot, "pos" | "look" | "fov">, aspect: number, p: Vec3): { x: number; y: number; depth: number } {
  const { right, up, fwd } = basisOf(shot);
  const v: Vec3 = [p[0] - shot.pos[0], p[1] - shot.pos[1], p[2] - shot.pos[2]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const depth = dot(v, fwd);
  const h = Math.tan((shot.fov * RAD) / 2) * (Math.abs(depth) || 1e-6);
  return { x: dot(v, right) / (h * aspect), y: dot(v, up) / h, depth };
}

/**
 * Letak lintasan matahari di layar, dalam NDC: kiri/kanan = ujung timur/barat, `top` = puncak busur,
 * `bottom` = cakrawala. Diukur dari `.fl-sunbox` (bingkai lintasan matahari film 2,5D).
 */
export type SunTrack = Readonly<{ left: number; right: number; top: number; bottom: number }>;
export const SUN_TRACK: SunTrack = { left: -0.74, right: 0.74, top: 0.86, bottom: -GALLERY_HORIZON };

/**
 * Arah matahari di langit untuk letak `u` (0 = timur … 1 = barat) dan `v` (0 = puncak … 1 = cakrawala):
 * titik yang sama di layar dengan matahari film 2,5D, dilihat dari kamera gallery di tengah lintasannya.
 * Matahari berada di tak hingga, jadi arah ini tetap selagi kamera bergeser.
 */
export function sunDirection(u: number, v: number, track: SunTrack, aspect: number): Vec3 {
  const base = galleryShot(0.5, { aspect, horizon: -track.bottom });
  const nx = lerp(track.left, track.right, u);
  const ny = lerp(track.top, track.bottom, v);
  return rayThrough(base, aspect, nx, ny);
}
