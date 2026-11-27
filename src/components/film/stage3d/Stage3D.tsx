"use client";
/**
 * Panggung 3D film (F2): satu kanvas React Three Fiber di belakang lapisan teks DOM. Berkas ini dan semua yang
 * diimpornya (three, R3F) hanya dimuat lewat `import()` dari StageMount, jadi gerbang dan Today tidak memuatnya.
 *
 * React hanya memasang kanvas dan mengganti tier; dunia, loop, dan gambar per frame ada di runtime.ts.
 * Loop dijalankan sendiri (frameloop "never" + `advance`), bukan oleh R3F.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { PerspectiveCamera } from "three";
import type { Film } from "@/engine/slides/build-slides";
import type { Cursor } from "@/engine/stage/cue";
import type { PassContent } from "./pass3d/content";
import { createGovernor, dprFor, type Governor, type Tier, TIER, type TierSpec } from "@/engine/stage/tier";
import { createRuntime, type Runtime, type StageHooks, type StageStats } from "./runtime";

export type { StageStats };

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
  /** Isi tiket 3D (Tugas 12b); null = tidak ada tiket 3D. */
  pass?: PassContent | null;
  /** Frame pertama sudah tergambar. */
  onLive: () => void;
  /** Tidak bisa lanjut (konteks WebGL hilang, atau terlalu berat bahkan di tier terendah): kembali ke film 2,5D. */
  onFail: (why: "lost") => void;
};

declare global {
  interface Window {
    __lakonStage?: StageStats;
  }
}

type SceneProps = {
  film: Film;
  root: RefObject<HTMLElement | null>;
  spec: TierSpec;
  governor: Governor;
  stats: RefObject<StageStats>;
  hooks: RefObject<StageHooks>;
};

function Scene({ film, root, spec, governor, stats, hooks }: SceneProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const advance = useThree((s) => s.advance);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const runtime = useRef<Runtime | null>(null);

  // dunia dibangun sekali per tier, dibongkar saat tier berganti atau film ditutup
  useEffect(() => {
    const rt = createRuntime({ gl, scene, advance, film, root: () => root.current, spec, governor, stats: stats.current, hooks: () => hooks.current });
    runtime.current = rt;
    return () => {
      runtime.current = null;
      rt.dispose();
    };
  }, [gl, scene, advance, film, root, spec, governor, stats, hooks]);

  // ukuran kanvas atau skala resolusi berganti
  useEffect(() => {
    runtime.current?.resize();
    runtime.current?.layout();
  }, [size.width, size.height, dpr]);

  // prioritas > 0: R3F tidak menggambar sendiri; rantai post yang menggambar
  useFrame((state, dt) => {
    runtime.current?.update(state.camera as PerspectiveCamera, state.clock.elapsedTime, dt);
  }, 1);

  return null;
}

const blankStats = (tier: Tier): StageStats => ({ tier, fps: 0, pace: 0, work: 0, frames: 0, calls: 0, triangles: 0, capped: false, camera: [0, 0, 0], fov: 0, index: 0, moving: false, strikes: 0, kick: 0, orbit: 0, kayon: false, bloom: "", gate: { end: null, planted: 0, face: "agung" }, time: 0, dof: { amount: 0, focus: 0, drawn: false }, portal: 0, grade: { phase: "gate", sat: 1 }, particles: { lamp: 1, dew: 0, motes: 0, fireflies: 0 } });

export default function Stage3D({ film, probe, root, tier, locked, debug, pass = null, onLive, onFail }: Stage3DProps) {
  const [current, setCurrent] = useState<Tier>(tier);
  const [governor] = useState(() => createGovernor(tier, performance.now(), locked));
  const stats = useRef<StageStats>(blankStats(tier));
  const wrap = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLPreElement>(null);
  const hudAt = useRef(0);
  const hooks = useRef<StageHooks>({ probe, onLive, onFail, onTier: setCurrent });

  useEffect(() => {
    const s = stats.current;
    s.tier = current;
    window.__lakonStage = s;
    hooks.current = {
      probe,
      onLive,
      onFail,
      onTier: setCurrent,
      onStats() {
        const now = performance.now();
        if (now - hudAt.current < 250) return;
        hudAt.current = now;
        if (wrap.current) wrap.current.dataset.frames = String(s.frames);
        if (hud.current) {
          const tri = s.triangles >= 1000 ? `${Math.round(s.triangles / 1000)}k` : String(s.triangles);
          // baris 1: laju layar sekarang, rata-rata 3 dtk dari pengatur tier (bila sudah ada), waktu CPU per frame
          const avg = s.fps ? ` · avg ${s.fps.toFixed(0)}` : "";
          hud.current.textContent = `${s.pace ? s.pace.toFixed(0) : "–"} fps${avg}${s.capped ? " (30 Hz)" : ""} · ${s.work.toFixed(1)} ms\n${governor.fell() ? `${s.tier} (turun dari ultra: ${governor.fell()} fps)` : s.tier} · ${s.calls} draw · ${tri} tri`;
        }
      },
    };
    return () => {
      delete window.__lakonStage;
    };
  }, [current, probe, onLive, onFail, governor]);

  // isi tiket 3D dibaca panggung tiap frame (tidak membangun ulang dunia saat bahasa berganti)
  useEffect(() => {
    hooks.current.pass = () => pass;
  }, [pass, current, probe, onLive, onFail, governor]);

  if (current === "static") return null;
  const spec = TIER[current];
  const dpr = dprFor(spec, window.devicePixelRatio || 1);
  return (
    <div ref={wrap} className="fl-canvas" data-tier={current} aria-hidden="true">
      <Canvas
        frameloop="never"
        dpr={dpr}
        flat
        linear
        gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" }}
        camera={{ fov: 36, near: 0.1, far: 3000, position: [0, 1.3, 7.4] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene film={film} root={root} spec={spec} governor={governor} stats={stats} hooks={hooks} />
      </Canvas>
      {debug && <pre ref={hud} className="fl-fps" />}
    </div>
  );
}
