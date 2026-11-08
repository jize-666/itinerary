"use client";
import Link from "next/link";
import { useI18n } from "@/engine/i18n/useI18n";
import { useRequireSession } from "./useRequireSession";

/** Tempat film (Fase 3–5). Sementara: judul + jalan ke Today. */
export function FilmPlaceholder() {
  const session = useRequireSession();
  const { t } = useI18n();
  if (!session) return null;
  return (
    <main className="gate">
      <div className="gate-head">
        <h1 className="gate-title gate-title--sm">{t("film.title")}</h1>
        <p className="gate-prompt">{t("film.soon")}</p>
      </div>
      <Link className="begin-btn begin-btn--quiet film-link" href="/today/">
        <span className="begin-main">{t("film.toToday")}</span>
      </Link>
    </main>
  );
}
