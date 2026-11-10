/**
 * Mesin slide film (PRD §7.0a, FR-20a): satu gerakan = tepat satu slide.
 *
 * Murni dan tanpa DOM: `reduce(state, event)` mengembalikan keadaan baru + daftar efek untuk dijalankan lapisan
 * tampilan (menyiapkan transisi, mengikuti jari, memutar sampai selesai). Lapisan tampilan mengirim `settled`
 * saat animasinya tuntas. Karena murni, semua aturannya bisa dites tanpa browser.
 *
 * Aturan:
 * - Diam + langkah → transisi ke slide sebelah. Di ujung film → efek `edge` saja.
 * - Selama transisi, input ditahan: paling banyak SATU langkah diantrekan (yang terbaru menang).
 *   Roda/trackpad tidak pernah diantrekan sebelum transisi ±80% (ekor inersia tidak boleh jadi slide kedua).
 * - Arah berlawanan saat transisi berjalan → transisi dibalik di tempat (tidak perlu menunggu sampai tiba).
 * - Scrub jari: transisi mengikuti jari; dilepas di ≥ 35% (atau sentakan searah) → lanjut, selain itu kembali.
 */
import { SLIDE } from "@/engine/motion/tokens";

export type Dir = 1 | -1;
export type Source = "wheel" | "key" | "touch" | "ui";
export type Phase = "idle" | "scrub" | "run";

export type Queued = { type: "step"; dir: Dir } | { type: "jump"; to: number };

export type SlideState = Readonly<{
  /** Jumlah slide. */
  count: number;
  /** Slide tempat penonton berada (asal transisi). */
  index: number;
  /** Tujuan transisi yang sedang berjalan / di-scrub. */
  to: number | null;
  phase: Phase;
  /** Saat `run`: menuju tujuan (commit) atau kembali ke asal (cancel). */
  settle: "commit" | "cancel" | null;
  /** Kemajuan terakhir yang diketahui (0 = di asal, 1 = di tujuan). */
  progress: number;
  queued: Queued | null;
}>;

export type SlideEvent =
  /** `at` = kemajuan transisi saat ini menurut lapisan tampilan (untuk aturan 80% & balik arah). */
  | { type: "step"; dir: Dir; source: Source; at?: number }
  | { type: "jump"; to: number }
  | { type: "scrubStart" }
  /** Posisi jari bertanda: + = menuju slide berikutnya, − = sebelumnya; 1 = satu slide penuh. */
  | { type: "scrub"; signed: number }
  /** `flick`: sentakan saat dilepas (arah), 0 bila dilepas pelan. */
  | { type: "scrubEnd"; flick: Dir | 0 }
  | { type: "settled" }
  /** Daftar slide berganti (data diperbarui): jaga posisi sebisanya. */
  | { type: "resize"; count: number; index?: number };

export type SlideEffect =
  /** Siapkan transisi dari → ke (pasang lapisan tujuan, bangun timeline). */
  | { type: "prepare"; from: number; to: number }
  /** Tujuan scrub berganti arah / batal: buang timeline yang disiapkan. */
  | { type: "discard" }
  /** Ikuti jari. */
  | { type: "seek"; progress: number }
  /** Putar dari `from` sampai tujuan (1) atau kembali ke asal (0). `released` = dilepas dari scrub. */
  | { type: "run"; from: number; end: 0 | 1; released: boolean }
  /** Ada langkah menunggu: percepat sisa transisi. */
  | { type: "hurry" }
  /** Tiba di slide baru. */
  | { type: "commit"; index: number; from: number }
  /** Kembali ke slide asal. */
  | { type: "cancel"; index: number }
  /** Mentok di awal/akhir film. */
  | { type: "edge"; dir: Dir };

export const initialSlideState = (count: number, index = 0): SlideState => ({
  count,
  index: clampIndex(index, count),
  to: null,
  phase: "idle",
  settle: null,
  progress: 0,
  queued: null,
});

const clampIndex = (i: number, count: number) => Math.max(0, Math.min(Math.max(0, count - 1), Math.trunc(Number.isFinite(i) ? i : 0)));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const inRange = (i: number, count: number) => i >= 0 && i < count;
const dirOf = (from: number, to: number): Dir => (to >= from ? 1 : -1);

type Out = [SlideState, SlideEffect[]];

/** Mulai transisi dari keadaan diam. */
function begin(s: SlideState, to: number): Out {
  return [
    { ...s, to, phase: "run", settle: "commit", progress: 0, queued: null },
    [
      { type: "prepare", from: s.index, to },
      { type: "run", from: 0, end: 1, released: false },
    ],
  ];
}

function fromIdle(s: SlideState, e: Queued): Out {
  if (e.type === "step") {
    const to = s.index + e.dir;
    return inRange(to, s.count) ? begin(s, to) : [s, [{ type: "edge", dir: e.dir }]];
  }
  const to = clampIndex(e.to, s.count);
  return to === s.index ? [s, []] : begin(s, to);
}

