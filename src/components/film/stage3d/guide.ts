/**
 * Clawd di panggung 3D film (M3): maskot kit + sesi (`components/mascot/session.ts`: otak, pemandu, tempat di
 * samping) + gelembung ucapan + tombol tak terlihat di atas badannya (klik/ketuk/Enter).
 *
 * - Muncul begitu gunungan pembuka tampil (atau sejak awal bila film dibuka tanpa gerbang).
 * - Letaknya dihitung dalam ruang kamera, jadi Clawd selalu di dalam bingkai: di samping layar, atau menghampiri
 *   gunungan/gong yang sedang dijelaskan. Perpindahan antar tempat dihaluskan; yang jauh dijalani dengan terbang.
 * - Gerak pandang (aturan host 13 Nov, semua objek): Clawd dekat kamera, jadi saat kamera bergeser mengikuti kursor
 *   atau kemiringan HP ia bergeser lebih jauh dari latar (parallax) dan wajahnya sedikit menoleh (perspective shift);
 *   selama perpindahan slide ia mendekat mengikuti kemajuan gulir (kedalaman ikut gulir).
 */
import { type PerspectiveCamera, type Scene, Vector3 } from "three";
import { createBubble } from "@/components/mascot/bubble";
import { BODY_FRAC, contextOf, createSession } from "@/components/mascot/session";
import type { BubbleSide } from "@/engine/mascot/guide";
import { createMascot } from "./mascot";
import type { Shared } from "./shared";

export type GuideFrame = {
  camera: PerspectiveCamera;
  t: number;
  dt: number;
  /** Film sedang berpindah slide, dan kedalaman ikut gulir saat ini (0 saat diam). */
  moving: boolean;
  depth: number;
  /** Arah pandang −1…1 (kursor/kemiringan HP). */
  look: Readonly<{ x: number; y: number }>;
  /** Banyak pukulan gong sejauh ini. */
  strikes: number;
  /** Pusat gong dan jari-jarinya (dunia). */
  gong: Vector3;
  gongRadius: number;
};

/** Jarak Clawd dari kamera (m). */
const NEAR = 3.4;
/** Letak di layar (NDC) di dekat gunungan, untuk layar lebar dan tegak. Di samping: dipilih dari tata letak slide. */
const KAYON_SPOT = { wide: [0.5, -0.42], tall: [0.52, -0.5] } as const;
/** Parallax Clawd (NDC per satuan pandang) dan seberapa jauh wajahnya ikut menoleh. */
const PARALLAX = { x: 0.035, y: 0.025, turn: 0.6 } as const;

