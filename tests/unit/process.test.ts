/**
 * Urutan tahap membatik di /canting/ (Tugas 11.2, PRD §8: gambar → celup → lorod → simpan; tidak bisa melorod
 * sebelum ada malam). Sogan Solo: malam → nila → kerok → (mbironi) → soga → lorod.
 */
import { describe, expect, it } from "vitest";
import { advance, allowed, createProcess, DURATION, layerFor, start, type Process } from "@/engine/canting/process";

/** Jalankan animasi sampai selesai. */
const finish = (p: Process, from: number) => advance(p, from + 60_000);

describe("urutan tahap batik", () => {
  it("awal: hanya menggambar (dan mulai lagi) yang boleh; tanpa malam tidak bisa dicelup atau dilorod", () => {
    const p = createProcess();
    expect(p.stage).toBe("malam");
    expect(allowed(p, "draw", false)).toBe(true);
    for (const a of ["nila", "soga", "lorod", "save"] as const) expect(allowed(p, a, false)).toBe(false);
    expect(allowed(p, "restart", false)).toBe(true);
  });

  it("ada malam: boleh celup nila atau langsung soga, belum boleh lorod atau simpan", () => {
    const p = createProcess();
    expect(allowed(p, "nila", true)).toBe(true);
    expect(allowed(p, "soga", true)).toBe(true);
    expect(allowed(p, "lorod", true)).toBe(false);
    expect(allowed(p, "save", true)).toBe(false);
  });

  it("nila: kain turun ke bak, lalu malam tembok dikerok, lalu tahap biru (mbironi)", () => {
    let p = start(createProcess(), "nila", 1000);
    expect(p.busy).toBe("nila");
    expect(allowed(p, "draw", true)).toBe(false);
    expect(allowed(p, "soga", true)).toBe(false);
    p = advance(p, 1000 + DURATION.nila / 2);
    expect(p.amounts.nila).toBeGreaterThan(0.2);
    expect(p.amounts.nila).toBeLessThan(0.95);
    p = advance(p, 1000 + DURATION.nila + 1);
    expect(p.amounts.nila).toBe(1);
    expect(p.busy).toBe("kerok");
    p = advance(p, 1000 + DURATION.nila + DURATION.kerok + 2);
    expect(p.amounts.kerok).toBe(1);
    expect(p.busy).toBeNull();
    expect(p.stage).toBe("biru");
    expect(allowed(p, "draw", true)).toBe(true);
    expect(allowed(p, "nila", true)).toBe(false);
    expect(allowed(p, "soga", true)).toBe(true);
    expect(allowed(p, "lorod", true)).toBe(true);
  });

  it("soga lalu lorod lalu simpan; sesudah lorod tidak bisa menggambar atau mencelup lagi", () => {
    let p = finish(start(createProcess(), "nila", 0), 0);
    p = start(p, "soga", 100_000);
    p = finish(p, 100_000);
    expect(p.amounts.soga).toBe(1);
    expect(p.stage).toBe("coklat");
    expect(allowed(p, "draw", true)).toBe(false);
    expect(allowed(p, "lorod", true)).toBe(true);
    p = start(p, "lorod", 200_000);
    expect(advance(p, 200_000 + DURATION.lorod / 2).amounts.lorod).toBeGreaterThan(0);
    p = finish(p, 200_000);
    expect(p.stage).toBe("jadi");
    expect(p.amounts.lorod).toBe(1);
    expect(allowed(p, "save", true)).toBe(true);
    for (const a of ["draw", "nila", "soga", "lorod"] as const) expect(allowed(p, a, true)).toBe(false);
  });

  it("langsung soga tanpa nila: kerok tidak terjadi, lalu boleh lorod", () => {
    const p = finish(start(createProcess(), "soga", 0), 0);
    expect(p.amounts).toMatchObject({ nila: 0, kerok: 0, soga: 1 });
    expect(p.stage).toBe("coklat");
    expect(allowed(p, "lorod", true)).toBe(true);
  });

  it("aksi yang tidak boleh tidak mengubah keadaan", () => {
    const p = createProcess();
    expect(start(p, "lorod", 0)).toBe(p);
    const busy = start(p, "nila", 0);
    expect(start(busy, "soga", 10)).toBe(busy);
  });

  it("mulai lagi kembali ke kain kosong dari tahap mana pun", () => {
    let p = finish(start(createProcess(), "nila", 0), 0);
    p = start(p, "restart", 50_000);
    expect(p).toEqual(createProcess());
  });

  it("lapisan malam: klowong/cecek tetap, tembok dikerok, sesudah nila semua menjadi mbironi", () => {
    const p = createProcess();
    expect(layerFor(p, "klowong")).toBe(0);
    expect(layerFor(p, "cecek")).toBe(0);
    expect(layerFor(p, "tembok")).toBe(1);
    const biru = finish(start(p, "nila", 0), 0);
    expect(layerFor(biru, "klowong")).toBe(2);
    expect(layerFor(biru, "tembok")).toBe(2);
  });

  it("Calm: perpindahan tahap memakai pudar singkat", () => {
    const calm = start(createProcess(), "nila", 0, true);
    expect(advance(calm, DURATION.calm + 1).busy).toBe("kerok");
    const p = advance(calm, DURATION.calm * 2 + 2);
    expect(p.stage).toBe("biru");
  });
});
