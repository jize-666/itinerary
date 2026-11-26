import { afterEach, describe, expect, it, vi } from "vitest";
import { renderBeep } from "@/engine/audio/beep-synth";
import { audioStatus, type AudioControl } from "@/engine/audio/status";
import { BEEP, BEEP_TONES, type BeepTone, moodOf, planBeeps, toneFor, wordsOf } from "@/engine/mascot/beep";
import { Clawd } from "@/engine/mascot/clawd";
import { Dialogue, holdTime, typingTime } from "@/engine/mascot/dialogue";
import { TIPS } from "@/engine/mascot/lines";
import { createSession } from "@/components/mascot/session";
import { langStore } from "@/engine/i18n/lang";

const SEMITONE = 2 ** (1 / 12);

describe("kata dan suasana", () => {
  it("kata = deret huruf/angka; apostrof di dalam kata tidak memecah; tanda baca dan emoji tidak dihitung", () => {
    expect(wordsOf("Hi! I'm Clawd.").map((w) => [w.start, w.word])).toEqual([[0, "Hi"], [4, "I'm"], [8, "Clawd"]]);
    expect(wordsOf("Day 2 — 🎉 Kemuning, 06:15!").map((w) => w.word)).toEqual(["Day", "2", "Kemuning", "06", "15"]);
    expect(wordsOf("... !? 🎉")).toEqual([]);
    expect(wordsOf("")).toEqual([]);
  });

  it("suasana: dasar tenang; marah, senang, terkejut, dan mengantuk mengikuti reaksi Clawd", () => {
    expect(moodOf("intro.0")).toBe("calm");
    expect(moodOf("tip.gong.0")).toBe("calm");
    expect(moodOf("angry.1")).toBe("angry");
    expect(moodOf("happy.0")).toBe("happy");
    expect(moodOf("love.1")).toBe("happy");
    expect(moodOf("tap.2")).toBe("happy");
    expect(moodOf("tap.0")).toBe("calm");
    expect(moodOf("gong.1")).toBe("surprised");
    expect(moodOf("wake.0")).toBe("surprised");
    expect(moodOf("wake.1")).toBe("sleepy");
    expect(moodOf("rest.0")).toBe("sleepy");
  });
});

