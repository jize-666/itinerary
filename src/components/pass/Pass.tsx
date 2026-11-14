"use client";
import type { CSSProperties, ReactNode } from "react";
import type { Lang } from "@/engine/i18n/lang";
import { useI18n } from "@/engine/i18n/useI18n";
import type { TripView } from "@/lib/trip";
import "./pass.css";

const fmtDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );

/** Pass hanya digambar bila nama tamu, rute (≥ 2 kode), dan hari pertama ada di trip-data. */
export const hasPass = (data: TripView) => !!data.private?.party?.name && (data.trip.route?.legs?.length ?? 0) >= 2 && !!data.trip.days[0];

/**
 * Lapisan kartu tiket: bayangan jauh di belakang, tebal, alas bertepi emas (kertas kawung + kilau), mata tali, dan isi
 * yang melayang di atas alas. Saat kartu miring (--mx / --my) ketiganya bergeser satu terhadap yang lain.
 */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="hm-card">
      <span className="hm-card-shadow" aria-hidden="true" />
      <span className="hm-card-back" aria-hidden="true" />
      <span className="hm-card-base" aria-hidden="true">
        <i className="hm-sheen" />
      </span>
      <span className="hm-eyelet" aria-hidden="true" />
      <div className="hm-card-body">{children}</div>
    </div>
  );
}

/**
 * Isi boarding pass: nama tamu dari data privat, rute dan tanggal dari konten trip; tidak ada yang tertanam di bundle.
 * Cap "Admitted" disiapkan tak terlihat; home menjatuhkannya saat lakon dimulai.
 */
export function PassFace({ data }: { data: TripView }) {
  const { lang, t, tx } = useI18n();
  const party = data.private?.party;
  const legs = data.trip.route?.legs ?? [];
  const first = data.trip.days[0];
  if (!party?.name || !first || legs.length < 2) return null;
  return (
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
  );
}

/**
 * Boarding pass yang tergantung di benang emas pendek (Today, film): berayun masuk sekali setelah `delay` ms, lalu
 * miring mengikuti arah pandang halaman. Di home, kartu yang sama tergantung di benang panjang (home/Scene.tsx Hang).
 */
export function HangingPass({ data, delay = 0, width, thread, className }: { data: TripView; delay?: number; width?: number; thread?: number; className?: string }) {
  if (!hasPass(data)) return null;
  const style = { "--d": `${delay}ms`, ...(width ? { "--card-w": `${width}px` } : {}), ...(thread ? { "--thread": `${thread}px` } : {}) } as CSSProperties;
  return (
    <div className={`pass-hold${className ? ` ${className}` : ""}`} style={style}>
      <div className="pass-swing">
        <span className="pass-thread" aria-hidden="true" />
        <Card>
          <PassFace data={data} />
        </Card>
      </div>
    </div>
  );
}
