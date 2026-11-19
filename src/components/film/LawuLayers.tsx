import { useEffect, useRef } from "react";
import type { Cursor } from "@/engine/stage/cue";
import type { Film, Slide } from "@/engine/slides/build-slides";
import morning from "@/engine/stage/lawu/morning.json";
import { travel } from "@/engine/stage/lawu/journey";
import { audioStatus } from "@/engine/audio/status";

const ridge = morning.silhouette.map((y, i) => `${(i / 80) * 1000},${254 - y * 5.5}`).join(" ");
const rows = Array.from(
  { length: 22 },
  (_, i) =>
    `M-80 ${257 + i * 7.5} Q120 ${168 + i * 7.9} 321 ${253 + i * 6.3} T700 ${262 + i * 5.4} Q880 ${191 + i * 6.7} 1100 ${229 + i * 7.9}`,
);
type Props = { film: Film; slide: Slide; probe: () => Cursor; moving: boolean; calm: boolean };
export function LawuLayers({ film, slide, probe, moving, calm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let id = 0;
    const sample = () => {
      const s = travel(film, probe());
      if (s) {
        el.style.setProperty("--land-depth", String(calm ? 0 : s.index));
        el.style.setProperty("--sun-up", String(Math.min(1, Math.max(0, (s.minute - morning.firstMinute + 2) / 6))));
        el.style.setProperty(
          "--night",
          String(Math.max(0, Math.min(1, (310 - s.minute) / 75), Math.min(1, (s.minute - 1030) / 110))),
        );
      }
      if (moving && !calm) id = requestAnimationFrame(sample);
    };
    sample();
    return () => cancelAnimationFrame(id);
  }, [film, slide, probe, moving, calm]);
  const place = slide.kind === "panel" ? slide.stop.id : "";
  return (
    <div className="lawu-layers" ref={ref} aria-hidden="true" data-landmark={place} data-lawu-flat="">
      <div className="lawu-orb" />
      <svg className="lawu-ridge" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <polygon points={`0,400 ${ridge} 1000,400`} />
      </svg>
      <div className="lawu-bank" />
      <svg className="lawu-fields" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <path d="M-80 265 Q120 170 320 251 T700 261 Q880 190 1100 226 V460 H-80Z" fill="#415b48" />
        {rows.map((d, i) => (
          <path key={d} d={d} fill="none" stroke={i % 3 === 0 ? "#80936d" : "#667f58"} strokeWidth={1.5 + i * 0.14} />
        ))}
      </svg>
      {place === "candi-cetho" && (
        <svg className="lawu-figure" viewBox="0 0 120 62">
          <path d="M4 56h112v5H4zM18 54V44h6v-8h5v-7h5v-7h4v-7h4V8h4v46zm84 0V44h-6v-8h-5v-7h-5v-7h-4v-7h-4V8h-4v46z" />
        </svg>
      )}
      {place === "candi-sukuh" && (
        <svg className="lawu-figure" viewBox="0 0 120 62">
          <path d="M5 56h110v5H5zM16 54l17-36h54l17 36z" />
          <path d="M55 54l3-34h5l3 34z" fill="#a79e7c" />
        </svg>
      )}
      {place === "grojogan-sewu" && (
        <svg className="lawu-figure" viewBox="0 0 120 62">
          <path d="M0 17l31-9 38 5 13-8 38 9v48H0z" />
          <path d="M51 12q4 24-3 44h13q-4-23 1-44z" fill="#c9dad1" />
        </svg>
      )}
      <div className="lawu-night" />
    </div>
  );
}
// Uses the unlocked film audio context and master bus, including its speaker toggle and background suspension.
export function LawuSound({ place }: { place: string }) {
  useEffect(() => {
    let revision = 0;
    let stop: (() => void) | undefined;
    const sync = () => {
      const request = ++revision;
      stop?.();
      stop = undefined;
      if (!audioStatus.voiceOn() || document.hidden) return;
      // The speaker publishes its preference just before unlocking a fresh AudioContext.
      void import("./lawu-audio")
        .then(({ mountAmbience }) => {
          const bus = audioStatus.environment();
          if (request === revision && bus && !document.hidden) stop = mountAmbience(bus, place);
        })
        .catch(() => {});
    };
    sync();
    const off = audioStatus.subscribe(sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      revision++;
      off();
      document.removeEventListener("visibilitychange", sync);
      stop?.();
    };
  }, [place]);
  return null;
}
