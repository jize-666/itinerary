/**
 * Resep transisi antar slide: memetakan (slide asal, slide tujuan) ke lintasan opacity/transform per elemen.
 * Hanya `opacity` dan `transform` yang digerakkan (aturan performa). Empat rupa:
 *  - slide: lapisan lama memudar naik, lapisan baru masuk dari arah perjalanan (vertikal)
 *  - inner: di dalam gallery, rel kartu bergeser satu kartu (menyamping)
 *  - wipe : antar bab / lompatan: bayangan kayon menyapu layar, isi berganti di baliknya
 *  - fade : Calm mode, crossfade tanpa gerak
 */
import { type EaseName, INPUT, SLIDE } from "@/engine/motion/tokens";
import { type Film, transitionKind } from "@/engine/slides/build-slides";
import type { Track } from "@/engine/slides/timeline";

export type Plan = {
  kind: "slide" | "inner" | "wipe" | "fade";
  tracks: Track[];
  dur: number;
  ease: EaseName;
  /** Saat teks slide tujuan mulai masuk (ms sejak transisi penuh dimulai). */
  textAt: number;
};

const find = (root: ParentNode, selector: string) => root.querySelector<HTMLElement>(selector);
const layerOf = (root: HTMLElement, scene: string) => find(root, `.fl-layer[data-scene="${CSS.escape(scene)}"]`);
const skyOf = (root: HTMLElement, sky: string) => find(root, `.fl-sky[data-sky="${CSS.escape(sky)}"]`);

/** Posisi slide di dalam scene-nya (kartu ke berapa di gallery). */
export function stepInScene(film: Film, index: number): number {
  const scene = film.slides[index]?.scene;
  let first = index;
  while (first > 0 && film.slides[first - 1]?.scene === scene) first--;
  return index - first;
}

/** Jarak antar kartu gallery dalam px (lebar kartu + celah). */
export function galleryStep(layer: Element | null): number {
  const cards = layer?.querySelectorAll<HTMLElement>(".gal-card");
  if (!cards || cards.length === 0) return 0;
  if (cards.length > 1) return cards[1]!.offsetLeft - cards[0]!.offsetLeft;
  return cards[0]!.offsetWidth;
}

/** Jarak jari untuk satu slide penuh pada transisi dari `from` ke `to`. */
export function scrubSpan(root: HTMLElement, film: Film, from: number, to: number): number {
  const a = film.slides[from];
  const b = film.slides[to];
  if (a && b && a.scene === b.scene) return galleryStep(layerOf(root, a.scene)) || root.clientWidth * 0.8;
  return root.clientHeight * INPUT.scrubSpan;
}

export function planTransition(root: HTMLElement, film: Film, from: number, to: number, calm: boolean): Plan {
  const a = film.slides[from];
  const b = film.slides[to];
  const tracks: Track[] = [];
  if (!a || !b) return { kind: "fade", tracks, dur: 0, ease: "linear", textAt: 0 };
  const dir = to > from ? 1 : -1;
  const base = transitionKind(film, from, to);
  const kind: Plan["kind"] = calm ? "fade" : base;
  const out = layerOf(root, a.scene);
  const inn = layerOf(root, b.scene);

  // ---- langit: yang baru memudar masuk di atas yang lama ----
  if (a.sky !== b.sky) {
    const sky = skyOf(root, b.sky);
    const window: Record<Plan["kind"], [number, number]> = { slide: [0.08, 0.86], inner: [0, 1], wipe: [0.44, 0.56], fade: [0, 1] };
    const [s, e] = window[kind];
    if (sky) tracks.push({ el: sky, opacity: [[s, 0], [e, 1]] });
  }

  if (base === "inner" && out) {
    // rel kartu gallery bergeser dari kartu i ke kartu j
    const track = find(out, ".gal-track");
    const cards = out.querySelectorAll<HTMLElement>(".gal-card");
    const step = galleryStep(out);
    const i = stepInScene(film, from);
    const j = stepInScene(film, to);
    if (track) {
      tracks.push(
        kind === "fade"
          ? { el: track, x: [[0, -i * step], [0.5, -i * step], [0.5, -j * step], [1, -j * step]], opacity: [[0, 1], [0.5, 0], [1, 1]] }
          : { el: track, x: [[0, -i * step], [1, -j * step]] },
      );
    }
    const dim = (el: HTMLElement | undefined, lit: boolean) => {
      if (!el) return;
      if (kind === "fade") tracks.push({ el, opacity: lit ? [[0, 0.42], [0.5, 0.42], [0.5, 1], [1, 1]] : [[0, 1], [0.5, 1], [0.5, 0.42], [1, 0.42]], scale: lit ? [[0, 0.93], [0.5, 0.93], [0.5, 1]] : [[0, 1], [0.5, 1], [0.5, 0.93]] });
      else tracks.push({ el, opacity: lit ? [[0, 0.42], [1, 1]] : [[0, 1], [1, 0.42]], scale: lit ? [[0, 0.93], [1, 1]] : [[0, 1], [1, 0.93]] });
    };
    dim(cards[i], false);
    dim(cards[j], true);
    return { kind, tracks, dur: kind === "fade" ? SLIDE.calmDur : Math.round(SLIDE.dur * 0.82), ease: kind === "fade" ? "sineInOut" : "power3InOut", textAt: kind === "fade" ? 0 : Math.round(SLIDE.textIn * 0.7) };
  }

  if (kind === "fade") {
    if (out) tracks.push({ el: out, opacity: [[0, 1], [0.5, 0]] });
    if (inn) tracks.push({ el: inn, opacity: [[0.5, 0], [1, 1]] });
    return { kind, tracks, dur: SLIDE.calmDur, ease: "sineInOut", textAt: 0 };
  }

  if (kind === "wipe") {
    // bayangan kayon menyapu searah perjalanan; isi berganti saat intinya menutup layar
    const wipe = find(root, ".fl-wipe");
    if (wipe) tracks.push({ el: wipe, unit: "%", x: [[0, -66 * dir], [1, 66 * dir]], opacity: [[0, 0], [0.03, 1], [0.97, 1], [1, 0]] });
    if (out) tracks.push({ el: out, opacity: [[0, 1], [0.42, 1], [0.5, 0]] });
    if (inn) tracks.push({ el: inn, opacity: [[0.5, 0], [0.58, 1]] });
    return { kind, tracks, dur: SLIDE.wipeDur, ease: "sineInOut", textAt: Math.round(SLIDE.wipeDur * 0.52) };
  }

  // slide: lapisan lama memudar sambil bergeser tipis; lapisan baru masuk dari arah perjalanan
  if (out) tracks.push({ el: out, unit: "%", opacity: [[0, 1], [0.34, 0]], y: [[0, 0], [0.5, -7 * dir]] });
  if (inn) tracks.push({ el: inn, unit: "%", opacity: [[0.3, 0], [0.74, 1]], y: [[0.3, 10 * dir], [1, 0]] });
  return { kind, tracks, dur: SLIDE.dur, ease: "power3InOut", textAt: SLIDE.textIn };
}
