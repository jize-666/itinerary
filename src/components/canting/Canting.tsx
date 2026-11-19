"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Color,
  Mesh,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { kawungUkel } from "@/engine/canting/motif";
import { traceMotif } from "@/engine/canting/trace";
import { CLOTH_TILT, fitDistance } from "@/engine/canting/frame";
import { tahapState, type CantingQuality, type Tahap } from "@/engine/canting/options";
import type { BatikState } from "@/engine/canting/state";
import { startLook, stepLook } from "@/components/film/look";
import { Icon } from "@/components/diorama/Icons";
import { Batik } from "./batik";
import { surfaceMaterial } from "./surface";
import "./canting.css";

export type CantingProps = {
  lang: "en" | "id";
  calm: boolean;
  quality?: CantingQuality;
  tahap?: Tahap;
  draw?: number;
  showFps?: boolean;
};

declare global {
  interface Window {
    __lakonCanting?: { frames: number; state: BatikState; tier: CantingQuality };
  }
}

const ASPECT = 1.6;
const FOV = 30;
const MARGIN = 0.07;

const text = {
  en: { kicker: "Canting", title: "Kawung, in wax and indigo", back: "Back" },
  id: { kicker: "Canting", title: "Kawung, malam dan nila", back: "Kembali" },
} as const;

export function Canting({ lang, calm, quality, tahap, draw, showFps = false }: CantingProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const state = tahapState(tahap, draw);
  const stateRef = useRef(state);
  stateRef.current = state;
  const tier: CantingQuality = quality ?? "high";

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === "low" ? 1 : tier === "medium" ? 1.5 : 2));
    renderer.toneMapping = NoToneMapping;
    const scene = new Scene();
    scene.background = new Color("#0b0a12");
    const trace = traceMotif(kawungUkel({ aspect: ASPECT }));
    const batik = new Batik(renderer, trace, ASPECT, tier);
    const geometry = new PlaneGeometry(ASPECT, 1, 1, 1);
    const material: ShaderMaterial = surfaceMaterial({
      wax: batik.wax.texture,
      dye: batik.dye.texture,
      width: batik.wax.width,
      height: batik.wax.height,
      aspect: ASPECT,
    });
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = -CLOTH_TILT;
    scene.add(mesh);
    const camera = new PerspectiveCamera(FOV, 1, 0.05, 50);
    let distance = 2;
    const resize = () => {
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      distance = fitDistance(FOV, w / h, ASPECT, 1, MARGIN);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    const release = calm ? () => {} : startLook();

    const info = { frames: 0, state: stateRef.current, tier };
    window.__lakonCanting = info;
    let raf = 0;
    let fpsFrames = 0;
    let fpsStart = performance.now();
    let first = true;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const s = stateRef.current;
      batik.update(s);
      material.uniforms.uKerok!.value = s.kerok;
      material.uniforms.uLorod!.value = s.lorod;
      const look = calm ? { x: 0, y: 0 } : stepLook();
      camera.position.set(look.x * 0.06 * distance, look.y * 0.04 * distance, distance);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      info.frames++;
      info.state = s;
      if (first) {
        first = false;
        setReady(true);
      }
      fpsFrames++;
      const now = performance.now();
      if (now - fpsStart >= 500) {
        if (fpsRef.current) fpsRef.current.textContent = Math.round((fpsFrames * 1000) / (now - fpsStart)) + " fps";
        fpsFrames = 0;
        fpsStart = now;
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      release();
      batik.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (window.__lakonCanting === info) delete window.__lakonCanting;
      setReady(false);
    };
  }, [tier, calm]);

  useEffect(() => {
    const before = document.title;
    document.title = "Canting · A Three-Day Lakon";
    return () => {
      document.title = before;
    };
  }, []);

  const goBack = () => {
    let local = false;
    try {
      local = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (local && history.length > 1) history.back();
    else router.push("/film/#day-3");
  };
  const t = text[lang];
  return (
    <main
      ref={rootRef}
      className="cnt-root"
      data-ready={ready ? "true" : "false"}
      data-tahap={tahap ?? "lorod"}
      data-draw={state.draw.toFixed(3)}
    >
      <canvas ref={canvasRef} className="cnt-canvas" role="img" aria-label={t.title} />
      <header className="cnt-top">
        <button type="button" className="pb pb--tonal pb--sm cnt-back" data-sfx="ui-tok" onClick={goBack}>
          <span className="pb-face">
            <Icon name="back" size={18} />
            <span>{t.back}</span>
          </span>
        </button>
        <div className="cnt-intro">
          <span className="cnt-kicker">{t.kicker}</span>
          <h1 className="cnt-title">{t.title}</h1>
        </div>
      </header>
      {showFps && <span ref={fpsRef} className="cnt-fps" />}
    </main>
  );
}
