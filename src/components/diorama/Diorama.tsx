"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DioramaProps, DioLocation } from "@/engine/diorama/options";
import { directions, locationContent, scenes, tr, type StringKey } from "@/engine/diorama/strings";
import { NEXT } from "@/engine/diorama/camera";
import { RouteOptions } from "./RouteOptions";
import { DioramaController, initialState, type ViewerState } from "./controller";
import { Icon, LandmarkIcon, Mark, type IconName } from "./Icons";
import type { SurfaceMode } from "./artwork";
import { Viewer } from "./Viewer";
import { DioDialog } from "./Dialog";
import { PhotoRoom } from "./PhotoRoom";
import "./diorama.css";
export type { DioramaProps } from "@/engine/diorama/options";

type Panel = "angles" | "guide" | "poses" | "single" | "all" | null;
type NavWindow = Window & {
  navigation?: { currentEntry?: { index: number }; entries: () => { url: string | null }[] };
};
const timecode = (n: number) => "0" + Math.floor(n / 60) + ":" + String(Math.floor(n) % 60).padStart(2, "0");

function Tool({
  icon,
  label,
  onClick,
  disabled,
  className = "",
  visible = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  visible?: boolean;
}) {
  return (
    <button
      type="button"
      className={(visible ? "dio-labeled" : "dio-icon-btn") + " " + className}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />
      {visible && <span>{label}</span>}
    </button>
  );
}
function Compass({ az, letter }: { az: number; letter: string }) {
  return (
    <svg viewBox="0 0 52 52" className="dio-compass" aria-hidden="true">
      <circle cx="26" cy="26" r="22.5" fill="none" stroke="currentColor" opacity=".28" />
      {Array.from({ length: 24 }, (_, i) => (
        <path
          key={i}
          d={i % 3 === 0 ? "M26 3.5v4" : "M26 3.5v2"}
          transform={"rotate(" + i * 15 + " 26 26)"}
          stroke="currentColor"
          opacity=".55"
        />
      ))}
      <g transform={"rotate(" + (180 - az) + " 26 26)"}>
        <path d="m26 10 3.4 18.8L26 26l-3.4 2.8Z" fill="#dcc18d" />
        <path d="m26 42 3.4-13.2L26 26l-3.4 2.8Z" fill="none" stroke="#b6aa8b" strokeWidth=".9" />
      </g>
      <title>{letter}</title>
    </svg>
  );
}
export function Diorama({ lang, calm, quality, focus, onTour, onLocation, onSlow }: DioramaProps) {
  const route = useContext(RouteOptions),
    router = useRouter();
  const [state, setState] = useState<ViewerState>(initialState),
    [engine, setEngine] = useState<DioramaController | null>(null);
  const [panel, setPanel] = useState<Panel>(route.autoTour && calm ? "poses" : null),
    [full, setFull] = useState(false),
    [mode, setMode] = useState<SurfaceMode>("material");
  const [labels, setLabels] = useState(false),
    [revision, setRevision] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLElement>(null);
  const callbacks = useRef({ onSlow, onTour, onLocation });
  useEffect(() => {
    callbacks.current = { onSlow, onTour, onLocation };
  }, [onSlow, onTour, onLocation]);
  useEffect(() => {
    if (engine) callbacks.current.onTour?.(state.tour);
  }, [state.tour, engine]);
  useEffect(() => {
    if (engine) callbacks.current.onLocation?.(state.location);
  }, [state.location, engine]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) setFull(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const onStats = useCallback(
    (s: ViewerState) =>
      setState((prev) =>
        Object.keys(s).every((k) => prev[k as keyof ViewerState] === s[k as keyof ViewerState]) ? prev : s,
      ),
    [],
  );
  const slow = useCallback((n: number) => callbacks.current.onSlow?.(n), []);
  const text = (k: StringKey) => tr(lang, k),
    selected = state.location ? locationContent[state.location] : null;
  const side = state.angle ?? Math.round(state.azimuth / 45) % 8,
    enabled = !!engine;
  const goBack = () => {
    const nav = (window as NavWindow).navigation;
    const prev = nav?.currentEntry ? nav.entries()[nav.currentEntry.index - 1]?.url : null;
    const source = prev || document.referrer;
    let local = false;
    try {
      local = !!source && new URL(source).origin === location.origin;
    } catch {}
    if (local && history.length > 1) history.back();
    else router.push("/film/");
  };
  const open = (p: Panel) => {
    if (p === "all" || p === "single") engine?.freeze(true);
    else if (p) engine?.pause();
    setPanel(p);
  };
  const close = () => setPanel(null);
  function play() {
    if (!engine) return;
    if (calm) open("poses");
    else if (state.tour === "playing") engine.pause();
    else engine.play();
  }
  function goto(id: DioLocation) {
    engine?.focus(id);
  }
  const tourLabel = text(
    calm
      ? "selectPose"
      : state.tour === "playing"
        ? "pause"
        : state.tour === "paused"
          ? "resume"
          : state.tour === "done"
            ? "restart"
            : "tour",
  );
  const fallback = (
    <div className="dio-webgl-error" role="alert">
      <Icon name="layers" size={32} />
      <p>{text("unavailable")}</p>
      <button className="dio-quiet" onClick={() => setRevision((x) => x + 1)}>
        {text("retry")}
      </button>
    </div>
  );
  const title = text("title").split(" ");
  return (
    <main
      className={"dio-root" + (full ? " dio-immersive" : "")}
      data-calm={calm ? "true" : "false"}
      data-tour={state.tour}
      data-location={state.location ?? ""}
      data-quality={state.tier}
      data-ready={enabled ? "true" : "false"}
    >
      <header className="dio-top">
        <Tool icon="back" label={text("back")} visible onClick={goBack} className="dio-back" />
        <div className="dio-sign">
          <Mark size={30} />
          <span>{text("stageTitle")}</span>
        </div>
      </header>
      <div className="dio-layout">
        <aside className="dio-sidebar">
          <div className="dio-intro">
            <span className="dio-eyebrow">
              <span className="dio-rule" />
              {text("model")}
            </span>
            <h1>
              {title[0]} <em>{title.slice(1).join(" ")}</em>
            </h1>
            <p>{text("intro")}</p>
            <button
              type="button"
              className="dio-tour"
              aria-label={tourLabel}
              onClick={play}
              disabled={!enabled}
            >
              <Icon name={calm ? "grid" : state.tour === "playing" ? "pause" : "play"} size={16} />
              <span>{tourLabel}</span>
              <small>
                {calm ? "6" : timecode(state.tour === "playing" || state.tour === "paused" ? state.time : 64)}
              </small>
            </button>
          </div>
          <nav className="dio-locations" aria-label={text("selectLocation")}>
            <h2 className="dio-section-title">{text("locations")}</h2>
            {NEXT.map((id) => (
              <button
                key={id}
                className="dio-place"
                aria-label={locationContent[id].name[lang]}
                aria-pressed={state.location === id}
                disabled={!enabled}
                onClick={() => goto(id)}
              >
                <span className={"dio-etching dio-etching-" + id}>
                  <LandmarkIcon id={id} />
                </span>
                <span className="dio-place-copy">
                  <strong>{locationContent[id].short[lang]}</strong>
                  <small>{locationContent[id].kind[lang]}</small>
                </span>
              </button>
            ))}
          </nav>
          <button type="button" className="dio-guide" onClick={() => open("guide")}>
            <Icon name="help" size={17} />
            {text("guide")}
          </button>
        </aside>
        <section
          ref={stage}
          className="dio-stage"
          aria-label={text("model")}
          data-angle={side}
          data-azimuth={state.azimuth.toFixed(2)}
          data-elevation={state.elevation.toFixed(2)}
        >
          <div className="dio-canvas">
            <Viewer
              key={revision}
              lang={lang}
              calm={calm}
              quality={quality}
              focus={focus}
              autoTour={route.autoTour}
              forceQuality={route.forceQuality}
              renderTier={enabled ? state.tier : (quality ?? state.tier)}
              mode={mode}
              labelHost={host}
              labels={labels}
              ready={setEngine}
              changed={onStats}
              slow={slow}
              fallback={fallback}
            />
          </div>
          {!enabled && (
            <div className="dio-loading" role="status">
              {text("loading")}
            </div>
          )}
          <div className="dio-labels" ref={host} hidden={!labels}>
            {NEXT.map((id) => (
              <span key={id}>{locationContent[id].short[lang]}</span>
            ))}
          </div>
          <div className="dio-stage-top">
            <span className="dio-state">
              <Icon
                name={state.tour === "playing" ? "play" : state.tour === "paused" ? "pause" : "orbit"}
                size={15}
              />
              {state.tour === "playing"
                ? text("cameraTour")
                : state.tour === "paused"
                  ? text("pause")
                  : state.tour === "done"
                    ? text("done")
                    : text("free")}
            </span>
            <div className="dio-stage-tools">
              {full && (
                <Tool
                  icon={state.tour === "playing" ? "pause" : "play"}
                  label={tourLabel}
                  onClick={play}
                  disabled={!enabled}
                />
              )}
              <Tool
                icon="angles"
                label={text("angle")}
                visible
                onClick={() => open("angles")}
                disabled={!enabled}
              />
              <Tool
                icon={full ? "contract" : "expand"}
                label={text(full ? "contract" : "expand")}
                onClick={() => setFull(!full)}
              />
            </div>
          </div>
          {route.showFps && (
            <output
              className="dio-meter"
              aria-label={text("fps")}
              data-p95={state.p95.toFixed(2)}
              data-calls={state.draws}
              data-triangles={state.triangles}
              data-runs={state.runs}
              data-tour-p95={state.tourP95.toFixed(2)}
              data-max-draws={state.maxDraws}
              data-max-triangles={state.maxTriangles}
            >
              p95 {state.p95.toFixed(1)} ms · {state.draws} {text("drawCalls")} ·{" "}
              {state.triangles.toLocaleString(lang)} {text("triangles")} · {text(state.tier)}
              {state.runs > 0 && (
                <span>
                  {" "}
                  · {state.runs}× {text("cameraTour")} p95 {state.tourP95.toFixed(1)} ms
                </span>
              )}
            </output>
          )}
          <div className="dio-stage-bottom">
            <div className="dio-bearing">
              <Compass az={state.azimuth} letter={lang === "id" ? "U" : "N"} />
              <span>
                <strong>{directions[side]![lang]}</strong>
                <small>{String(Math.round(state.azimuth) % 360).padStart(3, "0")}°</small>
              </span>
            </div>
            <div className="dio-stage-tools">
              <div className="dio-zoom">
                <Tool
                  icon="minus"
                  label={text("zoomOut")}
                  disabled={!enabled}
                  onClick={() => engine?.dolly(1.19)}
                />
                <Tool
                  icon="plus"
                  label={text("zoomIn")}
                  disabled={!enabled}
                  onClick={() => engine?.dolly(1 / 1.19)}
                />
              </div>
              <Tool icon="home" label={text("home")} disabled={!enabled} onClick={() => engine?.home()} />
              <Tool
                icon="camera"
                label={text("photo")}
                visible
                className="dio-shutter"
                disabled={!enabled}
                onClick={() => open("single")}
              />
            </div>
          </div>
        </section>
        <div className="dio-caption">
          <div>
            <span className="dio-caption-title" aria-live="polite">
              {selected
                ? selected.name[lang]
                : state.tour === "playing" || state.tour === "paused"
                  ? scenes[state.scene]![lang]
                  : text("view") + " · " + directions[side]![lang]}
            </span>
            {selected && <p>{selected.description[lang]}</p>}
          </div>
          <div className="dio-steppers">
            <Tool
              icon="previous"
              label={text("previous")}
              disabled={!enabled}
              onClick={() => engine?.cycle(-1)}
            />
            <Tool icon="next" label={text("next")} disabled={!enabled} onClick={() => engine?.cycle(1)} />
          </div>
        </div>
      </div>
      {panel === "guide" && (
        <DioDialog lang={lang} title={text("guide")} onClose={close}>
          <div className="dio-help">
            {(
              [
                ["orbit", "drag", "orbitHint"],
                ["hand", "slide", "slideHint"],
                ["plus", "zoom", "zoomHint"],
              ] as const
            ).map(([i, t, d]) => (
              <div key={t}>
                <Icon name={i} />
                <section>
                  <h3>{text(t)}</h3>
                  <p>{text(d)}</p>
                </section>
              </div>
            ))}
            <p>{text("keyboardHint")}</p>
          </div>
        </DioDialog>
      )}
      {panel === "poses" && (
        <DioDialog lang={lang} title={text("selectPose")} onClose={close}>
          <div className="dio-pose-list">
            {scenes.map((s, i) => (
              <button
                key={s.en}
                onClick={() => {
                  engine?.calmPose(i);
                  close();
                }}
              >
                {s[lang]}
              </button>
            ))}
          </div>
        </DioDialog>
      )}
      {panel === "angles" && (
        <DioDialog lang={lang} title={text("angles")} onClose={close}>
          <div className="dio-angle-grid">
            {directions.map((d, i) => (
              <button
                key={d.en}
                aria-pressed={state.angle === i}
                onClick={() => {
                  engine?.direction(i);
                  close();
                }}
              >
                <span className="dio-angle-mark">
                  {i === 8 ? (
                    <Icon name="aperture" size={18} />
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M10 2 13.5 13 10 11 6.5 13Z"
                        transform={"rotate(" + i * 45 + " 10 10)"}
                        stroke="currentColor"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>
                {d[lang]}
              </button>
            ))}
          </div>
          <div className="dio-settings">
            <label>
              {text("mode")}
              <select value={mode} onChange={(e) => setMode(e.target.value as SurfaceMode)}>
                {(["material", "clay", "wire"] as const).map((s) => (
                  <option key={s} value={s}>
                    {text(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text("labels")}</span>
              <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
            </label>
          </div>
          <button className="dio-quiet" onClick={() => open("all")}>
            <Icon name="grid" size={17} />
            {text("allPhotos")}
          </button>
        </DioDialog>
      )}
      {(panel === "single" || panel === "all") && engine && (
        <PhotoRoom engine={engine} initial={panel} lang={lang} onClose={close} />
      )}
    </main>
  );
}
