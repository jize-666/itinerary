export type DioLocation = "pendhapa" | "pasar" | "laweyan";
export type Quality = "high" | "medium" | "low";
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
  const quality: Quality | undefined = q === "high" || q === "medium" || q === "low" ? q : undefined;
  return { focus, quality, autoTour: p.get("tur") === "1", showFps: p.has("fps") };
}
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
/** Use the high-tier density as a baseline so quality also scales on 1× desktop screens. */
export function renderDpr(tier: Quality, nativeDpr: number) {
  const base = Math.min(1.5, Math.max(0.5, nativeDpr || 1));
  const fraction = { high: 1, medium: 0.82, low: 0.6 }[tier];
  return base * fraction;
}
export const tierStep = (q: Quality): Quality => (q === "high" ? "medium" : "low");
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
