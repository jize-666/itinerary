/**
 * Sesi Clawd di film, dipakai bersama film 3D (`stage3d/guide.ts`) dan film 2,5D (`components/film/clawd-flat.ts`):
 * otak (`engine/mascot/clawd.ts`), pemandu (`engine/mascot/guide.ts`, petunjuk yang sudah tuntas diingat per
 * perangkat), bahasa, dan tempat di samping yang dipilih dari tata letak slide. Yang berbeda antara kedua film hanya
 * cara menggambar Clawd dan cara menaruhnya di layar.
 *
 * Suara Clawd (`engine/mascot/voice.ts`) juga diputar di sini: klip kalimat dimulai saat kalimatnya muncul, dan
 * dihentikan saat kalimat dilewati, dipotong reaksi, atau bahasa diganti. Ikut sakelar suara situs (`audioStatus`).
 */
import { audioStatus } from "@/engine/audio/status";
import { langStore } from "@/engine/i18n/lang";
import { Clawd, type ClawdFrame } from "@/engine/mascot/clawd";
import { bestSide, type Block, BLOCK_WEIGHT, type BubbleSide, Guide, type GuideContext, readSeen, type Spot, spotAt, stillApplies, writeSeen } from "@/engine/mascot/guide";
import { INTRO, TIPS, type TipId } from "@/engine/mascot/lines";
import { clipMs, clipUrl } from "@/engine/mascot/voice";

/** Tinggi badan Clawd di layar (bagian sisi layar terpendek). */
export const BODY_FRAC = { wide: 0.15, tall: 0.19 } as const;
/** Perkiraan ukuran gelembung dua baris (px CSS) untuk memilih tempat. */
const BUBBLE_EST = { wide: { w: 332, h: 84 }, tall: { w: 292, h: 80 } } as const;
/** Tata letak slide diukur sekian detik sesudah tiba (teks dan kartu sudah selesai muncul). */
const SETTLE = 0.45;
const TIP_IDS = Object.keys(TIPS) as TipId[];
/** Suara kalimat hanya dimulai bila frame pertamanya datang paling lambat sekian ms sesudah kalimat muncul. */
const VOICE_START = 400;

/** Kotak isi slide dan chrome yang sebaiknya tidak ditutupi (px, relatif terhadap akar film). */
export function blocksOf(el: HTMLElement): Block[] {
  const box = el.getBoundingClientRect();
  const out: Block[] = [];
  const add = (selector: string, weight: number) =>
    el.querySelectorAll<HTMLElement>(selector).forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, weight });
    });
  add(".fl-layer[data-pos='cur'] :is(button, a[href], [role='button']), .fl-chrome :is(button, a[href])", BLOCK_WEIGHT.control);
  add(".fl-layer[data-pos='cur'] :is(h1, h2, h3, p, li)", BLOCK_WEIGHT.text);
  add(".fl-layer[data-pos='cur'] .gal-card", BLOCK_WEIGHT.card);
  // kain buatan tamu di epilog (Tugas 11.4): seberat teks, supaya Clawd berdiri di sampingnya, bukan di atasnya
  add(".fl-layer[data-pos='cur'] .fs-cloth-sheet", BLOCK_WEIGHT.text);
  return out;
}

const storage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

/** Keadaan film yang dibaca dari atribut data akar film (`data-kind`, `data-beat`, `data-gate`, `data-sheet`). */
export function contextOf(el: HTMLElement, moving: boolean, flat: boolean): GuideContext {
  return {
    mountainDawn: el.dataset.theme === "lawu" && el.dataset.slide?.endsWith("/kemuning-sunrise"), kind: el.dataset.kind as GuideContext["kind"], beat: el.dataset.beat === "out", gate: el.dataset.gate ?? "off", moving, sheet: "sheet" in el.dataset, flat };
}

export type SessionFrame = Readonly<{
  clawd: ClawdFrame;
  /** Tempat Clawd: di samping, dekat gong, atau dekat gunungan. */
  spot: Spot;
  /** Tempat di samping yang paling lapang (NDC) dan letak gelembungnya; null sebelum diukur. */
  side: readonly [number, number, BubbleSide] | null;
}>;

