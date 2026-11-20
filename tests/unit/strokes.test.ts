import { describe, expect, it } from "vitest";
import { MAX_R, StrokeHistory } from "@/engine/canting/strokes";

function draw(h: StrokeHistory, tool: "klowong" | "cecek" | "tembok", layer: 0 | 1 | 2, n: number) {
  h.begin(tool, layer);
  for (let i = 0; i < n; i++) h.add(0.1 + i * 0.01, 0.5, 0.01);
  h.end();
}

/** Ubah byte hasil encode lalu bungkus lagi. */
function tamper(enc: string, edit: (dv: DataView, bytes: Uint8Array) => Uint8Array | void) {
  const bin = atob(enc.slice(3));
  let bytes: Uint8Array = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const out = edit(new DataView(bytes.buffer as ArrayBuffer), bytes);
  if (out) bytes = out;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return "w1:" + btoa(s);
}

describe("StrokeHistory", () => {
  it("begin/add/end menghitung dab", () => {
    const h = new StrokeHistory();
    expect(h.aspect).toBe(1.6);
    expect(h.hasWax).toBe(false);
    h.begin("klowong", 0);
    h.add(0.1, 0.2, 0.01);
    h.add(0.2, 0.2, 0.01);
    expect(h.current?.dabs).toHaveLength(6);
    expect(h.dabCount).toBe(2);
    expect(h.strokes.length).toBe(0);
    h.end();
    expect(h.current).toBeNull();
    expect(h.strokes.length).toBe(1);
    expect(h.dabCount).toBe(2);
    expect(h.hasWax).toBe(true);
  });

  it("add tanpa begin melempar; begin menutup goresan terbuka", () => {
    const h = new StrokeHistory();
    expect(() => h.add(0, 0, 0)).toThrow();
    h.begin("cecek", 0);
    h.add(0.1, 0.1, 0.01);
    h.begin("tembok", 1);
    expect(h.strokes.length).toBe(1);
    expect(h.current?.tool).toBe("tembok");
  });

  it("goresan kosong dibuang", () => {
    const h = new StrokeHistory();
    h.begin("klowong", 0);
    h.end();
    expect(h.strokes.length).toBe(0);
    expect(h.hasWax).toBe(false);
  });

  it("undo mengembalikan goresan terakhir dan memulihkan hitungan", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 3);
    draw(h, "tembok", 1, 2);
    const s = h.undo();
    expect(s?.tool).toBe("tembok");
    expect(h.dabCount).toBe(3);
    expect(h.undo()?.tool).toBe("klowong");
    expect(h.undo()).toBeNull();
    expect(h.dabCount).toBe(0);
  });

  it("undo dengan goresan terbuka menutupnya lalu membuangnya", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 2);
    h.begin("cecek", 0);
    h.add(0.3, 0.3, 0.01);
    const s = h.undo();
    expect(s?.tool).toBe("cecek");
    expect(h.current).toBeNull();
    expect(h.strokes.length).toBe(1);
    expect(h.dabCount).toBe(2);
  });

  it("clear mengosongkan semuanya", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 2);
    h.begin("cecek", 0);
    h.add(0.1, 0.1, 0.01);
    h.clear();
    expect(h.dabCount).toBe(0);
    expect(h.current).toBeNull();
    expect(h.strokes.length).toBe(0);
  });

  it("hasLayer melihat goresan selesai dan yang sedang dibuat", () => {
    const h = new StrokeHistory();
    expect(h.hasLayer(0)).toBe(false);
    draw(h, "klowong", 0, 1);
    expect(h.hasLayer(0)).toBe(true);
    expect(h.hasLayer(1)).toBe(false);
    h.begin("tembok", 2);
    expect(h.hasLayer(2)).toBe(false);
    h.add(0.1, 0.1, 0.01);
    expect(h.hasLayer(2)).toBe(true);
  });

  it("add menjepit x, y, r", () => {
    const h = new StrokeHistory(2);
    h.begin("klowong", 0);
    h.add(-1, 5, 1);
    h.add(9, -3, -1);
    h.end();
    expect(h.strokes[0]?.dabs).toEqual([0, 1, MAX_R, 2, 0, 0]);
  });

  it("flat memberi x,y,r,lapisan berurutan termasuk goresan terbuka", () => {
    const h = new StrokeHistory();
    h.begin("klowong", 0);
    h.add(0.1, 0.2, 0.01);
    h.end();
    h.begin("tembok", 2);
    h.add(0.3, 0.4, 0.02);
    const f = h.flat();
    expect(f.length).toBe(8);
    expect(Array.from(f.slice(0, 4))).toEqual([
      Math.fround(0.1),
      Math.fround(0.2),
      Math.fround(0.01),
      0,
    ]);
    expect(f[7]).toBe(2);
    expect(f[4]).toBeCloseTo(0.3, 6);
  });

  it("push mengabaikan goresan kosong dan menambah yang utuh", () => {
    const h = new StrokeHistory();
    h.push({ tool: "klowong", layer: 0, dabs: [] });
    expect(h.strokes.length).toBe(0);
    h.push({ tool: "cecek", layer: 0, dabs: [0.5, 0.5, 0.01, 0.6, 0.5, 0.01] });
    expect(h.strokes.length).toBe(1);
    expect(h.dabCount).toBe(2);
  });

  it("encode lalu decode menjaga posisi, alat, dan lapisan", () => {
    const h = new StrokeHistory();
    h.begin("klowong", 0);
    h.add(0.123, 0.456, 0.0123);
    h.add(1.5, 0.99, MAX_R);
    h.end();
    draw(h, "cecek", 0, 2);
    draw(h, "tembok", 2, 3);
    const enc = h.encode();
    expect(enc.startsWith("w1:")).toBe(true);
    const d = StrokeHistory.decode(enc);
    expect(d).not.toBeNull();
    expect(d!.strokes.length).toBe(3);
    expect(d!.strokes.map((s) => [s.tool, s.layer])).toEqual([
      ["klowong", 0],
      ["cecek", 0],
      ["tembok", 2],
    ]);
    const a = h.flat();
    const b = d!.flat();
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i += 4) {
      const d3 = (k: number) => Math.abs((b[i + k] ?? NaN) - (a[i + k] ?? NaN));
      expect(d3(0)).toBeLessThanOrEqual((1.6 / 65535) * 1.01);
      expect(d3(1)).toBeLessThanOrEqual((1 / 65535) * 1.01);
      expect(d3(2)).toBeLessThanOrEqual((MAX_R / 65535) * 1.01);
      expect(d3(3)).toBe(0);
    }
  });

  it("riwayat kosong bisa di-encode dan di-decode", () => {
    const d = StrokeHistory.decode(new StrokeHistory().encode());
    expect(d?.dabCount).toBe(0);
  });

  it("goresan 100 000 dab tidak melempar", () => {
    const h = new StrokeHistory();
    h.begin("klowong", 0);
    for (let i = 0; i < 100_000; i++) h.add((i % 1000) / 1000, (i % 777) / 777, 0.01);
    h.end();
    const enc = h.encode();
    const d = StrokeHistory.decode(enc);
    expect(d?.dabCount).toBe(100_000);
  });

  it("decode menolak sampah tanpa melempar", () => {
    for (const s of ["", "abc", "w1:", "w1:!!!", "w1:AAAA", "w2:AAAAAAAA", "x1:AAAA"]) {
      expect(StrokeHistory.decode(s)).toBeNull();
    }
    expect(StrokeHistory.decode(undefined as unknown as string)).toBeNull();
  });

  it("decode menolak awalan atau versi salah", () => {
    const enc = new StrokeHistory().encode();
    expect(StrokeHistory.decode("w2:" + enc.slice(3))).toBeNull();
    expect(StrokeHistory.decode(enc.slice(3))).toBeNull();
  });

  it("decode menolak string terpotong", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 10);
    const enc = h.encode();
    expect(StrokeHistory.decode(enc.slice(0, enc.length - 8))).toBeNull();
    expect(StrokeHistory.decode(enc.slice(0, 8))).toBeNull();
  });

  it("decode menolak jumlah yang tidak cocok dengan panjang data", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 10);
    const enc = h.encode();
    // jumlah dab lebih besar dari data
    expect(StrokeHistory.decode(tamper(enc, (dv) => void dv.setUint32(6, 11, true)))).toBeNull();
    // jumlah dab lebih kecil: sisa byte
    expect(StrokeHistory.decode(tamper(enc, (dv) => void dv.setUint32(6, 9, true)))).toBeNull();
    // jumlah goresan lebih besar
    expect(StrokeHistory.decode(tamper(enc, (dv) => void dv.setUint32(0, 2, true)))).toBeNull();
    // byte berlebih di ekor
    expect(StrokeHistory.decode(tamper(enc, (_dv, b) => new Uint8Array([...b, 0])))).toBeNull();
  });

  it("decode menolak alat atau lapisan di luar rentang", () => {
    const h = new StrokeHistory();
    draw(h, "klowong", 0, 2);
    const enc = h.encode();
    expect(StrokeHistory.decode(tamper(enc, (dv) => void dv.setUint8(4, 3)))).toBeNull();
    expect(StrokeHistory.decode(tamper(enc, (dv) => void dv.setUint8(5, 3)))).toBeNull();
  });
});
