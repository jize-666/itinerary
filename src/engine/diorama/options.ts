export type DioLocation = "pendhapa" | "pasar" | "laweyan";
import { parseQuality, pixelRatio, type Quality } from "@/engine/motion/quality";
export type { Quality };
export type TourState = "idle" | "playing" | "paused" | "done";

export type DioramaProps = {
  lang: "en" | "id";
  calm: boolean;
  focus?: DioLocation;
  quality?: Quality;
  onSlow?: (p95ms: number) => void;
  onLocation?: (id: DioLocation | null) => void;
  onTour?: (state: TourState) => void;
};

export function readOptions(search: string) {
  const p = new URLSearchParams(search);
  const place = p.get("lokasi"),
    q = p.get("q");
  const focus: DioLocation | undefined =
    place === "pendhapa" || place === "pasar" || place === "laweyan" ? place : undefined;
  const quality: Quality | undefined = parseQuality(q);
  return { focus, quality, autoTour: p.get("tur") === "1", showFps: p.has("fps") };
}
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
/** Rasio piksel kanvas: High = kerapatan layar (maks 2), Ultra = 1,5–2,5. Tidak pernah diperkecil. */
export const renderDpr = (tier: Quality, nativeDpr: number) => pixelRatio(tier, nativeDpr);
/** Satu-satunya langkah turun: Ultra ke High. */
export const tierStep = (q: Quality): Quality => (q === "ultra" ? "high" : q);
export function percentile(values: readonly number[], q = 0.95) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)]!;
}
export function photoSize(w: number, h: number): [number, number] {
  return w >= h
    ? [1920, Math.max(1, Math.round((1920 * h) / w))]
    : [Math.max(1, Math.round((1920 * w) / h)), 1920];
}
