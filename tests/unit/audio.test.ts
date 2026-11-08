import { describe, expect, it } from "vitest";
import { BedPlayer, type BedCtx } from "@/engine/audio/bed";
import { BEDS, SFX } from "@/engine/audio/catalog";
import { effectiveXfade, equalPowerIn, equalPowerOut, loopStarts, loopStep } from "@/engine/audio/loop";
import { readSoundPref, SOUND_KEY, writeSoundPref } from "@/engine/audio/preference";
import { existsSync } from "node:fs";

describe("preferensi suara", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it("menyimpan & membaca on/off", () => {
    const s = mem();
    expect(readSoundPref(s)).toBeNull();
    writeSoundPref("on", s);
    expect(s.m.get(SOUND_KEY)).toBe("on");
    expect(readSoundPref(s)).toBe("on");
    writeSoundPref("off", s);
    expect(readSoundPref(s)).toBe("off");
  });

  it("nilai asing dianggap belum memilih", () => {
    const s = mem();
    s.setItem(SOUND_KEY, "maybe");
    expect(readSoundPref(s)).toBeNull();
  });

  it("penyimpanan diblokir tidak melempar", () => {
    const boom = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(readSoundPref(boom)).toBeNull();
    expect(() => writeSoundPref("on", boom)).not.toThrow();
    expect(readSoundPref(undefined)).toBeNull();
  });
});

describe("matematika loop", () => {
  it("crossfade dibatasi sepertiga durasi", () => {
    expect(effectiveXfade(60, 4)).toBe(4);
    expect(effectiveXfade(6, 4)).toBe(2);
    expect(effectiveXfade(60, -1)).toBe(0);
  });

  it("salinan berjarak durasi − crossfade", () => {
    expect(loopStep(60, 4)).toBe(56);
    expect(loopStarts(60, 4, 10, 4)).toEqual([10, 66, 122, 178]);
  });

  it("kurva equal-power: in² + out² = 1 di setiap titik", () => {
    const a = equalPowerIn();
    const b = equalPowerOut();
    expect(a[0]).toBe(0);
    expect(a.at(-1)).toBeCloseTo(1, 6);
    expect(b[0]).toBe(1);
    expect(b.at(-1)).toBeCloseTo(0, 6);
    for (let i = 0; i < a.length; i++) expect(a[i]! ** 2 + b[i]! ** 2).toBeCloseTo(1, 5);
  });
});

/** Tiruan AudioContext: cukup untuk mencatat jadwal sumber & kurva gain. */
function fakeCtx() {
  const starts: number[] = [];
  const curves: { kind: "in" | "out"; at: number; dur: number }[] = [];
  const ctx = {
    currentTime: 0,
    createGain() {
      return {
        gain: {
          value: 1,
          cancelScheduledValues() {},
          setValueCurveAtTime(c: Float32Array, at: number, dur: number) {
            curves.push({ kind: c[0]! < 0.5 ? "in" : "out", at, dur });
          },
        },
        connect: (n: unknown) => n,
        disconnect() {},
      };
    },
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect: (n: unknown) => n,
        start: (at: number) => starts.push(at),
        stop() {},
      };
    },
  };
  return { ctx: ctx as unknown as BedCtx & { currentTime: number }, starts, curves };
}

const buf = (duration: number) => ({ duration }) as AudioBuffer;
const dest = {} as AudioNode;

describe("BedPlayer", () => {
  it("loop: salinan dijadwalkan bertumpuk tepat sebesar crossfade", () => {
    const { ctx, starts, curves } = fakeCtx();
    const p = new BedPlayer(ctx, buf(60), dest, { loop: true, fadeIn: 2, xfade: 4 });
    p.start(0.05);
    expect(starts).toEqual([0.05]);
    ctx.currentTime = 54; // belum masuk jendela lookahead (56,05 − 1)
    p.pump();
    expect(starts).toHaveLength(1);
    ctx.currentTime = 55.2;
    p.pump();
    expect(starts).toEqual([0.05, 56.05]);
    ctx.currentTime = 111.5;
    p.pump();
    expect(starts).toEqual([0.05, 56.05, 112.05]);
    // Salinan ke-n keluar persis saat salinan ke-(n+1) masuk.
    const outs = curves.filter((c) => c.kind === "out").map((c) => c.at);
    const ins = curves.filter((c) => c.kind === "in").map((c) => c.at);
    expect(ins).toEqual([0.05, 56.05, 112.05]);
    expect(outs.slice(0, 2)).toEqual([56.05, 112.05]);
    expect(curves[0]).toEqual({ kind: "in", at: 0.05, dur: 2 });
  });

  it("sekali putar + then: ekor memanggil sambungan tepat sekali", () => {
    const { ctx, starts, curves } = fakeCtx();
    const tails: [number, number][] = [];
    const p = new BedPlayer(ctx, buf(61), dest, { loop: false, fadeIn: 0.8, xfade: 4, onTail: (at, xf) => tails.push([at, xf]) });
    p.start(0);
    ctx.currentTime = 56.5;
    p.pump();
    p.pump();
    expect(tails).toEqual([[57, 4]]);
    expect(starts).toEqual([0]);
    expect(curves).toContainEqual({ kind: "out", at: 57, dur: 4 });
  });

  it("sekali putar tanpa then: tidak ada fade-out paksa di ekor", () => {
    const { ctx, curves } = fakeCtx();
    const p = new BedPlayer(ctx, buf(30), dest, { loop: false, fadeIn: 0, xfade: 4 });
    p.start(0);
    expect(curves).toEqual([]);
  });

  it("stop menghentikan penjadwalan", () => {
    const { ctx, starts } = fakeCtx();
    const p = new BedPlayer(ctx, buf(60), dest, { loop: true, fadeIn: 2, xfade: 4 });
    p.start(0);
    p.stop(1);
    ctx.currentTime = 100;
    p.pump();
    expect(starts).toEqual([0]);
    expect(p.playing).toBe(false);
  });
});

describe("katalog", () => {
  it("setiap berkas audio ada di public/", () => {
    for (const url of [...Object.values(BEDS), ...Object.values(SFX)]) expect(existsSync(`public${url}`), url).toBe(true);
  });
});
