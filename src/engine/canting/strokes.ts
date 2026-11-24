/**
 * Riwayat goresan malam untuk halaman interaktif `/canting/` (Tugas 11.2). Data murni: tanpa DOM, tanpa three.js.
 * Koordinat kain: x di [0, aspect], y di [0, 1] (y ke bawah); jari-jari dab dalam satuan tinggi kain.
 */

/** Lapisan malam: 0 = klowong/cecek (tetap sampai lorod), 1 = tembok (dikerok sesudah nila), 2 = mbironi (sesudah nila, menahan soga). */
export type WaxLayer = 0 | 1 | 2;
export type StrokeTool = "klowong" | "cecek" | "tembok";
/** dabs = deret x, y, r (r = jari-jari dab dalam satuan tinggi kain), tiga angka per dab. */
export type WaxStroke = { tool: StrokeTool; layer: WaxLayer; dabs: number[] };

/** Jari-jari dab terbesar (satuan tinggi kain). */
export const MAX_R = 0.06;
/** Batas ukuran hasil encode (karakter). encode() tetap boleh lebih besar; pemanggil yang memutuskan. */
export const STORE_LIMIT = 1_500_000;

const PREFIX = "w1:";
const TOOLS: readonly StrokeTool[] = ["klowong", "cecek", "tembok"];
const Q = 65535;
const CHUNK = 0x8000;

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
const quant = (v: number) => Math.round(clamp(v, 0, 1) * Q);

export class StrokeHistory {
  readonly aspect: number;
  private done: WaxStroke[] = [];
  private open: WaxStroke | null = null;

  constructor(aspect = 1.6) {
    this.aspect = aspect;
  }

  get strokes(): readonly WaxStroke[] {
    return this.done;
  }

  get current(): WaxStroke | null {
    return this.open;
  }

  get dabCount(): number {
    let n = this.open ? this.open.dabs.length / 3 : 0;
    for (const s of this.done) n += s.dabs.length / 3;
    return n;
  }

  get hasWax(): boolean {
    return this.dabCount > 0;
  }

  hasLayer(layer: WaxLayer): boolean {
    if (this.open && this.open.layer === layer && this.open.dabs.length > 0) return true;
    return this.done.some((s) => s.layer === layer && s.dabs.length > 0);
  }

  begin(tool: StrokeTool, layer: WaxLayer): void {
    this.end();
    this.open = { tool, layer, dabs: [] };
  }

  add(x: number, y: number, r: number): void {
    if (!this.open) throw new Error("add() tanpa begin()");
    this.open.dabs.push(clamp(x, 0, this.aspect), clamp(y, 0, 1), clamp(r, 0, MAX_R));
  }

  end(): void {
    const s = this.open;
    this.open = null;
    if (s && s.dabs.length > 0) this.done.push(s);
  }

  undo(): WaxStroke | null {
    this.end();
    return this.done.pop() ?? null;
  }

  clear(): void {
    this.done = [];
    this.open = null;
  }

  /** Ditambahkan sekaligus (auto-trace / demo): satu goresan utuh. */
  push(stroke: WaxStroke): void {
    const n = Math.floor(stroke.dabs.length / 3);
    if (n === 0) return;
    this.end();
    const dabs: number[] = [];
    for (let i = 0; i < n; i++) {
      dabs.push(
        clamp(stroke.dabs[i * 3] ?? 0, 0, this.aspect),
        clamp(stroke.dabs[i * 3 + 1] ?? 0, 0, 1),
        clamp(stroke.dabs[i * 3 + 2] ?? 0, 0, MAX_R),
      );
    }
    this.done.push({ tool: stroke.tool, layer: stroke.layer, dabs });
  }

  /** Semua dab berurutan: x, y, r, lapisan (4 angka per dab), termasuk goresan yang sedang dibuat. */
  flat(): Float32Array {
    const out = new Float32Array(this.dabCount * 4);
    let o = 0;
    const put = (s: WaxStroke) => {
      for (let i = 0; i < s.dabs.length; i += 3) {
        out[o++] = s.dabs[i] ?? 0;
        out[o++] = s.dabs[i + 1] ?? 0;
        out[o++] = s.dabs[i + 2] ?? 0;
        out[o++] = s.layer;
      }
    };
    for (const s of this.done) put(s);
    if (this.open) put(this.open);
    return out;
  }

  /** String ringkas untuk localStorage: "w1:" + base64 (u32 jumlah goresan; per goresan u8 alat, u8 lapisan, u32 dab, u16 x3 per dab). */
  encode(): string {
    const list = this.open && this.open.dabs.length > 0 ? [...this.done, this.open] : this.done;
    let size = 4;
    for (const s of list) size += 6 + (s.dabs.length / 3) * 6;
    const buf = new Uint8Array(size);
    const dv = new DataView(buf.buffer);
    let p = 0;
    dv.setUint32(p, list.length, true);
    p += 4;
    for (const s of list) {
      const n = s.dabs.length / 3;
      dv.setUint8(p++, TOOLS.indexOf(s.tool));
      dv.setUint8(p++, s.layer);
      dv.setUint32(p, n, true);
      p += 4;
      for (let i = 0; i < n; i++) {
        dv.setUint16(p, quant((s.dabs[i * 3] ?? 0) / this.aspect), true);
        dv.setUint16(p + 2, quant(s.dabs[i * 3 + 1] ?? 0), true);
        dv.setUint16(p + 4, quant((s.dabs[i * 3 + 2] ?? 0) / MAX_R), true);
        p += 6;
      }
    }
    // Rangkai string biner per potongan supaya 100 ribu dab tidak menjebol tumpukan panggilan.
    let bin = "";
    for (let i = 0; i < buf.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK) as unknown as number[]);
    }
    return PREFIX + btoa(bin);
  }

  /** null untuk masukan rusak apa pun; tidak pernah melempar. */
  static decode(s: string, aspect = 1.6): StrokeHistory | null {
    try {
      if (typeof s !== "string" || !s.startsWith(PREFIX)) return null;
      const bin = atob(s.slice(PREFIX.length));
      const len = bin.length;
      if (len < 4) return null;
      const buf = new Uint8Array(len);
      for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
      const dv = new DataView(buf.buffer);
      const count = dv.getUint32(0, true);
      let p = 4;
      const h = new StrokeHistory(aspect);
      for (let k = 0; k < count; k++) {
        if (p + 6 > len) return null;
        const tool = TOOLS[dv.getUint8(p)];
        const layer = dv.getUint8(p + 1);
        const n = dv.getUint32(p + 2, true);
        p += 6;
        if (!tool || layer > 2 || n === 0) return null;
        if (p + n * 6 > len) return null;
        const dabs = new Array<number>(n * 3);
        for (let i = 0; i < n; i++) {
          dabs[i * 3] = (dv.getUint16(p, true) / Q) * aspect;
          dabs[i * 3 + 1] = dv.getUint16(p + 2, true) / Q;
          dabs[i * 3 + 2] = (dv.getUint16(p + 4, true) / Q) * MAX_R;
          p += 6;
        }
        h.done.push({ tool, layer: layer as WaxLayer, dabs });
      }
      return p === len ? h : null;
    } catch {
      return null;
    }
  }
}
