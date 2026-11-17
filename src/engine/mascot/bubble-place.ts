/**
 * Letak gelembung ucapan Clawd di layar (permintaan host 17 Nov: "cek semua bubble chat clawd, jangan sampai clawd
 * terpotong bubble chat ... bisa di perkecil bubble nya, atau arahnya"). Murni: ukuran teks diminta lewat `heightAt`,
 * jadi aturannya bisa dites tanpa DOM.
 *
 * Gelembung tidak pernah menutupi badan Clawd:
 * - di samping (kanan/kiri): lebarnya menyesuaikan ruang sampai tepi layar, tidak digeser masuk ke badan;
 * - di atas kepala: hanya bila tinggi gelembung muat di atas kepala, tidak didorong turun ke badan;
 * - urutan coba: sisi yang diminta, sisi seberangnya, lalu atas kepala (atau atas lalu kanan/kiri); bila tidak ada
 *   yang muat, huruf diperkecil (`tight`) dan dicoba lagi; bila tetap tidak muat, sisi samping yang paling lapang.
 */
import type { BubbleSide } from "./guide";

/** Kotak di layar (px CSS). */
export type Box = Readonly<{ left: number; top: number; right: number; bottom: number }>;

export type BubblePlacement = Readonly<{
  side: BubbleSide;
  /** Pojok kiri atas kotak gelembung (tanpa ekor) dan lebar maksimumnya. */
  x: number;
  y: number;
  maxW: number;
  h: number;
  /** Huruf diperkecil supaya muat. */
  tight: boolean;
}>;

export type PlaceInput = Readonly<{
  prefer: BubbleSide;
  /** Badan Clawd beserta lengan, kaki, dan ruang di atas kepala. */
  body: Box;
  view: Readonly<{ w: number; h: number }>;
  /** Lebar paling besar gelembung (biasa dan huruf kecil). */
  cap: number;
  capTight: number;
  /** Tinggi kotak gelembung (px) bila lebar maksimumnya `w`. */
  heightAt: (w: number, tight: boolean) => number;
  /** Lebar sebenarnya (px) bila lebar maksimumnya `w` (teks pendek lebih sempit dari batasnya). */
  widthAt: (w: number, tight: boolean) => number;
  /** Panjang ekor, jarak dari badan, dan jarak dari tepi layar. */
  drop: number;
  gap: number;
  margin: number;
  /** Gelembung samping lebih sempit dari ini dianggap tidak muat. */
  minW: number;
}>;

const ORDER: Readonly<Record<BubbleSide, readonly BubbleSide[]>> = {
  above: ["above", "right", "left"],
  right: ["right", "left", "above"],
  left: ["left", "right", "above"],
};

/** Coba satu sisi: letak bila muat, atau null. `force` = sisi samping dipakai walau lebih sempit dari `minW`. */
function trySide(o: PlaceInput, side: BubbleSide, tight: boolean, force = false): BubblePlacement | null {
  const { body, view, margin, gap, drop } = o;
  const cap = tight ? o.capTight : o.cap;
  const cy = (body.top + body.bottom) / 2;
  if (side === "above") {
    const maxW = Math.min(cap, view.w - 2 * margin);
    const h = o.heightAt(maxW, tight);
    const w = o.widthAt(maxW, tight);
    const y = body.top - gap - drop - h;
    if (y < margin) return null;
    const cx = (body.left + body.right) / 2;
    return { side, x: Math.max(margin, Math.min(view.w - margin - w, cx - w / 2)), y, maxW, h, tight };
  }
  const room = side === "right" ? view.w - margin - (body.right + gap + drop) : body.left - gap - drop - margin;
  const maxW = Math.min(cap, room);
  if (maxW < (force ? 60 : o.minW)) return null;
  const h = o.heightAt(maxW, tight);
  const w = o.widthAt(maxW, tight);
  const y = Math.max(margin, Math.min(view.h - margin - h, cy - h / 2));
  const x = side === "right" ? body.right + gap + drop : body.left - gap - drop - w;
  return { side, x, y, maxW, h, tight };
}

export function placeBubble(o: PlaceInput): BubblePlacement {
  for (const tight of [false, true]) {
    for (const side of ORDER[o.prefer]) {
      const p = trySide(o, side, tight);
      if (p) return p;
    }
  }
  // tidak ada yang muat: sisi samping yang paling lapang, huruf kecil
  const roomR = o.view.w - o.margin - (o.body.right + o.gap + o.drop);
  const roomL = o.body.left - o.gap - o.drop - o.margin;
  return trySide(o, roomR >= roomL ? "right" : "left", true, true) ?? { side: "above", x: o.margin, y: o.margin, maxW: o.capTight, h: o.heightAt(o.capTight, true), tight: true };
}

/** Dua kotak beririsan. */
export const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
