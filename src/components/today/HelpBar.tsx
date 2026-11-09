"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { prefersReducedMotion } from "@/engine/motion/tokens";
import { telHref, waLink, waNumber } from "@/engine/today/format";
import { guestShortName, type TripView } from "@/lib/trip";
import { CopyButton } from "./DayPlan";

const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 19.5l1.1-3.6A7.8 7.8 0 1 1 8.4 18.6z" />
    <path d="M9.2 9.1c.2 1.9 1.8 3.6 3.7 4.1l1-1 1.6.8c-.2 1-.9 1.5-1.9 1.4-2.6-.3-4.8-2.5-5-5.1 0-1 .5-1.7 1.4-1.9l.8 1.6z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.6 3.8l2.6.4 1.2 3.6-1.8 1.3a11 11 0 0 0 6.3 6.3l1.3-1.8 3.6 1.2.4 2.6c-.3 1.4-1.6 2.3-3 2.2C10 18.9 5.1 14 4.4 6.8c-.1-1.4.8-2.7 2.2-3z" />
  </svg>
);

/**
 * Bilah kontak sticky (PRD §7.6, FR-32/35): WhatsApp ke host/guide/translator dengan pesan EN yang sudah terisi,
 * telepon, dan sheet darurat (112/119/110 + alamat penginapan). Nomor & alamat hanya datang dari data privat.
 */
export function HelpBar({ data, onCopied }: { data: TripView; onCopied: (ok: boolean) => void }) {
  const { t, tx } = useI18n();
  const sheet = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const contacts = (data.private?.contacts ?? []).filter((c) => waNumber(c.whatsapp) || c.phone);
  const lodging = data.private?.lodging;
  const short = guestShortName(data);
  const message = data.role === "team" ? t("today.waTeam") : short ? t("today.waGuest", { name: short }) : t("today.waGuestNoName");

  const open = () => {
    setClosing(false);
    sheet.current?.showModal();
  };
  const close = () => {
    if (prefersReducedMotion()) return sheet.current?.close();
    setClosing(true);
    setTimeout(() => {
      sheet.current?.close();
      setClosing(false);
    }, 200);
  };

  return (
    <>
      <nav className="hb" aria-label={t("today.contacts")}>
        {contacts.slice(0, 3).map((c, i) => {
          const wa = waNumber(c.whatsapp);
          const name = tx(c.label);
          return wa ? (
            <a key={i} className="hb-btn hb-wa" href={waLink(wa, message)} target="_blank" rel="noopener noreferrer" aria-label={t("today.whatsapp", { name })}>
              <WaIcon />
              <span>{name}</span>
            </a>
          ) : (
            <a key={i} className="hb-btn" href={telHref(c.phone!)} aria-label={t("today.call", { name })}>
              <PhoneIcon />
              <span>{name}</span>
            </a>
          );
        })}
        <button type="button" className="hb-btn hb-sos" aria-haspopup="dialog" onClick={open}>
          <span className="hb-sosdot" aria-hidden="true" />
          <span>{t("today.emergency")}</span>
        </button>
      </nav>

      <dialog
        ref={sheet}
        className="sheet"
        aria-labelledby="sheet-title"
        data-closing={closing ? "" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // ketuk latar
        }}
      >
        <div className="sheet-body">
          <span className="sheet-grip" aria-hidden="true" />
          <h2 id="sheet-title" className="sheet-title">
            {t("today.emergencyTitle")}
          </h2>
          <p className="sheet-note">{t("today.emergencyNote")}</p>
          <ul className="sheet-nums">
            {(data.trip.emergency ?? []).map((e) => (
              <li key={e.number}>
                <a href={telHref(e.number)}>
                  <span className="sheet-num">{e.number}</span>
                  <span>{tx(e.label)}</span>
                </a>
              </li>
            ))}
          </ul>
          {contacts.some((c) => c.phone || c.whatsapp) && (
            <ul className="sheet-people">
              {contacts.map((c, i) => {
                const phone = c.phone ?? c.whatsapp;
                return phone ? (
                  <li key={i}>
                    <a href={telHref(phone)}>
                      <PhoneIcon />
                      <span>{t("today.call", { name: tx(c.label) })}</span>
                    </a>
                  </li>
                ) : null;
              })}
            </ul>
          )}
          {lodging?.address && (
            <section className="sheet-stay" aria-labelledby="sheet-stay">
              <h3 id="sheet-stay">{t("today.stay")}</h3>
              {lodging.name && <p className="sheet-stayname">{lodging.name}</p>}
              <p>{lodging.address}</p>
              <div className="tl-acts">
                {lodging.mapsUrl && (
                  <a className="act" href={lodging.mapsUrl} target="_blank" rel="noopener noreferrer">
                    <span>{t("today.maps")}</span>
                  </a>
                )}
                <CopyButton text={lodging.address} label={t("today.copy")} onCopied={onCopied} />
              </div>
            </section>
          )}
          <button type="button" className="sheet-close" onClick={close}>
            {t("today.close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
