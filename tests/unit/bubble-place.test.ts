import { describe, expect, it } from "vitest";
import { type Box, overlaps, placeBubble, type PlaceInput } from "@/engine/mascot/bubble-place";
import type { BubbleSide } from "@/engine/mascot/guide";

/**
 * Gelembung Clawd tidak pernah menutupi badannya (host 17 Nov, tangkapan layar iPhone: gelembung di kanan Clawd
 * yang ada di tepi kiri layar bergeser masuk ke badannya).
 */
const text = (chars: number) => ({
  // teks mengalir: makin sempit, makin tinggi; satu baris ±9 px per huruf, tinggi baris 22 px, nama + bantalan 40 px
  heightAt: (w: number, tight: boolean) => 40 + 22 * Math.ceil((chars * (tight ? 7.5 : 9)) / Math.max(40, w - 30)),
  widthAt: (w: number, tight: boolean) => Math.min(w, 30 + chars * (tight ? 7.5 : 9)),
});
const base = (body: Box, prefer: BubbleSide, view = { w: 390, h: 844 }, chars = 70): PlaceInput => ({
  prefer,
  body,
  view,
  cap: 304,
  capTight: 260,
  ...text(chars),
  drop: 12,
  gap: 4,
  margin: 12,
  minW: 150,
});
const boxOf = (p: ReturnType<typeof placeBubble>, i: PlaceInput): Box => {
  const w = i.widthAt(p.maxW, p.tight);
  return { left: p.x, top: p.y, right: p.x + w, bottom: p.y + p.h };
};

describe("letak gelembung Clawd", () => {
  it("kasus tangkapan layar host: Clawd di tepi kiri atas HP, gelembung kanan menyempit dan tidak menutupi badan", () => {
    const body: Box = { left: 4, top: 150, right: 101, bottom: 250 };
    const i = base(body, "right");
    const p = placeBubble(i);
    expect(p.side).toBe("right");
    expect(p.x).toBeGreaterThanOrEqual(body.right);
    expect(overlaps(boxOf(p, i), body)).toBe(false);
    expect(boxOf(p, i).right).toBeLessThanOrEqual(390 - 12 + 1e-6);
  });

  it("di kanan tidak ada ruang: pindah ke kiri; di kiri juga tidak: ke atas kepala", () => {
    const right = placeBubble(base({ left: 220, top: 400, right: 300, bottom: 480 }, "right"));
    expect(right.side).toBe("left");
    const centre = base({ left: 150, top: 400, right: 240, bottom: 480 }, "right");
    const up = placeBubble(centre);
    expect(up.side).toBe("above");
    expect(up.y + up.h).toBeLessThanOrEqual(centre.body.top);
  });

  it("di atas kepala hanya bila muat; dekat tepi atas pindah ke samping, tidak didorong turun ke badan", () => {
    const i = base({ left: 40, top: 30, right: 130, bottom: 120 }, "above");
    const p = placeBubble(i);
    expect(p.side).not.toBe("above");
    expect(overlaps(boxOf(p, i), i.body)).toBe(false);
  });

  it("layar sempit tanpa ruang longgar: huruf diperkecil, tetap tidak menutupi badan", () => {
    const i = base({ left: 120, top: 40, right: 250, bottom: 150 }, "right", { w: 340, h: 600 }, 120);
    const p = placeBubble(i);
    expect(overlaps(boxOf(p, i), i.body)).toBe(false);
  });

  it("menyapu semua letak Clawd di HP dan layar lebar, semua arah: gelembung tidak pernah menutupi badan dan tetap di layar", () => {
    for (const view of [
      { w: 390, h: 844 },
      { w: 360, h: 640 },
      { w: 1280, h: 720 },
      { w: 1920, h: 1080 },
    ]) {
      const size = Math.min(view.w, view.h) * (view.w < view.h ? 0.19 : 0.15);
      for (let cx = size; cx <= view.w - size; cx += view.w / 13) {
        for (let cy = size; cy <= view.h - size; cy += view.h / 11) {
          const body: Box = { left: cx - size * 0.8, top: cy - size * 0.75, right: cx + size * 0.8, bottom: cy + size * 0.75 };
          for (const prefer of ["above", "right", "left"] as const) {
            for (const chars of [14, 70, 110]) {
              const i = base(body, prefer, view, chars);
              const p = placeBubble(i);
              const b = boxOf(p, i);
              expect(overlaps(b, body), `${view.w}x${view.h} ${cx},${cy} ${prefer} ${chars}`).toBe(false);
              expect(b.top).toBeGreaterThanOrEqual(12 - 1e-6);
              expect(b.bottom).toBeLessThanOrEqual(view.h - 12 + 1e-6);
              expect(b.left).toBeGreaterThanOrEqual(12 - 1e-6);
              expect(b.right).toBeLessThanOrEqual(view.w - 12 + 1e-6);
            }
          }
        }
      }
    }
  });
});
