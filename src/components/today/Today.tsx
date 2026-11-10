"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { fmtAgo, fmtClock, fmtDay } from "@/engine/today/format";
import { todayState } from "@/engine/today/schedule";
import { sessionStore } from "@/lib/session";
import { loadTrip, peekTrip, type TripLoad, type TripView } from "@/lib/trip";
import { IconPlay, IconRefresh } from "../Icons";
import { InstallGuide } from "../InstallGuide";
import { Benang, CountUp, Gamelan, Gunungan } from "../motion/Kinetic";
import { CurtainLink, useCurtainOpen } from "../motion/Curtain";
import { Ticket } from "../Ticket";
import { useRequireSession } from "../useRequireSession";
import { BeforeYouGo } from "./BeforeYouGo";
import { DayPlan } from "./DayPlan";
import { HelpBar } from "./HelpBar";
import { isPreview, useNow, useOnline } from "./hooks";
import { NowNext } from "./NowNext";

type State = { kind: "loading" } | TripLoad;
const STALE_MS = 5 * 60_000;

/**
 * Mode Today (PRD §7.6): ringan, tanpa WebGL, fokus informasi.
 * Sebelum trip → hitung mundur + Before you go. Selama trip → hari ini, Now/Next, timeline, kontak.
 * Setelah trip → ucapan terima kasih. Data tampil seketika dari salinan di perangkat, lalu diperbarui dari jaringan.
 */
