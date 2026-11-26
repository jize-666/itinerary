import { describe, expect, it } from "vitest";
import { bestSide, BLOCK_WEIGHT, PASS_BODY_WEIGHT, PASS_CANDIDATES, SIDE_CANDIDATES } from "@/engine/mascot/guide";

/** Tata letak slide tiket dengan tiket 3D di HP 9:16 yang pendek (360 × 640 px CSS), diukur dari pratinjau 26 Nov. */
const screen = { w: 360, h: 640 };
const card = { x: 117, y: 110, w: 128, h: 253, weight: BLOCK_WEIGHT.text };
const blocks = [
  card,
  { x: 23, y: 377, w: 314, h: 55, weight: BLOCK_WEIGHT.control },
  { x: 23, y: 448, w: 314, h: 44, weight: BLOCK_WEIGHT.control },
  { x: 23, y: 507, w: 314, h: 44, weight: BLOCK_WEIGHT.control },
  { x: 16, y: 13, w: 98, h: 40, weight: BLOCK_WEIGHT.control },
  { x: 122, y: 13, w: 40, h: 40, weight: BLOCK_WEIGHT.control },
  { x: 194, y: 13, w: 40, h: 40, weight: BLOCK_WEIGHT.control },
  { x: 245, y: 13, w: 98, h: 40, weight: BLOCK_WEIGHT.control },
];

describe("Clawd di slide tiket 3D (Tugas 12b)", () => {
  it("di HP sempit badannya berdiri di samping kartu, tidak menutupinya", () => {
    const body = 0.19 * Math.min(screen.w, screen.h);
    const [x, y] = bestSide(blocks, screen, body, { w: 292, h: 80 }, PASS_CANDIDATES, PASS_BODY_WEIGHT);
    const cx = ((x + 1) / 2) * screen.w;
    const cy = ((1 - y) / 2) * screen.h;
    const [bx, by, bw, bh] = [cx - (body * 1.6) / 2, cy - body * 0.55, body * 1.6, body * 1.3];
    const ox = Math.max(0, Math.min(card.x + card.w, bx + bw) - Math.max(card.x, bx));
    const oy = Math.max(0, Math.min(card.y + card.h, by + bh) - Math.max(card.y, by));
    expect(ox * oy).toBe(0);
  });

  it("slide lain tidak berubah: calon dan bobot bawaan memilih tempat yang sama seperti sebelumnya", () => {
    const body = 0.19 * Math.min(screen.w, screen.h);
    expect(bestSide(blocks, screen, body, { w: 292, h: 80 })).toEqual(bestSide(blocks, screen, body, { w: 292, h: 80 }, SIDE_CANDIDATES, 1));
  });
});
