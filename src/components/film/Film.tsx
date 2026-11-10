"use client";
import "./film.css";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useI18n } from "@/engine/i18n/useI18n";
import { prefersReducedMotion } from "@/engine/motion/tokens";
import { buildFilm, chapterAt, type Film as FilmData, indexForHash, type PanelSlide, type Sky, type Slide } from "@/engine/slides/build-slides";
import { createLiveStore } from "@/engine/slides/live";
import { sessionStore } from "@/lib/session";
import { loadTrip, peekTrip, type TripLoad, type TripView } from "@/lib/trip";
import { IconRefresh } from "../Icons";
import { useCurtainOpen } from "../motion/Curtain";
import { useRequireSession } from "../useRequireSession";
import { Corner, Hint, Rail, useChapterLabel } from "./Chrome";
import { DetailSheet, type SheetOrigin } from "./DetailSheet";
import { Director, type FilmView } from "./director";
import { Gallery } from "./Gallery";
import { LiveContext, SlideContent, useLive } from "./Slides";

type State = { kind: "loading" } | TripLoad;
const SKIES: readonly Sky[] = ["gate", "dawn", "day", "dusk", "night"];
const CALM_KEY = "lakon.calm";
const HINT_KEY = "lakon.film.hint";

const readFlag = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeFlag = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* tidak diingat */
  }
};

/**
 * Film (PRD §7): rangkaian slide di atas satu panggung. Data datang dari trip-data setelah kode benar;
 * tampil seketika dari salinan di perangkat, lalu diperbarui dari jaringan.
 */
export function Film() {
  const session = useRequireSession();
  const { t } = useI18n();
  const token = session?.token;
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  useCurtainOpen();
  const snap = useMemo(() => (token ? peekTrip(token) : null), [token]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    loadTrip(token, { fresh: reload > 0 }).then((r) => {
      if (!alive) return;
      if (r.kind === "unauthorized") sessionStore.clear(); // token kedaluwarsa/dicabut → kembali ke gerbang
      else setState((prev) => (r.kind === "ok" || prev.kind !== "ok" ? r : prev));
    });
    return () => {
      alive = false;
    };
  }, [token, reload]);

  if (!session) return null;
  const view = state.kind === "loading" && snap ? snap : state;
  if (view.kind !== "ok") {
    const msg = view.kind === "loading" ? t("film.loading") : view.kind === "offline" ? t("film.offline") : t("film.server");
    return (
      <main className="gate">
        <p className="gate-prompt today-loading" role="status" aria-live="polite">
          {msg}
        </p>
        {view.kind !== "loading" && (
          <button
            type="button"
            className="pb pb--gold pb--lg"
            onClick={() => {
              setState({ kind: "loading" });
              setReload((n) => n + 1);
            }}
          >
            <span className="pb-face">
              <IconRefresh />
              <span>{t("today.retry")}</span>
            </span>
          </button>
        )}
      </main>
    );
  }
  return <Stage data={view.data} />;
}

type SceneView = { id: string; slides: Slide[]; first: number; pos: "cur" | "in" | "out" | "away"; step: number };

/** Scene yang dipasang: slide sekarang, tetangganya (siap untuk transisi berikutnya), dan tujuan transisi. */
function scenesFor(film: FilmData, view: FilmView): SceneView[] {
  const { index, moving } = view;
  const wanted = new Set([index - 1, index, index + 1]);
  if (moving) wanted.add(moving.to);
  const sceneOf = (i: number) => film.slides[i]?.scene;
  const current = sceneOf(index);
  const target = moving ? sceneOf(moving.to) : undefined;
  const out = new Map<string, SceneView>();
  for (const i of [...wanted].sort((a, b) => a - b)) {
    const id = sceneOf(i);
    if (id === undefined || out.has(id)) continue;
    let first = i;
    while (first > 0 && sceneOf(first - 1) === id) first--;
    const slides: Slide[] = [];
    for (let k = first; sceneOf(k) === id; k++) slides.push(film.slides[k]!);
    const last = first + slides.length - 1;
    const pos = id === current ? (target !== undefined && target !== current ? "out" : "cur") : id === target ? "in" : "away";
    // kartu yang ditunjuk: slide sekarang bila ada di scene ini, selain itu sisi yang menghadap penonton
    const at = index >= first && index <= last ? index : moving && moving.to >= first && moving.to <= last ? moving.to : first > index ? first : last;
    out.set(id, { id, slides, first, pos, step: at - first });
  }
  return [...out.values()];
}

