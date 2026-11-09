"use client";
import type { CSSProperties } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { fmtDay, fmtDur } from "@/engine/today/format";
import { calendarDiff, type TodayState } from "@/engine/today/schedule";
import type { DayView } from "@/lib/trip";
import { MapsLink } from "./DayPlan";

type Var = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Kartu Now / Next (PRD §7.6, FR-31): tempat sekarang dengan sisa waktunya, dan tempat berikutnya
 * dengan hitung mundur. Jam jemput (data privat) tampil langsung di sini: dari layar Today ke jam jemput 0 ketukan.
 */
export function NowNext({ s }: { s: TodayState<DayView> }) {
  const { lang, t, tx } = useI18n();
  const { now, next } = s;
  const when = (() => {
    if (!next || s.msToNext === null) return "";
    const gap = calendarDiff(s.date, next.day.date);
    if (gap === 0) return s.msToNext < 60_000 ? t("today.startingNow") : t("today.in", { d: fmtDur(s.msToNext, lang) });
    if (gap === 1) return t("today.tomorrowAt", { t: next.stop.start });
    return `${fmtDay(next.day.date, lang)}, ${next.stop.start}`;
  })();
  const label = s.phase === "before" ? t("today.firstScene") : t("today.next");

  return (
    <section className="nn" aria-label={`${t("today.now")} · ${t("today.next")}`}>
      {s.phase === "during" && (
        <div className="nn-row nn-now" data-free={now ? undefined : ""}>
          <p className="nn-label">
            <span className="nn-pulse" aria-hidden="true" />
            {t("today.now")}
          </p>
          {now ? (
            <>
              <h2 className="nn-title">{tx(now.stop.title)}</h2>
              <p className="nn-meta">
                {now.stop.end ? t("today.until", { t: now.stop.end }) : now.stop.start}
                {s.msLeftNow !== null && <> · {t("today.left", { d: fmtDur(s.msLeftNow, lang) })}</>}
              </p>
              <span className="nn-track" aria-hidden="true">
                <span className="nn-fill" style={{ "--p": s.progress ?? 0 } as Var} />
              </span>
              <MapsLink stop={now.stop} compact />
            </>
          ) : (
            <>
              <h2 className="nn-title">{next ? t("today.free") : t("today.wrap")}</h2>
              {next && <p className="nn-meta">{t("today.freeBody")}</p>}
            </>
          )}
        </div>
      )}
      {next && (
        <div className="nn-row nn-next">
          <p className="nn-label">
            {label}
            {when && <span className="nn-when"> · {when}</span>}
          </p>
          <h2 className="nn-title">{tx(next.stop.title)}</h2>
          <time className="nn-time" dateTime={`${next.day.date}T${next.stop.start}+07:00`}>
            {next.stop.start}
          </time>
          {next.stop.private?.pickup && <p className="nn-pickup">{t("today.pickup", { p: next.stop.private.pickup })}</p>}
          {next.stop.why && <p className="nn-meta">{tx(next.stop.why)}</p>}
          <MapsLink stop={next.stop} compact />
        </div>
      )}
    </section>
  );
}
