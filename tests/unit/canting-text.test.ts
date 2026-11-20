import { describe, expect, it } from "vitest";
import { CANTING_TEXT, ct, type CantingTextKey } from "@/engine/canting/text";

const keys = Object.keys(CANTING_TEXT) as CantingTextKey[];
/** Istilah dan nama diri yang memang sama di kedua bahasa. */
const SAME = new Set<CantingTextKey>([
  "kicker",
  "tool.klowong",
  "tool.cecek",
  "tool.tembok",
  "guide.kawung",
  "guide.parang",
  "guide.bengawan",
]);
const clawd = keys.filter((k) => k.startsWith("clawd."));

describe("CANTING_TEXT", () => {
  it("setiap daun punya en dan id tak kosong tanpa spasi tepi", () => {
    for (const k of keys) {
      for (const l of ["en", "id"] as const) {
        const v = CANTING_TEXT[k][l];
        expect(v.length, `${k}.${l}`).toBeGreaterThan(0);
        expect(v, `${k}.${l}`).toBe(v.trim());
      }
    }
  });

  it("en berbeda dari id kecuali istilah yang didaftar", () => {
    for (const k of keys) {
      if (SAME.has(k)) continue;
      expect(CANTING_TEXT[k].en, k).not.toBe(CANTING_TEXT[k].id);
    }
  });

  it("baris Clawd paling panjang 90 karakter dan paling banyak satu tanda seru", () => {
    expect(clawd.length).toBeGreaterThanOrEqual(14);
    let bang = 0;
    for (const k of clawd) {
      for (const l of ["en", "id"] as const) {
        const v = CANTING_TEXT[k][l];
        expect(v.length, `${k}.${l}`).toBeLessThanOrEqual(90);
        bang += v.split("!").length - 1;
      }
    }
    expect(bang).toBeLessThanOrEqual(1);
  });

  it("ct() mengembalikan bahasa yang benar", () => {
    expect(ct("back", "en")).toBe("Back");
    expect(ct("back", "id")).toBe("Kembali");
  });

  it("about.body menyebut 2009 dan 1905 di kedua bahasa", () => {
    for (const l of ["en", "id"] as const) {
      expect(ct("about.body", l)).toContain("2009");
      expect(ct("about.body", l)).toContain("1905");
    }
  });
});
