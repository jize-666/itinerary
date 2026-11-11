"use client";
import "./home.css";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from "react";
import { HOME } from "@/engine/motion/tokens";
import { BRANCHES, branchPath, KAYON, KAYON_GATE } from "../motion/kayon";
import { useDepth } from "./useDepth";

type Var = CSSProperties & Record<`--${string}`, string | number>;

/** Kedalaman home untuk CSS (satu sumber: HOME di tokens). --k-* = geser lapisan dalam px saat kursor di tepi layar. */
const VARS: Var = {
  "--hm-perspective": `${HOME.perspective}px`,
  "--hm-tilt-x": `${HOME.tiltX}deg`,
  "--hm-tilt-y": `${HOME.tiltY}deg`,
  "--hm-lift": `${HOME.lift}px`,
  "--hm-lift-foil": `${HOME.liftFoil}px`,
  "--hm-lift-scale": 1 - HOME.lift / HOME.perspective,
  "--hm-foil-scale": 1 - HOME.liftFoil / HOME.perspective,
  "--hm-sway": `${HOME.sway}ms`,
  "--k-stars": HOME.layers.stars,
  "--k-far": HOME.layers.far,
  "--k-near": HOME.layers.near,
  "--k-kayon": HOME.layers.kayon,
  "--k-floor": HOME.layers.floor,
  "--k-dust": HOME.layers.dust,
};

/** Punggung Lawu di kejauhan (puncak di tengah) dan perbukitan di depannya; viewBox 0 0 1600 300, alas di cakrawala. */
const RIDGE_FAR = "M0 300V224C120 216 240 198 360 174C470 152 560 112 650 72C700 50 750 35 800 32C850 35 900 52 950 74C1040 114 1130 154 1240 176C1360 200 1480 216 1600 226V300Z";
const RIDGE_NEAR = "M0 300V246C150 214 300 256 462 236C622 216 724 184 902 208C1082 232 1204 192 1382 204C1482 210 1542 230 1600 224V300Z";

/** Debu emas di lapisan terdekat: [kiri %, atas %, ukuran px, lama dtk, tunda dtk]. Tetap, supaya server dan klien sama. */
const DUST: readonly [number, number, number, number, number][] = [
  [8, 22, 3, 13, 0],
  [17, 58, 2, 17, 4],
  [27, 34, 2, 15, 9],
  [38, 72, 3, 19, 2],
  [47, 14, 2, 16, 7],
  [58, 64, 2, 14, 11],
  [66, 28, 3, 18, 5],
  [77, 50, 2, 15, 1],
  [86, 18, 2, 20, 8],
  [93, 68, 3, 16, 3],
];

function Kayon() {
  return (
    <svg viewBox="0 0 120 200" focusable="false">
      <path className="hm-kayon-stick" d="M60 184V200" />
      <path className="hm-kayon-body" d={KAYON} />
      <path className="hm-kayon-rim" d={KAYON} transform="translate(60 100) scale(0.93) translate(-60 -100)" />
      <g className="hm-kayon-tree">
        <path d={KAYON_GATE} />
        <path d="M60 122V20" />
        {BRANCHES.map(([y, reach]) => (
          <path key={y} d={branchPath(y, reach)} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Panggung home (2,5D): langit malam, bintang, punggung Lawu, kabut, lantai pendapa berperspektif, dua kayon
 * penjaga, dan debu emas, masing-masing di kedalaman sendiri. Kursor menggeser tiap lapisan dengan jarak berbeda;
 * di layar sentuh lapisan berayun pelan. Panggung tetap terpasang saat gerbang berganti jadi sambutan, jadi
 * kayon tinggal menyibak (data-open) tanpa adegan diulang.
 */
export function Stage({ mode, unlocking = false, children }: { mode: "gate" | "welcome"; unlocking?: boolean; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useDepth(root);
  // toggle bahasa & suara di layout ikut gaya home selama halaman ini terpasang
  useLayoutEffect(() => {
    document.documentElement.classList.add("home-on");
    return () => document.documentElement.classList.remove("home-on");
  }, []);
  return (
    <main ref={root} className="home" data-mode={mode} data-open={mode === "welcome" || unlocking ? "" : undefined} data-unlocking={unlocking ? "" : undefined} style={VARS}>
      <div className="hm-scene" aria-hidden="true">
        <div className="hm-sky" />
        <div className="hm-l hm-stars" />
        <div className="hm-l hm-ridge" data-depth="far">
          <svg viewBox="0 0 1600 300" preserveAspectRatio="none" focusable="false">
            <path d={RIDGE_FAR} />
          </svg>
        </div>
        <div className="hm-mist" />
        <div className="hm-l hm-ridge" data-depth="near">
          <svg viewBox="0 0 1600 300" preserveAspectRatio="none" focusable="false">
            <path d={RIDGE_NEAR} />
          </svg>
        </div>
        <div className="hm-l hm-floor">
          <div className="hm-floor-plane" />
        </div>
        <div className="hm-glow" />
        <div className="hm-l hm-kayon" data-side="left">
          <div className="hm-kayon-in">
            <Kayon />
          </div>
        </div>
        <div className="hm-l hm-kayon" data-side="right">
          <div className="hm-kayon-in">
            <Kayon />
          </div>
        </div>
        <div className="hm-flare" />
        <div className="hm-l hm-dust">
          {DUST.map(([x, y, size, dur, delay]) => (
            <i key={`${x}-${y}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, "--dur": `${dur}s`, "--delay": `${-delay}s` } as Var} />
          ))}
        </div>
        <div className="hm-vignette" />
      </div>
      <div className="hm-content">{children}</div>
    </main>
  );
}

/**
 * Benda yang tergantung di benang emas (kartu undangan, boarding pass): berayun masuk seperti bandul, lalu miring
 * mengikuti kursor. Di dalamnya ada tiga bidang: alas kartu, isi yang melayang di atasnya, dan cap foil paling depan,
 * jadi saat kartu miring ketiganya bergeser satu terhadap yang lain.
 */
export function Hang({ kind, flip, className, children }: { kind: "invite" | "pass"; flip?: "in" | "out"; className?: string; children: ReactNode }) {
  return (
    <div className={`hm-hang${className ? ` ${className}` : ""}`} data-kind={kind}>
      <div className="hm-swing">
        <span className="hm-thread" aria-hidden="true" />
        <div className="hm-flip" data-flip={flip}>
          <div className="hm-card">
            <span className="hm-card-shadow" aria-hidden="true" />
            <span className="hm-card-back" aria-hidden="true" />
            <span className="hm-card-base" aria-hidden="true">
              <i className="hm-sheen" />
            </span>
            <span className="hm-eyelet" aria-hidden="true" />
            <div className="hm-card-body">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
