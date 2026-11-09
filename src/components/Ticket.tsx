"use client";
import type { Lang } from "@/engine/i18n/lang";
import { useI18n } from "@/engine/i18n/useI18n";
import type { TripView } from "@/lib/trip";

const fmtDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );

/**
 * Tiket pribadi (versi DOM dari boarding pass 3D). Semua isinya dari trip-data setelah kode benar:
 * nama tamu dari data privat, rute & tanggal dari konten trip. Tidak ada yang tertanam di bundle.
 */
export function Ticket({ data, compact = false, delay = 0 }: { data: TripView; compact?: boolean; delay?: number }) {
  const { lang, t, tx } = useI18n();
  const party = data.private?.party;
  const legs = data.trip.route?.legs ?? [];
  const first = data.trip.days[0];
  if (!party?.name || legs.length < 2 || !first) return null;
  return (
    <article className="ticket" data-compact={compact ? "" : undefined} style={{ "--d": `${delay}ms` } as React.CSSProperties} aria-label={`${t("ticket.kicker")}: ${party.name}`}>
      <span className="ticket-shine" aria-hidden="true" />
      <div className="ticket-top">
        <span>{t("ticket.kicker")}</span>
        <span>{t("ticket.admit")}</span>
      </div>
      <p className="ticket-label">{t("ticket.passenger")}</p>
      <p className="ticket-name">{party.name}</p>
      <ol className="ticket-route" aria-label={tx(data.trip.route?.label)}>
        {legs.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <dl className="ticket-grid">
        <div>
          <dt>{t("ticket.date")}</dt>
          <dd>{fmtDate(first.date, lang)}</dd>
        </div>
        <div>
          <dt>{t("ticket.seat")}</dt>
          <dd>{t("ticket.seatValue")}</dd>
        </div>
        <div>
          <dt>{t("ticket.gate")}</dt>
          <dd className="ticket-foil" lang="jv">
            Kulonuwun
          </dd>
        </div>
      </dl>
      <div className="ticket-stub" aria-hidden="true" />
      <span className="ticket-stamp" aria-hidden="true">
        {t("ticket.stamp")}
      </span>
    </article>
  );
}
