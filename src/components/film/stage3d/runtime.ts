/**
 * Isi panggung 3D di luar React: membangun dunia (langit, lanskap, pendapa, blencong, debu), menjalankan loop,
 * dan menggambar tiap frame. Stage3D.tsx hanya memasang dan membongkarnya.
 *
 * Tiap frame: letak film (`probe`) → cue (shot kamera + keadaan langit) → uniform bersama dan kamera → rantai
 * post. Loop berhenti saat tab tersembunyi, melambat saat diam di tier rendah, dan memberi makan pengatur tier.
 */
import { type PerspectiveCamera, type Scene, Vector2, Vector3, type WebGLRenderer } from "three";
import type { Film } from "@/engine/slides/build-slides";
import type { SkyState } from "@/engine/slides/sky";
import { createCues, type Cursor } from "@/engine/stage/cue";
import { lightElevation, type Mood, moodOf } from "@/engine/stage/mood";
import { type Frame, SUN_TRACK, sunDirection, type SunTrack } from "@/engine/stage/shots";
import { TERRAIN_DEFAULT, type TerrainShape } from "@/engine/stage/terrain";
import type { Governor, Rung, Tier, TierSpec } from "@/engine/stage/tier";
import { createBlencong } from "./blencong";
import { createDust } from "./dust";
import { createPendapa } from "./pendapa";
import { StagePost } from "./post";
import { createShared } from "./shared";
import { createSky, MOON_DIR } from "./sky";
import { createTerrain } from "./terrain";

/** Angka yang dibaca overlay FPS, tes, dan skrip ukur. */
export type StageStats = {
  tier: Tier;
  scale: number;
  fps: number;
  /** Waktu CPU untuk satu frame (ms), rata-rata bergerak. */
  work: number;
  frames: number;
  calls: number;
  triangles: number;
  capped: boolean;
  camera: [number, number, number];
  fov: number;
  /** Indeks slide tempat kamera berada (asal transisi). */
  index: number;
  moving: boolean;
};

export type StageHooks = {
  /** Letak film saat ini (slide asal, tujuan, kemajuan transisi). */
  probe(): Cursor;
  /** Frame pertama sudah tergambar. */
  onLive(): void;
  /** Tidak bisa lanjut (konteks WebGL hilang, atau terlalu berat bahkan di tier terendah). */
  onFail(why: "lost" | "slow"): void;
  /** Pengatur FPS pindah anak tangga. */
  onRung(r: Rung): void;
  /** Sesudah tiap frame (overlay FPS). */
  onStats?(): void;
};

export type RuntimeOptions = {
  gl: WebGLRenderer;
  scene: Scene;
  /** `advance` milik R3F: menjalankan satu frame (frameloop "never"). */
  advance: (timestamp: number) => void;
  film: Film;
  /** Akar film: tempat mengukur bentuk layar dan lintasan matahari (`.fl-sunbox`). */
  root: () => HTMLElement | null;
  spec: TierSpec;
  governor: Governor;
  stats: StageStats;
  /** Dibaca tiap dipakai, supaya selalu memakai callback terbaru dari React. */
  hooks: () => StageHooks;
};

const LAMP_RGB = [1, 0.56, 0.24] as const;
const LAMP_POWER = 5.2;
const isMobile = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export type Runtime = {
  update(camera: PerspectiveCamera, t: number, dt: number): void;
  layout(): void;
  resize(): void;
  dispose(): void;
};

