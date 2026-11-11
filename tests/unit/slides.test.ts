import { describe, expect, it } from "vitest";
import { createSlideStore, initialSlideState, reduce, type SlideEffect, type SlideEvent, type SlideState } from "@/engine/slides/controller";

/** Jalankan serangkaian event; kembalikan keadaan akhir + jenis efek berurutan. */
function play(count: number, events: SlideEvent[], index = 0) {
  let s: SlideState = initialSlideState(count, index);
  const fx: SlideEffect[] = [];
  for (const e of events) {
    const [next, out] = reduce(s, e);
    s = next;
    fx.push(...out);
  }
  return { s, fx, types: fx.map((f) => f.type) };
}
const step = (dir: 1 | -1, source: "wheel" | "key" | "touch" | "ui" = "key", at?: number): SlideEvent => ({ type: "step", dir, source, at });
const settled: SlideEvent = { type: "settled" };

describe("mesin slide: satu gerakan = satu slide", () => {
  it("satu langkah memajukan tepat satu slide", () => {
    const { s, types } = play(5, [step(1), settled]);
    expect(s.index).toBe(1);
    expect(s.phase).toBe("idle");
    expect(types).toEqual(["prepare", "run", "commit"]);
  });

  it("mundur dari slide pertama dan maju dari slide terakhir hanya memberi efek `edge`", () => {
    expect(play(3, [step(-1)]).types).toEqual(["edge"]);
    const last = play(3, [step(1)], 2);
    expect(last.types).toEqual(["edge"]);
    expect(last.s.index).toBe(2);
    expect(last.s.phase).toBe("idle");
  });

  it("selama transisi, paling banyak satu langkah diantrekan", () => {
    const { s, types } = play(9, [step(1), step(1, "key", 0.2), step(1, "key", 0.3), step(1, "key", 0.4), settled, settled]);
    expect(s.index).toBe(2); // bukan 4
    expect(types.filter((t) => t === "commit")).toHaveLength(2);
  });

  it("antrean memicu `hurry` supaya sisa transisi dipercepat", () => {
    expect(play(9, [step(1), step(1, "key", 0.2)]).types).toContain("hurry");
  });

  it("roda sebelum 80% transisi dibuang (ekor inersia), sesudahnya diantrekan", () => {
    const early = play(9, [step(1, "wheel"), step(1, "wheel", 0.1), step(1, "wheel", 0.5), step(1, "wheel", 0.79), settled]);
    expect(early.s.index).toBe(1);
    expect(early.s.phase).toBe("idle");
    const late = play(9, [step(1, "wheel"), step(1, "wheel", 0.85), settled, settled]);
    expect(late.s.index).toBe(2);
  });

  it("arah berlawanan saat transisi berjalan membalik transisi di tempat", () => {
    for (const at of [0.3, 0.9]) {
      const { s, fx } = play(9, [step(1), step(-1, "key", at), settled], 3);
      expect(fx.at(-2)).toEqual({ type: "run", from: at, end: 0, released: false });
      expect(fx.at(-1)).toEqual({ type: "cancel", index: 3 });
      expect(s.index).toBe(3);
    }
  });

  it("balik arah lewat roda juga langsung berlaku (inersia tidak pernah berbalik arah)", () => {
    const { s } = play(9, [step(1, "wheel"), step(-1, "wheel", 0.2), settled], 3);
    expect(s.index).toBe(3);
  });

  it("saat sedang kembali, langkah searah tujuan semula melanjutkan transisi", () => {
    const { s } = play(9, [step(1), step(-1, "key", 0.2), step(1, "key", 0.1), settled], 3);
    expect(s.index).toBe(4);
  });

  it("`settled` tanpa transisi diabaikan", () => {
    const { s, types } = play(4, [settled]);
    expect(types).toEqual([]);
    expect(s.index).toBe(0);
  });
});

describe("mesin slide: lompat bab", () => {
  it("lompat ke slide mana pun dalam satu transisi", () => {
    const { s, fx } = play(40, [{ type: "jump", to: 22 }, settled]);
    expect(fx[0]).toEqual({ type: "prepare", from: 0, to: 22 });
    expect(s.index).toBe(22);
  });

  it("lompat ke slide yang sama tidak berbuat apa-apa; di luar jangkauan dijepit", () => {
    expect(play(10, [{ type: "jump", to: 4 }], 4).types).toEqual([]);
    expect(play(10, [{ type: "jump", to: 99 }, settled]).s.index).toBe(9);
    expect(play(10, [{ type: "jump", to: -3 }, settled], 5).s.index).toBe(0);
  });

  it("lompat saat transisi berjalan diantrekan dan menggantikan antrean lama", () => {
    const { s } = play(40, [step(1), step(1, "key", 0.2), { type: "jump", to: 30 }, settled, settled]);
    expect(s.index).toBe(30);
  });
});

