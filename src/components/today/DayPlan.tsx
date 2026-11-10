"use client";
import { type CSSProperties, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { fmtDay, fmtSpan } from "@/engine/today/format";
import { timeline, type TodayState } from "@/engine/today/schedule";
import type { DayView, StopView } from "@/lib/trip";
import { IconCheck, IconCopy, IconPin } from "../Icons";
import { copyText } from "./hooks";

type Var = CSSProperties & Record<`--${string}`, string | number>;
const SWEET = { low: "today.sweet.low", mid: "today.sweet.mid", high: "today.sweet.high" } as const;
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** URL Maps: alamat privat menang atas query publik (alamat jemput spesifik tidak pernah ada di repo). */
export const mapsUrl = (s: StopView) => s.private?.mapsUrl ?? s.maps?.url;
const addressOf = (s: StopView) => s.private?.address ?? s.maps?.query;

export function MapsLink({ stop, compact = false }: { stop: StopView; compact?: boolean }) {
  const { t, tx } = useI18n();
  const href = mapsUrl(stop);
  if (!href) return null;
  return (
    <a
      className={compact ? "pb pb--tonal pb--icon" : "pb pb--tonal pb--sm"}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("today.mapsFor", { place: tx(stop.title) })}
    >
      <span className="pb-face">
        <IconPin size={compact ? 20 : 18} />
        {!compact && <span>{t("today.maps")}</span>}
      </span>
    </a>
  );
}

