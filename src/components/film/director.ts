/**
 * Sutradara film: menyambungkan mesin slide (murni) ke layar. Menerima efek dari mesin, memasang lapisan
 * tujuan lewat React, membangun lintasan transisi dari DOM, lalu memutarnya dengan Web Animations.
 * Satu instans per film; tidak menyimpan apa pun di React selain `view` (slide sekarang + transisi berjalan).
 */
import { easeCss, type EaseName, SLIDE } from "@/engine/motion/tokens";
import { axisBetween, type Film } from "@/engine/slides/build-slides";
import { createSlideStore, type Dir, type SlideEffect, type SlideStore } from "@/engine/slides/controller";
import { type Axis, bindInput } from "@/engine/slides/input";
import type { LiveStore } from "@/engine/slides/live";
import { Timeline } from "@/engine/slides/timeline";
import { type Plan, planTransition, scrubSpan } from "./transitions";

export type FilmView = Readonly<{ index: number; moving: { from: number; to: number } | null }>;

type Hooks = {
  /** Terapkan `view` ke React. `sync` = sekarang juga (flushSync): lintasan dibangun dari DOM tepat setelahnya. */
  render(view: FilmView, sync: boolean): void;
  /** Tiba di slide baru (hash bab, petunjuk, fokus). */
  arrived(index: number, from: number): void;
};

export class Director {
  readonly store: SlideStore;
  film: Film;
  calm = false;
  /** Sheet detail terbuka: input film dimatikan. */
  paused = false;
  private root: HTMLElement | null = null;
  private timeline: Timeline | null = null;
  private plan: Plan | null = null;
  private pendingLive: (() => void) | null = null;
  private unbind: (() => void) | null = null;

  constructor(
    film: Film,
    index: number,
    /** Unit yang sudah hidup (reveal teks); dimiliki komponen supaya bisa dibaca lewat context. */
    private readonly live: LiveStore,
    private readonly hooks: Hooks,
  ) {
    this.film = film;
    this.store = createSlideStore(
      film.slides.length,
      index,
      (fx) => this.apply(fx),
      () => this.timeline?.progress() ?? 0,
    );
  }

  /** Sambungkan ke elemen akar film; mengembalikan pelepas. */
  attach(root: HTMLElement): () => void {
    this.root = root;
    this.unbind = bindInput(root, {
      axisFor: (dir) => this.axisFor(dir),
      spanFor: (dir) => scrubSpan(root, this.film, this.index, this.index + dir),
      step: (dir, source) => this.store.dispatch({ type: "step", dir, source }),
      edge: (to) => this.jump(to === "first" ? 0 : this.film.slides.length - 1),
      scrubStart: () => this.store.dispatch({ type: "scrubStart" }),
      scrub: (signed) => this.store.dispatch({ type: "scrub", signed }),
      scrubEnd: (flick) => this.store.dispatch({ type: "scrubEnd", flick }),
      canScrub: () => !this.calm,
      paused: () => this.paused,
    });
    return () => {
      this.unbind?.();
      this.unbind = null;
      this.timeline?.cancel();
      this.timeline = null;
      this.pendingLive?.();
      this.root = null;
    };
  }

  get index() {
    return this.store.get().index;
  }

  step(dir: Dir) {
    this.store.dispatch({ type: "step", dir, source: "ui" });
  }

  jump(to: number) {
    this.store.dispatch({ type: "jump", to });
  }

  /** Daftar slide berganti (data diperbarui): pertahankan slide yang sedang ditonton bila masih ada. */
  retarget(film: Film) {
    const current = this.film.slides[this.index]?.id;
    this.film = film;
    const index = Math.max(0, film.slides.findIndex((s) => s.id === current));
    this.store.dispatch({ type: "resize", count: film.slides.length, index });
    this.hooks.render({ index: this.index, moving: null }, false);
  }

  private axisFor(dir: Dir): Axis | null {
    const next = this.film.slides[this.index + dir];
    return next ? axisBetween(this.film.slides[this.index], next) : null;
  }

  private apply(fx: SlideEffect) {
    const root = this.root;
    switch (fx.type) {
      case "prepare": {
        this.hooks.render({ index: fx.from, moving: { from: fx.from, to: fx.to } }, true);
        this.timeline?.cancel();
        this.plan = root ? planTransition(root, this.film, fx.from, fx.to, this.calm) : null;
        this.timeline = this.plan ? new Timeline(this.plan.tracks) : null;
        return;
      }
      case "discard": {
        this.drop();
        this.hooks.render({ index: this.index, moving: null }, false);
        return;
      }
      case "seek":
        this.timeline?.seek(fx.progress);
        return;
      case "run": {
        const plan = this.plan;
        const timeline = this.timeline;
        this.pendingLive?.();
        this.pendingLive = null;
        if (!plan || !timeline) {
          queueMicrotask(() => this.store.dispatch({ type: "settled" }));
          return;
        }
        const left = Math.abs(fx.end - fx.from);
        const full = fx.from === 0 && fx.end === 1 && !fx.released;
        let dur: number;
        let easing: EaseName;
        if (full) [dur, easing] = [plan.dur, plan.ease];
        else if (fx.released && fx.end === 0) [dur, easing] = [SLIDE.returnDur, "power3Out"];
        else [dur, easing] = [Math.max(SLIDE.releaseMin, plan.dur * left * 0.8), "power3Out"]; // dilepas dari jari, atau dibalik
        const to = this.store.get().to;
        const target = to === null ? undefined : this.film.slides[to];
        if (fx.end === 1 && target) this.pendingLive = this.live.add(target.id, full ? plan.textAt : Math.min(plan.textAt, dur * 0.4));
        void timeline.run(fx.end, dur, easing).then((done) => {
          if (done && this.timeline === timeline) this.store.dispatch({ type: "settled" });
        });
        return;
      }
      case "hurry":
        this.timeline?.hurry(SLIDE.hurryRate);
        return;
      case "commit": {
        this.hooks.render({ index: fx.index, moving: null }, true);
        this.drop();
        const slide = this.film.slides[fx.index];
        if (slide) this.live.add(slide.id);
        this.hooks.arrived(fx.index, fx.from);
        return;
      }
      case "cancel": {
        this.pendingLive?.();
        this.pendingLive = null;
        this.hooks.render({ index: fx.index, moving: null }, true);
        this.drop();
        return;
      }
      case "edge": {
        if (this.calm || !root) return;
        // mentok di ujung film: lapisan terdorong sedikit lalu kembali
        const body = root.querySelector(".fl-layer[data-pos='cur'] .fl-body");
        body?.animate([{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(0, ${-fx.dir * 16}px, 0)` }, { transform: "translate3d(0, 0, 0)" }], {
          duration: 420,
          easing: easeCss("power3Out"),
        });
        return;
      }
    }
  }

  /** Lepas timeline: gaya kembali ke keadaan tetap dari CSS (yang baru saja diterapkan React). */
  private drop() {
    this.timeline?.cancel();
    this.timeline = null;
    this.plan = null;
  }
}
