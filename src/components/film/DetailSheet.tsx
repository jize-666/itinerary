"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { EASE, prefersReducedMotion } from "@/engine/motion/tokens";
import type { PanelSlide } from "@/engine/slides/build-slides";
import { fmtDay, fmtSpan } from "@/engine/today/format";
import { IconClose } from "../Icons";
import { CopyButton, MapsLink } from "../today/DayPlan";

const SWEET = { low: "today.sweet.low", mid: "today.sweet.mid", high: "today.sweet.high" } as const;
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** Letak & ukuran huruf judul kartu saat sheet dibuka: titik berangkat judul sheet. */
export type SheetOrigin = { rect: DOMRect; fontSize: number };

const OPEN = { duration: 420, easing: EASE.expoOut } as const; // sama dengan animasi sheet-up di globals.css
const CLOSE = { duration: 200, easing: EASE.power3Out } as const; // sama dengan sheet-down

/**
 * Sheet detail tempat (PRD §7.3 butir 4, FR-23): cerita, tips, dress code, penanda makanan, tombol Maps, Plan B.
 * Memakai <dialog> bawaan (fokus terkunci, Escape menutup, fokus kembali ke tombol pembuka), dan isinya
 * di-scroll biasa. `slide` null = tertutup.
 *
 * Shared element: judul sheet "terbang" dari judul kartu dan kembali ke sana saat ditutup. Dikerjakan dengan
 * FLIP (satu animasi transform), bukan View Transitions: tanpa memotret seluruh halaman, jalan di semua browser.
 * Gerak judul memakai durasi & kurva yang sama dengan gerak sheet, jadi lintasannya lurus.
 */
export function DetailSheet({ slide, origin, onClose, onCopied }: { slide: PanelSlide | null; origin: SheetOrigin | null; onClose: () => void; onCopied: (ok: boolean) => void }) {
  const { lang, t, tx } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [closing, setClosing] = useState(false);
  // isi terakhir tetap tampil selama animasi menutup
  const [shown, setShown] = useState<PanelSlide | null>(slide);
  if (slide && slide !== shown) setShown(slide);

  /** Geseran & skala yang menempatkan judul sheet tepat di atas judul kartu, dari letaknya saat ini. */
  const offset = (extraY = 0) => {
    const title = titleRef.current;
    if (!title || !origin || prefersReducedMotion()) return null;
    const now = title.getBoundingClientRect();
    const scale = origin.fontSize / (parseFloat(getComputedStyle(title).fontSize) || origin.fontSize);
    return `translate3d(${origin.rect.left - now.left}px, ${origin.rect.top - now.top + extraY}px, 0) scale(${scale})`;
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (slide && !el.open) {
      el.showModal();
      // sheet baru mulai naik: judulnya berangkat dari judul kartu
      const from = offset();
      if (from) titleRef.current?.animate([{ transform: from }, { transform: "none" }], OPEN);
    }
    if (!slide && el.open) el.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat sheet dibuka/ditutup
  }, [slide]);

  const close = () => {
    if (prefersReducedMotion()) return onClose();
    // sheet turun setinggi dirinya; judul mengimbanginya supaya mendarat tepat di judul kartu
    const body = ref.current?.querySelector<HTMLElement>(".sheet-body");
    const back = offset(-(body?.offsetHeight ?? 0));
    const flight = back ? titleRef.current?.animate([{ transform: "none" }, { transform: back }], { ...CLOSE, fill: "forwards" }) : undefined;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
      flight?.cancel(); // sheet sudah tertutup: judul kembali ke tempat asalnya untuk pembukaan berikutnya
    }, CLOSE.duration);
  };

  const stop = shown?.stop;
  const address = stop?.private?.address ?? stop?.maps?.query;
  const food = stop?.food;
  return (
    <dialog
      ref={ref}
      className="sheet fl-sheet"
      aria-labelledby="fl-sheet-title"
      data-closing={closing ? "" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={() => slide && onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // ketuk latar
      }}
    >
      {shown && stop && (
        <div className="sheet-body" data-scroll="">
          <span className="sheet-grip" aria-hidden="true" />
          <div className="sheet-head">
            <p className="fl-sheet-when">
              {t("today.day", { n: shown.day.n })} · {fmtDay(shown.day.date, lang)} · <time>{fmtSpan(stop.start, stop.end)}</time>
            </p>
            <button type="button" className="pb pb--glass pb--sm pb--icon sheet-x" aria-label={t("today.close")} onClick={close}>
              <span className="pb-face">
                <IconClose />
              </span>
            </button>
          </div>
          <h2 id="fl-sheet-title" ref={titleRef} className="sheet-title">
            {tx(stop.title)}
          </h2>
          {stop.story && <p className="fl-sheet-story">{tx(stop.story)}</p>}
          {stop.why && <p className="sheet-note">{tx(stop.why)}</p>}
          {stop.private?.pickup && <p className="tl-pickup">{t("today.pickup", { p: stop.private.pickup })}</p>}
          {(stop.optional || stop.dressCode || food) && (
            <ul className="chips">
              {stop.optional && <li className="chip">{t("today.optional")}</li>}
              {stop.dressCode && <li className="chip chip--dress">{tx(stop.dressCode)}</li>}
              {food?.halal && <li className="chip chip--food">{t("today.halal")}</li>}
              {food?.sweet && <li className="chip chip--food">{t(SWEET[food.sweet])}</li>}
              {food?.banana === false && <li className="chip chip--banana">{t("today.noBanana")}</li>}
            </ul>
          )}
          {food?.note && <p className="sheet-note">{tx(food.note)}</p>}
          {stop.tips && (
            <p className="fl-sheet-row">
              <strong>{t("today.tip")}</strong>
              {tx(stop.tips)}
            </p>
          )}
          {stop.planB && (
            <p className="fl-sheet-row" data-rain="">
              <strong>{t("today.planB")}</strong>
              {tx(stop.planB)}
            </p>
          )}
          {(stop.teamNote || stop.estCost !== undefined) && (
            <p className="fl-sheet-row" data-team="">
              {stop.teamNote && (
                <>
                  <strong>{t("today.teamNote")}</strong>
                  {stop.teamNote}
                </>
              )}
              {stop.estCost !== undefined && (
                <>
                  <strong>{t("today.estCost")}</strong>
                  {rupiah(stop.estCost)}
                </>
              )}
            </p>
          )}
          {(stop.private?.mapsUrl || stop.maps?.url || address) && (
            <div className="tl-acts">
              <MapsLink stop={stop} />
              {address && <CopyButton text={address} label={t("today.copyFor", { place: tx(stop.title) })} onCopied={onCopied} />}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
