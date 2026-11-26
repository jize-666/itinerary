/**
 * Clawd di film 2,5D (M4; tanpa WebGL, tier Static, Calm, gerak dikurangi): karakter CSS 3D (`mascot/flat.ts`) +
 * sesi yang sama dengan film 3D (`mascot/session.ts`: otak, petunjuk, tempat di samping) + gelembung ucapan +
 * partikel emosi DOM. Loop rAF sendiri; hanya menulis `transform` dan `opacity`.
 *
 * - Tempat: di samping (dipilih dari tata letak slide) atau di samping cakram gong CSS saat menjelaskannya.
 * - Gerak pandang (aturan host 13 Nov): Clawd lapisan terdekat, jadi bergeser searah pandang lebih jauh dari isi
 *   slide (parallax; isi slide 14 px, Clawd 22 px), badannya ikut memutar (perspective shift), dan selama perpindahan
 *   slide ia mendekat mengikuti kemajuan gulir (kedalaman ikut gulir).
 * - Calm dan gerak dikurangi: pose diam, tanpa jeli dan kedip, kalimat langsung utuh.
 */
import { createBubble } from "@/components/mascot/bubble";
import { createFlatClawd } from "@/components/mascot/flat";
import { createFlatEmotes } from "@/components/mascot/flat-emotes";
import { BODY_FRAC, contextOf, createSession } from "@/components/mascot/session";
import { Motor } from "@/engine/mascot/motor";
import type { Cursor } from "@/engine/stage/cue";
import { stageBus } from "@/engine/stage/bus";
import { scrollDepth } from "@/engine/motion/view";

/** Parallax Clawd (px per satuan pandang) dan putaran badannya (rad per satuan pandang). */
const PARALLAX = { x: 22, y: 12, yaw: 0.3, pitch: 0.12 } as const;

export function createFlatGuide({ host, probe, still, touch }: { host: HTMLElement; probe: () => Cursor; still: () => boolean; touch: boolean }) {
  const session = createSession({ touch });
  const motor = new Motor();
  const bubble = createBubble(host, { onTap: () => session.tapBubble(session.clock), reduced: still });
  const clawd = createFlatClawd(host, () => {
    if (session.tap(session.clock) === "tap") motor.poke();
  });
  const emotes = createFlatEmotes(host);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  // gong dipukul (cakram CSS): Clawd terkejut saat gong kena
  const offStrike = stageBus.onStrike((due) => {
    const id = setTimeout(() => {
      timers.delete(id);
      session.gong(performance.now());
    }, due * 1000);
    timers.add(id);
  });

  // tamu bermain dengan tiket bertali (2,5D): Clawd bereaksi
  const offPass = stageBus.onPass((e) => session.ticket(e, performance.now()));

  const view = { w: host.clientWidth, h: host.clientHeight };
  const resize = new ResizeObserver(() => {
    view.w = host.clientWidth;
    view.h = host.clientHeight;
  });
  resize.observe(host);

  let raf = 0;
  let last = 0;
  let placed = false;
  const pos = { x: 0, y: 0 };
  let yaw = 0;

  const tick = (ts: number) => {
    raf = requestAnimationFrame(tick);
    if (document.visibilityState === "hidden") {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 1 / 60;
    last = ts;
    const t = ts / 1000;
    const ms = ts;
    const calm = still();
    const cur = probe();
    const moving = cur.from !== cur.to;
    const ctx = contextOf(host, moving, true);
    session.start(ms);
    const { clawd: frame, spot, side } = session.step(ctx, ms, t, host, view);
    const { w, h } = view;
    if (!w || !h) return;
    const tall = w < h;
    const body = BODY_FRAC[tall ? "tall" : "wide"] * Math.min(w, h);

    // ---- tujuan di layar (px, tengah badan) ----
    let gx: number;
    let gy: number;
    let side3 = side?.[2] ?? "above";
    const disc = spot === "gong" ? host.querySelector<HTMLElement>(".fl-layer[data-pos='cur'] .fs-gong") : null;
    const r = disc?.getBoundingClientRect();
    if (r && r.width > 0) {
      // di samping cakram gong CSS
      const box = host.getBoundingClientRect();
      gx = Math.min(w - body * 0.9, r.right - box.left + body * 0.85);
      gy = Math.min(h - body * 0.8, Math.max(body, r.top - box.top + r.height * 0.6));
      side3 = "above";
    } else {
      const [sx, sy] = side ?? (tall ? [0.62, -0.63] : [0.76, -0.5]);
      gx = ((sx + 1) / 2) * w;
      gy = ((1 - sy) / 2) * h;
    }
    // parallax: lapisan terdekat, searah pandang dan lebih jauh dari isi slide
    const lx = calm ? 0 : parseFloat(host.style.getPropertyValue("--lx")) || 0;
    const ly = calm ? 0 : parseFloat(host.style.getPropertyValue("--ly")) || 0;
    gx += lx * PARALLAX.x;
    gy += ly * PARALLAX.y;
    if (!placed) {
      pos.x = gx;
      pos.y = gy;
      placed = true;
    }
    const far = Math.hypot(gx - pos.x, gy - pos.y) / body;
    const k = calm ? 1 : 1 - Math.exp(-dt / 0.45);
    const vx = (gx - pos.x) * k;
    pos.x += vx;
    pos.y += (gy - pos.y) * k;
    session.brain.behavior.setTraveling(!calm && far > 0.7);

    // ---- arah hadap: menoleh ke arah terbang, ke gong yang dijelaskan, dan sedikit mengikuti pandang ----
    let goalYaw = lx * PARALLAX.yaw;
    if (far > 0.7) goalYaw += Math.sign(vx) * 0.5;
    if (r && r.width > 0) goalYaw -= 0.35;
    yaw += (goalYaw - yaw) * (calm ? 1 : Math.min(1, dt * 6));

    const m = motor.update({
      t,
      dt,
      mood: frame.mood,
      motion: frame.motion,
      motionSince: frame.motionSince / 1000,
      still: calm,
      base: [pos.x / body, -pos.y / body, 0],
      yaw,
    });
    // kedalaman ikut gulir: mendekat selama perpindahan slide
    const size = body * (1 + (calm || !moving ? 0 : 0.6 * scrollDepth(cur.p)));
    clawd.render({ x: pos.x, y: pos.y, size, pose: m.pose, lift: m.lift, stretch: m.stretch, shearX: m.shearX, shearZ: m.shearZ, arms: m.arms, legs: m.legs, yaw, pitch: 0.1 - ly * PARALLAX.pitch, expression: m.expression, open: m.open });

    // ---- gelembung dan partikel emosi ----
    const headY = pos.y - size * (0.5 + m.lift) - size * 0.22;
    // kotak badan beserta lengan, kaki, dan ruang di atas kepala: gelembung tidak pernah menutupinya
    const box = { left: pos.x - size * 0.8, right: pos.x + size * 0.8, top: headY, bottom: pos.y + size * 0.8 };
    bubble.render(ctx.sheet ? null : frame.speech, box, side3);
    emotes.update(t, frame.mood, pos.x, headY + size * 0.1, size, calm);
  };
  raf = requestAnimationFrame(tick);

  return {
    session,
    dispose() {
      cancelAnimationFrame(raf);
      offStrike();
      offPass();
      timers.forEach((id) => clearTimeout(id));
      resize.disconnect();
      session.dispose();
      bubble.dispose();
      clawd.dispose();
      emotes.dispose();
    },
  };
}
