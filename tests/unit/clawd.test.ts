import { describe, expect, it } from "vitest";
import { Clawd } from "@/engine/mascot/clawd";
import { Dialogue, holdTime, TYPE, typedLength, typingTime } from "@/engine/mascot/dialogue";
import { INTRO, MASCOT_NAME, SAY } from "@/engine/mascot/lines";

/** Clawd, gelembung ucapan ala piksel (M2, arahan host 15 Nov: "perkenalan dulu, nama dia clawd", "gas m2"). */
const u = (id: string, text: string) => ({ id, text: () => text });

describe("efek ketik", () => {
  it("huruf muncul bertahap, berhenti sejenak sesudah tanda baca, dan lengkap tepat di akhir waktu ketik", () => {
    const text = "Hi! I'm Clawd.";
    expect(typedLength(text, 0)).toBe(0);
    const per = 1000 / TYPE.cps;
    expect(typedLength(text, per * 2 + 1)).toBe(2);
    // "!" lalu jeda: huruf ke-4 (spasi) baru muncul sesudah jeda titik
    expect(typedLength(text, per * 4 + 1)).toBe(3);
    expect(typedLength(text, per * 4 + TYPE.stop + 1)).toBe(4);
    expect(typedLength(text, typingTime(text))).toBe(text.length);
    expect(typedLength(text, typingTime(text) - 1)).toBe(text.length - 1);
  });

  it("titik berurutan (...) dijeda sekali, bukan tiga kali", () => {
    const a = typingTime("Okay... yes");
    const b = typingTime("Okay.   yes");
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("antrean gelembung", () => {
  it("kalimat diketik, ditahan selama waktu baca, lalu lanjut sendiri; kalimat terakhir memudar", () => {
    const d = new Dialogue();
    d.say([u("a", "Hello there."), u("b", "Bye.")], 0);
    const f0 = d.tick(10)!;
    expect(f0.id).toBe("a");
    expect(f0.typing).toBe(true);
    expect(f0.more).toBe(true);
    const done = typingTime("Hello there.");
    expect(d.tick(done)!.typing).toBe(false);
    expect(d.tick(done + holdTime("Hello there.") - 1)!.id).toBe("a");
    expect(d.tick(done + holdTime("Hello there."))!.id).toBe("b");
    const t2 = done + holdTime("Hello there.") + typingTime("Bye.") + holdTime("Bye.");
    const fading = d.tick(t2 + TYPE.fade / 2)!;
    expect(fading.fade).toBeGreaterThan(0);
    expect(fading.fade).toBeLessThan(1);
    expect(d.tick(t2 + TYPE.fade + 1)).toBeNull();
    expect(d.active).toBe(false);
  });

  it("ketukan: melengkapi kalimat yang sedang diketik, lalu ketukan berikutnya pindah kalimat", () => {
    const d = new Dialogue();
    d.say([u("a", "A fairly long sentence to type."), u("b", "Next.")], 0);
    expect(d.tick(100)!.shown).toBeLessThan(10);
    expect(d.advance(100)).toBe(true);
    const full = d.tick(101)!;
    expect(full.shown).toBe(full.text.length);
    expect(full.typing).toBe(false);
    d.advance(200);
    expect(d.tick(201)!.id).toBe("b");
    expect(d.tick(201)!.shown).toBe(0);
  });

  it("ucapan yang menyela menggantikan antrean", () => {
    const d = new Dialogue();
    d.say([u("a", "One."), u("b", "Two.")], 0);
    d.say([u("x", "Ouch!")], 50, true);
    expect(d.tick(60)!.id).toBe("x");
    expect(d.pending).toBe(0);
  });

  it("teks dibaca ulang tiap frame: ganti bahasa di tengah kalimat langsung terlihat", () => {
    let lang = "en";
    const d = new Dialogue();
    d.say([{ id: "a", text: () => (lang === "en" ? "Hello!" : "Halo!") }], 0);
    expect(d.tick(1000)!.text).toBe("Hello!");
    lang = "id";
    expect(d.tick(1001)!.text).toBe("Halo!");
  });
});

describe("Clawd: perkenalan dan reaksi", () => {
  it("bernama Clawd; semua ucapan ada dalam EN dan ID, tanpa emoji (huruf piksel)", () => {
    expect(MASCOT_NAME).toBe("Clawd");
    expect(INTRO[0]!.en).toContain("Clawd");
    expect(INTRO[0]!.id).toContain("Clawd");
    const all = [...INTRO, ...Object.values(SAY).flat()];
    for (const t of all) {
      expect(t.en.length).toBeGreaterThan(0);
      expect(t.id.length).toBeGreaterThan(0);
      expect(/\p{Extended_Pictographic}/u.test(t.en + t.id), t.en).toBe(false);
    }
  });

  it("muncul: menyapa dan memperkenalkan diri berurutan dalam bahasa yang dipilih", () => {
    const c = new Clawd(0, "id");
    c.start(0);
    const f = c.tick(50);
    expect(f.introducing).toBe(true);
    expect(f.mood).toBe("happy");
    expect(f.speech!.text).toBe(INTRO[0]!.id);
    expect(f.speech!.more).toBe(true);
    c.lang = "en";
    expect(c.tick(60).speech!.text).toBe(INTRO[0]!.en);
  });

  it("selama perkenalan ketukan memajukan kalimat, tidak membuat Clawd marah", () => {
    const c = new Clawd(0, "en");
    c.start(0);
    let t = 100;
    for (let i = 0; i < 12 && c.introducing; i++) {
      expect(c.tap(t)).toBe("advance");
      t += 80;
      c.tick(t);
    }
    const f = c.tick(t + 10);
    expect(f.mood).not.toBe("angry");
    expect(f.introducing).toBe(false);
  });

  it("sesudah perkenalan: klik pelan 3× = senang dengan ucapan; spam = marah dengan ucapan", () => {
    const c = new Clawd(0, "id");
    c.start(0);
    for (let t = 100; c.introducing; t += 80) {
      c.tap(t);
      c.tick(t + 1);
    }
    const t0 = 5000;
    [t0, t0 + 600, t0 + 1200].forEach((t) => c.tap(t));
    const happy = c.tick(t0 + 1600);
    expect(happy.mood).toBe("happy");
    expect(SAY.happy.map((x) => x.id)).toContain(happy.speech!.text);
    const t1 = t0 + 9000;
    [0, 100, 200, 300, 400].forEach((d) => c.tap(t1 + d));
    const angry = c.tick(t1 + 450);
    expect(angry.mood).toBe("angry");
    expect(SAY.angry.map((x) => x.id)).toContain(angry.speech!.text);
  });

  it("diam lama: mulai mengantuk sambil pamit istirahat; diklik saat tidur: bangun dengan ucapan", () => {
    const c = new Clawd(0, "en");
    c.start(0);
    for (let t = 100; c.introducing; t += 80) {
      c.tap(t);
      c.tick(t + 1);
    }
    const sleepy = c.tick(40000);
    expect(sleepy.mood).toBe("sleepy");
    expect(sleepy.speech!.text).toBe(SAY.rest[0]!.en);
    expect(c.tick(70000).mood).toBe("sleeping");
    c.tap(71000);
    const awake = c.tick(71010);
    expect(awake.mood).toBe("curious");
    expect(SAY.wake.map((x) => x.en)).toContain(awake.speech!.text);
  });

  it("selama mengetik Clawd bergerak bicara; variasi ucapan digilir", () => {
    const c = new Clawd(0, "en");
    c.start(0);
    for (let t = 100; c.introducing; t += 80) {
      c.tap(t);
      c.tick(t + 1);
    }
    c.gong(10000);
    const g1 = c.tick(10010).speech!.text;
    c.gong(20000);
    const g2 = c.tick(20010).speech!.text;
    expect(g1).not.toBe(g2);
    const c2 = new Clawd(0, "en");
    c2.start(0);
    c2.tick(5000);
    // sapaan selesai (2,4 dtk) tetapi kalimat perkenalan kedua masih diketik → bicara
    const typingLater = c2.tick(2600 + 1);
    expect(["talk", "greet"]).toContain(typingLater.motion);
  });
});
