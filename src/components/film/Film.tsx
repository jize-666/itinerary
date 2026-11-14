"use client";
import "./film.css";
import { type CSSProperties, memo, type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { audioStatus } from "@/engine/audio/status";
import { useI18n } from "@/engine/i18n/useI18n";
import { DEPTH, prefersReducedMotion } from "@/engine/motion/tokens";
import type { Beat } from "@/engine/slides/beat";
import { buildFilm, chapterAt, type Film as FilmData, galleryDrift, indexForHash, type PanelSlide, type Slide } from "@/engine/slides/build-slides";
import { createLiveStore } from "@/engine/slides/live";
import { skyCovered, skyPath, skyState, STILL } from "@/engine/slides/sky";
import { styleAt } from "@/engine/slides/timeline";
import { stageBus } from "@/engine/stage/bus";
import { GATE, type GateSnapshot, logTop, plantSize } from "@/engine/stage/gate";
import { KAYON as KAYON_SHEET } from "@/engine/stage/gunungan";
import { sessionStore } from "@/lib/session";
import { loadTrip, peekTrip, type TripLoad, type TripView } from "@/lib/trip";
import { IconRefresh } from "../Icons";
import { useCurtainOpen } from "../motion/Curtain";
import { BRANCHES, branchPath, KAYON, KAYON_GATE } from "../motion/kayon";
import { useRequireSession } from "../useRequireSession";
import { Corner, Hint, Rail, useChapterLabel } from "./Chrome";
import { DetailSheet, type SheetOrigin } from "./DetailSheet";
import { Director, type FilmView } from "./director";
import { Gallery } from "./Gallery";
import { LiveContext, SlideContent, useLive } from "./Slides";
import { startLook, stepLook } from "./look";
import { StageMount, type StagePhase } from "./StageMount";
import { HILLS, hillShift, sunPlace } from "./transitions";

type State = { kind: "loading" } | TripLoad;
type Var = CSSProperties & Record<`--${string}`, string | number>;
/** Kedalaman gallery untuk CSS (satu sumber dengan lintasan transisi: DEPTH di tokens). */
const DEPTH_VARS: Var = { "--depth-perspective": `${DEPTH.perspective}px`, "--depth-card-z": `${DEPTH.cardZ}px`, "--depth-card-turn": `${DEPTH.cardTurn}deg` };
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

type SceneView = { id: string; slides: Slide[]; first: number; pos: "cur" | "in" | "out" | "away"; step: number; beat: Beat };

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
    // tahap judul (beat.ts) milik slide `index`: ikut dibawa lapisannya selama transisi keluar, supaya teks yang
    // sudah tersedot ke gong tidak muncul lagi saat lapisan itu meninggalkan layar
    out.set(id, { id, slides, first, pos, step: at - first, beat: first === index ? view.beat : 0 });
  }
  return [...out.values()];
}

const Layer = memo(function Layer({
  data,
  id,
  slides,
  pos,
  step,
  beat,
  onOpen,
}: {
  data: TripView;
  id: string;
  slides: Slide[];
  pos: SceneView["pos"];
  step: number;
  beat: Beat;
  onOpen: (s: PanelSlide) => void;
}) {
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
      {gallery ? <Gallery data={data} slides={slides as PanelSlide[]} step={step} onOpen={onOpen} /> : <SlideContent data={data} slide={head} pos={pos} beat={beat} />}
    </section>
  );
});

