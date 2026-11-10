"use client";
import { type CSSProperties, memo } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { PanelSlide } from "@/engine/slides/build-slides";
import { fmtSpan } from "@/engine/today/format";
import type { Phase, StopView, TripView } from "@/lib/trip";
import { IconStory } from "../Icons";
import { Benang, Gunungan } from "../motion/Kinetic";
import { MapsLink } from "../today/DayPlan";
import { useLive } from "./Slides";

type Var = CSSProperties & Record<`--${string}`, string | number>;
const SWEET = { low: "today.sweet.low", mid: "today.sweet.mid", high: "today.sweet.high" } as const;
const PHASE = { dawn: "film.phase.dawn", day: "film.phase.day", dusk: "film.phase.dusk", night: "film.phase.night" } as const;

/** Lukisan garis kecil penanda waktu: matahari naik, tinggi, turun, atau bulan sabit di atas cakrawala. */
function PhaseArt({ phase }: { phase: Phase }) {
  const sun = { dawn: 40, day: 17, dusk: 40, night: 0 }[phase];
  return (
    <svg className="gal-art" data-phase={phase} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      {phase === "night" ? (
        <>
          <path className="gal-art-body" d="M66 12a16 16 0 1 0 14 24 13 13 0 0 1-14-24Z" />
          <path d="M30 14v6M27 17h6M96 8v4M94 10h4M104 28v4M102 30h4" />
        </>
      ) : (
        <>
          <circle className="gal-art-body" cx="60" cy={sun} r="13" />
          {phase === "day" ? <path d="M60 36v6M38 17h-6M88 17h-6M44.4 32.6l-4.2 4.2M75.6 32.6l4.2 4.2" /> : <path d="M60 20v-7M41 26l-5-5M79 26l5-5M33 40h-7M94 40h-7" />}
        </>
      )}
      <path className="gal-art-land" d="M2 46c18-7 30-7 44 0s26 7 40 0 22-6 32-2" />
      <path className="gal-art-land" d="M10 54c20-5 34-5 50 0s30 5 50 0" opacity="0.55" />
    </svg>
  );
}

/** Stop yang dilebur ke panel ini (istirahat, transfer, ibadah): satu baris jam + nama. */
function Notes({ label, stops }: { label: string; stops: StopView[] }) {
  const { tx } = useI18n();
  if (stops.length === 0) return null;
  return (
    <ul className="gal-notes">
      {stops.map((s) => (
        <li key={s.id}>
          <span className="gal-notes-k">{label}</span>
          <time>{s.start}</time>
          <span>{tx(s.title)}</span>
        </li>
      ))}
    </ul>
  );
}

const Card = memo(function Card({ data, slide, current, onOpen }: { data: TripView; slide: PanelSlide; current: boolean; onOpen: (slide: PanelSlide) => void }) {
  const { t, tx } = useI18n();
  const live = useLive(slide.id);
  const { stop } = slide;
  const phase: Phase = stop.phase ?? "day";
  const photo = stop.photo ? data.manifest?.find((p) => p.id === stop.photo) : undefined;
  const title = tx(stop.title);
  return (
    <li className="gal-card" data-unit={slide.id} data-live={live ? "" : undefined} data-cur={current ? "" : undefined} data-phase={phase} aria-hidden={!current} inert={!current}>
      <article className="gal-paper">
        {photo ? (
          // foto berlisensi dari manifest (PRD §12.6); ukuran responsif menyusul bersama pipeline aset (Tugas 21)
          // eslint-disable-next-line @next/next/no-img-element -- situs statis, gambar sudah dioptimalkan pipeline
          <img className="gal-photo" src={`/photos/${photo.file}`} alt={tx(photo.alt)} loading="lazy" decoding="async" />
        ) : (
          <PhaseArt phase={phase} />
        )}
        <p className="gal-meta">
          <time className="gal-time">{fmtSpan(stop.start, stop.end)}</time>
          <span className="gal-phase">{t(PHASE[phase])}</span>
          <span className="gal-n">{t("film.panel", { n: slide.n, total: slide.of })}</span>
        </p>
        <Gunungan as="h2" className="gal-title" text={title} delay={80} />
        {stop.why && (
          <p className="gal-why f-rise" style={{ "--d": "420ms" } as Var}>
            {tx(stop.why)}
          </p>
        )}
        <div className="gal-foot f-rise" style={{ "--d": "560ms" } as Var}>
          {(stop.optional || stop.dressCode || stop.food) && (
            <ul className="chips">
              {stop.optional && <li className="chip">{t("today.optional")}</li>}
              {stop.dressCode && <li className="chip chip--dress">{tx(stop.dressCode)}</li>}
              {stop.food?.halal && <li className="chip chip--food">{t("today.halal")}</li>}
              {stop.food?.sweet && <li className="chip chip--food">{t(SWEET[stop.food.sweet])}</li>}
              {stop.food?.banana === false && <li className="chip chip--banana">{t("today.noBanana")}</li>}
            </ul>
          )}
          <Notes label={t("film.before")} stops={slide.lead} />
          <Notes label={t("film.then")} stops={slide.then} />
          <div className="gal-acts">
            <button type="button" className="pb pb--tonal pb--sm" aria-label={t("film.storyFor", { place: title })} aria-haspopup="dialog" onClick={() => onOpen(slide)}>
              <span className="pb-face">
                <IconStory />
                <span>{t("film.story")}</span>
              </span>
            </button>
            <MapsLink stop={stop} compact />
          </div>
        </div>
      </article>
    </li>
  );
});

/**
 * Horizontal gallery satu hari (PRD §7.3, FR-21): semua kartu berada di satu rel; pindah slide = rel bergeser
 * satu kartu. Kartu aktif di tengah, tetangganya mengintip redup di kiri-kanan.
 */
export function Gallery({ data, slides, step, onOpen }: { data: TripView; slides: PanelSlide[]; step: number; onOpen: (slide: PanelSlide) => void }) {
  const { t, tx } = useI18n();
  const day = slides[0]?.day;
  return (
    <div className="fl-body fl-body--gallery">
      {day && (
        <p className="fs-kicker gal-head">
          <Benang text={`${t("today.day", { n: day.n })} · ${tx(day.title)}`} />
        </p>
      )}
      <ol className="gal-track" style={{ "--i": step } as Var}>
        {slides.map((s, i) => (
          <Card key={s.id} data={data} slide={s} current={i === step} onOpen={onOpen} />
        ))}
      </ol>
    </div>
  );
}
