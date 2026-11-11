"use client";
import { createContext, type CSSProperties, type ReactNode, useContext, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import type { Slide } from "@/engine/slides/build-slides";
import type { LiveStore } from "@/engine/slides/live";
import { fmtDay, fmtSpan, waLink, waNumber } from "@/engine/today/format";
import { guestShortName, type TripView } from "@/lib/trip";
import { IconChat, IconClose, IconGong, IconHomeAdd, IconToday } from "../Icons";
import { InstallGuide } from "../InstallGuide";
import { CurtainLink } from "../motion/Curtain";
import { Bayang, Benang, Canting, CountUp, Gamelan, Gunungan } from "../motion/Kinetic";
import { Ticket } from "../Ticket";

type Var = CSSProperties & Record<`--${string}`, string | number>;
const d = (ms: number): Var => ({ "--d": `${ms}ms` });

// ---- unit hidup: reveal teks baru berjalan saat penonton tiba di slide/kartu ini ----
export const LiveContext = createContext<LiveStore | null>(null);
const never = () => () => {};
export function useLive(id: string): boolean {
  const store = useContext(LiveContext);
  return useSyncExternalStore(
    store?.subscribe ?? never,
    () => store?.has(id) ?? true,
    () => false,
  );
}

/** Angka yang baru bergulir ketika slidenya hidup. */
function LiveCount({ id, value, delay }: { id: string; value: number; delay: number }) {
  return useLive(id) ? <CountUp value={value} delay={delay} /> : <span className="k-num">0</span>;
}

/** Blok teks yang naik pelan (opacity + transform saja). */
const Rise = ({ as: Tag = "p", className = "", delay = 0, children }: { as?: "p" | "div" | "ul" | "ol" | "dl"; className?: string; delay?: number; children: ReactNode }) => (
  <Tag className={`f-rise ${className}`.trim()} style={d(delay)}>
    {children}
  </Tag>
);

type Ctx = { data: TripView; slide: Slide };

function Hero({ data }: Ctx) {
  const { t, tx } = useI18n();
  const name = guestShortName(data);
  return (
    <div className="fl-body fl-body--center fs-hero">
      <span className="fs-gong" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {data.trip.city && (
        <p className="fs-kicker">
          <Benang text={data.trip.city} delay={200} />
        </p>
      )}
      <h1 className="fs-display">
        <Bayang key={tx(data.trip.title)} text={tx(data.trip.title)} delay={500} />
      </h1>
      {name && (
        <p className="fs-for">
          <Canting tone="gold" text={t("film.for", { name })} delay={1900} />
        </p>
      )}
    </div>
  );
}

function Headline({ data }: Ctx) {
  const { tx } = useI18n();
  const pro = data.trip.prologue;
  return (
    <div className="fl-body fl-body--low">
      {pro?.kicker && (
        <p className="fs-kicker">
          <Benang text={tx(pro.kicker)} />
        </p>
      )}
      <Gamelan as="h2" className="fs-h1 fs-wide" text={tx(pro?.headline)} delay={260} />
    </div>
  );
}

function Intro({ data }: Ctx) {
  const { tx } = useI18n();
  return (
    <div className="fl-body fl-body--low">
      <span className="f-rule" aria-hidden="true" />
      <Rise className="fs-lede" delay={160}>
        {tx(data.trip.prologue?.intro)}
      </Rise>
    </div>
  );
}

function Fact({ slide }: Ctx) {
  const { tx } = useI18n();
  if (slide.kind !== "fact") return null;
  return (
    <div className="fl-body fl-body--low fs-split">
      <div>
        <p className="fs-count" aria-hidden="true">
          <span>{String(slide.n).padStart(2, "0")}</span>
          <span className="fs-count-of">/ {String(slide.of).padStart(2, "0")}</span>
        </p>
        <Gunungan as="h2" className="fs-h1" text={tx(slide.fact.title)} delay={120} />
      </div>
      <Rise className="fs-lede fs-side" delay={620}>
        {tx(slide.fact.body)}
      </Rise>
    </div>
  );
}

function Route({ data, slide }: Ctx) {
  const { t, tx } = useI18n();
  if (slide.kind !== "route") return null;
  const legs = data.trip.route?.legs ?? [];
  const counters = [
    [slide.days, t("film.count.days")],
    [slide.stops, t("film.count.stops")],
    [1, t("film.count.city")],
  ] as const;
  return (
    <div className="fl-body fl-body--center fs-route">
      <p className="fs-kicker">
        <Benang text={t("film.route")} />
      </p>
      <ol className="fs-legs" aria-label={tx(data.trip.route?.label)} style={{ "--n": legs.length } as Var}>
        {legs.map((code, i) => (
          <li key={code} style={{ "--i": i } as Var}>
            <span className="fs-leg-dot" aria-hidden="true" />
            <span className="fs-leg-code">{code}</span>
          </li>
        ))}
      </ol>
      <Rise className="fs-routelabel" delay={900}>
        {tx(data.trip.route?.label)}
      </Rise>
      <dl className="fs-counters">
        {counters.map(([n, label], i) => (
          <div key={label} className="f-rise" style={d(1100 + i * 140)}>
            <dd>
              <LiveCount id={slide.id} value={n} delay={1200 + i * 140} />
            </dd>
            <dt>{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Team({ slide }: Ctx) {
  const { t, tx } = useI18n();
  if (slide.kind !== "team") return null;
  return (
    <div className="fl-body fl-body--center">
      <p className="fs-kicker">
        <Benang text={t("film.team")} />
      </p>
      <ul className="fs-team">
        {slide.contacts.map((c, i) => {
          const name = tx(c.label);
          return (
            <li key={i} className="f-rise" style={d(300 + i * 140)}>
              <span className="fs-avatar" aria-hidden="true">
                {Array.from(name)[0]?.toUpperCase()}
              </span>
              <span className="fs-teamname">{name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Phrases({ slide }: Ctx) {
  const { lang, t } = useI18n();
  const [turned, setTurned] = useState<ReadonlySet<number>>(new Set());
  if (slide.kind !== "phrases") return null;
  const flip = (i: number) =>
    setTurned((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  return (
    <div className="fl-body fl-body--center">
      <p className="fs-kicker">
        <Benang text={t("film.phrases")} />
      </p>
      <ul className="fs-phrases">
        {slide.phrases.map((p, i) => (
          <li key={p.jv} className="f-rise" style={d(260 + i * 110)}>
            {/* kartu bolak-balik: depan bahasa Jawa, belakang artinya; kedua sisi tetap terbaca pembaca layar */}
            <button type="button" className="fs-phrase" data-press="" data-sfx="ui-tok" aria-pressed={turned.has(i)} onClick={() => flip(i)}>
              <span className="fs-phrase-in">
                <span className="fs-phrase-face" lang="jv">
                  {p.jv}
                </span>
                <span className="fs-phrase-face fs-phrase-back">{lang === "id" ? p.id : p.en}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Rise className="fs-fine" delay={900}>
        {t("film.phrasesHint")}
      </Rise>
    </div>
  );
}

function DayCard({ slide }: Ctx) {
  const { lang, t, tx } = useI18n();
  if (slide.kind !== "daycard") return null;
  const { day } = slide;
  return (
    <div className="fl-body fl-body--low fs-split">
      <div>
        <p className="fs-kicker">
          <Benang text={`${t("today.day", { n: day.n })} · ${fmtDay(day.date, lang)}`} />
        </p>
        <Gunungan as="h2" className="fs-h1" text={tx(day.title)} delay={160} />
        <Rise className="fs-lede" delay={620}>
          {tx(day.subtitle)}
        </Rise>
      </div>
      <Rise as="ol" className="fs-stops fs-side" delay={820}>
        {day.stops.map((s) => (
          <li key={s.id}>
            <time>{fmtSpan(s.start, s.end)}</time>
            <span>{tx(s.title)}</span>
          </li>
        ))}
      </Rise>
    </div>
  );
}

function Title({ slide }: Ctx) {
  const { lang, t, tx } = useI18n();
  if (slide.kind !== "title") return null;
  const { day } = slide;
  return (
    <div className="fl-body fl-body--center fs-title">
      <span className="fs-bar fs-bar--top" aria-hidden="true" />
      <span className="fs-bar fs-bar--bottom" aria-hidden="true" />
      <p className="fs-kicker">
        <Benang text={`${t("today.day", { n: day.n })} · ${fmtDay(day.date, lang)}`} delay={500} />
      </p>
      <h2 className="fs-display">
        <Bayang key={tx(day.title)} text={tx(day.title)} delay={760} />
      </h2>
    </div>
  );
}

function DayIntro({ slide }: Ctx) {
  const { t, tx } = useI18n();
  if (slide.kind !== "dayintro") return null;
  const { day } = slide;
  return (
    <div className="fl-body fl-body--low fs-split">
      <div>
        <p className="fs-kicker">
          <Benang text={`${t("today.day", { n: day.n })} · ${tx(day.title)}`} />
        </p>
        <Gamelan as="h2" className="fs-h2 fs-wide" text={tx(day.subtitle)} delay={240} />
      </div>
      <Rise as="ul" className="fs-facts fs-side" delay={900}>
        {day.sunrise && <li data-sun="rise">{t("today.sunrise", { t: day.sunrise })}</li>}
        {day.sunset && <li data-sun="set">{t("today.sunset", { t: day.sunset })}</li>}
        <li data-fact="stops">{t("film.stops", { n: slide.panels })}</li>
        {day.dressCode && <li data-fact="dress">{tx(day.dressCode)}</li>}
      </Rise>
    </div>
  );
}

function GongClose({ slide }: Ctx) {
  const { t, tx } = useI18n();
  const [strikes, setStrikes] = useState(0);
  if (slide.kind !== "gong") return null;
  return (
    <div className="fl-body fl-body--center fs-gongclose">
      {/* pukulan gong menutup satu hari (gongan). Gong 3D + bunyinya menyusul di F3; ini versi panggung 2D. */}
      <button type="button" className="fs-strike" data-press="" data-sfx="ui-pop" data-struck={strikes || undefined} aria-label={t("film.gong")} onClick={() => setStrikes((n) => n + 1)}>
        <span key={strikes} className="fs-gong fs-gong--small" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <IconGong size={26} />
      </button>
      <p className="fs-kicker">
        <Benang text={t("film.endOfDay", { n: slide.day.n })} delay={300} />
      </p>
      {slide.next ? (
        <>
          <Rise className="fs-fine" delay={700}>
            {t("film.tomorrow")}
          </Rise>
          <Gamelan as="h2" className="fs-h1" text={tx(slide.next.title)} delay={860} />
        </>
      ) : (
        <Gamelan as="h2" className="fs-h2" text={t("film.lastGong")} delay={700} />
      )}
    </div>
  );
}

function Epilogue({ data }: Ctx) {
  const { tx } = useI18n();
  const epi = data.trip.epilogue;
  return (
    <div className="fl-body fl-body--center fs-epilogue">
      <h2 className="fs-display">
        <Bayang key={tx(epi?.title)} text={tx(epi?.title)} delay={300} />
      </h2>
      <Rise className="fs-lede" delay={1700}>
        {tx(epi?.body)}
      </Rise>
    </div>
  );
}

function Pass({ data }: Ctx) {
  const { t } = useI18n();
  const guide = useRef<HTMLDialogElement>(null);
  const host = (data.private?.contacts ?? []).find((c) => waNumber(c.whatsapp));
  const short = guestShortName(data);
  const message = data.role === "team" ? t("today.waTeam") : short ? t("today.waGuest", { name: short }) : t("today.waGuestNoName");
  return (
    <div className="fl-body fl-body--center fs-pass">
      <Ticket data={data} compact delay={200} />
      <div className="fs-actions f-rise" style={d(700)}>
        <CurtainLink className="pb pb--gold pb--kawung pb--lg" data-haptic="" href="/today/">
          <span className="pb-face">
            <IconToday />
            <span>{t("film.toToday")}</span>
          </span>
        </CurtainLink>
        <button type="button" className="pb pb--glass" aria-haspopup="dialog" onClick={() => guide.current?.showModal()}>
          <span className="pb-face">
            <IconHomeAdd />
            <span>{t("install.add")}</span>
          </span>
        </button>
        {host && (
          <a className="pb pb--tonal" href={waLink(waNumber(host.whatsapp), message)} target="_blank" rel="noopener noreferrer">
            <span className="pb-face">
              <IconChat size={18} />
              <span>{t("film.messageHost")}</span>
            </span>
          </a>
        )}
      </div>
      {/* panduan Home Screen dibuka sebagai sheet: slide tetap pas selayar, jadi geser & roda tetap memindah slide */}
      <dialog
        ref={guide}
        className="sheet fl-sheet"
        aria-label={t("install.add")}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close(); // ketuk latar
        }}
      >
        <div className="sheet-body" data-scroll="">
          <span className="sheet-grip" aria-hidden="true" />
          <div className="sheet-head">
            <p className="fl-sheet-when">{t("install.add")}</p>
            <button type="button" className="pb pb--glass pb--sm pb--icon sheet-x" aria-label={t("today.close")} onClick={() => guide.current?.close()}>
              <span className="pb-face">
                <IconClose />
              </span>
            </button>
          </div>
          <InstallGuide onDismiss={() => guide.current?.close()} />
        </div>
      </dialog>
    </div>
  );
}

function Credits({ data }: Ctx) {
  const { t, tx } = useI18n();
  const photos = data.manifest ?? [];
  const people = (data.private?.contacts ?? []).map((c) => tx(c.label)).filter(Boolean);
  return (
    <div className="fl-body fl-body--center fs-credits">
      <h2 className="fs-kicker">
        <Benang text={t("film.credits")} />
      </h2>
      <Rise as="dl" className="fs-roll" delay={300}>
        {people.length > 0 && (
          <div>
            <dt>{t("film.credits.with")}</dt>
            <dd>{people.join(" · ")}</dd>
          </div>
        )}
        {photos.length > 0 && (
          <div>
            <dt>{t("film.credits.photos")}</dt>
            {photos.map((p) => (
              <dd key={p.id}>
                {p.sourceUrl ? (
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {p.author}
                  </a>
                ) : (
                  p.author
                )}
                {" · "}
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {p.license}
                  </a>
                ) : (
                  p.license
                )}
              </dd>
            ))}
          </div>
        )}
        <div>
          <dt>{t("film.credits.music")}</dt>
          <dd>{t("film.credits.musicBody")}</dd>
        </div>
        <div>
          <dt>{t("film.credits.type")}</dt>
          <dd>{t("film.credits.typeBody")}</dd>
        </div>
      </Rise>
      <Gamelan as="p" className="fs-h2" text={t("film.credits.thanks")} delay={900} />
    </div>
  );
}

const VIEWS: Partial<Record<Slide["kind"], (p: Ctx) => ReactNode>> = {
  hero: Hero,
  headline: Headline,
  intro: Intro,
  fact: Fact,
  route: Route,
  team: Team,
  phrases: Phrases,
  daycard: DayCard,
  title: Title,
  dayintro: DayIntro,
  gong: GongClose,
  epilogue: Epilogue,
  pass: Pass,
  credits: Credits,
};

/** Isi satu slide (selain panel gallery, yang punya lapisan sendiri). */
export function SlideContent({ data, slide }: Ctx) {
  const View = VIEWS[slide.kind];
  return View ? <View data={data} slide={slide} /> : null;
}
