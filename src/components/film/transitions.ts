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
import { SKY_LAYERS, type SkyKey, skyPath, type SunState } from "@/engine/slides/sky";
import type { Key, Track } from "@/engine/slides/timeline";

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

/** Letak matahari di bingkainya, dalam % ukuran bingkai (lihat `.fl-sunbox`). */
export const sunPlace = (sun: SunState) => ({ x: sun.u * 100, y: sun.v * 100 });

/**
 * Lintasan langit: kadar tiap lapisan warna + letak, ukuran, dan rona matahari, dipetakan ke jendela [s, e]
 * dari transisi. Hanya elemen yang nilainya berubah yang diberi lintasan.
 * Calm: tanpa gerak; matahari memudar, pindah tempat saat tak tampak, lalu muncul lagi.
 */
function skyTracks(root: HTMLElement, keys: readonly SkyKey[], [s, e]: readonly [number, number], calm: boolean): Track[] {
  const first = keys[0]?.[1];
  const last = keys[keys.length - 1]?.[1];
  if (!first || !last || keys.length < 2) return [];
  const tracks: Track[] = [];
  const at = (p: number) => s + (e - s) * p;
  const line = (pick: (k: SkyKey[1]) => number): Key[] => keys.map(([p, state]) => [at(p), pick(state)] as const);
  const changes = (keysOf: readonly Key[]) => keysOf.some(([, v]) => v !== keysOf[0]![1]);
  /** Calm: nilai asal ditahan sampai tengah, lalu nilai tujuan (pergantiannya terjadi saat matahari tak tampak). */
  const swap = (from: number, to: number): Key[] => [[at(0), from], [at(0.5), from], [at(0.501), to], [at(1), to]];

  for (const name of SKY_LAYERS) {
    const opacity = line((k) => k[name]);
    const el = changes(opacity) ? skyOf(root, name) : null;
    if (el) tracks.push({ el, opacity });
  }

  const sun = find(root, ".fl-sun");
  const warm = find(root, ".fl-sun-warm");
  const x = line((k) => sunPlace(k.sun).x);
  const y = line((k) => sunPlace(k.sun).y);
  const scale = line((k) => k.sun.scale);
  const opacity = line((k) => k.sun.opacity);
  const glow = line((k) => k.sun.warm);
  if (sun && [x, y, scale, opacity].some(changes)) {
    if (calm) {
      const [a, b] = [first.sun, last.sun];
      const dip = changes(x) || changes(y) || changes(scale);
      tracks.push({
        el: sun,
        unit: "%",
        x: swap(sunPlace(a).x, sunPlace(b).x),
        y: swap(sunPlace(a).y, sunPlace(b).y),
        scale: swap(a.scale, b.scale),
        opacity: dip ? [[at(0), a.opacity], [at(0.5), 0], [at(0.501), 0], [at(1), b.opacity]] : [[at(0), a.opacity], [at(1), b.opacity]],
      });
    } else tracks.push({ el: sun, unit: "%", x, y, scale, opacity });
  }
  if (warm && changes(glow)) tracks.push({ el: warm, opacity: calm ? swap(first.sun.warm, last.sun.warm) : glow });
  return tracks;
}

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

  // ---- langit & matahari: mengikuti jam slide (gallery) atau crossfade antar langit tetap ----
  const window: Record<Plan["kind"], readonly [number, number]> = { slide: [0.08, 0.86], inner: [0, 1], wipe: [0.44, 0.56], fade: [0, 1] };
  tracks.push(...skyTracks(root, skyPath(a, b), window[kind], kind === "fade"));

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
  if (out) tracks.push({ el: out, unit: "%", opacity: [[0, 1], [0.4, 0]], y: [[0, 0], [0.5, -7 * dir]] });
  if (inn) tracks.push({ el: inn, unit: "%", opacity: [[0.24, 0], [0.72, 1]], y: [[0.24, 10 * dir], [1, 0]] });
  return { kind, tracks, dur: SLIDE.dur, ease: "power3InOut", textAt: SLIDE.textIn };
}
