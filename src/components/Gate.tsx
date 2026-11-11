"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAudio } from "@/engine/audio/AudioEngine";
import { useI18n } from "@/engine/i18n/useI18n";
import { MOTION, prefersReducedMotion } from "@/engine/motion/tokens";
import { todayState } from "@/engine/today/schedule";
import { CODE_LENGTH } from "@/lib/code";
import { type AccessResult, type Session, sessionStore, UNKNOWN, verifyAccess } from "@/lib/session";
import { guestShortName, loadTrip, peekTrip, type TripView } from "@/lib/trip";
import { BeginChoice } from "./BeginChoice";
import { CodeInput } from "./CodeInput";
import { Pass } from "./home/Pass";
import { Hang, Stage } from "./home/Scene";
import { IconKey } from "./Icons";
import { Bayang, Benang, Canting, Gamelan } from "./motion/Kinetic";
import { useCurtainNav } from "./motion/Curtain";
import { useSession } from "./useSession";

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "unlocking" } | Exclude<AccessResult, { kind: "ok" }>;

/**
 * Home (PRD §7.1), 2,5D: kartu undangan tergantung di benang emas di depan panggung berlapis (langit, Lawu, lantai
 * pendapa, dua kayon penjaga). Kode benar → huruf menyala, kayon menyibak, kartu berbalik menjadi boarding pass
 * di sambutan. Panggungnya satu untuk gerbang dan sambutan, jadi pergantian itu tidak mengulang adegan.
 * Kunjungan berikutnya langsung ke sambutan dengan gerak yang lebih singkat.
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
      void loadTrip(r.session.token); // nama & boarding pass sudah siap saat sambutan tampil
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

  // sebelum sesi di perangkat terbaca: panggungnya saja, supaya tamu yang kembali tidak sempat melihat kartu kode
  if (session === UNKNOWN) return <Stage mode="gate">{null}</Stage>;

  if (session)
    return (
      <Stage mode="welcome">
        <Welcome
          session={session}
          fresh={fresh}
          onBegin={async (withSound, during) => {
            // selama trip (dan untuk tim) yang dibutuhkan jadwal hari ini; sebelum trip, filmnya
            await go(session.role === "team" || during ? "/today/" : "/film/", prefersReducedMotion() ? 0 : 420); // cap dulu, lalu tirai
            if (withSound) void getAudio().playSfx("gong", { gain: 0.85 }); // pukulan gong membuka lakon
          }}
        />
      </Stage>
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
  const unlocking = status.kind === "unlocking";

  return (
    <Stage mode="gate" unlocking={unlocking}>
      <Hang kind="invite" flip={unlocking ? "out" : undefined}>
        <InviteHead kicker={t("gate.kicker")} />
        <div className="hm-form">
          <Gamelan as="p" className="hm-prompt" text={t("gate.prompt")} delay={1500} />
          <CodeInput
            key={attempt}
            length={CODE_LENGTH}
            label={t("gate.codeLabel")}
            enter={attempt === 0}
            state={status.kind === "checking" ? "checking" : unlocking ? "success" : status.kind === "wrong" ? "error" : "idle"}
            disabled={status.kind === "checking" || unlocking || locked || status.kind === "ended"}
            onComplete={submit}
            onInput={() => {
              if (isError && !locked) setStatus({ kind: "idle" });
            }}
          />
          <p className="hm-msg" role={isError ? "alert" : "status"} aria-live="polite" data-error={isError ? "" : undefined}>
            {message}
            {hint && (
              <>
                <br />
                <span className="hm-msg-hint">{hint}</span>
              </>
            )}
          </p>
        </div>
      </Hang>
    </Stage>
  );
}

/** Trip sedang berlangsung (kalender WIB)? */
const isDuring = (d: TripView | null | undefined) => !!d && todayState(d.trip.days).phase === "during";

function Welcome({ session, fresh, onBegin }: { session: Session; fresh: boolean; onBegin: (withSound: boolean, during: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<TripView | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = data ? guestShortName(data) : null;
  // Kunjungan ulang: sapaan tidak perlu ditunggu lagi, jadi tundanya dipersingkat.
  const pace = fresh ? 1 : 0.35;
  // Data trip mulai diunduh di sini (dipakai lagi oleh Today); nama tamu hanya datang dari data privat.
  useEffect(() => {
    let alive = true;
    // Kunjungan ulang selama trip: Today langsung tampil (PRD §7.6), tanpa menunggu jaringan.
    if (!fresh && isDuring(peekTrip(session.token)?.data)) {
      router.replace("/today/");
      return;
    }
    loadTrip(session.token).then((r) => {
      if (!alive) return;
      if (r.kind === "ok") {
        if (!fresh && isDuring(r.data)) return router.replace("/today/");
        setData(r.data);
      } else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [session.token, fresh, router]);
  return (
    <div className="hm-welcome" data-fresh={fresh ? "" : undefined} data-leaving={leaving ? "" : undefined}>
      <div className="hm-head">
        {session.role === "team" && <Benang className="hm-kicker" text={t("gate.team")} />}
        <h1 className="hm-title hm-title--welcome" lang="jv">
          {/* tiap baris satu kesatuan: koma ikut "rawuh" dan titik ikut nama, jadi di HP barisnya tidak pecah di tanda baca */}
          <span className="hm-nowrap">
            <Bayang text="Sugeng rawuh" delay={150 * pace} />
            {name ? <span className="hm-comma">,</span> : "."}
          </span>
          {name && (
            <>
              {" "}
              <span className="hm-nowrap">
                <Canting className="hm-name" tone="gold" text={name} delay={900 * pace} />.
              </span>
            </>
          )}
        </h1>
        <Gamelan as="p" className="hm-prompt" delay={1250 * pace} text={session.role === "guest" ? t(fresh ? "gate.forOne" : "gate.forOneBack") : t(fresh ? "gate.welcome" : "gate.welcomeBack")} />
      </div>
      {/* tempat boarding pass disiapkan sejak awal supaya judul & tombol tidak meloncat saat datanya datang */}
      {!failed && <div className="hm-pass-slot">{data && <Pass data={data} flip="in" />}</div>}
      <div className="hm-actions">
        <BeginChoice
          onBegin={(withSound) => {
            setLeaving(true);
            onBegin(withSound, isDuring(data));
          }}
        />
        {/* jalan keluar yang jarang dipakai: tautan kecil di bawah tombol utama, tidak bersaing dengannya */}
        <button type="button" data-press="" className="hb hb--link hm-switch" onClick={() => sessionStore.clear()}>
          <IconKey size={15} />
          <span>{t("gate.switch")}</span>
        </button>
      </div>
    </div>
  );
}

/** Kepala undangan: kicker dijahit benang, "Kulonuwun?" muncul sebagai bayangan yang menajam. */
function InviteHead({ kicker }: { kicker: string }) {
  return (
    <div className="hm-head">
      <Benang className="hm-kicker" text={kicker} delay={450} />
      <h1 className="hm-title">
        <Bayang text="Kulonuwun?" delay={650} />
      </h1>
    </div>
  );
}
