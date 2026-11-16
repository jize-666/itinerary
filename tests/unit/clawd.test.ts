import { describe, expect, it } from "vitest";
import { Clawd } from "@/engine/mascot/clawd";
import { Dialogue, holdTime, TYPE, typedLength, typingTime } from "@/engine/mascot/dialogue";
import { bestSide, BLOCK_WEIGHT, GUIDE_KEY, Guide, type GuideContext, readSeen, SIDE_CANDIDATES, spotAt, stillApplies, tipAt, writeSeen } from "@/engine/mascot/guide";
import { INTRO, MASCOT_NAME, SAY, TIPS } from "@/engine/mascot/lines";

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

  it("selama berbicara (perkenalan panjang, petunjuk) Clawd tidak mengantuk; diam 30 dtk sesudahnya baru mengantuk", () => {
    const c = new Clawd(0, "en");
    c.start(0);
    // perkenalan dibiarkan berjalan sendiri, tanpa klik
    let t = 0;
    for (; c.dialogue.active; t += 100) expect(c.tick(t).mood).not.toBe("sleepy");
    c.tip("gallery", t);
    for (; c.dialogue.active; t += 100) expect(c.tick(t).mood).not.toBe("sleepy");
    expect(c.tick(t + 29000).mood).not.toBe("sleepy");
    expect(c.tick(t + 31000).mood).toBe("sleepy");
  });

  it("petunjuk diantrekan sesudah perkenalan, dan bisa dibuang tanpa memotong perkenalan", () => {
    const c = new Clawd(0, "id", true);
    c.start(0);
    c.tip("kayon", 10);
    expect(c.hasTip("kayon")).toBe(true);
    expect(c.tick(20).speech!.id).toBe("intro.0");
    c.hushTip("kayon", 30);
    expect(c.hasTip("kayon")).toBe(false);
    expect(c.tick(40).speech!.id).toBe("intro.0");
    // layar sentuh: "ketuk", bukan "klik"
    c.tip("phrases", 50);
    let t = 60;
    for (; c.tick(t).speech?.id !== "tip.phrases.0"; t += 50) c.tap(t);
    expect(c.tick(t).speech!.text).toBe("Ketuk kartu untuk membaliknya. Coba ucapkan, ya!");
  });

  it("tamu lama disapa singkat, tanpa perkenalan ulang", () => {
    const c = new Clawd(0, "id");
    c.start(0, true);
    const f = c.tick(10);
    expect(f.speech!.id).toBe("welcome.0");
    expect(f.speech!.more).toBe(false);
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

describe("Clawd pemandu di film 3D (M3)", () => {
  const at = (over: Partial<GuideContext>): GuideContext => ({ kind: "hero", beat: false, gate: "off", moving: false, sheet: false, ...over });

  it("petunjuk per tempat: gunungan, tahap gong, zoom, gallery, ungkapan, gong penutup, credits", () => {
    expect(tipAt(at({ gate: "head" }))).toBe("kayon");
    expect(tipAt(at({ kind: "hero" }))).toBe("beat");
    expect(tipAt(at({ kind: "title", beat: true }))).toBe("zoom");
    expect(tipAt(at({ kind: "panel" }))).toBe("gallery");
    expect(tipAt(at({ kind: "phrases" }))).toBe("phrases");
    expect(tipAt(at({ kind: "gong" }))).toBe("gong");
    expect(tipAt(at({ gate: "tail", kind: "credits" }))).toBe("credits");
    expect(tipAt(at({ kind: "fact" }))).toBeNull();
    expect(tipAt(at({ kind: "gong", moving: true }))).toBeNull();
    expect(tipAt(at({ kind: "panel", sheet: true }))).toBeNull();
  });

  it("petunjuk yang tidak berlaku lagi dibuang; geser antar kartu gallery tidak membuangnya", () => {
    expect(stillApplies("kayon", at({ gate: "head" }))).toBe(true);
    expect(stillApplies("kayon", at({ gate: "off", moving: true }))).toBe(false);
    expect(stillApplies("gallery", at({ kind: "panel", moving: true }))).toBe(true);
    expect(stillApplies("beat", at({ kind: "hero", beat: true }))).toBe(false);
    expect(stillApplies("gong", at({ kind: "gong", moving: true }))).toBe(false);
  });

  it("Clawd menghampiri gunungan dan gong yang dijelaskan; selain itu di samping layar", () => {
    expect(spotAt(at({ gate: "head" }), null)).toBe("kayon");
    expect(spotAt(at({ kind: "gong" }), null)).toBe("gong");
    expect(spotAt(at({ kind: "hero" }), "beat")).toBe("gong");
    expect(spotAt(at({ kind: "hero" }), null)).toBe("side");
    expect(spotAt(at({ kind: "panel" }), "gallery")).toBe("side");
    expect(spotAt(at({ kind: "gong", moving: true }), null)).toBe("side");
  });

  it("petunjuk yang tuntas diingat per perangkat; data rusak tidak menggagalkan film", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const g = new Guide(readSeen(store));
    expect(g.due(at({ kind: "gong" }))).toBe("gong");
    expect(g.done("gong")).toBe(true);
    expect(g.done("gong")).toBe(false);
    expect(g.introDone()).toBe(true);
    writeSeen(g.seen, store);
    const again = new Guide(readSeen(store));
    expect(again.seen.intro).toBe(true);
    expect(again.due(at({ kind: "gong" }))).toBeNull();
    expect(again.due(at({ kind: "panel" }))).toBe("gallery");
    mem.set(GUIDE_KEY, "{rusak");
    expect(readSeen(store)).toEqual({ intro: false, tips: [] });
    mem.set(GUIDE_KEY, JSON.stringify({ intro: true, tips: ["gong", "bukan-petunjuk"] }));
    expect(readSeen(store)).toEqual({ intro: true, tips: ["gong"] });
  });

  it("tiap petunjuk punya teks EN/ID; yang menyebut klik/gulir punya varian layar sentuh", () => {
    for (const [id, lines] of Object.entries(TIPS))
      for (const t of lines) {
        expect(t.en && t.id, id).toBeTruthy();
        if (/click|scroll/i.test(t.en)) expect(t.touch, `${id}: ${t.en}`).toBeDefined();
        if (t.touch) expect(/click|scroll|klik|gulir/i.test(t.touch.en + t.touch.id), `${id} touch`).toBe(false);
      }
  });
});

describe("tempat Clawd di samping: tidak menutupi tombol dan teks", () => {
  const screen = { w: 390, h: 844 };
  const bubble = { w: 292, h: 80 };

  it("layar kosong: tempat yang paling disukai (kanan bawah); di HP sempit calon yang keluar layar dilewati", () => {
    expect(bestSide([], { w: 1280, h: 720 }, 108, { w: 332, h: 84 })).toEqual(SIDE_CANDIDATES[0]);
    expect(bestSide([], screen, 74, bubble)).toEqual(SIDE_CANDIDATES[1]);
  });

  it("tombol di kanan bawah (kartu gallery di HP): pindah ke tempat yang tidak menutupinya", () => {
    const buttons = [{ x: 210, y: 560, w: 170, h: 200, weight: BLOCK_WEIGHT.control }];
    const pick = bestSide(buttons, screen, 74, bubble);
    expect(pick).not.toEqual(SIDE_CANDIDATES[0]);
    // badan Clawd di tempat terpilih tidak menyentuh tombol
    const cx = ((pick[0] + 1) / 2) * screen.w;
    const cy = ((1 - pick[1]) / 2) * screen.h;
    const touches = cx + 59 > 210 && cx - 59 < 380 && cy + 56 > 560 && cy - 41 < 760;
    expect(touches).toBe(false);
  });

  it("calon yang membuat gelembung keluar layar atas tidak dipilih", () => {
    const pick = bestSide([], { w: 390, h: 400 }, 74, bubble, [
      [0.5, 0.6],
      [0.5, -0.6],
    ]);
    expect(pick).toEqual([0.5, -0.6]);
  });
});