export function Today() {
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
      else setState((prev) => (r.kind === "ok" || prev.kind !== "ok" ? r : prev)); // gagal tanpa salinan: yang sudah tampil tetap tampil
    });
    return () => {
      alive = false;
    };
  }, [token, reload]);

  // perbarui saat sinyal kembali, atau saat dibuka lagi setelah lama di latar
  const savedAt = state.kind === "ok" ? state.savedAt : 0;
  useEffect(() => {
    const again = () => setReload((n) => n + 1);
    const wake = () => {
      if (document.visibilityState === "visible" && Date.now() - savedAt > STALE_MS) again();
    };
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [savedAt]);

  if (!session) return null;
  const view = state.kind === "loading" && snap ? snap : state;

  if (view.kind !== "ok") {
    const msg = view.kind === "loading" ? t("today.loading") : view.kind === "offline" ? t("today.offline") : t("today.server");
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
  return <TodayView data={view.data} savedAt={view.savedAt} stale={view.stale} onRefresh={() => setReload((n) => n + 1)} />;
}

function TodayView({ data, savedAt, stale, onRefresh }: { data: TripView; savedAt: number; stale: boolean; onRefresh: () => void }) {
  const { lang, t, tx } = useI18n();
  const at = useNow();
  const online = useOnline();
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { trip } = data;
  const s = todayState(trip.days, at);
  const greeting = tx(data.private?.party?.greeting);

  const onCopied = useCallback(
    (ok: boolean) => {
      setToast(t(ok ? "today.copied" : "today.copyFail"));
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 2400);
    },
    [t],
  );
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const offline = stale || !online;
  const during = s.phase === "during";
  const meta = (
    <div className="td-statusrow">
      <p className="td-status" data-offline={offline ? "" : undefined}>
        <span className="td-dot" aria-hidden="true" />
        <span>{offline ? t("today.offlineSaved", { t: fmtAgo(savedAt, at, lang) }) : t("today.updated", { t: fmtAgo(savedAt, at, lang) })}</span>
        {offline && online && (
          <button type="button" className="pb pb--glass pb--xs td-refresh" onClick={onRefresh}>
            <span className="pb-face">
              <IconRefresh size={14} />
              <span>{t("today.refresh")}</span>
            </span>
          </button>
        )}
      </p>
      <CurtainLink className="pb pb--glass pb--sm today-film" href="/film/">
        <span className="pb-face">
          <IconPlay />
          <span>{t("today.toFilm")}</span>
        </span>
      </CurtainLink>
    </div>
  );
  return (
    <main className="td" data-phase={s.phase}>
      {isPreview() && (
        <p className="td-preview">
          Preview · {fmtDay(s.date, lang)} {fmtClock(at)} WIB · <a href="/today/">{t("today.now")}</a>
        </p>
      )}
      <header className="td-head">
        {during ? (
          <>
            <Benang className="td-kicker" text={s.day ? `${t("today.day", { n: s.day.n })} · ${fmtDay(s.date, lang)}` : fmtDay(s.date, lang)} />
            <Gunungan as="h1" className="td-title" text={s.day ? tx(s.day.title) : tx(trip.title)} delay={80} />
            {(s.day?.sunrise || s.day?.sunset) && (
              <p className="td-sun">
                {s.day.sunrise && <span data-sun="rise">{t("today.sunrise", { t: s.day.sunrise })}</span>}
                {s.day.sunset && <span data-sun="set">{t("today.sunset", { t: s.day.sunset })}</span>}
              </p>
            )}
          </>
        ) : s.phase === "before" ? (
          <>
            <Benang className="td-kicker" text={t("today.title")} delay={100} />
            <Gunungan as="h1" className="td-title" text={tx(trip.title)} delay={250} />
            {greeting && <Gamelan as="p" className="td-greeting" text={greeting} delay={900} />}
            <Countdown days={s.daysToStart} />
            <Ticket data={data} delay={1300} />
          </>
        ) : (
          <>
            <Benang className="td-kicker" text={t("today.afterKicker")} delay={100} />
            <Gunungan as="h1" className="td-title" text={tx(trip.epilogue?.title) || tx(trip.title)} delay={250} />
            {trip.epilogue && <p className="td-sub">{tx(trip.epilogue.body)}</p>}
            {greeting && <Gamelan as="p" className="td-greeting" text={greeting} delay={900} />}
            <Ticket data={data} delay={1200} />
          </>
        )}
        {!during && meta}
      </header>

      {/* selama trip: Now/Next langsung di bawah judul (terlihat tanpa scroll), catatan hari menyusul */}
      {during && <NowNext s={s} />}
      {during && (
        <div className="td-meta">
          {s.day && <p className="td-sub">{tx(s.day.subtitle)}</p>}
          {s.day?.dressCode && <p className="td-dress">{tx(s.day.dressCode)}</p>}
          {meta}
        </div>
      )}
      {data.role === "team" && data.team && <TeamNotes team={data.team} />}
      {s.phase === "before" && s.next && <NowNext s={s} />}
      {s.phase === "before" && <BeforeYouGo items={trip.beforeYouGo ?? []} />}
      {s.phase === "before" && <InstallGuide />}
      <DayPlan days={trip.days} s={s} at={at} onCopied={onCopied} />
      {s.phase !== "before" && <InstallGuide />}
      <p className="td-wib">{t("today.allWib")}</p>
      <HelpBar data={data} onCopied={onCopied} />
      <p className="toast" role="status" aria-live="polite" data-shown={toast ? "" : undefined}>
        {toast}
      </p>
    </main>
  );
}

function Countdown({ days }: { days: number }) {
  const { t } = useI18n();
  if (days < 0) return null;
  if (days <= 1) return <p className="today-count">{t(days === 1 ? "today.tomorrow" : "today.today")}</p>;
  const [before, after] = t("today.countdown", { n: "\u0000" }).split("\u0000");
  return (
    <p className="today-count">
      {before}
      <CountUp value={days} delay={700} />
      {after}
    </p>
  );
}

/** Catatan tim (ID). Hanya ada di respons untuk token tim; di halaman tamu kolom ini tidak pernah terkirim. */
function TeamNotes({ team }: { team: NonNullable<TripView["team"]> }) {
  const { t } = useI18n();
  const rows = [
    ["today.team.medical", team.medical],
    ["today.team.party", team.partyNote],
    ["today.team.prefs", team.preferences],
  ] as const;
  if (!rows.some(([, v]) => v)) return null;
  return (
    <section className="team" aria-labelledby="team-title">
      <h2 id="team-title" className="dp-title">
        {t("today.team")}
      </h2>
      <dl>
        {rows.map(([k, v]) =>
          v ? (
            <div key={k} data-key={k}>
              <dt>{t(k)}</dt>
              <dd>{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
