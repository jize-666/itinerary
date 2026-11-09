"use client";
import { type CSSProperties, useEffect, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { Lang } from "@/engine/i18n/lang";
import { sessionStore, type TripResult } from "@/lib/session";
import { type DayView, daysUntil, loadTrip, type TripView } from "@/lib/trip";
import { CountUp, Scramble, Words } from "./motion/Kinetic";
import { CurtainLink, useCurtainOpen } from "./motion/Curtain";
import { useReveal } from "./motion/useReveal";
import { Ticket } from "./Ticket";
import { useRequireSession } from "./useRequireSession";

type State = { kind: "loading" } | Exclude<TripResult<TripView>, { kind: "unauthorized" }>;
type Var = CSSProperties & Record<`--${string}`, string | number>;

const dayDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/**
 * Today versi awal: seluruh jadwal sebagai teks DOM (PRD FR-12), diambil dari trip-data dengan token.
 * Gerak: judul naik dari balik tirai, hitung mundur bergulir, tiap hari muncul saat di-scroll dengan benang emas
 * yang menjalar di antara stop (titik berwarna menurut fase: subuh, siang, senja, malam).
 * Versi lengkap (kartu "sekarang/berikutnya", offline, Calm mode) dibangun di Fase 2.
 */
export function TodayPreview() {
  const session = useRequireSession();
  const { t, tx } = useI18n();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const token = session?.token;
  useCurtainOpen();

  useEffect(() => {
    if (!token) return;
    let alive = true;
    loadTrip(token, reload > 0).then((r) => {
      if (!alive) return;
      if (r.kind === "unauthorized") sessionStore.clear(); // token kedaluwarsa/dicabut → kembali ke gerbang
      else setState(r);
    });
    return () => {
      alive = false;
    };
  }, [token, reload]);

  if (!session) return null;

  if (state.kind !== "ok") {
    const msg = state.kind === "loading" ? t("today.loading") : state.kind === "offline" ? t("today.offline") : t("today.server");
    return (
      <main className="gate">
        <p className="gate-prompt today-loading" role="status" aria-live="polite">
          {msg}
        </p>
        {state.kind !== "loading" && (
          <button
            type="button"
            className="begin-btn begin-btn--quiet"
            onClick={() => {
              setState({ kind: "loading" });
              setReload((n) => n + 1);
            }}
          >
            <span className="begin-main">{t("today.retry")}</span>
          </button>
        )}
      </main>
    );
  }

  const { trip } = state.data;
  const greeting = tx(state.data.private?.party?.greeting);
  const left = trip.days[0] ? daysUntil(trip.days[0].date) : -1;
  // angka hitung mundur bergulir di tengah kalimat: kalimat dipecah di posisi {n}
  const [before, after] = left > 1 ? t("today.countdown", { n: "\u0000" }).split("\u0000") : [left === 1 ? t("today.tomorrow") : left === 0 ? t("today.today") : "", ""];
  return (
    <main className="today">
      <header className="today-head">
        <Scramble className="gate-kicker" text={t("today.title")} />
        <Words as="h1" className="today-title" mode="curtain" text={tx(trip.title)} delay={150} />
        {greeting && <Words as="p" className="today-greeting" text={greeting} delay={550} />}
        {(before || after) && (
          <p className="today-count">
            {before}
            {left > 1 && <CountUp value={left} delay={850} />}
            {after}
          </p>
        )}
        <Ticket data={state.data} delay={1000} />
        <CurtainLink className="today-film" href="/film/">
          {t("today.toFilm")}
        </CurtainLink>
      </header>
      {trip.days.map((d) => (
        <Day key={d.n} d={d} />
      ))}
    </main>
  );
}

function Day({ d }: { d: DayView }) {
  const { lang, t, tx } = useI18n();
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="today-day" data-shown={shown ? "" : undefined} aria-labelledby={`day-${d.n}`}>
      <span className="today-bignum" aria-hidden="true">
        {String(d.n).padStart(2, "0")}
      </span>
      <h2 id={`day-${d.n}`}>
        <span className="today-daynum">
          {t("today.day", { n: d.n })} · {dayDate(d.date, lang)}
        </span>
        <span className="today-dtitle">{tx(d.title)}</span>
      </h2>
      <p className="today-sub">{tx(d.subtitle)}</p>
      <ol className="today-stops" style={{ "--n": d.stops.length } as Var}>
        {d.stops.map((s, i) => (
          <li key={s.id} data-phase={s.phase ?? "day"} style={{ "--i": i } as Var}>
            <time className="today-time">{s.end ? `${s.start}–${s.end}` : s.start}</time>
            <div>
              <p className="today-stop">{tx(s.title)}</p>
              {s.why && <p className="today-why">{tx(s.why)}</p>}
              {(s.teamNote || s.estCost !== undefined) && (
                <p className="today-team">
                  {s.teamNote && (
                    <>
                      <strong>{t("today.teamNote")}:</strong> {s.teamNote}{" "}
                    </>
                  )}
                  {s.estCost !== undefined && (
                    <>
                      <strong>{t("today.estCost")}:</strong> {rupiah(s.estCost)}
                    </>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