export function createSession({ touch }: { touch: boolean }) {
  const guide = new Guide(readSeen(storage()));
  const brain: Clawd = new Clawd(0, langStore.get(), touch, {
    on: audioStatus.voiceOn,
    prepare: (names) => audioStatus.prepareVoice(names.filter((n) => clipMs(brain.lang, n) !== null).map((n) => clipUrl(brain.lang, n))),
  });
  /** Kalimat bersuara yang sedang diputar: kunci + klip + bahasa + saat muncul. */
  let voiced = "";
  const offLang = langStore.subscribe(() => (brain.lang = langStore.get()));
  let clock = 0;
  const onVisibility = () => brain.visibility(document.visibilityState === "hidden", clock);
  document.addEventListener("visibilitychange", onVisibility);
  const persist = () => writeSeen(guide.seen, storage());

  let started = false;
  let side: readonly [number, number, BubbleSide] | null = null;
  let sideKey = "";
  let settledAt = 0;
  let lastSlide = "";

  return {
    brain,
    get started() {
      return started;
    },
    /** Jam sesi terakhir (ms). */
    get clock() {
      return clock;
    },
    /** Muncul: tamu baru diperkenalkan, tamu lama disapa singkat. */
    start(ms: number) {
      if (started) return;
      started = true;
      clock = ms;
      brain.start(ms, guide.seen.intro);
    },
    /**
     * Satu frame. `el` = akar film, `view` = ukurannya (disimpan pemanggil, tidak dibaca tiap frame), `t` = jam (dtk)
     * untuk menunggu tata letak tenang sebelum memilih tempat di samping.
     */
    step(ctx: GuideContext, ms: number, t: number, el: HTMLElement, view: Readonly<{ w: number; h: number }>): SessionFrame {
      clock = ms;
      if (ctx.moving) brain.activity(ms);
      // petunjuk: yang baru diantrekan, yang tidak berlaku lagi dibuang
      const due = guide.due(ctx);
      if (due && !brain.hasTip(due)) {
        brain.tip(due, ms);
        if (due === "gong" || due === "zoom") brain.behavior.point(ms);
      }
      for (const id of TIP_IDS) if (brain.hasTip(id) && !stillApplies(id, ctx)) brain.hushTip(id, ms);
      const frame = brain.tick(ms);
      const speech = frame.speech;
      // suara: satu klip per kalimat; kalimat berganti, dilewati, memudar, atau bahasa diganti → klip lama berhenti
      const voiceKey = speech?.voice && speech.fade === 1 ? `${speech.id}|${speech.voice}|${brain.lang}|${speech.since}` : "";
      if (voiceKey !== voiced) {
        if (voiced) audioStatus.hush();
        voiced = voiceKey;
        if (speech?.voice && speech.voicing && ms - speech.since <= VOICE_START) audioStatus.voice(clipUrl(brain.lang, speech.voice));
      }
      // tuntas: kalimat terakhir perkenalan/petunjuk sudah lengkap diketik
      if (speech && !speech.typing) {
        if (speech.id === `intro.${INTRO.length - 1}` && guide.introDone()) persist();
        const tip = brain.tipShown(speech);
        if (tip && speech.id === `tip.${tip}.${TIPS[tip].length - 1}` && guide.done(tip)) persist();
      }
      const spot = spotAt(ctx, brain.tipShown(speech));
      // tempat di samping: paling lapang di slide ini, diukur sekali sesudah tamu tiba
      const slideId = el.dataset.slide ?? "";
      if (ctx.moving || slideId !== lastSlide) {
        lastSlide = slideId;
        settledAt = t;
      }
      const key = `${slideId}|${view.w}x${view.h}`;
      if (!ctx.moving && key !== sideKey && t - settledAt >= SETTLE && view.w > 0) {
        sideKey = key;
        const tall = view.w < view.h;
        side = bestSide(blocksOf(el), view, BODY_FRAC[tall ? "tall" : "wide"] * Math.min(view.w, view.h), BUBBLE_EST[tall ? "tall" : "wide"]);
      }
      return { clawd: frame, spot, side };
    },
    tap(ms: number) {
      clock = ms;
      return brain.tap(ms);
    },
    tapBubble(ms: number) {
      clock = ms;
      brain.tapBubble(ms);
    },
    gong(ms: number) {
      clock = ms;
      brain.gong(ms);
    },
    dispose() {
      if (voiced) audioStatus.hush();
      offLang();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type Session = ReturnType<typeof createSession>;
