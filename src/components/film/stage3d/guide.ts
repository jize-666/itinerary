/**
 * Clawd di panggung 3D film (M3): maskot kit + otak (`engine/mascot/clawd.ts`) + pemandu (`engine/mascot/guide.ts`)
 * + gelembung ucapan (`components/mascot/bubble.ts`) + tombol tak terlihat di atas badannya (klik/ketuk/Enter).
 *
 * - Muncul begitu gunungan pembuka tampil (atau sejak awal bila film dibuka tanpa gerbang): tamu baru diperkenalkan,
 *   tamu lama disapa singkat.
 * - Letaknya dihitung dalam ruang kamera, jadi Clawd selalu di dalam bingkai: di samping layar, atau menghampiri
 *   gunungan/gong yang sedang dijelaskan. Perpindahan antar tempat dihaluskan; yang jauh dijalani dengan terbang.
 *   Kamera yang bergerak memberi badannya lentur jeli dengan sendirinya.
 * - Petunjuk diucapkan sekali per perangkat saat tamu pertama kali tiba di tempatnya; yang tidak berlaku lagi
 *   (tamu sudah pindah) dibuang.
 * - Membaca keadaan film dari atribut data akar film (`data-kind`, `data-beat`, `data-gate`, `data-sheet`).
 */
import { type PerspectiveCamera, type Scene, Vector3 } from "three";
import { createBubble } from "@/components/mascot/bubble";
import { langStore } from "@/engine/i18n/lang";
import { Clawd } from "@/engine/mascot/clawd";
import { Guide, type GuideContext, readSeen, type Spot, spotAt, stillApplies, writeSeen } from "@/engine/mascot/guide";
import { INTRO, TIPS, type TipId } from "@/engine/mascot/lines";
import { createMascot } from "./mascot";
import type { Shared } from "./shared";

export type GuideFrame = {
  camera: PerspectiveCamera;
  t: number;
  dt: number;
  /** Film sedang berpindah slide. */
  moving: boolean;
  /** Banyak pukulan gong sejauh ini. */
  strikes: number;
  /** Pusat gong dan jari-jarinya (dunia). */
  gong: Vector3;
  gongRadius: number;
};

/** Jarak Clawd dari kamera (m) dan tinggi badannya di layar (bagian sisi layar terpendek). */
const NEAR = 3.4;
const BODY_FRAC = { wide: 0.15, tall: 0.19 } as const;
/** Letak di layar (NDC) untuk layar lebar dan tegak. */
const SPOTS: Record<Exclude<Spot, "gong">, { wide: [number, number]; tall: [number, number] }> = {
  side: { wide: [0.76, -0.5], tall: [0.6, -0.56] },
  kayon: { wide: [0.5, -0.42], tall: [0.52, -0.5] },
};
const TIP_IDS = Object.keys(TIPS) as TipId[];

const storage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

