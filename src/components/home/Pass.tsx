"use client";
import type { Lang } from "@/engine/i18n/lang";
import { useI18n } from "@/engine/i18n/useI18n";
import type { TripView } from "@/lib/trip";
import { Hang } from "./Scene";

const fmtDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );

/**
 * Boarding pass di sambutan (2,5D): tergantung di benang emas, miring mengikuti kursor, cap "Admitted" jatuh dari
 * depan saat lakon dimulai. Semua isinya dari trip-data setelah kode benar; tidak ada yang tertanam di bundle.
 */
export function Pass({ data, flip }: { data: TripView; flip?: "in" }) {
  const { lang, t, tx } = useI18n();
  const party = data.private?.party;
  const legs = data.trip.route?.legs ?? [];
  const first = data.trip.days[0];
  if (!party?.name || legs.length < 2 || !first) return null;
  return (
    <Hang kind="pass" flip={flip}>
      <article className="hm-pass" aria-label={`${t("ticket.kicker")}: ${party.name}`}>
        <div className="hm-pass-main">
          <div className="hm-pass-top">
            <span>{t("ticket.kicker")}</span>
            <span>{t("ticket.admit")}</span>
          </div>
          <p className="hm-pass-label">{t("ticket.passenger")}</p>
          <p className="hm-pass-name">{party.name}</p>
          <ol className="hm-pass-route" aria-label={tx(data.trip.route?.label)}>
            {legs.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ol>
        </div>
        <div className="hm-pass-stub">
          <dl className="hm-pass-grid">
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
              <dd className="hm-pass-foil" lang="jv">
                Kulonuwun
              </dd>
            </div>
          </dl>
          <div className="hm-pass-bars" aria-hidden="true" />
        </div>
        <span className="hm-pass-stamp" aria-hidden="true">
          <span>{t("ticket.stamp")}</span>
        </span>
      </article>
    </Hang>
  );
}
