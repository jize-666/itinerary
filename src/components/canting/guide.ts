/**
 * Clawd memandu di samping kain /canting/ (Tugas 11.2). Badan CSS 3D, gelembung, dan motor gerak sama dengan film
 * 2,5D (`mascot/flat.ts`, `mascot/bubble.ts`, `engine/mascot/motor.ts`, `dialogue.ts`); di sini tanpa otak film:
 * halaman memanggil `say(kunci)` saat sesuatu terjadi (malam habis, celup, lorod, ...).
 *
 * - Tempat: di samping kain, di atas panel alat (`place`), sedikit bergeser mengikuti pandang (parallax, aturan host
 *   13 Nov); badan ikut memutar.
 * - Calm dan gerak dikurangi: pose diam, kalimat langsung utuh.
 * - Kalimat baru tanpa klip suara: gelembung saja.
 */
import { createBubble } from "@/components/mascot/bubble";
import { createFlatClawd } from "@/components/mascot/flat";
import { stepLook } from "@/components/film/look";
import { Dialogue, type Utterance } from "@/engine/mascot/dialogue";
import type { Mood } from "@/engine/mascot/face";
import { Motor } from "@/engine/mascot/motor";
import type { Motion } from "@/engine/mascot/pose";
import { ct, type CantingLang, type CantingTextKey } from "@/engine/canting/text";

type ClawdKey = Extract<CantingTextKey, `clawd.${string}`>;

/** Suasana dan gerak per kalimat. */
const ACT: Record<ClawdKey, [Mood, Motion]> = {
  "clawd.hello": ["happy", "greet"],
  "clawd.blow": ["curious", "talk"],
  "clawd.fast": ["surprised", "surprised"],
  "clawd.slow": ["curious", "look"],
  "clawd.empty": ["curious", "point"],
  "clawd.cool": ["curious", "look"],
  "clawd.nila": ["happy", "talk"],
  "clawd.kerok": ["neutral", "look"],
  "clawd.biru": ["curious", "point"],
  "clawd.soga": ["happy", "talk"],
  "clawd.lorod": ["surprised", "surprised"],
  "clawd.done": ["love", "happy"],
  "clawd.saved": ["happy", "happy"],
  "clawd.undo": ["neutral", "talk"],
};

export type CantingGuide = {
  say(key: ClawdKey, interrupt?: boolean): void;
  setLang(lang: CantingLang): void;
  dispose(): void;
};

export function createCantingGuide(
  host: HTMLElement,
  opts: { lang: CantingLang; reduced: () => boolean; place: (w: number, h: number) => { x: number; y: number } },
): CantingGuide {
  let lang = opts.lang;
  const dialogue = new Dialogue();
  const motor = new Motor();
  const said = new Map<string, number>();
  let mood: Mood = "neutral";
  let motion: Motion = "hover";
  let motionSince = 0;
  const bubble = createBubble(host, { onTap: () => dialogue.advance(performance.now()), reduced: opts.reduced });
  const clawd = createFlatClawd(host, () => {
    motor.poke();
    guide.say("clawd.blow");
  });
  const view = { w: host.clientWidth, h: host.clientHeight };
  const ro = new ResizeObserver(() => {
    view.w = host.clientWidth;
    view.h = host.clientHeight;
  });
  ro.observe(host);
  const pos = { x: 0, y: 0, placed: false };
  let yaw = 0;
  let raf = 0;
  let last = 0;

  const tick = (ts: number) => {
    raf = requestAnimationFrame(tick);
    if (document.visibilityState === "hidden") {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 1 / 60;
    last = ts;
    const { w, h } = view;
    if (!w || !h) return;
    const still = opts.reduced();
    const size = Math.max(54, Math.min(104, Math.min(w, h) * 0.13));
    const goal = opts.place(w, h);
    const look = still ? { x: 0, y: 0 } : stepLook(ts);
    const gx = goal.x + look.x * 18;
    const gy = goal.y + look.y * 10;
    if (!pos.placed) {
      pos.x = gx;
      pos.y = gy;
      pos.placed = true;
    }
    const k = still ? 1 : 1 - Math.exp(-dt / 0.35);
    pos.x += (gx - pos.x) * k;
    pos.y += (gy - pos.y) * k;
    yaw += (look.x * 0.3 + 0.35 - yaw) * (still ? 1 : Math.min(1, dt * 5));
    const speech = dialogue.tick(ts);
    // gerak sekali jalan kembali melayang; selagi bicara: gerak bicara
    const m = motor.update({
      t: ts / 1000,
      dt,
      mood: speech ? mood : "neutral",
      motion: speech ? motion : "hover",
      motionSince: motionSince / 1000,
      still,
      base: [pos.x / size, -pos.y / size, 0],
      yaw,
    });
    clawd.render({ x: pos.x, y: pos.y, size, pose: m.pose, lift: m.lift, stretch: m.stretch, shearX: m.shearX, shearZ: m.shearZ, arms: m.arms, legs: m.legs, yaw, pitch: 0.1 - look.y * 0.12, expression: m.expression, open: m.open });
    const headY = pos.y - size * (0.5 + m.lift) - size * 0.22;
    bubble.render(speech, { left: pos.x - size * 0.8, right: pos.x + size * 0.8, top: headY, bottom: pos.y + size * 0.8 }, "above");
  };
  raf = requestAnimationFrame(tick);

  const guide: CantingGuide = {
    say(key, interrupt = false) {
      const now = performance.now();
      // kalimat yang sama tidak diulang dalam 25 dtk (malam habis, mbleber, ...)
      if (now - (said.get(key) ?? -1e9) < 25_000) return;
      said.set(key, now);
      const [md, mo] = ACT[key];
      mood = md;
      motion = mo;
      motionSince = now;
      const u: Utterance = { id: key, text: () => ct(key, lang) };
      dialogue.say([u], now, interrupt);
    },
    setLang(l) {
      lang = l;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      bubble.dispose();
      clawd.dispose();
    },
  };
  return guide;
}