export function createStageGuide({ shared, scene, host, touch }: { shared: Shared; scene: Scene; host: () => HTMLElement | null; touch: boolean }) {
  const rig = createMascot(shared);
  rig.root.visible = false;
  rig.emotes.visible = false;
  scene.add(rig.root, rig.emotes, rig.lights);
  const guide = new Guide(readSeen(storage()));
  const brain = new Clawd(0, langStore.get(), touch);
  const offLang = langStore.subscribe(() => (brain.lang = langStore.get()));

  let clockMs = 0;
  let bubble: ReturnType<typeof createBubble> | null = null;
  let hit: HTMLButtonElement | null = null;
  let mounted: HTMLElement | null = null;
  const tap = () => {
    if (brain.tap(clockMs) === "tap") rig.poke();
  };
  const mount = (el: HTMLElement) => {
    mounted = el;
    bubble = createBubble(el, { onTap: () => brain.tapBubble(clockMs) });
    hit = document.createElement("button");
    hit.type = "button";
    hit.className = "clawd-hit";
    hit.setAttribute("aria-label", "Clawd");
    hit.addEventListener("click", (e) => {
      e.stopPropagation();
      tap();
    });
    el.appendChild(hit);
  };
  const onVisibility = () => brain.visibility(document.visibilityState === "hidden", clockMs);
  document.addEventListener("visibilitychange", onVisibility);

  let started = false;
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

  const persist = () => writeSeen(guide.seen, storage());

  return {
    rig,
    brain,
    update(f: GuideFrame) {
      const el = host();
      if (!el) return;
      if (mounted !== el) mount(el);
      const ms = f.t * 1000;
      clockMs = ms;
      const ctx: GuideContext = { kind: el.dataset.kind as GuideContext["kind"], beat: el.dataset.beat === "out", gate: el.dataset.gate ?? "off", moving: f.moving, sheet: "sheet" in el.dataset };
      // muncul saat panggung siap: gunungan tampil, atau film tanpa gerbang
      if (!started) {
        if (ctx.gate === "wait") return;
        started = true;
        brain.start(ms, guide.seen.intro);
        rig.root.visible = rig.emotes.visible = true;
      }

      // ---- kejadian film ----
      if (strikes >= 0 && f.strikes > strikes) brain.gong(ms);
      strikes = f.strikes;
      if (f.moving) brain.activity(ms);

      // ---- petunjuk: yang baru diantrekan, yang tidak berlaku lagi dibuang ----
      const due = guide.due(ctx);
      if (due && !brain.hasTip(due)) {
        brain.tip(due, ms);
        if (due === "gong" || due === "beat" || due === "zoom") brain.behavior.point(ms);
      }
      for (const id of TIP_IDS) if (brain.hasTip(id) && !stillApplies(id, ctx)) brain.hushTip(id, ms);

      const frame = brain.tick(ms);
      const speech = frame.speech;
      // tuntas: kalimat terakhir perkenalan/petunjuk sudah lengkap diketik
      if (speech && !speech.typing) {
        if (speech.id === `intro.${INTRO.length - 1}` && guide.introDone()) persist();
        const tip = brain.tipShown(speech);
        if (tip && speech.id === `tip.${tip}.${TIPS[tip].length - 1}` && guide.done(tip)) persist();
      }

      // ---- letak: tempat → tujuan dalam ruang kamera ----
      const { camera } = f;
      const tall = camera.aspect < 1;
      const spot = spotAt(ctx, brain.tipShown(speech));
      let d = NEAR;
      if (spot === "gong") {
        // di samping gong, sedikit di depannya
        v.copy(f.gong).project(camera);
        head.set(f.gongRadius, 0, 0).applyQuaternion(camera.quaternion).add(f.gong).project(camera);
        const r = Math.abs(head.x - v.x);
        d = Math.min(NEAR + 1, camera.position.distanceTo(f.gong) * 0.55);
        const x = Math.max(-0.82, Math.min(tall ? 0.62 : 0.8, v.x + r * 1.15 + (tall ? 0.18 : 0.12)));
        const y = Math.max(-0.7, Math.min(0.5, v.y - r * 0.35));
        fromNdc(camera, x, y, d, goal);
      } else {
        const [x, y] = SPOTS[spot][tall ? "tall" : "wide"];
        fromNdc(camera, x, y, d, goal);
      }
      if (!placed) {
        local.copy(goal);
        placed = true;
      }
      const far = local.distanceTo(goal);
      local.lerp(goal, 1 - Math.exp(-f.dt / 0.45));
      brain.behavior.setTraveling(far > 0.7);
      world.copy(local).applyMatrix4(camera.matrixWorld);
      travel.subVectors(world, prev);
      prev.copy(world);

      // tinggi badan: bagian tetap dari sisi layar terpendek, berapa pun jaraknya
      const tv = Math.tan((camera.fov * Math.PI) / 360);
      const size = BODY_FRAC[tall ? "tall" : "wide"] * 2 * -local.z * tv * Math.min(1, camera.aspect);
      // menghadap kamera; saat menjelaskan gong separuh berpaling ke gong
      faceAt.copy(camera.position);
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

      // ---- lapisan DOM: gelembung di atas kepala, tombol di atas badan ----
      const w = el.clientWidth;
      const h = el.clientHeight;
      const box = el.getBoundingClientRect();
      head.set(0, 0.95 + 0.4, 0).applyMatrix4(rig.character.bodyRig.matrixWorld).project(camera);
      bubble?.render(ctx.sheet ? null : speech, box.left + ((head.x + 1) / 2) * w, box.top + ((1 - head.y) / 2) * h);
      if (hit) {
        v.copy(world).project(camera);
        const px = (size / (2 * -local.z * tv)) * h;
        const cx = ((v.x + 1) / 2) * w;
        const cy = ((1 - v.y) / 2) * h;
        hit.style.width = hit.style.height = `${Math.round(px * 1.3)}px`;
        hit.style.transform = `translate(${(cx - px * 0.65).toFixed(1)}px, ${(cy - px * 0.6).toFixed(1)}px)`;
      }
    },
    /** Clawd sedang bicara atau terbang: frame tidak dijarangkan saat panggung diam. */
    busy() {
      return started && (brain.dialogue.active || brain.behavior.traveling);
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2), untuk ukuran partikel emosi. */
    setPixel(px: number) {
      rig.setPixel(px);
    },
    dispose() {
      offLang();
      document.removeEventListener("visibilitychange", onVisibility);
      bubble?.dispose();
      hit?.remove();
      scene.remove(rig.root, rig.emotes, rig.lights);
      rig.dispose();
    },
  };
}

export type StageGuide = ReturnType<typeof createStageGuide>;