describe("mesin slide: scrub dengan jari", () => {
  const scrub = (signed: number): SlideEvent => ({ type: "scrub", signed });
  const start: SlideEvent = { type: "scrubStart" };
  const end = (flick: 1 | -1 | 0 = 0): SlideEvent => ({ type: "scrubEnd", flick });

  it("mengikuti jari, lalu lanjut bila dilepas di 35% atau lebih", () => {
    const { s, fx } = play(9, [start, scrub(0.1), scrub(0.36), end(), settled], 2);
    expect(fx.filter((f) => f.type === "seek").map((f) => (f as { progress: number }).progress)).toEqual([0.1, 0.36]);
    expect(fx.find((f) => f.type === "run")).toEqual({ type: "run", from: 0.36, end: 1, released: true });
    expect(s.index).toBe(3);
  });

  it("kembali bila dilepas di bawah 35%", () => {
    const { s, fx } = play(9, [start, scrub(0.34), end(), settled], 2);
    expect(fx.find((f) => f.type === "run")).toEqual({ type: "run", from: 0.34, end: 0, released: true });
    expect(s.index).toBe(2);
  });

  it("sentakan searah melanjutkan walau baru sedikit; sentakan berlawanan membatalkan walau sudah jauh", () => {
    expect(play(9, [start, scrub(0.08), end(1), settled], 2).s.index).toBe(3);
    expect(play(9, [start, scrub(0.6), end(-1), settled], 2).s.index).toBe(2);
    expect(play(9, [start, scrub(-0.08), end(-1), settled], 2).s.index).toBe(1);
  });

  it("jari berbalik melewati titik awal: tujuan berganti ke slide sebelumnya", () => {
    const { s, fx } = play(9, [start, scrub(0.2), scrub(-0.4), end(), settled], 2);
    expect(fx.filter((f) => f.type === "prepare")).toEqual([
      { type: "prepare", from: 2, to: 3 },
      { type: "prepare", from: 2, to: 1 },
    ]);
    expect(fx.filter((f) => f.type === "discard")).toHaveLength(1);
    expect(s.index).toBe(1);
  });

  it("di ujung film jari tidak menyiapkan transisi apa pun", () => {
    const { s, types } = play(3, [start, scrub(-0.5), end()]);
    expect(types).toEqual([]);
    expect(s.phase).toBe("idle");
    expect(play(3, [start, scrub(-0.5), end(-1)]).types).toEqual(["edge"]);
  });

  it("tidak pernah melompat dua slide: kemajuan dijepit di 1", () => {
    const { s, fx } = play(9, [start, scrub(2.7), end(), settled], 2);
    expect(fx.find((f) => f.type === "seek")).toEqual({ type: "seek", progress: 1 });
    expect(s.index).toBe(3);
  });

  it("sentuhan saat transisi berjalan tidak men-scrub; sentakannya dihitung satu langkah yang diantrekan", () => {
    const { s } = play(9, [step(1), start, scrub(0.5), end(1), settled, settled], 2);
    expect(s.index).toBe(4);
    const noFlick = play(9, [step(1), start, scrub(0.5), end(0), settled], 2);
    expect(noFlick.s.index).toBe(3);
  });

  it("langkah keyboard diabaikan selama jari menempel", () => {
    const { s } = play(9, [start, scrub(0.2), step(1), end(), settled], 2);
    expect(s.index).toBe(2);
  });
});

describe("mesin slide: daftar slide berganti", () => {
  it("menjaga posisi dan menjepit bila daftar memendek", () => {
    expect(play(10, [{ type: "resize", count: 12 }], 6).s.index).toBe(6);
    expect(play(10, [{ type: "resize", count: 4 }], 6).s.index).toBe(3);
    expect(play(10, [step(1), { type: "resize", count: 10, index: 2 }], 6).types).toContain("discard");
  });
});

describe("store slide", () => {
  it("menjalankan efek berurutan, menyisipkan kemajuan saat ini, dan memberi tahu pendengar", () => {
    const seen: string[] = [];
    let p = 0;
    const store = createSlideStore(5, 0, (fx) => seen.push(fx.type), () => p);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.dispatch({ type: "step", dir: 1, source: "wheel" });
    p = 0.4;
    store.dispatch({ type: "step", dir: 1, source: "wheel" }); // dibuang: masih 40%
    expect(store.get().queued).toBeNull();
    p = 0.9;
    store.dispatch({ type: "step", dir: 1, source: "wheel" }); // diantrekan
    expect(store.get().queued).toEqual({ type: "step", dir: 1 });
    store.dispatch({ type: "settled" });
    store.dispatch({ type: "settled" });
    expect(store.get().index).toBe(2);
    expect(seen).toEqual(["prepare", "run", "hurry", "commit", "prepare", "run", "commit"]);
    expect(calls).toBeGreaterThanOrEqual(4);
    off();
  });
});
