import { describe, expect, it } from "vitest";
import { keyAction, longDragPx, TouchTracker, WheelGestures, type WheelSample, wheelSample } from "@/engine/slides/input";

/**
 * Jejak di bawah ini TIRUAN (model), bukan rekaman perangkat: bentuknya mengikuti perilaku yang diketahui
 * (trackpad: dorongan jari lalu ekor inersia yang meluruh; mouse: takik terpisah). Kalibrasi akhir tetap
 * dilakukan di MacBook dan HP nyata (PRD §9).
 */

/** Gesekan trackpad: jari mendorong selama `push` ms, lalu inersia meluruh (konstanta waktu `tau`). */
function swipe(t0: number, o: { peak?: number; push?: number; tau?: number; hz?: number; dir?: 1 | -1; inertia?: boolean } = {}): WheelSample[] {
  const { peak = 34, push = 110, tau = 330, hz = 60, dir = 1, inertia = true } = o;
  const frame = 1000 / hz;
  const out: WheelSample[] = [];
  let carry = 0;
  for (let t = 0; t < 4000; t += frame) {
    const speed = t < push ? peak * Math.sin((Math.PI / 2) * (t / push)) ** 2 : inertia ? peak * Math.exp(-(t - push) / tau) : 0;
    if (t >= push && speed < 0.04) break;
    carry += (speed * 60) / hz;
    const px = Math.floor(carry); // delta bilangan bulat; sisa pecahan terbawa → ekor jadi 1 px yang makin jarang
    carry -= px;
    if (px > 0) out.push({ t: t0 + t, delta: px * dir, notch: false });
  }
  return out;
}

/** Takik mouse: delta tetap, satu event per takik. */
const notches = (t0: number, n: number, every = 50, delta = 100): WheelSample[] => Array.from({ length: n }, (_, i) => ({ t: t0 + i * every, delta, notch: true }));

/** Mouse dengan "smooth scrolling": satu takik = semburan event kecil berbentuk lonceng. */
function smoothNotch(t0: number, total = 100, ms = 160): WheelSample[] {
  const out: WheelSample[] = [];
  const steps = Math.round(ms / 8);
  for (let i = 0; i < steps; i++) {
    const w = Math.sin((Math.PI * (i + 0.5)) / steps);
    out.push({ t: t0 + i * 8, delta: (total * w * Math.PI) / (2 * steps), notch: false });
  }
  return out;
}

const fires = (samples: WheelSample[]) => {
  const g = new WheelGestures();
  return samples
    .sort((a, b) => a.t - b.t)
    .map((s) => ({ t: s.t, dir: g.push(s) }))
    .filter((f) => f.dir !== 0);
};
const count = (samples: WheelSample[]) => fires(samples).length;
const endOf = (samples: WheelSample[]) => samples[samples.length - 1]!.t;

describe("roda: mouse bertakik", () => {
  it("satu takik = satu langkah", () => {
    expect(fires(notches(0, 1))).toEqual([{ t: 0, dir: 1 }]);
    expect(fires(notches(0, 1, 50, -100))).toEqual([{ t: 0, dir: -1 }]);
  });

  it("beberapa takik dalam satu putaran jari = satu langkah", () => {
    expect(count(notches(0, 4, 45))).toBe(1);
  });

  it("putaran berikutnya setelah jeda = langkah baru", () => {
    expect(count([...notches(0, 3, 45), ...notches(420, 2, 45), ...notches(900, 1)])).toBe(3);
  });

  it("takik berlawanan arah langsung dihitung", () => {
    const f = fires([...notches(0, 2, 45), ...notches(200, 1, 45, -100)]);
    expect(f.map((x) => x.dir)).toEqual([1, -1]);
  });

  it("takik kecil (mouse di macOS) tetap satu langkah bila ditandai bertakik", () => {
    expect(count([{ t: 0, delta: 4.0002, notch: true }])).toBe(1);
  });

  it("mouse smooth-scroll: semburan satu takik = satu langkah, tiga takik beruntun tetap satu", () => {
    expect(count(smoothNotch(0))).toBe(1);
    expect(count([...smoothNotch(0), ...smoothNotch(120), ...smoothNotch(240)])).toBe(1);
  });
});

