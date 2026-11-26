import { describe, expect, it, vi } from "vitest";
import { Clawd } from "@/engine/mascot/clawd";
import { Dialogue, holdTime, typingTime } from "@/engine/mascot/dialogue";
import { INTRO, SAY, TIPS, WELCOME_BACK } from "@/engine/mascot/lines";
import { clipMs, clipName, clipUrl, moodOf, VOICE, voiceLines } from "@/engine/mascot/voice";

/**
 * Suara Clawd (suara teman host, ditiru dengan Chatterbox; hanya bahasa Inggris). Lama klip di sini tiruan supaya tes
 * tidak bergantung pada rekaman; manifest dan berkas aslinya dicek `voice-clips.test.ts` dan
 * `scripts/audio/clawd-voice.ts check`.
 */
vi.mock("@/engine/mascot/voice-clips.json", () => ({
  default: {
    en: { "intro.0": 5000, "intro.1": 2600, "intro.2": 3000, "intro.2.touch": 2800, "intro.3": 2400, "tap.0": 1500 },
    id: { "intro.0": 5200 },
  },
}));

const u = (id: string, text: string) => ({ id, text: () => text, clip: () => id });

describe("daftar klip suara Clawd", () => {
  const lines = voiceLines();

  it("satu klip per kalimat, ditambah satu untuk tiap varian layar sentuh; nama unik", () => {
    const all = [...INTRO, ...WELCOME_BACK, ...Object.values(TIPS).flat(), ...Object.values(SAY).flat()];
    expect(lines).toHaveLength(all.length + all.filter((t) => t.touch).length);
    expect(lines).toHaveLength(49); // + tip.pass.0/1 (+ varian sentuh) dan ucapan tiket (ticketGrab/Toss/Back/Front)
    expect(new Set(lines.map((l) => l.name)).size).toBe(lines.length);
    for (const l of lines) {
      expect(l.en.length, l.name).toBeGreaterThan(0);
      expect(l.id.length, l.name).toBeGreaterThan(0);
    }
  });

  it("nama klip = kunci kalimat di gelembung; varian sentuh berakhiran .touch", () => {
    const names = lines.map((l) => l.name);
    expect(names.slice(0, 7)).toEqual(["intro.0", "intro.1", "intro.2", "intro.2.touch", "intro.3", "intro.3.touch", "welcome.0"]);
    expect(names).toContain("tip.gong.0.touch");
    expect(names).toContain("angry.1");
    expect(lines.find((l) => l.name === "intro.2.touch")!.en).toBe(INTRO[2]!.touch!.en);
    expect(clipName("tip.zoom.0", true)).toBe("tip.zoom.0.touch");
    expect(clipUrl("id", "tap.2")).toBe("/audio/clawd/id/tap.2.mp3");
  });

  it("emosi suara: dasar tenang; marah, senang, terkejut, dan mengantuk mengikuti reaksi Clawd", () => {
    expect(moodOf("intro.0")).toBe("calm");
    expect(moodOf("tip.gong.0.touch")).toBe("calm");
    expect(moodOf("angry.1")).toBe("angry");
    expect(moodOf("happy.0")).toBe("happy");
    expect(moodOf("love.1")).toBe("happy");
    expect(moodOf("tap.2")).toBe("happy");
    expect(moodOf("tap.0")).toBe("calm");
    expect(moodOf("gong.1")).toBe("surprised");
    expect(moodOf("wake.0")).toBe("surprised");
    expect(moodOf("wake.1")).toBe("sleepy");
    expect(moodOf("rest.0")).toBe("sleepy");
    const moods = new Set(voiceLines().map((l) => l.mood));
    expect([...moods].sort()).toEqual(["angry", "calm", "happy", "sleepy", "surprised"]);
  });

  it("klip yang belum ada: tanpa lama (kalimatnya tetap tampil tanpa suara)", () => {
    expect(clipMs("en", "intro.0")).toBe(5000);
    expect(clipMs("id", "intro.1")).toBeNull();
    expect(clipMs("en", "nope")).toBeNull();
  });
});

