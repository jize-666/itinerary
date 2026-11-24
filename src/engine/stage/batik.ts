/**
 * Hari 3 di panggung 3D (Tugas 11.3): kain mori di gawangan di halaman saudagar Laweyan. Murni, tanpa three.
 *
 * - Dunia batik hidup di pembuka hari dan di gallery Hari 3 (seperti Lereng Lawu di Hari 2); judul hari dan gong
 *   penutup tetap di pendapa bersama. Di gong penutup Hari 3, gong terakhir film, kain yang sudah jadi tergantung di
 *   pendapa di belakang gong dan dilorod saat gong didekati.
 * - Proses kain mengikuti letak di hari itu (`q`: 0 = pembuka hari, n = panel ke-n), jadi maju dan mundur memberi kain
 *   yang sama persis: sungai dan lampion digores lebih dulu (pembuka hari → panel pertama), lalu seluruh kawung sampai
 *   sepertiga hari, nila menjelang siang, kerok, soga sore, kain kering di malam hari, lorod di gong terakhir.
 */
import type { Film, Slide } from "@/engine/slides/build-slides";
import type { BatikState } from "@/engine/canting/state";
import type { Cursor } from "./cue";

export const BATIK_THEME = "batik";

/** Slide yang digambar dunia batik: pembuka hari dan panel gallery Hari 3. */
export const hasBatikWorld = (s?: Slide) => s?.theme === BATIK_THEME && (s.kind === "dayintro" || s.kind === "panel");

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** smoothstep 0–1. */
const ease = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const ramp = (q: number, a: number, b: number) => ease((q - a) / Math.max(1e-6, b - a));

/** Letak slide dalam hari: 0 = pembuka hari, n = panel ke-n. */
export const dayPos = (s: Slide) => (s.kind === "panel" ? s.n : 0);
/** Banyak panel gallery Hari 3 (≥ 1). */
export function panelsOf(s: Slide): number {
  if (s.kind === "panel") return Math.max(1, s.of);
  if (s.kind === "dayintro") return Math.max(1, s.panels);
  return 1;
}

export type BatikTravel = {
  /** Letak di hari itu (0 = pembuka hari … `of` = panel terakhir), pecahan selama geseran. */
  q: number;
  of: number;
  /** 1 = dunia batik penuh; turun ke 0 saat bergeser ke slide di luar dunia batik. */
  amount: number;
  /** Kedalaman ikut gulir: 0 saat diam, puncak di tengah geseran. */
  depth: number;
};

/** Letak di dunia batik dari kursor film; null bila kedua slide di luar dunia batik. */
export function batikTravel(film: Film, c: Cursor): BatikTravel | null {
  const a = film.slides[c.from];
  const b = film.slides[c.to];
  if (!a || !b) return null;
  const av = hasBatikWorld(a);
  const bv = hasBatikWorld(b);
  if (!av && !bv) return null;
  const p = clamp(c.p);
  const from = av ? a : b;
  const to = bv ? b : a;
  const moving = c.from !== c.to;
  return {
    q: mix(dayPos(from), dayPos(to), av && bv ? p : av ? 0 : 1),
    of: panelsOf(from),
    amount: av && bv ? 1 : av ? 1 - p : p,
    depth: moving ? Math.sin(Math.PI * p) : 0,
  };
}

/**
 * Batas proses dalam pecahan hari (`q / of`): torehan selesai, nila, kerok, soga. Untuk 9 panel: kawung selesai di
 * panel 3 (Danar Hadi), nila sampai panel 4, kerok sampai ±panel 4,6, soga sampai panel 6 (senja); malam hari kain
 * kering menunggu lorod.
 */
export const PROCESS = { draw: 3 / 9, nila: 4 / 9, kerok: 4.6 / 9, soga: 6 / 9 } as const;

/**
 * Keadaan kain pada letak `q` (dari `of` panel). `river` = progres torehan saat sungai dan lampion selesai
 * (`trace.phases.river`): sungai digores selama pembuka hari → panel pertama, sisanya sampai `PROCESS.draw`.
 */
export function processAt(q: number, of: number, river: number): BatikState {
  const n = Math.max(1, of);
  const first = Math.min(1, n * PROCESS.draw);
  const draw = q <= 1 ? mix(0, river, ease(q)) : mix(river, 1, ease((q - 1) / Math.max(1e-6, n * PROCESS.draw - first)));
  return {
    draw: clamp(draw),
    nila: ramp(q, n * PROCESS.draw, n * PROCESS.nila),
    kerok: ramp(q, n * PROCESS.nila, n * PROCESS.kerok),
    soga: ramp(q, n * PROCESS.kerok, n * PROCESS.soga),
    lorod: 0,
  };
}

