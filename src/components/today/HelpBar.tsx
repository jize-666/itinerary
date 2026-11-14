"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { prefersReducedMotion } from "@/engine/motion/tokens";
import { telHref, waLink, waNumber } from "@/engine/today/format";
import { type Contact, guestShortName, type TripView } from "@/lib/trip";
import { IconChat, IconClose, IconPhone, IconPin, IconSiren } from "../Icons";
import { CopyButton } from "./DayPlan";

const phoneOf = (c: Contact) => c.phone ?? c.whatsapp;

/**
 * Dock bantuan di bawah layar (PRD §7.6, FR-32/35), mengikuti pola baca HP: aksi ada di bawah, dalam jangkauan ibu jari.
 * Kiri → kanan: WhatsApp host (utama, pesan EN sudah terisi), telepon host, SOS. Kontak lain (guide) dan
 * nomor darurat ada di sheet SOS. Nomor & alamat hanya datang dari data privat.
 */
export function HelpBar({ data, onCopied }: { data: TripView; onCopied: (ok: boolean) => void }) {
  const { t, tx } = useI18n();
  const sheet = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [closing, setClosing] = useState(false);
  const contacts = (data.private?.contacts ?? []).filter((c) => waNumber(c.whatsapp) || c.phone);
  const [main] = contacts;
  const lodging = data.private?.lodging;
  const short = guestShortName(data);
  const message = data.role === "team" ? t("today.waTeam") : short ? t("today.waGuest", { name: short }) : t("today.waGuestNoName");

  const open = () => {
    setClosing(false);
    sheet.current?.showModal();
    // fokus pindah ke judul sheet (dibacakan screen reader), bukan ke tombol tutup yang lalu tampak bercincin
    title.current?.focus({ preventScroll: true });
  };
  const close = () => {
    if (prefersReducedMotion()) return sheet.current?.close();
    setClosing(true);
    setTimeout(() => {
      sheet.current?.close();
      setClosing(false);
    }, 200);
  };

  const mainName = main ? tx(main.label) : "";
  const mainWa = main ? waNumber(main.whatsapp) : "";
  const mainPhone = main ? phoneOf(main) : undefined;

  return (
    <>
      <nav className="dock" aria-label={t("today.contacts")} data-solo={main ? undefined : ""}>
        {main &&
          (mainWa ? (
            <a className="pb pb--gold pb--lg dock-main" data-haptic="" href={waLink(mainWa, message)} target="_blank" rel="noopener noreferrer">
              <span className="pb-face">
                <span className="dock-ico">
                  <IconChat size={22} />
                </span>
                <span className="dock-label">
                  <small>WhatsApp</small> <span>{mainName}</span>
                </span>
              </span>
            </a>
          ) : (
            <a className="pb pb--gold pb--lg dock-main" data-haptic="" href={telHref(mainPhone!)}>
              <span className="pb-face">
                <span className="dock-ico">
                  <IconPhone size={22} />
                </span>
                <span className="dock-label">
                  <small>{t("today.callShort")}</small> <span>{mainName}</span>
                </span>
              </span>
            </a>
          ))}
        {main && mainWa && mainPhone && (
          <a className="pb pb--glass pb--lg pb--icon" href={telHref(mainPhone)} aria-label={t("today.call", { name: mainName })}>
            <span className="pb-face">
              <IconPhone size={22} />
            </span>
          </a>
        )}
        <button type="button" className="pb pb--sos pb--lg dock-sos" data-haptic="" aria-haspopup="dialog" onClick={open}>
          <span className="pb-face">
            <span className="dock-orb">
              <IconSiren size={20} />
            </span>
            <span>SOS</span>
            <span className="sr-only"> {t("today.emergency")}</span>
          </span>
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
          {/* pola modal: judul kiri atas, tutup kanan atas */}
          <div className="sheet-head">
            <h2 ref={title} id="sheet-title" className="sheet-title" tabIndex={-1}>
              {t("today.emergencyTitle")}
            </h2>
            <button type="button" className="pb pb--glass pb--sm pb--icon sheet-x" aria-label={t("today.close")} onClick={close}>
              <span className="pb-face">
                <IconClose />
              </span>
            </button>
          </div>
          <p className="sheet-note">{t("today.emergencyNote")}</p>
          <ul className="sheet-nums">
            {(data.trip.emergency ?? []).map((e) => (
              <li key={e.number}>
                <a className="pb pb--sos sheet-num" data-haptic="" href={telHref(e.number)}>
                  <span className="pb-face">
                    <span className="sheet-call" aria-hidden="true">
                      <IconPhone size={11} />
                    </span>
                    <span className="sheet-digits">{e.number}</span>
                    <span>{tx(e.label)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {contacts.length > 0 && (
            <ul className="sheet-people">
              {contacts.map((c, i) => {
                const name = tx(c.label);
                const wa = waNumber(c.whatsapp);
                const phone = phoneOf(c);
                return (
                  <li key={i}>
                    <span className="sheet-who">{name}</span>
                    <span className="sheet-acts">
                      {wa && (
                        <a className="pb pb--tonal pb--sm" href={waLink(wa, message)} target="_blank" rel="noopener noreferrer" aria-label={t("today.whatsapp", { name })}>
                          <span className="pb-face">
                            <IconChat size={18} />
                            <span>WhatsApp</span>
                          </span>
                        </a>
                      )}
                      {phone && (
                        <a className="pb pb--glass pb--sm" href={telHref(phone)} aria-label={t("today.call", { name })}>
                          <span className="pb-face">
                            <IconPhone size={18} />
                            <span>{t("today.callShort")}</span>
                          </span>
                        </a>
                      )}
                    </span>
                  </li>
                );
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
                  <a className="pb pb--tonal pb--sm" href={lodging.mapsUrl} target="_blank" rel="noopener noreferrer">
                    <span className="pb-face">
                      <IconPin />
                      <span>{t("today.maps")}</span>
                    </span>
                  </a>
                )}
                <CopyButton text={lodging.address} label={t("today.copy")} onCopied={onCopied} />
              </div>
            </section>
          )}
        </div>
      </dialog>
    </>
  );
}
