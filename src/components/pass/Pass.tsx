"use client";
import { type CSSProperties, type ReactNode, type Ref, useId } from "react";
import type { Lang } from "@/engine/i18n/lang";
import { useI18n } from "@/engine/i18n/useI18n";
import type { TripView } from "@/lib/trip";
import "./pass.css";

export const fmtDate = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );

/** Pass hanya digambar bila nama tamu, rute (≥ 2 kode), dan hari pertama ada di trip-data. */
export const hasPass = (data: TripView) => !!data.private?.party?.name && (data.trip.route?.legs?.length ?? 0) >= 2 && !!data.trip.days[0];

/**
 * Lapisan kartu tiket: bayangan jauh di belakang, tebal, alas bertepi emas (kertas kawung + kilau), mata tali, dan isi
 * yang melayang di atas alas. Saat kartu miring (--mx / --my) ketiganya bergeser satu terhadap yang lain.
 */
export function Card({ children, shadow = true }: { children: ReactNode; shadow?: boolean }) {
  return (
    <div className="hm-card">
      {shadow && <span className="hm-card-shadow" aria-hidden="true" />}
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

/** Inisial tamu (maks. 2 huruf) dari nama di data privat; dihitung saat render, tidak tertanam di bundle. */
const initialsOf = (name: string) =>
  name
    .normalize("NFC")
    .trim()
    .split(/\s+/u)
    .map((w) => [...w][0] ?? "")
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();

/**
 * Punggung kartu (mode `toy`): kertas nila berpola kawung berlapis foil emas, monogram inisial tamu, "Matur nuwun" dan
 * keterangan terima kasih. Sepadan dengan punggung tiket 3D (stage3d/pass3d/faces.ts). Dekoratif: isi tiket ada di muka depan.
 */
function PassBack({ name }: { name: string }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="pass-back" aria-hidden="true">
      <span className="pass-back-base" />
      <svg className="pass-kawung" width="100%" height="100%" focusable="false">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1dca6" />
            <stop offset="0.5" stopColor="#b48a42" />
            <stop offset="1" stopColor="#e8cf92" />
          </linearGradient>
          <pattern id={`${id}p`} width="36" height="36" patternUnits="userSpaceOnUse">
            <g fill="none" stroke={`url(#${id}f)`} strokeWidth="1">
              <ellipse cx="18" cy="9" rx="5" ry="9" />
              <ellipse cx="18" cy="27" rx="5" ry="9" />
              <ellipse cx="9" cy="18" rx="9" ry="5" />
              <ellipse cx="27" cy="18" rx="9" ry="5" />
            </g>
            <circle cx="18" cy="18" r="1.6" fill={`url(#${id}f)`} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}p)`} />
      </svg>
      <div className="pass-back-body">
        <span className="pass-mono">{initialsOf(name)}</span>
        <p className="pass-thanks" lang="jv">
          Matur nuwun
        </p>
        <p className="pass-caption">{t("ticket.thanksCaption")}</p>
      </div>
      <i className="hm-sheen" />
    </div>
  );
}

/**
 * Boarding pass yang tergantung di benang emas pendek (Today, film): berayun masuk sekali setelah `delay` ms, lalu
 * miring mengikuti arah pandang halaman. Di home, kartu yang sama tergantung di benang panjang (home/Scene.tsx Hang).
 */
export function HangingPass({
  data,
  delay = 0,
  width,
  thread,
  className,
  toy,
  holdRef,
}: {
  data: TripView;
  delay?: number;
  width?: number;
  thread?: number;
  className?: string;
  /** Kartu dua muka yang digerakkan pengendali (film 2,5D, film/pass-toy.ts): ayun, putar, balik. Today dan home tidak memakainya. */
  toy?: boolean;
  holdRef?: Ref<HTMLDivElement>;
}) {
  if (!hasPass(data)) return null;
  const style = { "--d": `${delay}ms`, ...(width ? { "--card-w": `${width}px` } : {}), ...(thread ? { "--thread": `${thread}px` } : {}) } as CSSProperties;
  if (toy) {
    // bayangan jauh di luar putaran: tetap di belakang kartu di semua sudut yaw; muka depan dan belakang di dalamnya
    return (
      <div ref={holdRef} className={`pass-hold pass-toy${className ? ` ${className}` : ""}`} style={style}>
        <div className="pass-swing">
          <span className="hm-card-shadow" aria-hidden="true" />
          <span className="pass-thread" aria-hidden="true" />
          <div className="pass-turn">
            <Card shadow={false}>
              <PassFace data={data} />
            </Card>
            <PassBack name={data.private?.party?.name ?? ""} />
          </div>
        </div>
      </div>
    );
  }
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