export function createStageGuide({ shared, scene, host, touch }: { shared: Shared; scene: Scene; host: () => HTMLElement | null; touch: boolean }) {
  const rig = createMascot(shared);
  rig.root.visible = false;
  rig.emotes.visible = false;
  scene.add(rig.root, rig.emotes, rig.lights);
  const session = createSession({ touch });

  let bubble: ReturnType<typeof createBubble> | null = null;
  let hit: HTMLButtonElement | null = null;
  let mounted: HTMLElement | null = null;
  /** Ukuran dan letak akar film, dibaca hanya saat berubah (membaca tata letak tiap frame memaksa layout ulang). */
  const view = { w: 0, h: 0, left: 0, top: 0 };
  const measureView = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    view.w = el.clientWidth;
    view.h = el.clientHeight;
    view.left = r.left;
    view.top = r.top;
  };
  let resize: ResizeObserver | null = null;
  const mount = (el: HTMLElement) => {
    mounted = el;
    measureView(el);
    resize?.disconnect();
    resize = new ResizeObserver(() => measureView(el));
    resize.observe(el);
    bubble = createBubble(el, { onTap: () => session.tapBubble(session.clock) });
    hit = document.createElement("button");
    hit.type = "button";
    hit.className = "clawd-hit";
    hit.setAttribute("aria-label", "Clawd");
    hit.addEventListener("click", (e) => {
      e.stopPropagation();
      if (session.tap(session.clock) === "tap") rig.poke();
    });
    el.appendChild(hit);
  };

  let strikes = -1;
  /** Letak Clawd dalam ruang kamera (dihaluskan) dan tujuannya. */
  const local = new Vector3();
  const goal = new Vector3();
  let placed = false;
  const world = new Vector3();
  const prev = new Vector3();
  const travel = new Vector3();
  const faceAt = new Vector3();
  const head = new Vector3();
  const v = new Vector3();

  /** NDC (x, y) pada jarak `d` dari kamera → ruang kamera. */
  const fromNdc = (camera: PerspectiveCamera, x: number, y: number, d: number, out: Vector3) => {
    const tv = Math.tan((camera.fov * Math.PI) / 360);
    return out.set(x * tv * camera.aspect * d, y * tv * d, -d);
  };

  return {
    rig,
    brain: session.brain,
    update(f: GuideFrame) {
      const el = host();
      if (!el) return;
      if (mounted !== el) mount(el);
      const ms = f.t * 1000;
      const ctx = contextOf(el, f.moving, false);
      // muncul saat panggung siap: gunungan tampil, atau film tanpa gerbang
      if (!session.started) {
        if (ctx.gate === "wait") return;
        session.start(ms);
        rig.root.visible = rig.emotes.visible = true;
      }
      if (strikes >= 0 && f.strikes > strikes) session.gong(ms);
      strikes = f.strikes;
      const { clawd: frame, spot, side } = session.step(ctx, ms, f.t, el, view);
      const speech = frame.speech;

      // ---- letak: tempat → tujuan dalam ruang kamera ----
      const { camera } = f;
      const tall = camera.aspect < 1;
      let d = NEAR;
      let bubbleSide: BubbleSide = "above";
      let x: number;
      let y: number;
      if (spot === "gong") {
        // di samping gong, sedikit di depannya
        v.copy(f.gong).project(camera);
        head.set(f.gongRadius, 0, 0).applyQuaternion(camera.quaternion).add(f.gong).project(camera);
        const r = Math.abs(head.x - v.x);
        d = Math.min(NEAR + 1, camera.position.distanceTo(f.gong) * 0.55);
        x = Math.max(-0.82, Math.min(tall ? 0.62 : 0.8, v.x + r * 1.15 + (tall ? 0.18 : 0.12)));
        y = Math.max(-0.7, Math.min(0.5, v.y - r * 0.35));
      } else if (spot === "kayon") {
        [x, y] = KAYON_SPOT[tall ? "tall" : "wide"];
      } else {
        [x, y] = side ?? (tall ? [0.62, -0.63] : [0.76, -0.5]);
        bubbleSide = side?.[2] ?? "above";
      }
      // parallax: Clawd lebih dekat ke kamera daripada panggung, jadi bergeser berlawanan arah pandang lebih jauh
      fromNdc(camera, x - f.look.x * PARALLAX.x, y + f.look.y * PARALLAX.y, d, goal);
      if (!placed) {
        local.copy(goal);
        placed = true;
      }
      const far = local.distanceTo(goal);
      local.lerp(goal, 1 - Math.exp(-f.dt / 0.45));
      session.brain.behavior.setTraveling(far > 0.7);
      world.copy(local).applyMatrix4(camera.matrixWorld);
      travel.subVectors(world, prev);
      prev.copy(world);

      // tinggi badan: bagian tetap dari sisi layar terpendek, berapa pun jaraknya; kedalaman ikut gulir = mendekat
      const tv = Math.tan((camera.fov * Math.PI) / 360);
      const size = BODY_FRAC[tall ? "tall" : "wide"] * 2 * -local.z * tv * Math.min(1, camera.aspect) * (1 + 0.6 * f.depth);
      // menghadap kamera (wajah ikut menoleh ke arah pandang); saat menjelaskan gong separuh berpaling ke gong
      faceAt.set(f.look.x * PARALLAX.turn, -f.look.y * PARALLAX.turn * 0.6, 0).applyQuaternion(camera.quaternion).add(camera.position);
      if (spot === "gong") faceAt.lerp(f.gong, 0.35);
      rig.update({
        t: f.t,
        dt: f.dt,
        pos: world,
        face: faceAt,
        camera: camera.position,
        travel: far > 0.7 && travel.lengthSq() > 1e-8 ? travel : null,
        size,
        mood: frame.mood,
        motion: frame.motion,
        motionSince: frame.motionSince / 1000,
      });

      // ---- lapisan DOM: gelembung di atas kepala atau di samping, tombol di atas badan ----
      const { w, h } = view;
      v.copy(world).project(camera);
      const px = (size / (2 * -local.z * tv)) * h;
      const cx = ((v.x + 1) / 2) * w;
      const cy = ((1 - v.y) / 2) * h;
      // kotak badan di layar (lengan, kaki, dan ruang di atas kepala): gelembung di sisi pilihan bila muat, tidak
      // pernah menutupinya
      head.set(0, 0.95 + 0.4, 0).applyMatrix4(rig.character.bodyRig.matrixWorld).project(camera);
      const headY = ((1 - head.y) / 2) * h;
      const box = { left: view.left + cx - px * 0.8, right: view.left + cx + px * 0.8, top: view.top + Math.min(headY, cy - px * 0.6), bottom: view.top + cy + px * 0.8 };
      bubble?.render(ctx.sheet ? null : speech, box, bubbleSide);
      if (hit) {
        hit.style.width = hit.style.height = `${Math.round(px * 1.3)}px`;
        hit.style.transform = `translate(${(cx - px * 0.65).toFixed(1)}px, ${(cy - px * 0.6).toFixed(1)}px)`;
      }
    },
    /** Clawd sedang bicara atau terbang: frame tidak dijarangkan saat panggung diam. */
    busy() {
      return session.started && (session.brain.dialogue.active || session.brain.behavior.traveling);
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2), untuk ukuran partikel emosi. */
    setPixel(px: number) {
      rig.setPixel(px);
    },
    dispose() {
      session.dispose();
      resize?.disconnect();
      bubble?.dispose();
      hit?.remove();
      scene.remove(rig.root, rig.emotes, rig.lights);
      rig.dispose();
    },
  };
}

export type StageGuide = ReturnType<typeof createStageGuide>;
