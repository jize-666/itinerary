/**
 * Resep transisi antar slide: memetakan (slide asal, slide tujuan) ke lintasan opacity/transform per elemen.
 * Hanya `opacity` dan `transform` yang digerakkan (aturan performa). Empat rupa:
 *  - slide: lapisan lama memudar naik, lapisan baru masuk dari arah perjalanan (vertikal)
 *  - inner: di dalam gallery, rel kartu bergeser satu kartu sambil menembus gerbang dimensi (maju: kartu lama
 *           menukik melewati kamera, yang baru naik dari kedalaman; mundur kebalikannya)
 *  - wipe : antar bab / lompatan: bayangan kayon menyapu layar, isi berganti di baliknya
 *  - fade : Calm mode, crossfade tanpa gerak
 */
import { DEPTH, type EaseName, INPUT, SLIDE } from "@/engine/motion/tokens";
import { VIEW } from "@/engine/motion/view";
import { type Film, galleryDrift, transitionKind } from "@/engine/slides/build-slides";
import { SKY_LAYERS, type SkyKey, skyPath, type SunState } from "@/engine/slides/sky";
import type { Key, Track } from "@/engine/slides/timeline";
import { SKY_WINDOW } from "@/engine/stage/cue";

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

/** Dua lapis bukit: seberapa jauh masing-masing bergeser selama satu hari di gallery (% lebarnya sendiri). */
export const HILLS = [
  ["far", DEPTH.hillsFar],
  ["near", DEPTH.hillsNear],
] as const;
/** Geseran bukit pada letak `drift` di gallery (0–1). Makin dekat lapisannya, makin jauh gesernya: parallax. */
export const hillShift = (span: number, drift: number) => -span * drift;

/**
 * Lintasan langit: kadar tiap lapisan warna + letak, ukuran, dan rona matahari + bukit di kaki langit, dipetakan
 * ke jendela [s, e] dari transisi. Hanya elemen yang nilainya berubah yang diberi lintasan.
 * `drift` = letak asal dan tujuan di gallery (0–1): bukit jauh dan dekat bergeser dengan kecepatan berbeda.
 * Calm: tanpa gerak; matahari memudar, pindah tempat saat tak tampak, lalu muncul lagi; bukit tidak bergeser.
 */
