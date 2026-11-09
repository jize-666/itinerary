"use client";
import { useEffect, useState } from "react";
import { getAudio } from "@/engine/audio/AudioEngine";
import { useI18n } from "@/engine/i18n/useI18n";
import { MOTION, prefersReducedMotion } from "@/engine/motion/tokens";
import { CODE_LENGTH } from "@/lib/code";
import { type AccessResult, type Session, sessionStore, UNKNOWN, verifyAccess } from "@/lib/session";
import { guestShortName, loadTrip, type TripView } from "@/lib/trip";
import { BeginChoice } from "./BeginChoice";
import { CodeInput } from "./CodeInput";
import { FlipText, Scramble, Words } from "./motion/Kinetic";
import { useCurtainNav } from "./motion/Curtain";
import { Ticket } from "./Ticket";
import { useSession } from "./useSession";

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "unlocking" } | Exclude<AccessResult, { kind: "ok" }>;

/**
 * Gerbang (PRD §7.1). Alur gerak: benang emas turun → kicker teracak → "Kulonuwun?" membalik huruf demi huruf →
 * kotak kode muncul berurutan. Kode benar → kotak menyala & menyatu jadi benang → kilat blencong → sambutan.
 * Kunjungan berikutnya langsung ke sambutan. Gunungan 3D yang membuka menyusul di fase film.
 */
export function Gate() {
  const session = useSession();
  const { t } = useI18n();
  const go = useCurtainNav();
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
      void loadTrip(r.session.token); // nama & tiket sudah siap saat sambutan tampil
      setStatus({ kind: "unlocking" });
      setTimeout(() => {
        setFresh(true);
        setStatus({ kind: "idle" });
        sessionStore.set(r.session);
      }, prefersReducedMotion() ? 0 : MOTION.unlock.dur);
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

  if (session)
    return (
      <Welcome
        session={session}
        fresh={fresh}
        onBegin={async (withSound) => {
          await go(session.role === "team" ? "/today/" : "/film/", prefersReducedMotion() ? 0 : 420); // stempel dulu, lalu tirai
          if (withSound) void getAudio().playSfx("gong", { gain: 0.85 }); // pukulan gong membuka lakon
        }}
      />
    );

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
  const isError = status.kind !== "idle" && status.kind !== "checking" && status.kind !== "unlocking";

  return (
    <main className="gate" data-unlocking={status.kind === "unlocking" ? "" : undefined}>
      <span className="gate-flare" aria-hidden="true" />
      <GateHead kicker={t("gate.kicker")} />
      <div className="gate-form">
        <Words as="p" className="gate-prompt" text={t("gate.prompt")} delay={1250} />
        <CodeInput
          key={attempt}
          length={CODE_LENGTH}
          label={t("gate.codeLabel")}
          enter={attempt === 0}
          state={status.kind === "checking" ? "checking" : status.kind === "unlocking" ? "success" : status.kind === "wrong" ? "error" : "idle"}
          disabled={status.kind === "checking" || status.kind === "unlocking" || locked || status.kind === "ended"}
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

function Welcome({ session, fresh, onBegin }: { session: Session; fresh: boolean; onBegin: (withSound: boolean) => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<TripView | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = data ? guestShortName(data) : null;
  // Data trip mulai diunduh di sini (dipakai lagi oleh Today); nama tamu hanya datang dari data privat.
  useEffect(() => {
    let alive = true;
    loadTrip(session.token).then((r) => {
      if (!alive) return;
      if (r.kind === "ok") setData(r.data);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [session.token]);
  return (
    <main className="gate gate--welcome" data-leaving={leaving ? "" : undefined}>
      <div className="gate-head">
        {session.role === "team" && <Scramble className="gate-kicker" text={t("gate.team")} />}
        <h1 className="gate-title" lang="jv">
          <FlipText text="Sugeng rawuh" />
          {name && <span className="gate-name k-shine">, {name}</span>}.
        </h1>
        <Words as="p" className="gate-prompt" delay={650} text={session.role === "guest" ? t(fresh ? "gate.forOne" : "gate.forOneBack") : t(fresh ? "gate.welcome" : "gate.welcomeBack")} />
      </div>
      {/* tempat tiket disiapkan sejak awal supaya judul & tombol tidak meloncat saat tiket datang */}
      {!failed && <div className="ticket-slot">{data && <Ticket data={data} compact delay={750} />}</div>}
      <BeginChoice
        onBegin={(withSound) => {
          setLeaving(true);
          onBegin(withSound);
        }}
      />
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
      <Scramble className="gate-kicker k-fade" text={kicker} delay={450} />
      <h1 className="gate-title">
        <FlipText text="Kulonuwun?" delay={600} shine />
      </h1>
    </div>
  );
}
