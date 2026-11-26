/**
 * Clawd sebagai pemandu di film 3D (M3, arahan host 15 Nov: "peranmu sebagai pemandu, memberi tahu fitur fitur 3D
 * sambil mengampiri objek 3D nya, menyapa client, menjelaskan alur"; 16 Nov: teks petunjuk lama dihapus dan diganti
 * ucapan Clawd). Murni (tanpa DOM, tanpa three):
 *  - petunjuk mana yang berlaku di tempat tamu sekarang (`tipAt`);
 *  - di mana Clawd berdiri (`spotAt`): di samping layar, atau menghampiri gong/gunungan yang sedang dijelaskan;
 *  - petunjuk mana yang sudah pernah tuntas diucapkan di perangkat ini (`Guide`, disimpan di localStorage), supaya
 *    tamu yang membuka film lagi tidak diceramahi ulang.
 */
import type { SlideKind } from "@/engine/slides/build-slides";
import type { TipId } from "./lines";

export type GuideContext = Readonly<{
  kind: SlideKind | undefined;
  /** Judul hari/hero: huruf sudah tersedot dan gong sudah ditabuh. */
  beat: boolean;
  /** Fase gunungan pembuka/penutup (`off`, `wait`, `head`, `tail`). */
  gate: string;
  /** Sedang berpindah slide. */
  moving: boolean;
  /** Sheet detail terbuka. */
  sheet: boolean;
  /** Film 2,5D (tanpa panggung 3D): tidak ada zoom/kitar gong dan gunungan pembuka. Bawaan: film 3D. */
  flat?: boolean;
  mountainDawn?: boolean;
  /** Tiket 3D bertali sudah tampil di slide tiket (`data-pass3d`, bukan sedang dimuat). */
  pass3d?: boolean;
}>;

/** Petunjuk yang berlaku di tempat ini, atau null. */
export function tipAt(c: GuideContext): TipId | null {
  if (c.sheet) return null;
  if (c.gate === "head") return "kayon";
  if (c.gate === "tail") return "credits";
  if (c.moving) return null;
  switch (c.kind) {
    case "hero":
    case "title":
      return c.beat ? (c.flat ? null : "zoom") : "beat";
    case "panel":
      return c.mountainDawn ? "mountain" : "gallery";
    case "phrases":
      return "phrases";
    case "gong":
      return "gong";
    case "credits":
      return "credits";
    case "pass":
      return c.pass3d ? "pass" : null;
    default:
      return null;
  }
}

/** Petunjuk `tip` masih berlaku di sini (selama perpindahan dianggap masih berlaku, kecuali gunungan dicabut). */
export function stillApplies(tip: TipId, c: GuideContext): boolean {
  if (c.sheet) return false;
  if (tip === "kayon") return c.gate === "head";
  if (c.moving) return tip === "gallery" || tip === "credits";
  return tipAt(c) === tip;
}

/** Tempat Clawd di layar: dekat gunungan, dekat gong, atau di samping. */
export type Spot = "side" | "gong" | "kayon";

export function spotAt(c: GuideContext, speaking: TipId | null): Spot {
  if (c.gate === "head" || c.gate === "tail") return "kayon";
  if (c.moving) return "side";
  if (c.kind === "gong") return "gong";
  // tahap gong: selama judul masih tampil Clawd tetap di samping (gong ada di belakang judul, terutama di HP tegak);
  // sesudah huruf tersedot ia menghampiri gong untuk menjelaskan zoom dan kitar
  if ((c.kind === "hero" || c.kind === "title") && speaking === "zoom") return "gong";
  return "side";
}

// ---- yang sudah dilihat di perangkat ini ----
export const GUIDE_KEY = "lakon.clawd";
export type Seen = { intro: boolean; tips: TipId[] };
const EMPTY: Seen = { intro: false, tips: [] };
const TIP_IDS: readonly TipId[] = ["kayon", "beat", "zoom", "gallery", "phrases", "gong", "credits", "mountain", "pass"];

export function readSeen(store: Pick<Storage, "getItem"> | undefined): Seen {
  try {
    const raw = store?.getItem(GUIDE_KEY);
    if (!raw) return { ...EMPTY, tips: [] };
    const v = JSON.parse(raw) as Partial<Seen>;
    return { intro: v.intro === true, tips: Array.isArray(v.tips) ? v.tips.filter((t): t is TipId => TIP_IDS.includes(t as TipId)) : [] };
  } catch {
    return { ...EMPTY, tips: [] };
  }
}

export function writeSeen(seen: Seen, store: Pick<Storage, "setItem"> | undefined) {
  try {
    store?.setItem(GUIDE_KEY, JSON.stringify(seen));
  } catch {
    /* tidak diingat, tetap jalan */
  }
}

export class Guide {
  readonly seen: Seen;
  constructor(seen: Seen) {
    this.seen = { intro: seen.intro, tips: [...seen.tips] };
  }

  /** Petunjuk baru yang perlu diucapkan di tempat ini (belum pernah tuntas), atau null. */
  due(c: GuideContext): TipId | null {
    const tip = tipAt(c);
    return tip && !this.seen.tips.includes(tip) ? tip : null;
  }

  /** Petunjuk sudah tuntas diucapkan (kalimat terakhirnya lengkap). Mengembalikan true bila baru. */
  done(tip: TipId): boolean {
    if (this.seen.tips.includes(tip)) return false;
    this.seen.tips.push(tip);
    return true;
  }