describe("gelembung bersuara", () => {
  it("kalimat ditahan sampai klipnya selesai (ditambah jeda), walau teksnya sudah lama lengkap", () => {
    const d = new Dialogue((x) => (x.id === "a" ? 6000 : null));
    d.say([u("a", "Hi!"), u("b", "Bye.")], 0);
    const f = d.tick(10)!;
    expect(f.voice).toBe("a");
    expect(f.voicing).toBe(true);
    expect(f.since).toBe(0);
    // tanpa suara kalimat "Hi!" sudah berganti jauh sebelum 6 dtk
    expect(typingTime("Hi!") + holdTime("Hi!")).toBeLessThan(6000);
    expect(d.tick(5999)!.id).toBe("a");
    expect(d.tick(6001)!.voicing).toBe(false);
    expect(d.tick(6000 + VOICE.tail - 1)!.id).toBe("a");
    const next = d.tick(6000 + VOICE.tail)!;
    expect(next.id).toBe("b");
    expect(next.voice).toBeNull();
    expect(next.since).toBe(6000 + VOICE.tail);
  });

  it("waktu baca lebih panjang dari klip: waktu baca yang berlaku", () => {
    const text = "A long sentence that takes a while to read in the bubble.";
    const d = new Dialogue(() => 300);
    d.say([u("a", text), u("b", "Next.")], 0);
    const end = typingTime(text) + holdTime(text);
    expect(d.tick(end - 1)!.id).toBe("a");
    expect(d.tick(end)!.id).toBe("b");
  });

  it("ketukan: melengkapi teks dulu (suara jalan terus), ketukan berikutnya melewati kalimat", () => {
    const d = new Dialogue(() => 8000);
    d.say([u("a", "A fairly long sentence to type."), u("b", "Next.")], 0);
    d.advance(100);
    const full = d.tick(101)!;
    expect(full.typing).toBe(false);
    expect(full.voicing).toBe(true);
    expect(d.tick(4000)!.id).toBe("a");
    d.advance(4000);
    expect(d.tick(4001)!.id).toBe("b");
  });

  it("kalimat tanpa nama klip tidak bersuara walau lamanya ada", () => {
    const d = new Dialogue(() => 3000);
    d.say([{ id: "a", text: () => "Hi." }], 0);
    expect(d.tick(10)!.voice).toBeNull();
    expect(d.tick(typingTime("Hi.") + holdTime("Hi."))).not.toBeNull(); // memudar, bukan menunggu 3 dtk
    expect(d.active).toBe(false);
  });
});

describe("Clawd bersuara", () => {
  it("suara menyala: perkenalan memakai klipnya, klip diunduh lebih dulu, Clawd 'bicara' selama klip berbunyi", () => {
    const prepare = vi.fn();
    const c = new Clawd(0, "en", false, { on: () => true, prepare });
    c.start(0);
    expect(prepare).toHaveBeenCalledWith(["intro.0", "intro.1", "intro.2", "intro.3"]);
    const f = c.tick(20);
    expect(f.speech!.voice).toBe("intro.0");
    // teks "Hi! I'm Clawd." sudah lengkap, klip 5 dtk masih berbunyi
    const later = c.tick(3000);
    expect(later.speech!.id).toBe("intro.0");
    expect(later.speech!.typing).toBe(false);
    expect(later.speech!.voicing).toBe(true);
    expect(later.motion).toBe("talk");
    expect(c.tick(5000 + VOICE.tail + 1).speech!.id).toBe("intro.1");
  });

  it("layar sentuh: varian sentuh memakai klipnya sendiri", () => {
    const c = new Clawd(0, "en", true, { on: () => true });
    c.start(0);
    for (let t = 0; t < 60_000; t += 50) {
      const s = c.tick(t).speech;
      if (s?.id === "intro.2") {
        expect(s.voice).toBe("intro.2.touch");
        expect(s.text).toBe(INTRO[2]!.touch!.en);
        return;
      }
    }
    throw new Error("intro.2 tidak pernah tampil");
  });

  it("bahasa lain tanpa klip: kalimatnya tampil tanpa suara", () => {
    const c = new Clawd(0, "id", false, { on: () => true });
    c.start(0);
    expect(c.tick(10).speech!.voice).toBe("intro.0");
    for (let t = 10; t < 60_000; t += 50) {
      const s = c.tick(t).speech;
      if (s?.id === "intro.1") {
        expect(s.voice).toBeNull();
        return;
      }
    }
    throw new Error("intro.1 tidak pernah tampil");
  });

  it("suara mati: tanpa klip, tanpa unduhan, waktu gelembung seperti biasa", () => {
    const prepare = vi.fn();
    const c = new Clawd(0, "en", false, { on: () => false, prepare });
    c.start(0);
    expect(prepare).not.toHaveBeenCalled();
    expect(c.tick(10).speech!.voice).toBeNull();
    const text = INTRO[0]!.en;
    expect(c.tick(typingTime(text) + holdTime(text)).speech!.id).toBe("intro.1");
  });
});
