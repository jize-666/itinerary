import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pola GLSL yang menghasilkan NaN di GPU HP (audit host 14 Nov: segi delapan hitam di iPhone, disebar bloom dari
 * satu piksel NaN). Dibaca langsung dari sumber shader panggung, supaya polanya tidak masuk lagi.
 */
const DIR = "src/components/film/stage3d";
const sources = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => ({ file: f, text: readFileSync(join(DIR, f), "utf8") }));

/** Argumen tingkat atas sebuah panggilan, mulai dari kurung buka di `open`. */
function topArgs(text: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = open; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(" && depth++ === 0) continue;
    if (c === ")" && --depth === 0) return [...args, cur.trim()];
    if (c === "," && depth === 1) {
      args.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  return args;
}

describe("shader panggung aman dari NaN", () => {
  it("pow tidak pernah diberi dasar `1.0 - …` yang bisa negatif tanpa clamp", () => {
    const bad: string[] = [];
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/pow\(\s*1\.0\s*-[^,]*,/g)) bad.push(`${file}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it("pow tidak dipakai untuk kuadrat dari nilai yang bisa negatif (pakai sq)", () => {
    const bad: string[] = [];
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/pow\(\(([^()]*)\)\s*\/\s*[\d.]+,\s*2\.0\)/g)) bad.push(`${file}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it("smoothstep dengan tepi angka selalu naik (tepi terbalik tidak terdefinisi di GLSL)", () => {
    const bad: string[] = [];
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)) {
        if (Number(m[1]) >= Number(m[2])) bad.push(`${file}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("smoothstep dengan tepi bervariabel juga tidak terbalik (`L + w, L` atau `X, X * 0.25`)", () => {
    const bad: string[] = [];
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/smoothstep\(/g)) {
        const [a = "", b = ""] = topArgs(text, m.index + m[0].length - 1);
        const plus = /^(-?[\d.]+)\s*\+\s*.+$/.exec(a);
        const times = /^(.+?)\s*\*\s*([\d.]+)$/.exec(b);
        const timesA = /^(.+?)\s*\*\s*([\d.]+)$/.exec(a);
        const rev = (plus && plus[1] === b) || (times && times[1]!.trim() === a && Number(times[2]) < 1) || (timesA && times && timesA[1]!.trim() === times[1]!.trim() && Number(timesA[2]) > Number(times[2]));
        if (rev) bad.push(`${file}: smoothstep(${a}, ${b}, …)`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("rantai post menyaring piksel tak sah sebelum bloom dan sebelum gambar akhir", () => {
    const post = sources.find((s) => s.file === "post.ts")!.text;
    expect(post).toMatch(/isnan/);
    expect((post.match(/finite\(texture2D\(tSrc/g) ?? []).length).toBe(5);
    expect(post).toMatch(/finite\(texture2D\(tScene/);
  });
});