export function createRuntime({ gl, scene, advance, film, root, spec, governor, stats, hooks }: RuntimeOptions): Runtime {
  const shared = createShared();
  const sky = createSky(shared);
  const shape0 = TERRAIN_DEFAULT;
  const terrain = createTerrain(shared, shape0);
  const pendapa = createPendapa(shared);
  const blencong = createBlencong(shared, spec.bloom >= 4);
  const dust = createDust(shared, Math.round((isMobile() ? 2000 : 3600) * spec.particles));
  const nodes = [terrain.mesh, pendapa.group, blencong.group, dust.points, sky.mesh];
  scene.add(...nodes);
  const post = new StagePost(gl, spec);
  gl.info.autoReset = false;

  let frame: Frame = { aspect: 16 / 9 };
  let track: SunTrack = SUN_TRACK;
  let shape: TerrainShape = shape0;
  let cues = createCues(film, frame);
  let lastSky: SkyState | null = null;
  let mood: Mood | null = null;
  const sunDir = new Vector3();
  const sunLight = new Vector3();
  const buf = new Vector2();
  const look = new Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, at: -1e9 };

  const layout = () => {
    const el = root();
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    if (!el || !w || !h) return;
    const o = el.getBoundingClientRect();
    const box = el.querySelector(".fl-sunbox")?.getBoundingClientRect();
    track = box && box.width > 0 ? { left: (2 * (box.left - o.left)) / w - 1, right: (2 * (box.right - o.left)) / w - 1, top: 1 - (2 * (box.top - o.top)) / h, bottom: 1 - (2 * (box.bottom - o.top)) / h } : SUN_TRACK;
    frame = { aspect: w / h, horizon: -track.bottom };
    cues = createCues(film, frame);
    lastSky = null;
    // lanskap mengikuti lebar dan tinggi lintasan matahari di layar ini
    const end = sunDirection(1, 1, track, frame.aspect);
    const top = sunDirection(0.5, 0, track, frame.aspect);
    const next: TerrainShape = { trackHalf: Math.abs(Math.atan2(end[0], -end[2])), trackTop: Math.asin(Math.max(0, Math.min(1, top[1]))) };
    if (Math.abs(next.trackHalf - shape.trackHalf) > 0.02 || Math.abs(next.trackTop - shape.trackTop) > 0.01) {
      shape = next;
      terrain.reshape(shape);
    }
  };
  const resize = () => {
    gl.getDrawingBufferSize(buf);
    post.setSize(Math.max(1, buf.x), Math.max(1, buf.y));
  };

  const update = (camera: PerspectiveCamera, t: number, dt: number) => {
    const cursor = hooks().probe();
    const cue = cues(cursor);
    const shot = cue.shot;
    const s = cue.sky;
    if (s !== lastSky || !mood) {
      lastSky = s;
      mood = moodOf(s);
      const d = sunDirection(s.sun.u, s.sun.v, track, frame.aspect);
      sunDir.set(d[0], d[1], d[2]);
      // arah cahaya: azimut matahari di layar, tetapi tingginya mengikuti jam (lihat lightElevation)
      const el = lightElevation(s.sun.v);
      const flat = Math.hypot(d[0], d[2]) || 1;
      sunLight.set((d[0] / flat) * Math.cos(el), Math.sin(el), (d[2] / flat) * Math.cos(el));
      const u = shared;
      mood.sky.forEach((c, i) => u.uSky.value[i]!.setRGB(c[0], c[1], c[2]));
      u.uSunDir.value.copy(sunDir);
      u.uSunDisc.value = mood.disc;
      u.uWarm.value = mood.warm;
      u.uSunScale.value = mood.sunScale;
      u.uStars.value = mood.stars;
      u.uKeyDir.value.copy(MOON_DIR).lerp(sunLight, mood.sun).normalize();
      u.uKeyColor.value.setRGB(mood.key[0], mood.key[1], mood.key[2]);
      u.uAmbSky.value.setRGB(mood.ambientSky[0], mood.ambientSky[1], mood.ambientSky[2]);
      u.uAmbGround.value.setRGB(mood.ambientGround[0], mood.ambientGround[1], mood.ambientGround[2]);
      // kabut dekat: campuran warna kabut dan warna cakrawala, supaya menyatu dengan langit
      const h0 = mood.sky[0]!;
      u.uFogColor.value.setRGB(mood.fog[0] * 0.5 + h0[0] * 0.5, mood.fog[1] * 0.5 + h0[1] * 0.5, mood.fog[2] * 0.5 + h0[2] * 0.5);
      u.uFogDensity.value = mood.fogDensity;
      u.uNight.value = (1 - s.dawn) * (1 - s.day) * (1 - 0.7 * s.dusk);
    }
    shared.uTime.value = t;
    // nyala blencong: kuatnya dari suasana × shot, bergetar pelan
    const flicker = 0.9 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
    const lamp = mood.lamp * shot.lamp;
    const k = LAMP_POWER * lamp * flicker;
    shared.uLampColor.value.setRGB(LAMP_RGB[0] * k, LAMP_RGB[1] * k, LAMP_RGB[2] * k);
    blencong.setGlow(Math.min(1.6, 0.25 + lamp) * flicker);

    // kamera: shot + napas pelan + geseran kecil mengikuti kursor (parallax)
    const ease = 1 - Math.exp(-Math.min(0.1, dt) * 4);
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(shot.pos[0], shot.pos[1], shot.pos[2]);
    camera.lookAt(look.set(shot.look[0], shot.look[1], shot.look[2]));
    const reach = shot.rig === "orbit" ? 1 : 0.6;
    camera.translateX((Math.sin(t * 0.21) * 0.035 + pointer.x * 0.18) * reach);
    camera.translateY((Math.sin(t * 0.17 + 1.3) * 0.022 - pointer.y * 0.09) * reach);
    camera.updateMatrixWorld();

    gl.getDrawingBufferSize(buf);
    dust.setPixel(buf.y / Math.tan((camera.fov * Math.PI) / 360));
    gl.info.reset();
    post.render(scene, camera, { exposure: mood.exposure, dim: shot.dim, time: t });

    stats.frames++;
    stats.calls = gl.info.render.calls;
    stats.triangles = gl.info.render.triangles;
    stats.camera = [camera.position.x, camera.position.y, camera.position.z];
    stats.fov = camera.fov;
    stats.index = cursor.from;
    stats.moving = cue.moving;
  };
  layout();
  resize();

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.at = performance.now();
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const ro = new ResizeObserver(layout);
  const host = root();
  if (host) ro.observe(host);
  const canvas = gl.domElement;
  const onLost = (e: Event) => {
    e.preventDefault();
    hooks().onFail("lost");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // ---- loop ----
  let raf = 0;
  let live = false;
  let last = 0;
  let n = 0;
  let work = 0;
  const born = performance.now();
  const tick = (ts: number) => {
    raf = requestAnimationFrame(tick);
    if (document.visibilityState === "hidden") {
      last = 0;
      return;
    }
    n++;
    const c = hooks().probe();
    const now = performance.now();
    const active = c.to !== c.from || now - pointer.at < 900 || now - born < 1500;
    if (!active && spec.idleEvery > 1 && n % spec.idleEvery !== 0) return;
    const dt = last ? ts - last : 0;
    last = ts;
    const t0 = performance.now();
    advance(ts / 1000);
    work += (performance.now() - t0 - work) * 0.1;
    if (!live) {
      live = true;
      hooks().onLive();
    }
    // frame yang sengaja dilewati saat diam bukan data kehalusan
    const measured = active || spec.idleEvery === 1;
    const next = measured && dt > 0 ? governor.sample(dt, ts) : null;
    if (!measured) governor.rest(ts);
    stats.work = work;
    stats.fps = governor.fps();
    stats.capped = governor.capped();
    hooks().onStats?.();
    if (next) {
      if (next.tier === "static") hooks().onFail("slow");
      else hooks().onRung(next);
    }
  };
  raf = requestAnimationFrame(tick);

  const dispose = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointer);
    ro.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    scene.remove(...nodes);
    sky.dispose();
    terrain.dispose();
    pendapa.dispose();
    blencong.dispose();
    dust.dispose();
    post.dispose();
  };
  return { update, layout, resize, dispose };
}