function skyTracks(root: HTMLElement, keys: readonly SkyKey[], [s, e]: readonly [number, number], calm: boolean, drift: readonly [number, number]): Track[] {
  const first = keys[0]?.[1];
  const last = keys[keys.length - 1]?.[1];
  if (!first || !last) return [];
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

  const ground = line((k) => k.ground);
  const slides = !calm && drift[0] !== drift[1];
  for (const [depth, span] of HILLS) {
    const shifts = slides && span > 0;
    const el = shifts || changes(ground) ? find(root, `.fl-hills[data-depth="${depth}"]`) : null;
    if (!el) continue;
    const track: Track = { el, unit: "%" };
    if (shifts) track.x = [[at(0), hillShift(span, drift[0])], [at(1), hillShift(span, drift[1])]];
    if (changes(ground)) track.opacity = ground;
    tracks.push(track);
  }
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
  tracks.push(...skyTracks(root, skyPath(a, b), SKY_WINDOW[kind], kind === "fade", [galleryDrift(a), galleryDrift(b)]));

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
    // Kartu tetangga berada lebih jauh dan berpaling menjauh (seperti panel di drum yang berputar). Selama geseran
    // kartu menembus gerbang dimensi (permintaan host 17 Nov, PORTAL di view.ts; kamera 3D ikut menukik):
    //  - maju : kartu lama menukik ke arah kamera dan larut; kartu baru mundur dulu ke kedalaman lalu naik ke
    //           tempatnya;
    //  - mundur: kartu lama tenggelam ke kedalaman; kartu yang kembali datang dari belakang kamera.
    // Keadaan akhir sama dengan sebelumnya (tetangga: redup, mundur, berpaling). `turn` = paling kartu di sisi itu.
    const side = j > i ? 1 : -1;
    const [oldTurn, newTurn] = [-side * DEPTH.cardTurn, side * DEPTH.cardTurn];
    const [old, next] = [cards[i], cards[j]];
    if (kind === "fade") {
      // Calm: datar, tanpa kedalaman (kartu tetangga hanya mengecil), berganti di tengah crossfade
      if (old) tracks.push({ el: old, opacity: [[0, 1], [0.5, 1], [0.5, 0.42], [1, 0.42]], scale: [[0, 1], [0.5, 1], [0.5, 0.93]] });
      if (next) tracks.push({ el: next, opacity: [[0, 0.42], [0.5, 0.42], [0.5, 1], [1, 1]], scale: [[0, 0.93], [0.5, 0.93], [0.5, 1]] });
    } else if (side > 0) {
      if (old)
        tracks.push({
          el: old,
          opacity: [[0, 1], [0.24, 0.86], [0.5, 0], [0.8, 0], [1, 0.42]],
          z: [[0, 0], [0.5, DEPTH.portalNear], [0.51, DEPTH.cardZ - 160], [1, DEPTH.cardZ]],
          rotateY: [[0, 0], [0.5, 0], [0.51, oldTurn * 1.3], [1, oldTurn]],
        });
      if (next)
        tracks.push({
          el: next,
          opacity: [[0, 0.42], [0.3, 0.14], [0.5, 0.26], [0.9, 1], [1, 1]],
          z: [[0, DEPTH.cardZ], [0.34, DEPTH.portalFar], [1, 0]],
          rotateY: [[0, newTurn], [0.34, newTurn * 0.5], [1, 0]],
        });
    } else {
      if (old)
        tracks.push({
          el: old,
          opacity: [[0, 1], [0.45, 0], [0.8, 0], [1, 0.42]],
          z: [[0, 0], [0.48, DEPTH.portalFar], [0.49, DEPTH.cardZ - 160], [1, DEPTH.cardZ]],
          rotateY: [[0, 0], [0.48, 0], [0.49, oldTurn * 1.3], [1, oldTurn]],
        });
      if (next)
        tracks.push({
          el: next,
          opacity: [[0, 0.42], [0.28, 0], [0.4, 0], [0.86, 1], [1, 1]],
          z: [[0, DEPTH.cardZ], [0.3, DEPTH.cardZ], [0.31, DEPTH.portalNear], [1, 0]],
          rotateY: [[0, newTurn], [0.3, newTurn], [0.31, 0], [1, 0]],
        });
    }
    // laju lembut (sine) dan sedikit lebih panjang: gerbang terasa mengalir, tidak menyentak (host: "bikin lebih smooth")
    return { kind, tracks, dur: kind === "fade" ? SLIDE.calmDur : Math.round(SLIDE.dur * 1.15), ease: "sineInOut", textAt: kind === "fade" ? 0 : Math.round(SLIDE.textIn * 0.7) };
  }

  if (kind === "fade") {
    if (out) tracks.push({ el: out, opacity: [[0, 1], [0.5, 0]] });
    if (inn) tracks.push({ el: inn, opacity: [[0.5, 0], [1, 1]] });
    return { kind, tracks, dur: SLIDE.calmDur, ease: "sineInOut", textAt: 0 };
  }

  if (kind === "wipe") {
    // bayangan kayon menyapu searah perjalanan; isi berganti saat intinya menutup layar. Juga saat panggung 3D
    // hidup: keputusan host 13 Nov, gunungan 3D hanya untuk pembuka dan penutup film ("sapuanya pakai yang lama").
    const wipe = find(root, ".fl-wipe");
    if (wipe) tracks.push({ el: wipe, unit: "%", x: [[0, -66 * dir], [1, 66 * dir]], opacity: [[0, 0], [0.03, 1], [0.97, 1], [1, 0]] });
    // kedalaman ikut gulir di balik bayangan kayon: yang lama terdorong ke depan, yang baru muncul dari kedalaman
    const push = VIEW.layerPush * dir;
    if (out) tracks.push({ el: out, opacity: [[0, 1], [0.42, 1], [0.5, 0]], scale: [[0, 1], [0.5, 1 + push]] });
    if (inn) tracks.push({ el: inn, opacity: [[0.5, 0], [0.58, 1]], scale: [[0.5, 1 - push], [0.9, 1]] });
    return { kind, tracks, dur: SLIDE.wipeDur, ease: "sineInOut", textAt: Math.round(SLIDE.wipeDur * 0.52) };
  }

  // slide: lapisan lama memudar sambil bergeser tipis; lapisan baru masuk dari arah perjalanan. Kedalaman ikut gulir
  // (aturan host 13 Nov): maju = yang lama membesar seperti ditembus kamera dan yang baru tumbuh dari kedalaman;
  // mundur kebalikannya. Mengikuti kemajuan transisi, jadi di HP mengikuti jari.
  const push = VIEW.layerPush * dir;
  if (out) tracks.push({ el: out, unit: "%", opacity: [[0, 1], [0.4, 0]], y: [[0, 0], [0.5, -7 * dir]], scale: [[0, 1], [0.5, 1 + push]] });
  if (inn) tracks.push({ el: inn, unit: "%", opacity: [[0.24, 0], [0.72, 1]], y: [[0.24, 10 * dir], [1, 0]], scale: [[0.24, 1 - push], [1, 1]] });
  return { kind, tracks, dur: SLIDE.dur, ease: "power3InOut", textAt: SLIDE.textIn };
}
