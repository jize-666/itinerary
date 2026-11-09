"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { guestShortName, loadTrip } from "@/lib/trip";
import { Canting, Gamelan, Gunungan } from "./motion/Kinetic";
import { CurtainLink, useCurtainOpen } from "./motion/Curtain";
import { useRequireSession } from "./useRequireSession";

/** Tempat film (Fase 3–5). Sementara: judul + jalan ke Today. */
export function FilmPlaceholder() {
  const session = useRequireSession();
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);
  const token = session?.token;
  useCurtainOpen();
  useEffect(() => {
    if (!token) return;
    let alive = true;
    loadTrip(token).then((r) => {
      if (alive && r.kind === "ok") setName(guestShortName(r.data));
    });
    return () => {
      alive = false;
    };
  }, [token]);
  if (!session) return null;
  return (
    <main className="gate">
      <div className="gate-head">
        <Gunungan as="h1" className="gate-title gate-title--sm" text={t("film.title")} delay={300} />
        {name && (
          <p className="film-for">
            <Canting tone="gold" text={t("film.for", { name })} delay={1400} />
          </p>
        )}
        <Gamelan as="p" className="gate-prompt" text={t("film.soon")} delay={2100} />
      </div>
      <CurtainLink className="begin-btn begin-btn--quiet film-link k-late" href="/today/">
        <span className="begin-main">{t("film.toToday")}</span>
      </CurtainLink>
    </main>
  );
}