export function reduce(s: SlideState, e: SlideEvent): Out {
  switch (e.type) {
    case "resize": {
      const count = Math.max(0, e.count);
      return [initialSlideState(count, e.index ?? s.index), s.phase === "idle" ? [] : [{ type: "discard" }]];
    }

    case "step": {
      if (s.phase === "idle") return fromIdle(s, e);
      if (s.phase === "scrub" || s.to === null) return [s, []]; // jari masih menempel: jari yang memimpin
      const at = clamp01(e.at ?? s.progress);
      const heading = dirOf(s.index, s.to); // arah transisi yang sedang berjalan
      const toward = s.settle === "commit" ? heading : ((-heading) as Dir); // arah gerak di layar saat ini

      if (e.dir !== toward) {
        // berubah pikiran: transisi dibalik di tempat, dari titik mana pun
        const end = s.settle === "commit" ? 0 : 1;
        return [
          { ...s, settle: end === 1 ? "commit" : "cancel", progress: at, queued: null },
          [{ type: "run", from: at, end, released: false }],
        ];
      }
      // roda/trackpad: sebelum ±80% dianggap sisa gerakan yang sama
      if (e.source === "wheel" && (s.settle === "commit" ? at : 1 - at) < SLIDE.holdUntil) return [s, []];
      return [{ ...s, progress: at, queued: { type: "step", dir: e.dir } }, [{ type: "hurry" }]];
    }

    case "jump": {
      if (s.phase === "idle") return fromIdle(s, e);
      if (s.phase === "scrub") return [s, []];
      return [{ ...s, queued: { type: "jump", to: clampIndex(e.to, s.count) } }, [{ type: "hurry" }]];
    }

    case "scrubStart":
      return s.phase === "idle" ? [{ ...s, phase: "scrub", to: null, settle: null, progress: 0 }, []] : [s, []];

    case "scrub": {
      if (s.phase !== "scrub") return [s, []];
      const dir: Dir | 0 = e.signed > 0 ? 1 : e.signed < 0 ? -1 : 0;
      const to = dir === 0 ? s.to : s.index + dir;
      const fx: SlideEffect[] = [];
      if (to === null || !inRange(to, s.count)) {
        if (s.to !== null) fx.push({ type: "discard" });
        return [{ ...s, to: null, progress: 0 }, fx];
      }
      if (to !== s.to) {
        if (s.to !== null) fx.push({ type: "discard" });
        fx.push({ type: "prepare", from: s.index, to });
      }
      const progress = clamp01(Math.abs(e.signed));
      fx.push({ type: "seek", progress });
      return [{ ...s, to, progress }, fx];
    }

    case "scrubEnd": {
      if (s.phase !== "scrub") {
        // sentuhan saat transisi berjalan tidak men-scrub; sentakan yang sah tetap dihitung satu langkah
        return e.flick === 0 ? [s, []] : reduce(s, { type: "step", dir: e.flick, source: "touch" });
      }
      if (s.to === null) {
        const idle: SlideState = { ...s, phase: "idle", progress: 0 };
        return e.flick === 0 ? [idle, []] : [idle, [{ type: "edge", dir: e.flick }]];
      }
      const dir = dirOf(s.index, s.to);
      const commit = e.flick === dir || (e.flick === 0 && s.progress >= SLIDE.scrubCommit);
      return [
        { ...s, phase: "run", settle: commit ? "commit" : "cancel" },
        [{ type: "run", from: s.progress, end: commit ? 1 : 0, released: true }],
      ];
    }

    case "settled": {
      if (s.phase !== "run" || s.to === null) return [s, []];
      const arrived = s.settle === "commit";
      const index = arrived ? s.to : s.index;
      const idle: SlideState = { ...s, index, to: null, phase: "idle", settle: null, progress: 0, queued: null };
      const fx: SlideEffect[] = [arrived ? { type: "commit", index, from: s.index } : { type: "cancel", index }];
      if (!s.queued) return [idle, fx];
      const [next, more] = fromIdle(idle, s.queued);
      return [next, [...fx, ...more]];
    }
  }
}

/** Pembungkus kecil untuk React (useSyncExternalStore) dan lapisan input. */
export type SlideStore = {
  get(): SlideState;
  subscribe(fn: () => void): () => void;
  dispatch(e: SlideEvent): void;
};

export function createSlideStore(count: number, index: number, run: (fx: SlideEffect, state: SlideState) => void, progress: () => number = () => 0): SlideStore {
  let state = initialSlideState(count, index);
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispatch(e) {
      const event = e.type === "step" && e.at === undefined && state.phase === "run" ? { ...e, at: progress() } : e;
      const [next, effects] = reduce(state, event);
      const changed = next !== state;
      state = next;
      for (const fx of effects) run(fx, state);
      if (changed) for (const fn of listeners) fn();
    },
  };
}