describe("roda: trackpad dengan inersia", () => {
  it("satu gesekan (dengan ekor > 1 detik) = tepat satu langkah", () => {
    for (const hz of [60, 120]) {
      for (const peak of [12, 34, 80]) {
        const trace = swipe(0, { peak, hz });
        expect(endOf(trace), `ekor ${peak}px@${hz}Hz`).toBeGreaterThan(900);
        expect(count(trace), `${peak}px @ ${hz}Hz`).toBe(1);
      }
    }
  });

  it("ekor yang sangat panjang (inersia lemah meluruh lambat) tetap satu langkah", () => {
    expect(count(swipe(0, { peak: 60, tau: 700 }))).toBe(1);
  });

  it("sentuhan kecil yang tak disengaja tidak memicu apa pun", () => {
    expect(count(swipe(0, { peak: 3, push: 60, inertia: false }))).toBe(0);
    expect(count([1, 2, 3, 2, 1].map((delta, i) => ({ t: i * 16, delta, notch: false })))).toBe(0);
  });

  it("geser pelan tanpa inersia yang cukup jauh = satu langkah", () => {
    const slow = Array.from({ length: 40 }, (_, i) => ({ t: i * 16, delta: 3, notch: false }));
    expect(count(slow)).toBe(1);
  });

  it("gesekan kedua saat ekor pertama masih berjalan = langkah kedua", () => {
    const first = swipe(0);
    const cut = first.filter((s) => s.t < 640); // jari mendarat lagi: momentum berhenti
    const f = fires([...cut, ...swipe(700)]);
    expect(f).toHaveLength(2);
    expect(f[1]!.t).toBeGreaterThan(700);
  });

  it("tiga gesekan berirama = tiga langkah, tidak lebih", () => {
    const a = swipe(0).filter((s) => s.t < 600);
    const b = swipe(650).filter((s) => s.t < 1250);
    expect(count([...a, ...b, ...swipe(1300)])).toBe(3);
  });

  it("balik arah di tengah ekor = satu langkah mundur", () => {
    const down = swipe(0).filter((s) => s.t < 500);
    const f = fires([...down, ...swipe(560, { dir: -1 })]);
    expect(f.map((x) => x.dir)).toEqual([1, -1]);
  });

  it("thread utama tersendat: event ekor yang digabung browser tidak menjadi langkah kedua", () => {
    const trace = swipe(0, { peak: 60 });
    for (const [from, to] of [
      [200, 520],
      [350, 700],
      [150, 400],
    ] as const) {
      const before = trace.filter((s) => s.t < from);
      const stalled = trace.filter((s) => s.t >= from && s.t < to);
      const merged: WheelSample = { t: to, delta: stalled.reduce((n, s) => n + s.delta, 0), notch: false };
      const after = trace.filter((s) => s.t >= to);
      expect(merged.delta, "jejak uji harus berisi gabungan yang besar").toBeGreaterThan(50);
      expect(count([...before, merged, ...after]), `tersendat ${from}–${to} ms`).toBe(1);
    }
  });

  it("jitter dan event ganda di ekor tidak dianggap dorongan baru", () => {
    const trace = swipe(0, { peak: 40 }).map((s, i) => (i % 7 === 3 ? { ...s, delta: s.delta * 2 } : i % 5 === 1 ? { ...s, delta: Math.max(1, s.delta - 1) } : s));
    expect(count(trace)).toBe(1);
  });

  it("gesekan baru setelah ekor habis = langkah baru", () => {
    const first = swipe(0);
    expect(count([...first, ...swipe(endOf(first) + 400)])).toBe(2);
  });
});

describe("roda: membaca WheelEvent", () => {
  const ev = (o: Partial<Parameters<typeof wheelSample>[0]>) => ({ deltaX: 0, deltaY: 0, deltaMode: 0, timeStamp: 5, ...o });

  it("mouse Chrome (wheelDelta kelipatan 120) dan Firefox (satuan garis) ditandai bertakik", () => {
    expect(wheelSample(ev({ deltaY: 100, wheelDeltaY: -120 }), false)).toEqual({ t: 5, delta: 100, notch: true });
    expect(wheelSample(ev({ deltaY: 3, deltaMode: 1 }), false)).toEqual({ t: 5, delta: 120, notch: true });
    expect(wheelSample(ev({ deltaY: 1, deltaMode: 2 }), false, 700).delta).toBe(700);
  });

  it("trackpad (wheelDelta = −3 × delta) tidak ditandai bertakik", () => {
    expect(wheelSample(ev({ deltaY: 7, wheelDeltaY: -21 }), false).notch).toBe(false);
    expect(wheelSample(ev({ deltaY: 1, wheelDeltaY: -3 }), false).notch).toBe(false);
  });

  it("geser menyamping hanya dihitung di gallery", () => {
    expect(wheelSample(ev({ deltaX: 30, deltaY: 4 }), false).delta).toBe(4);
    expect(wheelSample(ev({ deltaX: 30, deltaY: 4 }), true).delta).toBe(30);
    expect(wheelSample(ev({ deltaX: 30 }), false).delta).toBe(0);
  });

  it("Shift+roda (tiba sebagai deltaX) tetap memajukan slide", () => {
    expect(wheelSample(ev({ deltaX: 100, shiftKey: true, wheelDeltaX: -120 }), false)).toEqual({ t: 5, delta: 100, notch: true });
  });
});

