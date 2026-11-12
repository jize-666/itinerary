"use client";
/**
 * Panggung 3D film (F2): satu kanvas React Three Fiber di belakang lapisan teks DOM. Berkas ini dan semua yang
 * diimpornya (three, R3F) hanya dimuat lewat `import()` dari StageMount, jadi gerbang dan Today tidak memuatnya.
 *
 * Tiap frame: letak film (`probe`) → cue (shot kamera + keadaan langit) → uniform bersama dan kamera → rantai
 * post. Loop dijalankan sendiri (frameloop "never" + `advance`): berhenti saat tab tersembunyi, melambat saat
 * diam di tier rendah, dan tiap frame memberi makan pengatur tier.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import { type PerspectiveCamera, Vector2, Vector3 } from "three";
import type { Film } from "@/engine/slides/build-slides";
import type { SkyState } from "@/engine/slides/sky";
import { createCues, type Cursor } from "@/engine/stage/cue";
import { lightElevation, type Mood, moodOf } from "@/engine/stage/mood";
import { type Frame, SUN_TRACK, sunDirection, type SunTrack } from "@/engine/stage/shots";
import { TERRAIN_DEFAULT, type TerrainShape } from "@/engine/stage/terrain";
import { createGovernor, type Governor, LADDER, type Rung, rungOf, type Tier, TIER, type TierSpec } from "@/engine/stage/tier";
import { createBlencong } from "./blencong";
import { createDust } from "./dust";
import { createPendapa } from "./pendapa";
import { StagePost } from "./post";
import { createShared } from "./shared";
import { createSky, MOON_DIR } from "./sky";
import { createTerrain } from "./terrain";

export type Stage3DProps = {
  film: Film;
  /** Letak film saat ini (slide asal, tujuan, kemajuan transisi). */
  probe: () => Cursor;
  /** Akar film: tempat mengukur bentuk layar dan lintasan matahari (`.fl-sunbox`). */
  root: RefObject<HTMLElement | null>;
  tier: Exclude<Tier, "static">;
  /** Tier dipaksa (`?stage=`): pengatur FPS hanya mengukur. */
  locked: boolean;
  /** Tampilkan overlay FPS. */
  debug: boolean;
  /** Frame pertama sudah tergambar. */
  onLive: () => void;
  /** Tidak bisa lanjut (konteks WebGL hilang, atau terlalu berat bahkan di tier terendah): kembali ke film 2,5D. */
  onFail: (why: "lost" | "slow") => void;
};

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

declare global {
  interface Window {
    __lakonStage?: StageStats;
  }
}

const LAMP_RGB = [1, 0.56, 0.24] as const;
const LAMP_POWER = 5.2;
const isMobile = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

type SceneProps = Omit<Stage3DProps, "tier" | "locked" | "debug"> & {
  spec: TierSpec;
  rung: Rung;
  governor: Governor;
  onRung: (r: Rung) => void;
  stats: StageStats;
  onStats?: () => void;
};

