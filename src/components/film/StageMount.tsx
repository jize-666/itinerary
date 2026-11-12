"use client";
/**
 * Pintu panggung 3D: memutuskan apakah film memakai kanvas WebGL, lalu memuat bundle-nya secara lazy.
 * Berkas ini ringan dan tidak mengimpor three; `stage3d/Stage3D` (three + R3F) baru diunduh bila dipakai.
 *
 * Tetap film 2,5D (tier Static) bila: Calm atau reduced motion, tanpa WebGL2, renderer perangkat lunak,
 * bundle gagal dimuat, konteks WebGL hilang, atau terlalu berat bahkan di tier terendah.
 *
 * Untuk uji dan pratinjau: `?stage=high|medium|low|static` memaksa tier (pengatur FPS hanya mengukur),
 * `?fps` menampilkan overlay FPS.
 */
import { type ComponentType, type RefObject, useCallback, useEffect, useState } from "react";
import { prefersReducedMotion } from "@/engine/motion/tokens";
import type { Film } from "@/engine/slides/build-slides";
import type { Cursor } from "@/engine/stage/cue";
import { type Caps, guessTier, type Tier } from "@/engine/stage/tier";
import type { Stage3DProps } from "./stage3d/Stage3D";

/** Keadaan panggung untuk Film: "off" = 2,5D, "live" = kanvas memudar masuk, "on" = kanvas penuh (langit 2,5D tak digambar). */
export type StagePhase = "off" | "live" | "on";

type Props = {
  film: Film;
  probe: () => Cursor;
  root: RefObject<HTMLElement | null>;
  calm: boolean;
  onPhase: (phase: StagePhase) => void;
};

const TIERS: readonly Tier[] = ["high", "medium", "low", "static"];
/** Lama kanvas memudar masuk (ms); sama dengan transisi `.fl-canvas` di film.css. */
const FADE_MS = 900;

/** Kemampuan perangkat, dibaca dari konteks WebGL2 sementara yang langsung dilepas. */
export function readCaps(): Caps {
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  let webgl2 = false;
  let renderer = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (gl) {
      webgl2 = true;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    /* tanpa WebGL */
  }
  return { webgl2, renderer, mobile, cores, memory };
}

type Choice = { tier: Tier; locked: boolean; debug: boolean };

function choose(): Choice {
  const q = new URLSearchParams(window.location.search);
  const forced = q.get("stage") as Tier | null;
  const debug = q.has("fps");
  const caps = readCaps();
  if (forced && TIERS.includes(forced)) return { tier: caps.webgl2 ? forced : "static", locked: true, debug };
  return { tier: guessTier(caps), locked: false, debug };
}

export function StageMount({ film, probe, root, calm, onPhase }: Props) {
  const [choice] = useState(choose);
  const [Stage, setStage] = useState<ComponentType<Stage3DProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  // Calm dan reduced motion: tanpa WebGL (reduced motion dibaca sekali; Calm bisa berganti di tengah film)
  const [reduced] = useState(prefersReducedMotion);
  const wanted = choice.tier !== "static" && !calm && !reduced && !failed;

  useEffect(() => {
    if (!wanted || Stage) return;
    let alive = true;
    import("./stage3d/Stage3D").then(
      (m) => alive && setStage(() => m.default),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [wanted, Stage]);

  // kanvas dilepas (Calm, gagal): mulai lagi dari awal bila dipasang kembali
  const shown = wanted && Stage !== null;
  if (!shown && live) setLive(false);
  const onLive = useCallback(() => setLive(true), []);
  const onFail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!shown || !live) {
      onPhase("off");
      return;
    }
    onPhase("live");
    const t = setTimeout(() => onPhase("on"), FADE_MS + 60);
    return () => clearTimeout(t);
  }, [shown, live, onPhase]);

  if (!shown || choice.tier === "static") return null;
  return <Stage film={film} probe={probe} root={root} tier={choice.tier} locked={choice.locked} debug={choice.debug} onLive={onLive} onFail={onFail} />;
}
