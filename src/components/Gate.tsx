"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { CODE_LENGTH } from "@/lib/code";
import { type AccessResult, type Session, sessionStore, UNKNOWN, verifyAccess } from "@/lib/session";
import { guestShortName, loadTrip, type TripView } from "@/lib/trip";
import { BeginChoice } from "./BeginChoice";
import { CodeInput } from "./CodeInput";
import { Ticket } from "./Ticket";
import { useSession } from "./useSession";

type Status = { kind: "idle" } | { kind: "checking" } | Exclude<AccessResult, { kind: "ok" }>;

/**
 * Gerbang (PRD §7.1), versi fungsional. Versi sinematik (blencong, gunungan membuka) menyusul di fase film.
 * Kode benar → token disimpan → dua tombol Begin. Kunjungan berikutnya langsung ke tombol Begin.
 */
export function Gate() {
  const session = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(0);

  const locked = lockedUntil > now;
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        clearInterval(id);
        setLockedUntil(0);
        setStatus({ kind: "idle" });
      }
    }, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const submit = async (code: string) => {
    setStatus({ kind: "checking" });
    const r = await verifyAccess(code);
    if (r.kind === "ok") {
      setFresh(true);
      setStatus({ kind: "idle" });
      sessionStore.set(r.session);
      return;
    }
    if (r.kind === "locked") {
      const n = Date.now();
      setNow(n);
      setLockedUntil(n + r.retryAfter * 1000);
    }
    if (r.kind === "wrong") setAttempt((a) => a + 1);
    setStatus(r);
  };

  if (session === UNKNOWN) {
    return (
      <main className="gate">
        <GateHead kicker={t("gate.kicker")} />
      </main>
    );
  }

  if (session) return <Welcome session={session} fresh={fresh} onBegin={() => router.push(session.role === "team" ? "/today/" : "/film/")} />;

  const secs = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
  const message =
    status.kind === "checking" ? t("gate.checking")
    : status.kind === "wrong" ? t("gate.wrong")
    : status.kind === "locked" ? t("gate.locked", { s: secs })
    : status.kind === "offline" ? t("gate.offline")
    : status.kind === "server" ? t("gate.server")
    : status.kind === "ended" ? t("gate.ended")
    : "";
  const hint =
    status.kind !== "wrong" || status.remaining < 1 || status.remaining > 3 ? "" : status.remaining === 1 ? t("gate.remainingOne") : t("gate.remaining", { n: status.remaining });
  const isError = status.kind !== "idle" && status.kind !== "checking";

  return (
    <main className="gate">
      <GateHead kicker={t("gate.kicker")} />
      <div className="gate-form">
        <p className="gate-prompt" id="gate-prompt">
          {t("gate.prompt")}
        </p>
        <CodeInput
          key={attempt}
          length={CODE_LENGTH}
          label={t("gate.codeLabel")}
          disabled={status.kind === "checking" || locked || status.kind === "ended"}
          shake={status.kind === "wrong"}
          onComplete={submit}
          onInput={() => {
            if (isError && !locked) setStatus({ kind: "idle" });
          }}
        />
        <p className="gate-msg" role={isError ? "alert" : "status"} aria-live="polite" data-error={isError ? "" : undefined}>
          {message}
          {hint && (
            <>
              <br />
              <span className="gate-hint">{hint}</span>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function Welcome({ session, fresh, onBegin }: { session: Session; fresh: boolean; onBegin: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<TripView | null>(null);
  const name = data ? guestShortName(data) : null;
  // Data trip mulai diunduh di sini (dipakai lagi oleh Today); nama tamu hanya datang dari data privat.
  useEffect(() => {
    let alive = true;
    loadTrip(session.token).then((r) => {
      if (alive && r.kind === "ok") setData(r.data);
    });
    return () => {
      alive = false;
    };
  }, [session.token]);
  return (
    <main className="gate gate--welcome">
      <div className="gate-head">
        {session.role === "team" && <p className="gate-kicker">{t("gate.team")}</p>}
        <h1 className="gate-title" lang="jv">
          Sugeng rawuh{name && <span className="gate-name">, {name}</span>}.
        </h1>
        <p className="gate-prompt">{session.role === "guest" ? t(fresh ? "gate.forOne" : "gate.forOneBack") : t(fresh ? "gate.welcome" : "gate.welcomeBack")}</p>
      </div>
      {data && <Ticket data={data} compact />}
      <BeginChoice onBegin={onBegin} />
      <button type="button" className="gate-switch" onClick={() => sessionStore.clear()}>
        {t("gate.switch")}
      </button>
    </main>
  );
}

/** Judul gerbang: benang emas turun dari atas, pendar blencong di belakang "Kulonuwun?". */
function GateHead({ kicker }: { kicker: string }) {
  return (
    <div className="gate-head gate-head--invite">
      <span className="gate-thread" aria-hidden="true" />
      <p className="gate-kicker">{kicker}</p>
      <h1 className="gate-title">Kulonuwun?</h1>
    </div>
  );
}