  introDone(): boolean {
    if (this.seen.intro) return false;
    this.seen.intro = true;
    return true;
  }
}

// ---- tempat di samping yang paling lapang ----
/** Kotak di layar (px CSS) yang sebaiknya tidak ditutupi Clawd atau gelembungnya; `weight` = seberapa penting. */
export type Block = Readonly<{ x: number; y: number; w: number; h: number; weight: number }>;

/** Bobot: tombol/tautan jangan ditutupi (bisa mencuri ketukan), teks lebih penting dari kartu latar. */
export const BLOCK_WEIGHT = { control: 12, text: 4, card: 1 } as const;

/** Letak gelembung terhadap Clawd: di atas kepala, atau di samping kanan/kiri badannya. */
export type BubbleSide = "above" | "right" | "left";

/**
 * Calon tempat Clawd (NDC) dan letak gelembungnya, urut dari yang paling disukai (kanan bawah). Yang terakhir untuk
 * layar tegak yang hampir penuh kartu (gallery di HP): Clawd di pita antara chrome atas dan kartu, gelembung di
 * sampingnya.
 */
export const SIDE_CANDIDATES: readonly (readonly [number, number, BubbleSide])[] = [
  [0.76, -0.5, "above"],
  [0.62, -0.63, "above"],
  [0.62, -0.7, "above"],
  [0.76, -0.3, "above"],
  [-0.76, -0.5, "above"],
  [-0.62, -0.63, "above"],
  [-0.62, -0.7, "above"],
  [0.76, -0.1, "above"],
  [-0.76, -0.3, "above"],
  [0.45, -0.72, "above"],
  [-0.45, -0.72, "above"],
  [0.76, 0.15, "above"],
  [-0.76, 0.15, "above"],
  [-0.6, 0.64, "right"],
  [0.6, 0.64, "left"],
  [-0.6, 0.56, "right"],
  [0.6, 0.56, "left"],
];

/**
 * Slide tiket dengan tiket 3D (Tugas 12b): kartu berdiri di tengah layar, tombol di bawahnya. Di HP sempit tidak ada
 * calon biasa yang muat di samping kartu, jadi ditambah calon di pita kiri/kanan kartu (setinggi kartu): badan Clawd
 * tidak menutupi kartu; gelembungnya hanya sebentar saat berbicara, jadi badan yang menutupi kartu dihitung jauh lebih
 * mahal (`PASS_BODY_WEIGHT`).
 */
export const PASS_BODY_WEIGHT = 12;
export const PASS_CANDIDATES: readonly (readonly [number, number, BubbleSide])[] = [
  ...SIDE_CANDIDATES,
  [0.68, -0.05, "above"],
  [-0.68, -0.05, "above"],
  [0.68, 0.12, "above"],
  [-0.68, 0.12, "above"],
  [0.68, 0.28, "above"],
  [-0.68, 0.28, "above"],
];

const overlap = (a: Block, x: number, y: number, w: number, h: number) =>
  Math.max(0, Math.min(a.x + a.w, x + w) - Math.max(a.x, x)) * Math.max(0, Math.min(a.y + a.h, y + h) - Math.max(a.y, y));

/**
 * Tempat di samping yang paling sedikit menutupi isi layar. Clawd berukuran `body` px (tinggi badan), gelembungnya
 * kira-kira `bubble` px di atas kepalanya. Calon yang keluar layar dibuang. Seri: calon yang lebih awal (lebih disukai).
 */
export function bestSide(
  blocks: readonly Block[],
  screen: Readonly<{ w: number; h: number }>,
  body: number,
  bubble: Readonly<{ w: number; h: number }>,
  candidates = SIDE_CANDIDATES,
  /** Pengali biaya badan yang menutupi isi (slide tiket 3D: badan tetap di sana, gelembung hanya sebentar). */
  bodyWeight = 1,
): readonly [number, number, BubbleSide] {
  let best = candidates[0]!;
  let bestCost = Infinity;
  for (const c of candidates) {
    const cx = ((c[0] + 1) / 2) * screen.w;
    const cy = ((1 - c[1]) / 2) * screen.h;
    // badan + lengan + kaki
    const bw = body * 1.6;
    const bh = body * 1.3;
    const bx = cx - bw / 2;
    const by = cy - body * 0.55;
    if (bx < 0 || bx + bw > screen.w || by < 0 || by + bh > screen.h) continue;
    // gelembung di atas kepala atau di samping badan, digeser masuk layar seperti bubble.ts
    const above = c[2] === "above";
    const gw = Math.min(bubble.w, above ? screen.w - 24 : c[2] === "right" ? screen.w - 12 - (bx + bw + 8) : bx - 8 - 12);
    if (gw < bubble.w * 0.7) continue;
    const gx = above ? Math.max(12, Math.min(screen.w - 12 - gw, cx - gw / 2)) : c[2] === "right" ? bx + bw + 8 : bx - 8 - gw;
    const gy = above ? by - bubble.h - 8 : Math.max(12, Math.min(screen.h - 12 - bubble.h, cy - bubble.h / 2));
    let cost = gy < 0 ? 1e9 : 0;
    for (const b of blocks) cost += b.weight * (bodyWeight * overlap(b, bx, by, bw, bh) + 0.6 * overlap(b, gx, gy, gw, bubble.h));
    if (cost < bestCost - 1) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}