/** Siluet gunungan (kayon) untuk sapuan antar bab: gapura, pohon hayat, tatahan di tepi. Digambar sekali. */
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
        <path d={KAYON_GATE} />
        {/* pohon hayat: batang + dahan berpilin, makin pendek ke puncak */}
        <path d="M60 122V20" />
        {BRANCHES.map(([y, reach]) => (
          <path key={y} d={branchPath(y, reach)} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Gunungan pembuka/penutup yang tertancap (gate.ts): tombol tak terlihat tepat di atas gunungan 3D. Klik, tap,
 * Enter, atau Spasi membaliknya (muka Agung ↔ muka Murka). Tombol ada untuk keyboard dan screen reader; gambarnya
 * di kanvas.
 */
function KayonFlip({ root, face }: { root: RefObject<HTMLElement | null>; face: GateSnapshot["face"] }) {
  const { t } = useI18n();
  const [box, setBox] = useState<Var>({});
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const place = () => {
      const [w, h] = [el.clientWidth, el.clientHeight];
      if (!w || !h) return;
      const size = plantSize(w / h);
      setBox({
        "--kayon-w": `${((size * KAYON_SHEET.aspect * h) / w) * 100}%`,
        "--kayon-h": `${size * 100}%`,
        "--kayon-top": `${((1 - (GATE.y + size)) / 2) * 100}%`,
      });
      // petunjuk gulir duduk di palemahan (pita gelap di atas gedebog), bukan di atas gunungan atau gedebog
      el.style.setProperty("--kayon-foot", `${((1 + logTop(size)) / 2) * 100}%`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.style.removeProperty("--kayon-foot");
    };
  }, [root]);
  return (
    <button
      type="button"
      className="fl-kayon"
      style={box}
      aria-label={t("film.kayon")}
      aria-pressed={face === "murka"}
      onClick={() => {
        if (stageBus.gateFlip()) audioStatus.scene("gunungan-balik");
      }}
    />
  );
}

function Stage({ data }: { data: TripView }) {
  const { t, tx } = useI18n();
  const film = useMemo(() => buildFilm(data), [data]);
  const root = useRef<HTMLElement>(null);
  const label = useChapterLabel();
  const [initial] = useState(() => indexForHash(film, window.location.hash) ?? 0);
  const [view, setView] = useState<FilmView>({ index: initial, moving: null, beat: 0 });
  const [live] = useState(createLiveStore);
  const [calm, setCalm] = useState(() => (readFlag(CALM_KEY) ?? (prefersReducedMotion() ? "1" : "0")) === "1");
  const [hint, setHint] = useState(() => readFlag(HINT_KEY) === null);
  const [sheet, setSheet] = useState<{ slide: PanelSlide; origin: SheetOrigin | null } | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filmNow = useRef(film);
  const director = useRef<Director | null>(null);
  const [stage, setStage] = useState<StagePhase>("off");
  // gunungan pembuka dan penutup (gate.ts): keadaannya di bus panggung, dibaca juga oleh kanvas 3D
  const gate = useSyncExternalStore(stageBus.gateSubscribe, stageBus.gateSnapshot, stageBus.gateServer);
  /** Panggung 3D akan dipakai: dikabarkan StageMount sebelum efek di bawah berjalan. */
  const stageWanted = useRef(false);
  const onIntent = useCallback((wanted: boolean) => {
    stageWanted.current = wanted;
    if (!wanted) stageBus.gateDisarm();
  }, []);
  /** Letak film untuk panggung 3D: sumber waktu yang sama dengan transisi DOM. */
  const probe = useCallback(() => director.current?.cursor() ?? { from: initial, to: initial, p: 0 }, [initial]);

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
    // gunungan pembuka: film dibuka di slide pertama dengan panggung 3D → teks prolog menunggu gunungannya dicabut
    const gated = d.index === 0 && stageWanted.current;
    if (gated) stageBus.gateArm();
    // slide pembuka hidup setelah tirai antar-halaman mulai membuka
    const first = d.film.slides[d.index];
    const cancelLive = first && !gated ? live.add(first.id, prefersReducedMotion() ? 0 : 380) : undefined;
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
      stageBus.gateReset();
    };
  }, [initial, live]);

  // Gunungan pembuka dicabut: teks prolog muncul seperti saat tiba. Ditancapkan lagi (mundur di slide pertama):
  // teksnya memudar (film.css), lalu reveal-nya disiapkan untuk diputar ulang.
  const gateShut = gate.phase === "wait" || gate.phase === "head";
  const shutBefore = useRef(false);
  useEffect(() => {
    const first = film.slides[0];
    const was = shutBefore.current;
    shutBefore.current = gateShut;
    if (!first || was === gateShut) return;
    if (gateShut) {
      const timer = setTimeout(() => live.remove(first.id), 520);
      return () => clearTimeout(timer);
    }
    return live.add(first.id, 0);
  }, [gateShut, film, live]);
  // pembuka yang menunggu panggung terlalu lama dilepas: film dibuka tanpa gerbang
  useEffect(() => {
    if (gate.phase !== "wait") return;
    const timer = setTimeout(() => stageBus.gateDisarm(), GATE.waitMs);
    return () => clearTimeout(timer);
  }, [gate.phase]);
  // film berpindah dari ujungnya: gunungan yang tertancap di sana ikut dicabut
  const lastIndex = film.slides.length - 1;
  useEffect(() => {
    stageBus.gateFollow(view.index, view.moving !== null, lastIndex);
  }, [view, lastIndex]);
  // penutup: diam di credits → gunungan ditancapkan sendiri (tancep kayon)
  useEffect(() => {
    if (view.index !== lastIndex || view.moving) return;
    const timer = setTimeout(() => stageBus.gateAuto(lastIndex, lastIndex), GATE.autoTailMs);
    return () => clearTimeout(timer);
  }, [view, lastIndex]);
  // tancep kayon diiringi gong, tepat saat gunungan menancap di gedebog
  const tailShut = gate.phase === "tail";
  useEffect(() => {
    if (!tailShut) return;
    const due = stageBus.gateLandsIn();
    if (due !== null) audioStatus.scene("gong", due, 0.8);
  }, [tailShut]);
  useEffect(() => {
    if (gate.end) audioStatus.prepare("gunungan-balik", "gong");
  }, [gate.end]);

  useEffect(() => {
    if (director.current) director.current.calm = calm;
  }, [calm]);
  // Gerak pandang 2,5D (aturan host 13 Nov): --lx dan --ly (−1…1) dari kursor atau kemiringan HP; langit, bukit,
  // dan isi slide bergeser menurut kedalamannya dan bidang teks sedikit memutar (film.css). Calm: diam.
  useEffect(() => {
    const el = root.current;
    if (!el || calm) return;
    const stop = startLook();
    let raf = 0;
    let lx = 0;
    let ly = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const l = stepLook();
      if (Math.abs(l.x - lx) < 0.01 && Math.abs(l.y - ly) < 0.01) return;
      lx = l.x;
      ly = l.y;
      el.style.setProperty("--lx", lx.toFixed(3));
      el.style.setProperty("--ly", ly.toFixed(3));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stop();
      el.style.removeProperty("--lx");
      el.style.removeProperty("--ly");
    };
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
  const chapter = chapterAt(film, view.index);
  // langit saat diam; selama transisi, lintasan dari transitions.ts berjalan di atas nilai ini
  const sky = slide ? skyState(slide) : STILL.gate;
  // lapisan yang tertutup penuh (saat diam, atau sepanjang transisi yang berjalan) tidak digambar
  const target = view.moving ? film.slides[view.moving.to] : undefined;
  const covered = skyCovered(slide && target ? skyPath(slide, target) : [[0, sky]]);
  const off = (name: Parameters<typeof covered.has>[0]) => (covered.has(name) ? "" : undefined);
  const sun = sunPlace(sky.sun);
  const sunStyle = styleAt({ unit: "%", x: [[0, sun.x]], y: [[0, sun.y]], scale: [[0, sky.sun.scale]], opacity: [[0, sky.sun.opacity]] }, 0);
  // parallax latar: bukit bergeser menurut letak panel di gallery, yang dekat lebih jauh dari yang jauh (Calm: diam)
  const drift = calm ? 0 : galleryDrift(slide);
  return (
    <main
      ref={root}
      className="film"
      tabIndex={-1}
      aria-label={tx(data.trip.title)}
      data-calm={calm ? "" : undefined}
      data-moving={view.moving ? "" : undefined}
      data-sheet={sheet ? "" : undefined}
      data-stage={stage === "off" ? undefined : stage}
      data-theme={slide?.theme}
      data-kind={slide?.kind}
      data-slide={slide?.id}
      data-index={view.index}
      data-beat={view.beat ? "out" : undefined}
      data-gate={gate.phase === "off" ? undefined : gate.phase}
      data-face={gate.phase === "head" || gate.phase === "tail" ? gate.face : undefined}
      style={DEPTH_VARS}
    >
      <div className="fl-skies" aria-hidden="true">
        <div className="fl-sky" data-sky="night" data-covered={off("night")} />
        <div className="fl-sky" data-sky="dawn" data-covered={off("dawn")} style={{ opacity: sky.dawn }} />
        <div className="fl-sky" data-sky="day" data-covered={off("day")} style={{ opacity: sky.day }} />
        <div className="fl-sky" data-sky="dusk" data-covered={off("dusk")} style={{ opacity: sky.dusk }} />
        <div className="fl-sunbox" data-covered={off("sun")}>
          <div className="fl-sun" style={sunStyle}>
            <i className="fl-sun-disc" />
            <i className="fl-sun-warm" style={{ opacity: sky.sun.warm }} />
          </div>
        </div>
        {HILLS.map(([depth, span]) => (
          // lebar = 100% layar + ruang geser, supaya tepi kanan tidak pernah tersingkap. Saat diam geserannya
          // transform 2D biasa: translate3d akan menjadikan tiap lapis bukit lapisan compositor tetap, dan tanpa GPU
          // itu memberatkan semua transisi di atasnya.
          <div key={depth} className="fl-hills" data-depth={depth} data-covered={off("ground")} style={{ width: `${10000 / (100 - span)}%`, opacity: sky.ground, transform: `translateX(${Math.round(hillShift(span, drift) * 1000) / 1000}%)` }} />
        ))}
        <div className="fl-sky" data-sky="gate" style={{ opacity: sky.gate }} />
      </div>
      <StageMount film={film} probe={probe} root={root} calm={calm} onPhase={setStage} onIntent={onIntent} />
      <div className="fl-grain" aria-hidden="true" />
      <LiveContext value={live}>
        <div className="fl-stage">
          {scenes.map((s) => (
            <Layer key={s.id} data={data} id={s.id} slides={s.slides} pos={s.pos} step={s.step} beat={s.beat} onOpen={openSheet} />
          ))}
        </div>
      </LiveContext>
      {(gate.phase === "head" || gate.phase === "tail") && <KayonFlip root={root} face={gate.face} />}
      <div className="fl-wipe" aria-hidden="true">
        <Kayon />
      </div>
      <div className="fl-chrome">
        <Corner calm={calm} onCalm={onCalm} />
        <Hint shown={(hint || gateShut) && view.index === 0 && !view.moving && !view.beat} kayon={gate.phase === "head"} />
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