/** Slide gong penutup Hari 3 (gong terakhir film), bila ada. */
export function lastGongIndex(film: Film): number {
  return film.slides.findIndex((s) => s.kind === "gong" && s.theme === BATIK_THEME);
}

/**
 * Kain jadi di pendapa saat gong terakhir: `show` 0–1 (tergantung di belakang gong), `lorod` 0–1 (malam luruh saat
 * gong didekati). Kain tampil penuh di slide gong itu, memudar masuk dari panel terakhir dan keluar ke epilog.
 */
export function gongCloth(film: Film, c: Cursor): { show: number; lorod: number } {
  const g = lastGongIndex(film);
  if (g < 0) return { show: 0, lorod: 0 };
  const p = clamp(c.p);
  const at = (i: number) => (i === g ? 1 : 0);
  const show = c.from === c.to ? at(c.from) : mix(at(c.from), at(c.to), p);
  // lorod berjalan selama mendekati gong dari panel terakhir; dari epilog (mundur) kain sudah dilorod
  const lorod = c.from === g || c.to === g ? (c.from === g - 1 ? p : c.to === g - 1 ? 1 - p : 1) : c.from > g && c.to > g ? 1 : 0;
  return { show: clamp(show), lorod: clamp(lorod) };
}

/** Kain di gawangan (meter, dunia batik): lebar mengikuti aspek motif, tinggi tetap, tepi bawah di atas lantai. */
export const CLOTH = { height: 2.4, bottom: 0.62, aspect: 1.6 } as const;
export const clothWidth = () => CLOTH.height * CLOTH.aspect;
/** Titik kain (u ke kanan 0–aspek, v ke bawah 0–1, satuan motif) → dunia (x, y) di bidang z = 0. */
export function clothPoint(u: number, v: number): [number, number] {
  return [(u / CLOTH.aspect - 0.5) * clothWidth(), CLOTH.bottom + (1 - v) * CLOTH.height];
}

export type BatikShot = { pos: [number, number, number]; aim: [number, number, number]; fov: number };

/**
 * Kamera dunia batik. Pembuka hari: bidikan lebar halaman (gawangan, wajan, tembok). Gallery: menghadap kain, bergeser
 * menyamping sepanjang hari (seperti gallery 7b). Pita bawah layar = pita sungai di tepi bawah kain, di bawah kartu.
 * `look` (−1…1, kursor/kemiringan HP) menggeser kamera sungguhan (perspective shift); `depth` (kedalaman ikut gulir)
 * mendekatkan kamera ke kain selama geseran.
 */
export function batikShot(q: number, of: number, aspect: number, look: { x: number; y: number }, depth: number): BatikShot {
  const tall = aspect < 1;
  const n = Math.max(1, of);
  const w = clothWidth();
  // pembuka hari → gallery
  const enter = ease(q);
  const u = n > 1 ? clamp((q - 1) / (n - 1)) : 0;
  // gallery: geser menyamping melintasi kain (di HP lebih sempit, kain lebih dekat ke tepi layar)
  const span = tall ? 0.3 : 0.26;
  const gx = mix(-span * w, span * w, u);
  const wide = { pos: [tall ? 1.1 : 2.1, 1.5, tall ? 8.2 : 6.6], aim: [0.15, CLOTH.bottom + CLOTH.height * 0.48, 0], fov: tall ? 50 : 34 };
  // HP tegak: kain memenuhi tinggi layar dan tiap panel menyusuri bagian kain yang lain
  const gallery = tall
    ? { pos: [gx, CLOTH.bottom + CLOTH.height * 0.5, 2.75], aim: [gx * 0.9, CLOTH.bottom + CLOTH.height * 0.5, 0], fov: 52 }
    : { pos: [gx, CLOTH.bottom + CLOTH.height * 0.43, 3.55], aim: [gx * 0.82, CLOTH.bottom + CLOTH.height * 0.42, 0], fov: 36 };
  const pos = wide.pos.map((v, i) => mix(v, gallery.pos[i]!, enter)) as [number, number, number];
  const aim = wide.aim.map((v, i) => mix(v, gallery.aim[i]!, enter)) as [number, number, number];
  const fov = mix(wide.fov, gallery.fov, enter);
  // perspective shift: kamera sungguh berpindah, bidikan bergeser lebih sedikit
  pos[0] += look.x * 0.42;
  pos[1] -= look.y * 0.22;
  aim[0] += look.x * 0.1;
  aim[1] -= look.y * 0.06;
  // kedalaman ikut gulir: mendekat ke kain di tengah geseran
  const k = 0.16 * clamp(depth);
  for (let i = 0; i < 3; i++) pos[i] = mix(pos[i]!, aim[i]!, k);
  return { pos, aim, fov };
}
