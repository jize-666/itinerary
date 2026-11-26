import { describe, expect, it } from "vitest";
import { MASCOT, MascotBehavior } from "@/engine/mascot/behavior";
import { Clawd } from "@/engine/mascot/clawd";
import { GRAB_DELAY, TOSS_SPEED, ticketReaction } from "@/engine/mascot/ticket";
import { moodOf } from "@/engine/mascot/beep";
import { contextOf } from "@/components/mascot/session";

/** Clawd bereaksi saat tamu bermain dengan tiket bertali (3D dan 2,5D). */
describe("ticketReaction", () => {
  it("memetakan isyarat tiket ke reaksi", () => {
    expect(ticketReaction({ type: "grab", kind: "card" })).toBe("grab");
    expect(ticketReaction({ type: "grab", kind: "thread" })).toBe("grab");
    expect(ticketReaction({ type: "flip", back: true })).toBe("back");
    expect(ticketReaction({ type: "flip", back: false })).toBe("front");
  });
  it("lepas dianggap lempar mulai TOSS_SPEED", () => {
    expect(ticketReaction({ type: "release", speed: TOSS_SPEED })).toBe("toss");
    expect(ticketReaction({ type: "release", speed: TOSS_SPEED - 0.01 })).toBeNull();
  });
  it("isyarat lain diabaikan", () => {
    expect(ticketReaction({ type: "eyelet-knock", strength: 1 })).toBeNull();
    expect(ticketReaction({ type: "swing-speed", speed: 3, angularSpeed: 3 })).toBeNull();
    expect(ticketReaction({ type: "rest", back: false })).toBeNull();
  });
});

describe("MascotBehavior.ticket", () => {
  const run = (kind: "grab" | "toss" | "back" | "front") => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    b.ticket(kind, 10000);
    return { b, said, snap: b.snapshot(10001) };
  };

  it("suasana hati dan gerak tiap jenis", () => {
    expect(run("grab").snap).toMatchObject({ mood: "curious", motion: "look" });
    expect(run("toss").snap).toMatchObject({ mood: "surprised", motion: "surprised" });
    expect(run("back").snap).toMatchObject({ mood: "happy", motion: "happy" });
    expect(run("front").snap).toMatchObject({ mood: "happy", motion: "look" });
  });

  it("berucap sesuai jenis", () => {
    expect(run("grab").said).toEqual(["ticketGrab"]);
    expect(run("toss").said).toEqual(["ticketToss"]);
    expect(run("back").said).toEqual(["ticketBack"]);
    expect(run("front").said).toEqual(["ticketFront"]);
  });

  it("jenis yang sama tidak mengulang ucapan sebelum ticketCooldown, gerak tetap jalan", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    b.ticket("grab", 10000);
    b.ticket("grab", 10000 + MASCOT.ticketCooldown - 1);
    expect(said).toHaveLength(1);
    expect(b.snapshot(10000 + MASCOT.ticketCooldown).motion).toBe("look");
    b.ticket("grab", 10000 + MASCOT.ticketCooldown);
    expect(said).toHaveLength(2);
  });

  it("jenis lain tetap menunggu speechGap", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    b.ticket("grab", 10000);
    b.ticket("toss", 10000 + MASCOT.speechGap - 1);
    expect(said).toEqual(["ticketGrab"]);
    b.ticket("toss", 10000 + MASCOT.speechGap);
    expect(said).toEqual(["ticketGrab", "ticketToss"]);
  });

  it("diam saat memandu", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    b.setGuiding(true, 0);
    b.ticket("grab", 10000);
    expect(said).toEqual([]);
  });

  it("tidak melakukan apa pun saat marah", () => {
    const said: string[] = [];
    const b = new MascotBehavior(0, { onSpeech: (l) => said.push(l) });
    [0, 100, 200, 300, 400].forEach((t) => b.tap(t));
    expect(b.mood).toBe("angry");
    said.length = 0;
    b.ticket("toss", 1000);
    expect(b.mood).toBe("angry");
    expect(said).toEqual([]);
  });
});

describe("suara dan konteks tiket", () => {
  it("emosi suara ucapan tiket", () => {
    expect(moodOf("ticketToss.0")).toBe("surprised");
    expect(moodOf("ticketToss.1")).toBe("happy");
    expect(moodOf("ticketFront.0")).toBe("happy");
    expect(moodOf("ticketGrab.0")).toBe("calm");
    expect(moodOf("ticketBack.0")).toBe("calm");
  });

  const el = (dataset: Record<string, string>) => ({ dataset }) as unknown as HTMLElement;
  it("pass3d benar untuk tiket 3D yang tampil", () => {
    expect(contextOf(el({ pass3d: "ready" }), false, false).pass3d).toBe(true);
    expect(contextOf(el({ pass3d: "loading" }), false, false).pass3d).toBe(false);
    expect(contextOf(el({}), false, false).pass3d).toBe(false);
  });
  it("pass3d juga benar saat tiket 2,5D interaktif (data-pass-flat)", () => {
    expect(contextOf(el({ passFlat: "ready" }), false, true).pass3d).toBe(true);
  });
});

describe("Clawd.ticketSignal", () => {
  const make = () => {
    const c = new Clawd(0, "en");
    const kinds: string[] = [];
    const orig = c.behavior.ticket.bind(c.behavior);
    c.behavior.ticket = (kind, now) => {
      kinds.push(kind);
      orig(kind, now);
    };
    return { c, kinds };
  };

  it("ketukan (pegang, lepas pelan, balik) hanya ditanggapi sebagai balik", () => {
    const { c, kinds } = make();
    c.ticketSignal({ type: "grab", kind: "card" }, 10000);
    c.ticketSignal({ type: "release", speed: 0.05 }, 10120);
    c.ticketSignal({ type: "flip", back: true }, 10120);
    c.tick(10000 + GRAB_DELAY + 500);
    expect(kinds).toEqual(["back"]);
  });

  it("pegangan yang ditahan ditanggapi sesudah GRAB_DELAY", () => {
    const { c, kinds } = make();
    c.ticketSignal({ type: "grab", kind: "card" }, 10000);
    c.tick(10000 + GRAB_DELAY - 1);
    expect(kinds).toEqual([]);
    c.tick(10000 + GRAB_DELAY);
    expect(kinds).toEqual(["grab"]);
    c.tick(10000 + GRAB_DELAY + 100);
    expect(kinds).toEqual(["grab"]);
  });

  it("sentilan cepat: lempar tanpa pegangan", () => {
    const { c, kinds } = make();
    c.ticketSignal({ type: "grab", kind: "card" }, 10000);
    c.ticketSignal({ type: "release", speed: TOSS_SPEED + 0.5 }, 10200);
    c.tick(11000);
    expect(kinds).toEqual(["toss"]);
  });
});
