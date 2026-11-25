import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KEEPSAKE_LIMIT,
  clearCloth,
  clothUrl,
  isClothRecord,
  readCloth,
  saveCloth,
} from "@/lib/keepsake";

function rec(over: Record<string, unknown> = {}) {
  return {
    v: 1,
    type: "image/jpeg",
    bytes: new ArrayBuffer(8),
    width: 640,
    height: 400,
    at: 1_700_000_000_000,
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isClothRecord", () => {
  it("menerima rekaman yang sah", () => {
    expect(isClothRecord(rec())).toBe(true);
    expect(isClothRecord(rec({ type: "image/webp" }))).toBe(true);
    expect(isClothRecord(rec({ type: "image/png", width: 16, height: 4096 }))).toBe(true);
    expect(isClothRecord(rec({ bytes: new ArrayBuffer(KEEPSAKE_LIMIT) }))).toBe(true);
  });

  it("menolak versi salah dan tipe asing", () => {
    expect(isClothRecord(rec({ v: 2 }))).toBe(false);
    expect(isClothRecord(rec({ v: undefined }))).toBe(false);
    expect(isClothRecord(rec({ type: "image/gif" }))).toBe(false);
    expect(isClothRecord(rec({ type: 5 }))).toBe(false);
  });

  it("menolak bytes kosong, kebesaran, atau bukan ArrayBuffer", () => {
    expect(isClothRecord(rec({ bytes: new ArrayBuffer(0) }))).toBe(false);
    expect(isClothRecord(rec({ bytes: new ArrayBuffer(KEEPSAKE_LIMIT + 1) }))).toBe(false);
    expect(isClothRecord(rec({ bytes: new Uint8Array(8) }))).toBe(false);
    expect(isClothRecord(rec({ bytes: "abc" }))).toBe(false);
  });

  it("menolak lebar/tinggi tidak bulat atau di luar 16..4096", () => {
    expect(isClothRecord(rec({ width: 640.5 }))).toBe(false);
    expect(isClothRecord(rec({ height: 15 }))).toBe(false);
    expect(isClothRecord(rec({ width: 4097 }))).toBe(false);
    expect(isClothRecord(rec({ width: NaN }))).toBe(false);
    expect(isClothRecord(rec({ height: "400" }))).toBe(false);
  });

  it("menolak at <= 0, NaN, atau tak hingga", () => {
    expect(isClothRecord(rec({ at: 0 }))).toBe(false);
    expect(isClothRecord(rec({ at: -1 }))).toBe(false);
    expect(isClothRecord(rec({ at: NaN }))).toBe(false);
    expect(isClothRecord(rec({ at: Infinity }))).toBe(false);
  });

  it("menolak null, string, dan array", () => {
    expect(isClothRecord(null)).toBe(false);
    expect(isClothRecord(undefined)).toBe(false);
    expect(isClothRecord("kain")).toBe(false);
    expect(isClothRecord(42)).toBe(false);
    expect(isClothRecord([])).toBe(false);
    expect(isClothRecord([rec()])).toBe(false);
  });
});

describe("tanpa IndexedDB", () => {
  it("readCloth null, saveCloth false, clothUrl null, clearCloth tidak melempar", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await clearCloth();
    expect(await readCloth()).toBeNull();
    expect(await clothUrl()).toBeNull();
    const blob = new Blob([new Uint8Array(8)], { type: "image/jpeg" });
    expect(await saveCloth(blob, 640, 400)).toBe(false);
    await expect(clearCloth()).resolves.toBeUndefined();
  });
});

describe("saveCloth menolak masukan buruk", () => {
  it("tipe text/plain", async () => {
    const blob = new Blob(["halo"], { type: "text/plain" });
    expect(await saveCloth(blob, 640, 400)).toBe(false);
  });

  it("blob kosong, kebesaran, atau ukuran tidak sah", async () => {
    expect(await saveCloth(new Blob([], { type: "image/jpeg" }), 640, 400)).toBe(false);
    const big = new Blob([new ArrayBuffer(KEEPSAKE_LIMIT + 1)], { type: "image/jpeg" });
    expect(await saveCloth(big, 640, 400)).toBe(false);
    const ok = new Blob([new Uint8Array(8)], { type: "image/jpeg" });
    expect(await saveCloth(ok, 8, 400)).toBe(false);
    expect(await saveCloth(ok, 640, 400.5)).toBe(false);
  });
});