/** Tombol sekunder: ikon berubah jadi centang sebentar setelah alamat tersalin. */
export function CopyButton({ text, label, onCopied }: { text: string; label: string; onCopied: (ok: boolean) => void }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="pb pb--glass pb--sm"
      data-done={done ? "" : undefined}
      aria-label={label}
      onClick={async () => {
        const ok = await copyText(text);
        onCopied(ok);
        if (!ok) return;
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      <span className="pb-face">
        {done ? <IconCheck /> : <IconCopy />}
        <span>{t("today.copy")}</span>
      </span>
    </button>
  );
}

/**
 * Jadwal per hari (PRD §7.6): pilihan hari, toggle "Rain plan", dan timeline dengan chip dress code,
 * penanda makanan (halal / tingkat manis / tanpa pisang), tombol Maps & salin alamat.
 */
export function DayPlan({ days, s, at, onCopied }: { days: DayView[]; s: TodayState<DayView>; at: number; onCopied: (ok: boolean) => void }) {
  const { lang, t, tx } = useI18n();
  const [picked, setPicked] = useState<number | null>(null);
  const [rain, setRain] = useState(false);
  const day = days.find((d) => d.n === picked) ?? days.find((d) => d.n === s.focus?.n) ?? days[0];
  if (!day) return null;
  const changes = day.stops.filter((x) => x.planB).length;
  const ends = new Map(timeline([day]).map((x) => [x.stop, x.endAt]));
  const stateOf = (stop: StopView): StopState =>
    s.now?.stop === stop ? "now" : s.next?.stop === stop ? "next" : (ends.get(stop) ?? Infinity) <= at ? "past" : undefined;

  return (
    <section className="dp" aria-labelledby="dp-title">
      <div className="dp-head">
        <h2 id="dp-title" className="dp-title">
          {t("today.programme")}
        </h2>
        <button type="button" className="rain" aria-pressed={rain} onClick={() => setRain((r) => !r)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 12a8.5 8.5 0 0 1 17 0z" fill="currentColor" fillOpacity="0.16" />
            <path d="M12 12v6.5a2 2 0 0 1-4 0" />
          </svg>
          <span>{t("today.rain")}</span>
          <span className="rain-knob" aria-hidden="true" />
        </button>
      </div>

      <div className="dp-tabs" role="group" aria-label={t("today.days")}>
        {days.map((d) => (
          <button
            key={d.n}
            type="button"
            className="dp-tab"
            aria-pressed={d.n === day.n}
            aria-current={d.n === s.day?.n ? "date" : undefined}
            onClick={() => setPicked(d.n)}
          >
            <span className="dp-tabn">{t("today.day", { n: d.n })}</span>
            <span className="dp-tabd">{fmtDay(d.date, lang)}</span>
          </button>
        ))}
      </div>

      {rain && (
        <p className="dp-rainnote" role="status">
          {t("today.rainOn")}
          {changes > 0 && ` (${changes})`}
        </p>
      )}

      <div key={day.n} className="dp-day">
        <h3 className="dp-daylabel">
          {t("today.day", { n: day.n })} · {fmtDay(day.date, lang)}
        </h3>
        <p className="dp-daytitle">{tx(day.title)}</p>
        {day.dressCode && day.n !== s.day?.n && <p className="dp-dress">{tx(day.dressCode)}</p>}
        <ol className="tl" style={{ "--n": day.stops.length } as Var}>
          {day.stops.map((stop, i) => (
            <Stop key={stop.id} stop={stop} i={i} rain={rain} state={stateOf(stop)} onCopied={onCopied} />
          ))}
        </ol>
      </div>
    </section>
  );
}

type StopState = "past" | "now" | "next" | undefined;

function Stop({ stop, i, rain, state, onCopied }: { stop: StopView; i: number; rain: boolean; state: StopState; onCopied: (ok: boolean) => void }) {
  const { t, tx } = useI18n();
  const food = stop.food;
  const address = addressOf(stop);
  const showPlanB = rain && stop.planB;
  return (
    <li className="tl-stop" data-phase={stop.phase ?? "day"} data-state={state} data-rain={showPlanB ? "" : undefined} style={{ "--i": i } as Var}>
      <time className="tl-time">{fmtSpan(stop.start, stop.end)}</time>
      <div className="tl-body">
        <h4 className="tl-title">
          {tx(stop.title)}
          {state === "now" && <span className="tag tag--now">{t("today.now")}</span>}
          {state === "next" && <span className="tag tag--next">{t("today.next")}</span>}
          {state === "past" && <span className="sr-only"> · {t("today.past")}</span>}
          {stop.optional && <span className="tag">{t("today.optional")}</span>}
        </h4>
        {stop.why && <p className="tl-why">{tx(stop.why)}</p>}
        {stop.private?.pickup && <p className="tl-pickup">{t("today.pickup", { p: stop.private.pickup })}</p>}
        {(stop.dressCode || food) && (
          <ul className="chips">
            {stop.dressCode && <li className="chip chip--dress">{tx(stop.dressCode)}</li>}
            {food?.halal && <li className="chip chip--food">{t("today.halal")}</li>}
            {food?.sweet && <li className="chip chip--food">{t(SWEET[food.sweet])}</li>}
            {food?.banana === false && <li className="chip chip--banana">{t("today.noBanana")}</li>}
          </ul>
        )}
        {food?.note && <p className="tl-note">{tx(food.note)}</p>}
        {stop.tips && (
          <p className="tl-note">
            <strong>{t("today.tip")}:</strong> {tx(stop.tips)}
          </p>
        )}
        {showPlanB && (
          <p className="tl-planb">
            <strong>{t("today.planB")}:</strong> {tx(stop.planB)}
          </p>
        )}
        {(stop.teamNote || stop.estCost !== undefined) && (
          <p className="tl-team">
            {stop.teamNote && (
              <>
                <strong>{t("today.teamNote")}:</strong> {stop.teamNote}{" "}
              </>
            )}
            {stop.estCost !== undefined && (
              <>
                <strong>{t("today.estCost")}:</strong> {rupiah(stop.estCost)}
              </>
            )}
          </p>
        )}
        {(mapsUrl(stop) || address) && (
          <div className="tl-acts">
            <MapsLink stop={stop} />
            {address && <CopyButton text={address} label={t("today.copyFor", { place: tx(stop.title) })} onCopied={onCopied} />}
          </div>
        )}
      </div>
    </li>
  );
}
