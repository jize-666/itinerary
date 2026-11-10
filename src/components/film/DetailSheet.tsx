"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { prefersReducedMotion } from "@/engine/motion/tokens";
import type { PanelSlide } from "@/engine/slides/build-slides";
import { fmtDay, fmtSpan } from "@/engine/today/format";
import { IconClose } from "../Icons";
import { CopyButton, MapsLink } from "../today/DayPlan";

const SWEET = { low: "today.sweet.low", mid: "today.sweet.mid", high: "today.sweet.high" } as const;
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/**
 * Sheet detail tempat (PRD §7.3 butir 4, FR-23): cerita, tips, dress code, penanda makanan, tombol Maps, Plan B.
 * Memakai <dialog> bawaan (fokus terkunci, Escape menutup, fokus kembali ke tombol pembuka), dan isinya
 * di-scroll biasa. `slide` null = tertutup.
 */
export function DetailSheet({ slide, onClose, onCopied }: { slide: PanelSlide | null; onClose: () => void; onCopied: (ok: boolean) => void }) {
  const { lang, t, tx } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  // isi terakhir tetap tampil selama animasi menutup
  const [shown, setShown] = useState<PanelSlide | null>(slide);
  if (slide && slide !== shown) setShown(slide);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (slide && !el.open) el.showModal();
    if (!slide && el.open) el.close();
  }, [slide]);

  const close = () => {
    if (prefersReducedMotion()) return onClose();
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
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
          <h2 id="fl-sheet-title" className="sheet-title">
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