describe("rencana biip", () => {
  const text = "Hi! I'm Clawd, your guide.";

  it("satu biip di awal tiap kata saat kata itu mulai terketik, bukan per huruf", () => {
    expect(planBeeps(text, 0, 1, "calm", 1000).beeps).toHaveLength(1); // "H"
    expect(planBeeps(text, 1, 2, "calm", 1000).beeps).toHaveLength(0); // "i"
    expect(planBeeps(text, 2, 4, "calm", 1000).beeps).toHaveLength(0); // "! "
    expect(planBeeps(text, 4, 5, "calm", 1000).beeps).toHaveLength(1); // "I"
    expect(planBeeps(text, 5, 8, "calm", 1000).beeps).toHaveLength(0); // "'m "
  });

  it("tanpa huruf baru, mundur, atau teks kosong: hening", () => {
    expect(planBeeps(text, 3, 3, "calm", 0).beeps).toEqual([]);
    expect(planBeeps(text, 5, 2, "calm", 0).beeps).toEqual([]);
    expect(planBeeps("", 0, 0, "calm", 0).beeps).toEqual([]);
    expect(planBeeps("", 0, 9, "calm", 0).beeps).toEqual([]);
    expect(planBeeps("... 🎉 !?", 0, 9, "calm", 0).beeps).toEqual([]);
  });

  it("batas laju: biip kurang dari BEEP.gap sesudah biip terakhir dibuang", () => {
    const a = planBeeps(text, 0, 1, "calm", 1000);
    expect(a.last).toBe(1000);
    expect(planBeeps(text, 4, 5, "calm", 1000 + BEEP.gap - 1, a.last).beeps).toHaveLength(0);
    expect(planBeeps(text, 4, 5, "calm", 1000 + BEEP.gap, a.last).beeps).toHaveLength(1);
  });

  it("simulasi mengetik: tidak pernah lebih dari ±13 biip per detik", () => {
    const long = "a b c d e f g h i j k l m n o p q r s t u v w x y z ".repeat(3);
    let last = -Infinity;
    let shown = 0;
    const times: number[] = [];
    for (let ms = 0; ms < 3000 && shown < long.length; ms += 16) {
      const to = Math.min(long.length, Math.floor(ms / 8)); // lebih cepat dari pengetikan asli
      const plan = planBeeps(long, shown, to, "calm", ms, last);
      last = plan.last;
      for (let k = 0; k < plan.beeps.length; k++) times.push(ms + k * BEEP.gap);
      shown = to;
    }
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(BEEP.gap);
    expect(times.length).toBeGreaterThan(5);
  });

  it("lompatan besar (Calm menampilkan semua sekaligus): paling banyak 3 biip, berjarak, urut", () => {
    const plan = planBeeps(text, 0, text.length, "calm", 500);
    expect(plan.beeps).toHaveLength(BEEP.burst);
    expect(plan.beeps.map((b) => b.delay ?? 0)).toEqual([0, 0.075, 0.15]);
    expect(plan.last).toBe(500 + 2 * BEEP.gap);
    // dua kata: dua biip
    expect(planBeeps("Hello there", 0, 11, "calm", 0).beeps).toHaveLength(2);
  });

  it("deterministik; kata yang sama selalu setinggi sama, kata berbeda bervariasi dalam rentang mood", () => {
    expect(planBeeps(text, 0, text.length, "happy", 10)).toEqual(planBeeps(text, 0, text.length, "happy", 10));
    expect(toneFor("calm", "Clawd")).toEqual(toneFor("calm", "clawd"));
    const freqs = new Set(["one", "two", "three", "four", "five", "six", "seven"].map((w) => toneFor("calm", w).freq));
    expect(freqs.size).toBeGreaterThan(3);
    for (const f of freqs) {
      expect(f).toBeGreaterThanOrEqual(BEEP_TONES.calm.freq / SEMITONE ** BEEP_TONES.calm.spread - 1e-6);
      expect(f).toBeLessThanOrEqual(BEEP_TONES.calm.freq * SEMITONE ** BEEP_TONES.calm.spread + 1e-6);
    }
  });

  it("nada per suasana", () => {
    const tone = (m: Parameters<typeof toneFor>[0]) => toneFor(m, "x");
    expect(tone("calm")).toMatchObject({ wave: "square", dur: 0.07, glide: 0 });
    expect(tone("happy")).toMatchObject({ wave: "square", dur: 0.06 });
    expect(tone("happy").glide).toBeGreaterThan(0);
    expect(tone("surprised")).toMatchObject({ glide: 5, dur: 0.08 });
    expect(tone("angry")).toMatchObject({ wave: "sawtooth", dur: 0.055 });
    expect(tone("angry").glide).toBeLessThan(0);
    expect(tone("angry").freq).toBeLessThan(400);
    expect(tone("angry").gain).toBeGreaterThan(tone("calm").gain);
    expect(tone("sleepy")).toMatchObject({ wave: "triangle", glide: -3, dur: 0.11 });
    for (const m of ["calm", "happy", "surprised", "angry", "sleepy"] as const) expect(tone(m).gain).toBeLessThan(0.4);
  });

  it("mengantuk: hanya tiap kata kedua", () => {
    const words = "one two three four five six";
    expect(planBeeps(words, 0, 4, "sleepy", 0).beeps).toHaveLength(1); // "one "
    expect(planBeeps(words, 4, 8, "sleepy", 0).beeps).toHaveLength(0); // "two "
    expect(planBeeps(words, 8, 14, "sleepy", 0).beeps).toHaveLength(1); // "three "
    expect(planBeeps(words, 0, words.length, "sleepy", 0).beeps).toHaveLength(3); // satu, tiga, lima
  });
});

describe("pembangkit biip", () => {
  it("simpul standar: osilator → (lowpass) → penguat; envelope dan glide terjadwal; simpul dilepas", () => {
    const calls: string[] = [];
    const param = (name: string) => ({
      setValueAtTime: (v: number, t: number) => calls.push(`${name}.set(${v.toFixed(4)},${t.toFixed(3)})`),
      linearRampToValueAtTime: (v: number, t: number) => calls.push(`${name}.lin(${v.toFixed(2)},${t.toFixed(3)})`),
      exponentialRampToValueAtTime: (v: number, t: number) => calls.push(`${name}.exp(${v.toFixed(1)},${t.toFixed(3)})`),
      value: 0,
    });
    const node = <T extends object>(kind: string, extra: T) => ({ kind, connect: (n: unknown) => n, disconnect: vi.fn(), ...extra });
    const osc = node("osc", { frequency: param("f"), type: "", start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) });
    const gain = node("gain", { gain: param("g") });
    const filter = node("lp", { type: "", frequency: { value: 0 } });
    const ctx = { createOscillator: () => osc, createGain: () => gain, createBiquadFilter: () => filter };
    const tone: BeepTone = { freq: 700, glide: 12, dur: 0.07, wave: "square", gain: 0.2 };
    renderBeep(ctx as unknown as BaseAudioContext, {} as AudioNode, tone, 2);
    expect(osc.type).toBe("square");
    expect(filter.type).toBe("lowpass");
    expect(filter.frequency.value).toBe(3000);
    expect(calls).toContain("f.set(700.0000,2.000)");
    expect(calls).toContain("f.exp(1400.0,2.070)"); // naik satu oktaf
    expect(calls).toContain("g.lin(0.20,2.004)"); // attack 4 ms
    expect(calls).toContain("g.exp(0.0,2.070)"); // habis di akhir
    expect(osc.start).toHaveBeenCalledWith(2);
    expect(osc.stop.mock.calls[0]![0]).toBeGreaterThan(2.07);
    osc.onended!();
    expect(osc.disconnect).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
  });
});