const Layer = memo(function Layer({ data, id, slides, pos, step, onOpen }: { data: TripView; id: string; slides: Slide[]; pos: SceneView["pos"]; step: number; onOpen: (s: PanelSlide) => void }) {
  const head = slides[0]!;
  const live = useLive(head.id);
  const gallery = head.kind === "panel";
  return (
    <section
      className="fl-layer"
      data-scene={id}
      data-kind={head.kind}
      data-sky={head.sky}
      data-pos={pos}
      data-unit={gallery ? undefined : head.id}
      data-live={!gallery && live ? "" : undefined}
      aria-roledescription="slide"
      aria-hidden={pos !== "cur"}
      inert={pos !== "cur"}
    >
      {gallery ? <Gallery data={data} slides={slides as PanelSlide[]} step={step} onOpen={onOpen} /> : <SlideContent data={data} slide={head} />}
    </section>
  );
});

/** Siluet gunungan (kayon) untuk sapuan antar bab: gapura, pohon hayat, tatahan di tepi. Digambar sekali. */
const KAYON = "M60 3C62 14 70 26 78 40C90 58 103 80 103 104C103 124 95 140 84 152V160L96 166V176H90V184H30V176H24V166L36 160V152C25 140 17 124 17 104C17 80 30 58 42 40C50 26 58 14 60 3Z";
/** Dahan pohon hayat: [tinggi pangkal, jangkauan]; makin pendek ke puncak supaya tetap di dalam tatahan. */
const BRANCHES: readonly [y: number, reach: number][] = [
  [112, 27],
  [97, 24],
  [82, 19],
  [67, 13],
  [52, 7],
];
function Kayon() {
  return (
    <svg viewBox="0 0 120 200" focusable="false">
      <defs>
        <radialGradient id="fl-kayon-fill" cx="50%" cy="46%" r="62%">
          <stop offset="0" stopColor="#1c2450" />
          <stop offset="1" stopColor="#090b1c" />
        </radialGradient>
      </defs>
      <path className="fl-wipe-stick" d="M60 184V199" />
      <path className="fl-wipe-body" d={KAYON} />
      <path className="fl-wipe-rim" d={KAYON} transform="translate(60 100) scale(0.93) translate(-60 -100)" />
      <path className="fl-wipe-dots" d={KAYON} transform="translate(60 100) scale(0.86) translate(-60 -100)" />
      <g className="fl-wipe-tree">
        {/* gapura */}
        <path d="M40 160H80M48 160V139H72V160M60 139V160M44 139H76L71 131H49ZM50 131L60 122L70 131M40 160V148M80 160V148M38 148H42M78 148H82" />
        {/* pohon hayat: batang + dahan berpilin, makin pendek ke puncak */}
        <path d="M60 122V20" />
        {BRANCHES.map(([y, reach]) => (
          <path key={y} d={`M60 ${y}C${60 + reach * 0.32} ${y - 2} ${60 + reach * 0.7} ${y - 7} ${60 + reach} ${y - 15}c2.6-3 6.4-.6 4.4 2.6M60 ${y}C${60 - reach * 0.32} ${y - 2} ${60 - reach * 0.7} ${y - 7} ${60 - reach} ${y - 15}c-2.6-3-6.4-.6-4.4 2.6`} />
        ))}
      </g>
    </svg>
  );
}

