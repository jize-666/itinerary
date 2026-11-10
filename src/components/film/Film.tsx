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
import { DetailSheet } from "./DetailSheet";
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
  const [sheet, setSheet] = useState<PanelSlide | null>(null);
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

  /** Panel → sheet detail sebagai shared element (View Transitions); browser tanpa dukungan: langsung terbuka. */
  const withTransition = useCallback(
    (change: () => void) => {
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (calm || prefersReducedMotion() || typeof doc.startViewTransition !== "function") return change();
      doc.startViewTransition(() => flushSync(change));
    },
    [calm],
  );
  const openSheet = useCallback((s: PanelSlide) => withTransition(() => setSheet(s)), [withTransition]);
  const closeSheet = useCallback(() => withTransition(() => setSheet(null)), [withTransition]);

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
        <svg viewBox="0 0 60 100" focusable="false">
          <path className="fl-wipe-body" d="M30 2C36 14 50 26 54 44C58 62 50 78 40 84V93L47 98H13L20 93V84C10 78 2 62 6 44C10 26 24 14 30 2Z" />
          <path className="fl-wipe-tree" d="M30 14V84M30 30C26 35 21 36 17 41M30 30C34 35 39 36 43 41M30 44C25 50 18 51 13 57M30 44C35 50 42 51 47 57M30 60C25 65 19 66 14 71M30 60C35 65 41 66 46 71M24 84H36V93H24Z" />
        </svg>
      </div>
      <div className="fl-chrome">
        <Corner calm={calm} onCalm={onCalm} />
        <Hint shown={hint && view.index === 0 && !view.moving} />
        <Rail film={film} index={view.index} onJump={onJump} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {chapter ? t("film.position", { chapter: label(chapter, true), n: view.index + 1, total: film.slides.length }) : ""}
      </p>
      <DetailSheet slide={sheet} onClose={closeSheet} onCopied={onCopied} />
      <p className="toast" role="status" aria-live="polite" data-shown={toast ? "" : undefined}>
        {toast}
      </p>
    </main>
  );
}