describe("audioStatus.beep", () => {
  const control = { setEnabled: vi.fn(), playSfx: vi.fn(), preload: vi.fn(), playBeep: vi.fn() } satisfies AudioControl;
  const tone: BeepTone = { freq: 700, glide: 0, dur: 0.07, wave: "square", gain: 0.2 };
  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { __clawdBeep?: unknown }).__clawdBeep;
    audioStatus.publish({ started: false, enabled: false }, control);
  });

  it("hanya sesudah lakon dimulai dan suara menyala; kait rekaman ikut menerima nada", () => {
    const hook = vi.fn();
    (globalThis as { __clawdBeep?: unknown }).__clawdBeep = hook;
    audioStatus.publish({ started: false, enabled: true }, control);
    audioStatus.beep(tone);
    audioStatus.publish({ started: true, enabled: false }, control);
    audioStatus.beep(tone);
    expect(control.playBeep).not.toHaveBeenCalled();
    expect(hook).not.toHaveBeenCalled();
    audioStatus.publish({ started: true, enabled: true }, control);
    audioStatus.beep(tone);
    expect(control.playBeep).toHaveBeenCalledWith(tone);
    expect(hook).toHaveBeenCalledWith(tone);
  });
});

describe("gelembung tanpa suara klip", () => {
  const u = (id: string, text: string) => ({ id, text: () => text });

  it("kalimat berganti tepat sesudah waktu baca, tanpa menunggu apa pun", () => {
    const d = new Dialogue();
    d.say([u("a", "Hi!"), u("b", "Bye.")], 0);
    const end = typingTime("Hi!") + holdTime("Hi!");
    expect(d.tick(end - 1)!.id).toBe("a");
    expect(d.tick(end)!.id).toBe("b");
  });

  it("Clawd 'bicara' hanya selama mengetik", () => {
    const c = new Clawd(0, "en", false);
    c.tip("zoom", 0);
    const text = TIPS.zoom[0]!.en;
    let talked = false;
    for (let t = 0; t < typingTime(text); t += 20) talked ||= c.tick(t).motion === "talk";
    expect(talked).toBe(true);
    const f = c.tick(typingTime(text) + 100);
    expect(f.speech!.typing).toBe(false);
    expect(f.motion).not.toBe("talk");
  });
});

describe("sesi: biip mengikuti ketikan", () => {
  const el = { dataset: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }), querySelectorAll: () => [] } as unknown as HTMLElement;
  const ctx = { kind: "scene", beat: false, gate: "off", moving: false, sheet: false, flat: false, pass3d: false } as never;
  const view = { w: 800, h: 450 };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tiap kata yang baru terketik berbunyi sekali; Calm (sekaligus) paling banyak 3; Indonesia juga berbunyi", () => {
    vi.stubGlobal("document", { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: "visible" });
    const beep = vi.spyOn(audioStatus, "beep").mockImplementation(() => {});
    langStore.set("id");
    const s = createSession({ touch: false });
    s.start(0);
    let t = 0;
    s.step(ctx, t, 0, el, view);
    const first = beep.mock.calls.length;
    expect(first).toBeLessThanOrEqual(1); // huruf pertama kata pertama
    for (t = 16; t < 1200; t += 16) s.step(ctx, t, t / 1000, el, view);
    expect(beep.mock.calls.length).toBeGreaterThanOrEqual(3);
    // laju: paling banyak satu biip per BEEP.gap
    expect(beep.mock.calls.length).toBeLessThanOrEqual(Math.ceil(1200 / BEEP.gap) + 1);
    // jam melompat jauh: kalimat tampil sekaligus → tidak lebih dari burst tambahan
    const before = beep.mock.calls.length;
    s.step(ctx, 9000, 9, el, view);
    expect(beep.mock.calls.length - before).toBeLessThanOrEqual(BEEP.burst);
    s.dispose();
  });
});