function Scene({ film, probe, root, spec, rung, governor, onRung, onLive, onFail, stats, onStats }: SceneProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const advance = useThree((s) => s.advance);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const world = useRef<{
    update: (camera: PerspectiveCamera, t: number, dt: number) => void;
    layout: () => void;
    resize: () => void;
  } | null>(null);
  const live = useRef(false);
  const cb = useRef({ onLive, onFail, onRung, onStats, probe });
  useEffect(() => {
    cb.current = { onLive, onFail, onRung, onStats, probe };
  });

  // ---- dunia: dibangun sekali per tier, dibongkar saat tier berganti atau film ditutup ----
  useEffect(() => {
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
      const el = root.current;
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
      const cursor = cb.current.probe();
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
    world.current = { update, layout, resize };
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
    if (root.current) ro.observe(root.current);
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      cb.current.onFail("lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    // ---- loop ----
    let raf = 0;
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
      const c = cb.current.probe();
      const now = performance.now();
      const active = c.to !== c.from || now - pointer.at < 900 || now - born < 1500;
      if (!active && spec.idleEvery > 1 && n % spec.idleEvery !== 0) return;
      const dt = last ? ts - last : 0;
      last = ts;
      const t0 = performance.now();
      advance(ts / 1000);
      work += (performance.now() - t0 - work) * 0.1;
      if (!live.current) {
        live.current = true;
        cb.current.onLive();
      }
      // frame yang sengaja dilewati saat diam bukan data kehalusan
      const measured = active || spec.idleEvery === 1;
      const next = measured && dt > 0 ? governor.sample(dt, ts) : null;
      if (!measured) governor.rest(ts);
      stats.work = work;
      stats.fps = governor.fps();
      stats.capped = governor.capped();
      cb.current.onStats?.();
      if (next) {
        if (next.tier === "static") cb.current.onFail("slow");
        else cb.current.onRung(next);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      world.current = null;
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
    // `stats` dan `governor` tetap sepanjang hidup Stage3D; `rung.tier` berganti → dunia dibangun ulang (lewat `spec`)
  }, [gl, scene, advance, film, root, spec, governor, stats]);

  // ukuran kanvas atau skala resolusi berganti
  useEffect(() => {
    world.current?.resize();
    world.current?.layout();
  }, [size.width, size.height, dpr, rung.scale]);

  // prioritas > 0: R3F tidak menggambar sendiri; rantai post yang menggambar
  useFrame((state, dt) => {
    world.current?.update(state.camera as PerspectiveCamera, state.clock.elapsedTime, dt);
  }, 1);

  return null;
}

export default function Stage3D({ tier, locked, debug, ...rest }: Stage3DProps) {
  const [rung, setRung] = useState<Rung>(() => LADDER[rungOf(tier)]!);
  const [governor] = useState(() => createGovernor(tier, performance.now(), locked));
  const [stats] = useState<StageStats>(() => ({ tier, scale: 1, fps: 0, work: 0, frames: 0, calls: 0, triangles: 0, capped: false, camera: [0, 0, 0], fov: 0, index: 0, moving: false }));
  const wrap = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLPreElement>(null);
  const hudAt = useRef(0);

  useEffect(() => {
    stats.tier = rung.tier;
    stats.scale = rung.scale;
    window.__lakonStage = stats;
    return () => {
      delete window.__lakonStage;
    };
  }, [stats, rung]);

  const onStats = () => {
    const now = performance.now();
    if (now - hudAt.current < 250) return;
    hudAt.current = now;
    const el = wrap.current;
    if (el) el.dataset.frames = String(stats.frames);
    if (hud.current) {
      const tri = stats.triangles >= 1000 ? `${Math.round(stats.triangles / 1000)}k` : String(stats.triangles);
      hud.current.textContent = `${stats.fps ? stats.fps.toFixed(0) : "–"} fps${stats.capped ? " (30 Hz)" : ""} · ${stats.work.toFixed(1)} ms\n${rung.tier} ×${rung.scale} · ${stats.calls} draw · ${tri} tri`;
    }
  };

  if (rung.tier === "static") return null;
  const spec = TIER[rung.tier];
  const dpr = Math.min(window.devicePixelRatio || 1, spec.dpr) * rung.scale;
  return (
    <div ref={wrap} className="fl-canvas" data-tier={rung.tier} data-scale={rung.scale} aria-hidden="true">
      <Canvas
        frameloop="never"
        dpr={dpr}
        flat
        linear
        gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" }}
        camera={{ fov: 36, near: 0.1, far: 3000, position: [0, 1.3, 7.4] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene {...rest} spec={spec} rung={rung} governor={governor} onRung={setRung} stats={stats} onStats={onStats} />
      </Canvas>
      {debug && <pre ref={hud} className="fl-fps" />}
    </div>
  );
}