describe("sentuhan", () => {
  /** Gerakkan jari lurus dari (x0,y0) sejauh (dx,dy) dalam `ms`, lalu lepas setelah `hold` ms diam. */
  function drag(dx: number, dy: number, ms: number, hold = 0) {
    const tr = new TouchTracker(200, 400, 0);
    const steps = Math.max(2, Math.round(ms / 16));
    let last: number | null = null;
    for (let i = 1; i <= steps; i++) last = tr.move(200 + (dx * i) / steps, 400 + (dy * i) / steps, (ms * i) / steps);
    return { tr, last, flick: tr.end(ms + hold) };
  }

  it("di bawah 10 px masih ketukan", () => {
    const { tr, last, flick } = drag(3, -6, 80);
    expect(tr.axis).toBeNull();
    expect(last).toBeNull();
    expect(flick).toBe(0);
  });

  it("jari ke atas = maju, ke bawah = mundur; sumbu terkunci vertikal", () => {
    const up = drag(4, -120, 300);
    expect(up.tr.axis).toBe("y");
    expect(up.last).toBeCloseTo(120);
    expect(drag(0, 120, 300).last).toBeCloseTo(-120);
  });

  it("jari ke kiri = maju di sumbu menyamping", () => {
    const left = drag(-90, 10, 200);
    expect(left.tr.axis).toBe("x");
    expect(left.last).toBeCloseTo(90);
    expect(left.flick).toBe(1);
  });

  it("geser pendek yang cepat (≥ 40 px) adalah sentakan", () => {
    expect(drag(0, -45, 280).flick).toBe(1);
    expect(drag(0, 45, 280).flick).toBe(-1);
  });

  it("geser pelan lalu diam sebelum diangkat bukan sentakan", () => {
    expect(drag(0, -45, 900).flick).toBe(0);
    expect(drag(0, -200, 250, 200).flick).toBe(0); // cepat, tapi jari berhenti dulu 200 ms
  });

  it("dilepas dengan kecepatan tinggi adalah sentakan walau pelan di awal", () => {
    const tr = new TouchTracker(200, 400, 0);
    tr.move(200, 380, 400); // 20 px dalam 400 ms: pelan
    tr.move(200, 372, 500);
    tr.move(200, 300, 560); // lalu menyentak
    expect(tr.end(565)).toBe(1);
  });

  it("tarikan pelan tapi panjang (slide tanpa scrub): satu langkah ke arah tarikan, berapa pun lamanya", () => {
    const h = 852;
    expect(longDragPx(h)).toBeCloseTo(153.36, 1); // 18% tinggi layar iPhone
    expect(longDragPx(300)).toBe(80); // paling sedikit 2 × 40 px
    const slow = drag(0, -300, 1500, 300); // pelan, lalu diam sebelum diangkat: bukan sentakan…
    expect(slow.flick).toBe(0);
    expect(slow.tr.reach(longDragPx(h))).toBe(1); // …tetapi tarikan panjang
    expect(drag(0, 300, 1500, 300).tr.reach(longDragPx(h))).toBe(-1);
    expect(drag(0, -120, 1500, 300).tr.reach(longDragPx(h))).toBe(0); // terlalu pendek: tidak apa-apa
  });

  it("jari ditarik balik sebelum dilepas: sentakan mengikuti arah terakhir", () => {
    const tr = new TouchTracker(200, 400, 0);
    tr.move(200, 250, 200);
    tr.move(200, 250, 320);
    tr.move(200, 330, 380);
    expect(tr.end(384)).toBe(-1);
  });
});

describe("keyboard", () => {
  it("panah, PageDown, dan spasi = satu langkah", () => {
    for (const key of ["ArrowDown", "ArrowRight", "PageDown", " "]) expect(keyAction({ key })).toEqual({ type: "step", dir: 1 });
    for (const key of ["ArrowUp", "ArrowLeft", "PageUp"]) expect(keyAction({ key })).toEqual({ type: "step", dir: -1 });
    expect(keyAction({ key: " ", shiftKey: true })).toEqual({ type: "step", dir: -1 });
  });

  it("Home & End melompat ke ujung", () => {
    expect(keyAction({ key: "Home" })).toEqual({ type: "edge", to: "first" });
    expect(keyAction({ key: "End" })).toEqual({ type: "edge", to: "last" });
  });

  it("tombol yang ditahan tidak memajukan terus-menerus", () => {
    expect(keyAction({ key: "ArrowDown", repeat: true })).toBeNull();
  });

  it("pintasan browser (Cmd/Ctrl/Alt) dan tombol lain dibiarkan", () => {
    expect(keyAction({ key: "ArrowLeft", altKey: true })).toBeNull();
    expect(keyAction({ key: "ArrowDown", metaKey: true })).toBeNull();
    expect(keyAction({ key: "a" })).toBeNull();
    expect(keyAction({ key: "Enter" })).toBeNull();
  });

  it("spasi di atas tombol tetap milik tombol itu; panah tetap memindah slide", () => {
    expect(keyAction({ key: " " }, true)).toBeNull();
    expect(keyAction({ key: "ArrowDown" }, true)).toEqual({ type: "step", dir: 1 });
  });
});