function Stage({ data }: { data: TripView }) {
  const { t, tx } = useI18n();
  const film = useMemo(() => buildFilm(data), [data]);
  const root = useRef<HTMLElement>(null);
  const label = useChapterLabel();
  const [initial] = useState(() => indexForHash(film, window.location.hash) ?? 0);
  const [view, setView] = useState<FilmView>({ index: initial, moving: null });
  const [live] = useState(createLiveStore);
  const [calm, setCalm] = useState(() => (readFlag(CALM_KEY) ?? (prefersReducedMotion() ? "1" : "0")) === "1");
  const [hint, setHint] = useState(() => readFlag(HINT_KEY) === null);
  const [sheet, setSheet] = useState<{ slide: PanelSlide; origin: SheetOrigin | null } | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filmNow = useRef(film);
  const director = useRef<Director | null>(null);

  // sutradara dibuat setelah panggung terpasang: ia membangun lintasan transisi dari DOM
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const d = new Director(filmNow.current, initial, live, {
      render: (next, sync) => (sync ? flushSync(() => setView(next)) : setView(next)),
      arrived: (index, from) => {
        const f = filmNow.current;
        // hash per bab, supaya host bisa mengirim "lihat Hari 2" (#day-2); prolog = tanpa hash
        const chapter = chapterAt(f, index);
        if (chapter && chapter !== chapterAt(f, from)) {
          const url = chapter.kind === "prologue" ? window.location.pathname + window.location.search : `#${chapter.id}`;
          window.history.replaceState(window.history.state, "", url);
        }
        setHint((shown) => {
          if (shown) writeFlag(HINT_KEY, "1");
          return false;
        });
        // fokus yang tertinggal di slide lama (kini inert) dipindah ke panggung supaya keyboard tetap jalan
        const active = document.activeElement;
        if (!active || active === document.body || active.closest(".fl-layer")) el.focus({ preventScroll: true });
      },
    });
    director.current = d;
    const detach = d.attach(el);
    // slide pembuka hidup setelah tirai antar-halaman mulai membuka
    const first = d.film.slides[d.index];
    const cancelLive = first ? live.add(first.id, prefersReducedMotion() ? 0 : 380) : undefined;
    const onHash = () => {
      const to = indexForHash(d.film, window.location.hash);
      if (to !== null) d.jump(to);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      cancelLive?.();
      detach();
      director.current = null;
    };
  }, [initial, live]);

  useEffect(() => {
    if (director.current) director.current.calm = calm;
  }, [calm]);
  useEffect(() => {
    if (director.current) director.current.paused = sheet !== null;
  }, [sheet]);
  useEffect(() => {
    filmNow.current = film;
    if (director.current && director.current.film !== film) director.current.retarget(film);
  }, [film]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // film memakai seluruh layar: halaman di belakangnya tidak boleh ikut ter-scroll / tertarik
  useLayoutEffect(() => {
    document.documentElement.classList.add("film-on");
    return () => document.documentElement.classList.remove("film-on");
  }, []);

  const onCalm = useCallback((on: boolean) => {
    setCalm(on);
    writeFlag(CALM_KEY, on ? "1" : "0");
  }, []);
  const onJump = useCallback((to: number) => director.current?.jump(to), []);
  const onCopied = useCallback(
    (ok: boolean) => {
      setToast(t(ok ? "today.copied" : "today.copyFail"));
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 2400);
    },
    [t],
  );

  /** Panel → sheet detail: catat letak judul kartu supaya judul sheet bisa "terbang" dari sana (shared element). */
  const openSheet = useCallback(
    (s: PanelSlide) => {
      const title = calm ? null : (root.current?.querySelector<HTMLElement>(".fl-layer[data-pos='cur'] .gal-card[data-cur] .gal-title") ?? null);
      const origin: SheetOrigin | null = title ? { rect: title.getBoundingClientRect(), fontSize: parseFloat(getComputedStyle(title).fontSize) || 0 } : null;
      setSheet({ slide: s, origin });
    },
    [calm],
  );
  const closeSheet = useCallback(() => setSheet(null), []);

  const scenes = scenesFor(film, view);
  const slide = film.slides[view.index];
  const incoming = view.moving ? film.slides[view.moving.to] : undefined;
  const chapter = chapterAt(film, view.index);
  return (
    <main
      ref={root}
      className="film"
      tabIndex={-1}
      aria-label={tx(data.trip.title)}
      data-calm={calm ? "" : undefined}
      data-moving={view.moving ? "" : undefined}
      data-sheet={sheet ? "" : undefined}
      data-theme={slide?.theme}
      data-kind={slide?.kind}
      data-slide={slide?.id}
      data-index={view.index}
    >
      <div className="fl-skies" aria-hidden="true">
        {SKIES.map((sky) => (
          <div key={sky} className="fl-sky" data-sky={sky} data-on={sky === slide?.sky ? "cur" : sky === incoming?.sky ? "in" : undefined} />
        ))}
      </div>
      <div className="fl-grain" aria-hidden="true" />
      <LiveContext value={live}>
        <div className="fl-stage">
          {scenes.map((s) => (
            <Layer key={s.id} data={data} id={s.id} slides={s.slides} pos={s.pos} step={s.step} onOpen={openSheet} />
          ))}
        </div>
      </LiveContext>
      <div className="fl-wipe" aria-hidden="true">
        <Kayon />
      </div>
      <div className="fl-chrome">
        <Corner calm={calm} onCalm={onCalm} />
        <Hint shown={hint && view.index === 0 && !view.moving} />
        <Rail film={film} index={view.index} onJump={onJump} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {chapter ? t("film.position", { chapter: label(chapter, true), n: view.index + 1, total: film.slides.length }) : ""}
      </p>
      <DetailSheet slide={sheet?.slide ?? null} origin={sheet?.origin ?? null} onClose={closeSheet} onCopied={onCopied} />
      <p className="toast" role="status" aria-live="polite" data-shown={toast ? "" : undefined}>
        {toast}
      </p>
    </main>
  );
}
