"use client";
import { type CSSProperties, memo } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { Chapter, Film } from "@/engine/slides/build-slides";
import { IconCalm, IconDown, IconToday } from "../Icons";
import { CurtainLink } from "../motion/Curtain";

type Var = CSSProperties & Record<`--${string}`, string | number>;

/** Kiri atas: jalan ke Today (selalu terlihat, PRD §7.7) dan sakelar Calm. */
export function Corner({ calm, onCalm }: { calm: boolean; onCalm: (on: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="fl-corner">
      <CurtainLink className="pb pb--tonal pb--sm" href="/today/" aria-label={t("film.toToday")}>
        <span className="pb-face">
          <IconToday size={18} />
          <span>{t("film.today")}</span>
        </span>
      </CurtainLink>
      <button type="button" className="pb pb--glass pb--sm pb--icon fl-calm" data-sfx="ui-tok" aria-pressed={calm} aria-label={t("film.calm")} title={t("film.calm")} onClick={() => onCalm(!calm)}>
        <span className="pb-face">
          <IconCalm />
        </span>
      </button>
    </div>
  );
}

export function useChapterLabel() {
  const { t, tx } = useI18n();
  return (c: Chapter, long = false) => {
    if (c.kind === "day" && c.day) return long ? `${t("today.day", { n: c.day.n })} · ${tx(c.day.title)}` : t("today.day", { n: c.day.n });
    return t(c.kind === "prologue" ? "film.ch.prologue" : c.kind === "epilogue" ? "film.ch.epilogue" : "film.ch.credits");
  };
}

/**
 * Indikator bab (PRD §7.7): satu ruas per bab, terisi sesuai kemajuan slide di bab itu. Ketuk untuk melompat.
 * Yang bergerak hanya transform isi ruas.
 */
export const Rail = memo(function Rail({ film, index, onJump }: { film: Film; index: number; onJump: (to: number) => void }) {
  const { t } = useI18n();
  const label = useChapterLabel();
  const current = film.chapters.find((c) => index >= c.first && index <= c.last);
  return (
    <nav className="fl-rail" aria-label={t("film.chapters")}>
      <p className="fl-rail-label" aria-hidden="true">
        {current ? label(current, true) : ""}
      </p>
      <ol className="fl-rail-list">
        {film.chapters.map((c) => {
          const fill = index > c.last ? 1 : index < c.first ? 0 : (index - c.first + 1) / (c.last - c.first + 1);
          return (
            <li key={c.id} style={{ "--w": c.last - c.first + 1 } as Var}>
              <button type="button" className="fl-seg" data-press="" data-sfx="ui-tok" aria-current={c === current ? "step" : undefined} aria-label={label(c, true)} title={label(c, true)} onClick={() => onJump(c.first)}>
                <span className="fl-seg-bar">
                  <span className="fl-seg-fill" style={{ "--fill": fill } as Var} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

/** Petunjuk navigasi di slide pertama; hilang setelah dipakai sekali (PRD §7.7). */
/** Petunjuk gulir di slide pertama; saat gunungan pembuka tertancap (`kayon`) ditambah ajakan membaliknya. */
export function Hint({ shown, kayon = false }: { shown: boolean; kayon?: boolean }) {
  const { t } = useI18n();
  return (
    <p className="fl-hint" data-shown={shown ? "" : undefined} data-kayon={kayon ? "" : undefined} aria-hidden={!shown}>
      <span className="fl-hint-ico" aria-hidden="true">
        <IconDown size={16} />
      </span>
      <span>{t("film.hint")}</span>
      <span className="fl-hint-keys">{t("film.hintKeys")}</span>
      {kayon && <span className="fl-hint-kayon">{t("film.kayonHint")}</span>}
    </p>
  );
}
