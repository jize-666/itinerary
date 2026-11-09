"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { Lang } from "@/engine/i18n/lang";
import { sessionStore, type TripResult } from "@/lib/session";
import { daysUntil, loadTrip, type TripView } from "@/lib/trip";
import { Ticket } from "./Ticket";
import { useRequireSession } from "./useRequireSession";

type State = { kind: "loading" } | Exclude<TripResult<TripView>, { kind: "unauthorized" }>;

const dayDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/**
 * Today versi awal: seluruh jadwal sebagai teks DOM (PRD FR-12), diambil dari trip-data dengan token.
 * Versi lengkap (kartu "sekarang/berikutnya", offline, Calm mode) dibangun di Fase 2.
 */
export function TodayPreview() {
  const session = useRequireSession();
  const { lang, t, tx } = useI18n();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const token = session?.token;

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
        <p className="gate-prompt" role="status" aria-live="polite">
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
  const countdown = left > 1 ? t("today.countdown", { n: left }) : left === 1 ? t("today.tomorrow") : left === 0 ? t("today.today") : "";
  return (
    <main className="today">
      <header className="today-head">
        <p className="gate-kicker">{t("today.title")}</p>
        <h1 className="today-title">{tx(trip.title)}</h1>
        {greeting && <p className="today-greeting">{greeting}</p>}
        {countdown && <p className="today-count">{countdown}</p>}
        <Ticket data={state.data} />
        <Link className="today-film" href="/film/">
          {t("today.toFilm")}
        </Link>
      </header>
      {trip.days.map((d) => (
        <section key={d.n} className="today-day" aria-labelledby={`day-${d.n}`}>
          <h2 id={`day-${d.n}`}>
            <span className="today-daynum">
              {t("today.day", { n: d.n })} · {dayDate(d.date, lang)}
            </span>
            {tx(d.title)}
          </h2>
          <p className="today-sub">{tx(d.subtitle)}</p>
          <ol className="today-stops">
            {d.stops.map((s) => (
              <li key={s.id}>
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
      ))}
    </main>
  );
}
