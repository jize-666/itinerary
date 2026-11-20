"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GUIDE_KINDS, type GuideKind } from "@/engine/canting/guides";
import type { Tool } from "@/engine/canting/motif";
import type { CantingQuality } from "@/engine/canting/options";
import { ct, type CantingLang, type CantingTextKey } from "@/engine/canting/text";
import { Icon } from "@/components/diorama/Icons";
import { createCantingGuide, type CantingGuide } from "./guide";
import { createStudio, type Studio, type StudioEvent, type StudioView } from "./studio";
import "./canting.css";

/**
 * Halaman /canting/ (Tugas 11.2): tamu membatik sendiri. Antarmuka React di atas studio imperatif (`studio.ts`):
 * alat canting, takaran malam dan celup ke wajan, urungkan, pola pensil dan auto-trace, tahap nila/soga/lorod, simpan
 * PNG, Clawd memandu. `?demo=1` memutar seluruh alur sendiri (pratinjau dan e2e).
 */
export type CantingProps = {
  lang: CantingLang;
  calm: boolean;
  quality?: CantingQuality;
  showFps?: boolean;
  demo?: boolean;
};

const TOOLS: readonly Tool[] = ["klowong", "cecek", "tembok"];
const FILE = "batik-laweyan.png";

/** Ikon alat dan aksi (garis 1,6 seperti ikon situs). */
function Glyph({ name }: { name: "klowong" | "cecek" | "tembok" | "undo" | "restart" | "dip" | "pencil" | "nila" | "soga" | "lorod" }) {
  const p = {
    klowong: <path d="M4 15c3-7 5 3 8-3s5 3 8-2" />,
    cecek: (
      <g fill="currentColor" stroke="none">
        <circle cx="6" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="18" cy="12" r="1.6" />
      </g>
    ),
    tembok: <path d="M5 8c4-3 11-3 14 1s-1 9-6 8-11 0-9-4 1-4 1-5z" fill="currentColor" fillOpacity=".35" />,
    undo: <path d="M9 7 5 11l4 4M5.5 11H14a5 5 0 0 1 0 10h-2" />,
    restart: <path d="M5 12a7 7 0 1 0 2.1-5M5 4v4h4" />,
    dip: <path d="M3.5 12h17M5 12c0 4 3 6.5 7 6.5s7-2.5 7-6.5M12 3v5m-2-2 2 2 2-2" />,
    pencil: <path d="m15 4.5 4.5 4.5L9 19.5H4.5V15zM13 6.5l4.5 4.5" />,
    nila: <path d="M12 4c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z" fill="#2a3b78" fillOpacity=".75" />,
    soga: <path d="M12 4c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z" fill="#8a5530" fillOpacity=".8" />,
    lorod: <path d="M6 20h12M8 17c0-2 2-2 2-4s-2-2-2-4m4 8c0-2 2-2 2-4s-2-2-2-4m4 8c0-2 2-2 2-4s-2-2-2-4" />,
  }[name];
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  );
}

const STAGES = ["malam", "nila", "soga", "lorod", "jadi"] as const;
/** Tahap yang sudah dilewati (untuk rel tahap). */
function reached(v: StudioView | null): Record<(typeof STAGES)[number], boolean> {
  const s = v?.stage ?? "malam";
  const d = v?.dyed;
  return { malam: true, nila: (d?.nila ?? 0) > 0, soga: (d?.soga ?? 0) > 0, lorod: (d?.lorod ?? 0) > 0, jadi: s === "jadi" };
}

const CLAWD_FOR: Partial<Record<StudioEvent, `clawd.${string}`>> = {
  fast: "clawd.fast",
  spread: "clawd.slow",
  empty: "clawd.empty",
  cool: "clawd.cool",
  nila: "clawd.nila",
  kerok: "clawd.kerok",
  biru: "clawd.biru",
  soga: "clawd.soga",
  lorod: "clawd.lorod",
  jadi: "clawd.done",
  undo: "clawd.undo",
};

export function Canting({ lang, calm, quality, showFps = false, demo = false }: CantingProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const studioRef = useRef<Studio | null>(null);
  const guideRef = useRef<CantingGuide | null>(null);
  const langRef = useRef(lang);
  const calmRef = useRef(calm);
  const [view, setView] = useState<StudioView | null>(null);
  const viewRef = useRef<StudioView | null>(null);
  const [hint, setHint] = useState<CantingTextKey | null>(null);
  const [stats, setStats] = useState("");
  const [failed, setFailed] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const tier: CantingQuality = quality ?? "high";
  const t = (k: CantingTextKey) => ct(k, lang);

  useEffect(() => {
    langRef.current = lang;
    guideRef.current?.setLang(lang);
  }, [lang]);
  useEffect(() => {
    calmRef.current = calm;
    studioRef.current?.setCalm(calm);
  }, [calm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const insets = () => {
      const h = root.clientHeight;
      const top = topRef.current?.getBoundingClientRect().bottom ?? 0;
      const dock = dockRef.current?.getBoundingClientRect().top ?? h;
      return { top: Math.max(0, top), bottom: Math.max(0, h - dock) };
    };
    const guide = createCantingGuide(root, {
      lang: langRef.current,
      reduced: () => calmRef.current,
      // di samping kain: kiri bawah di atas panel alat (layar lebar); di HP tegak kanan atas, di bawah sakelar bahasa
      // dan di samping judul, supaya wajan dan kain tidak tertutup
      place: (w, h) => {
        const ins = insets();
        if (w < h) return { x: w - Math.min(w, h) * 0.12, y: ins.top - Math.min(w, h) * 0.01 };
        return { x: Math.min(150, w * 0.09), y: h - ins.bottom - Math.min(w, h) * 0.12 };
      },
    });
    guideRef.current = guide;
    let studio: Studio;
    try {
      studio = createStudio(canvas, root, { quality: tier, calm: calmRef.current, demo, insets }, {
        view(next) {
          viewRef.current = next;
          setView(next);
        },
        event(e) {
          if (e === "hello") {
            guide.say("clawd.hello");
            setTimeout(() => guide.say("clawd.blow"), 5200);
          }
          const line = CLAWD_FOR[e];
          if (line) guide.say(line as Parameters<CantingGuide["say"]>[0], e === "lorod" || e === "jadi");
          if (e === "empty") setHint("malam.empty");
          else if (e === "dip") setHint(null);
          else if (e === "biru") setHint("hint.biru");
          else if (e === "blocked") setHint(studioRef.current && viewRef.current?.stage === "malam" && !viewRef.current.guide ? "hint.pickGuide" : "hint.locked");
          else if (e === "nila" || e === "soga" || e === "lorod" || e === "restart") setHint(null);
        },
        stats: showFps ? setStats : undefined,
      });
    } catch {
      // tanpa WebGL: pesan dan jalan kembali
      queueMicrotask(() => setFailed(true));
      guide.dispose();
      guideRef.current = null;
      return;
    }
    studioRef.current = studio;
    // tinggi panel berubah (bahasa, lebar layar): letak kain dihitung ulang
    const ro = new ResizeObserver(() => studio.resize());
    if (dockRef.current) ro.observe(dockRef.current);
    if (topRef.current) ro.observe(topRef.current);
    return () => {
      ro.disconnect();
      studio.dispose();
      guide.dispose();
      studioRef.current = null;
      guideRef.current = null;
    };
  }, [tier, demo, showFps]);

  useEffect(() => {
    const before = document.title;
    document.title = "Canting · A Three-Day Lakon";
    return () => {
      document.title = before;
    };
  }, []);

  // ---- simpan ----
  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const save = () => {
    const blob = studioRef.current?.png();
    if (!blob) return;
    const file = new File([blob], FILE, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const done = () => {
      setSavedOnce(true);
      setHint("saved");
      guideRef.current?.say("clawd.saved", true);
    };
    if (!demo && nav.canShare?.({ files: [file] })) {
      // Web Share berkas (HP): dipanggil langsung di ketukan, PNG sudah dibuat sesudah lorod
      nav.share({ files: [file], title: t("title") }).then(done, (err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") {
          download(blob);
          done();
        }
      });
      return;
    }
    download(blob);
    done();
  };

  // ---- demo: pola kawung ditorehkan, dicelup nila dan soga, dilorod, disimpan ----
  const demoStep = useRef(0);
  useEffect(() => {
    const s = studioRef.current;
    if (!demo || !s || !view?.ready) return;
    const step = demoStep.current;
    if (step === 0) {
      demoStep.current = 1;
      s.setGuide("kawung");
      setTimeout(() => s.trace(), 600);
    } else if (step === 1 && !view.tracing && view.hasWax && !view.busy) {
      demoStep.current = 2;
      setTimeout(() => s.act("nila"), 500);
    } else if (step === 2 && view.stage === "biru" && !view.busy) {
      demoStep.current = 3;
      setTimeout(() => s.act("soga"), 600);
    } else if (step === 3 && view.stage === "coklat" && !view.busy) {
      demoStep.current = 4;
      setTimeout(() => s.act("lorod"), 600);
    } else if (step === 4 && view.png) {
      demoStep.current = 5;
      setTimeout(save, 900);
    }
  });

  const goBack = () => {
    let local = false;
    try {
      local = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {}
    if (local && history.length > 1) history.back();
    else router.push("/film/#day-3");
  };

  const v = view;
  const s = studioRef.current;
  const busy = !!v?.busy || !!v?.tracing;
  const drawStage = v?.stage === "malam" || v?.stage === "biru";
  const hasWax = !!v?.hasWax;
  const step = reached(v);
  const can = {
    nila: v?.stage === "malam" && hasWax && !busy,
    soga: (v?.stage === "malam" || v?.stage === "biru") && hasWax && !busy,
    lorod: (v?.stage === "biru" || v?.stage === "coklat") && hasWax && !busy,
  };

  if (failed) {
    return (
      <main className="cnt-root cnt-root--fail" data-ready="false">
        <p className="cnt-fail">{t("nowebgl")}</p>
        <button type="button" className="pb pb--gold" onClick={goBack}>
          <span className="pb-face">
            <Icon name="back" size={18} />
            <span>{t("back")}</span>
          </span>
        </button>
      </main>
    );
  }

  return (
    <main
      ref={rootRef}
      className="cnt-root"
      data-ready={v?.ready ? "true" : "false"}
      data-stage={v?.stage ?? "malam"}
      data-busy={v?.busy ?? ""}
      data-tool={v?.tool ?? "klowong"}
      data-png={v?.png ? "true" : "false"}
      data-tracing={v?.tracing ? "" : undefined}
      data-dabs-ready={v?.hasWax ? "" : undefined}
      data-calm={calm ? "" : undefined}
    >
      <canvas ref={canvasRef} className="cnt-canvas" role="img" aria-label={t("title")} />
      <header ref={topRef} className="cnt-top">
        <button type="button" className="pb pb--tonal pb--sm cnt-back" data-sfx="ui-tok" onClick={goBack}>
          <span className="pb-face">
            <Icon name="back" size={18} />
            <span>{t("back")}</span>
          </span>
        </button>
        <div className="cnt-intro">
          <span className="cnt-kicker">{t("kicker")}</span>
          <h1 className="cnt-title">{t("title")}</h1>
        </div>
      </header>

      <section ref={dockRef} className="cnt-dock" aria-label={t("tools.label")}>
        <p className="cnt-hint" role="status" aria-live="polite" data-show={hint ? "" : undefined}>
          {hint ? t(hint) : ""}
        </p>
        <div className="cnt-row">
          <div className="cnt-seg" role="radiogroup" aria-label={t("tools.label")}>
            {TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                role="radio"
                aria-checked={v?.tool === tool}
                className="cnt-seg-opt"
                aria-label={t(`tool.${tool}` as CantingTextKey)}
                title={t(`tool.${tool}.hint` as CantingTextKey)}
                disabled={!drawStage}
                onClick={() => s?.setTool(tool)}
              >
                <Glyph name={tool} />
                <span>{t(`tool.${tool}` as CantingTextKey)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="pb pb--glass pb--icon pb--round cnt-ico" aria-label={t("undo")} title={t("undo")} disabled={!v?.canUndo} onClick={() => s?.undo()}>
            <span className="pb-face">
              <Glyph name="undo" />
            </span>
          </button>
          <button
            type="button"
            className="pb pb--tonal cnt-dip"
            data-empty={v && v.malam <= 0.02 ? "" : undefined}
            disabled={!drawStage || !!v?.dipping || busy}
            onClick={() => s?.dip()}
            aria-label={`${t("malam.dip")} · ${t("malam.label")} ${Math.round((v?.malam ?? 1) * 100)}%`}
          >
            <span className="pb-face">
              <Glyph name="dip" />
              <span className="cnt-gauge" aria-hidden="true">
                <span style={{ transform: `scaleX(${v?.malam ?? 1})` }} />
              </span>
              <span className="cnt-dip-label">{t("malam.dip")}</span>
            </span>
          </button>
        </div>

        <div className="cnt-row cnt-row--stages">
          <ol className="cnt-steps" aria-label={t("stage.label")}>
            {STAGES.map((st) => (
              <li key={st} data-on={step[st] ? "" : undefined} data-now={v?.busy === st || (st === "malam" && v?.stage === "malam" && !v?.busy) ? "" : undefined}>
                {t(`stage.${st}` as CantingTextKey)}
              </li>
            ))}
          </ol>
          <div className="cnt-acts">
            {v?.stage === "malam" && (
              <button type="button" className="pb pb--gold cnt-act" disabled={!can.nila} onClick={() => s?.act("nila")}>
                <span className="pb-face">
                  <Glyph name="nila" />
                  <span>{t("action.nila")}</span>
                </span>
              </button>
            )}
            {(v?.stage === "malam" || v?.stage === "biru") && (
              <button type="button" className={`pb ${v?.stage === "biru" ? "pb--gold" : "pb--tonal"} cnt-act`} disabled={!can.soga} onClick={() => s?.act("soga")}>
                <span className="pb-face">
                  <Glyph name="soga" />
                  <span>{t("action.soga")}</span>
                </span>
              </button>
            )}
            {(v?.stage === "biru" || v?.stage === "coklat") && (
              <button type="button" className={`pb ${v?.stage === "coklat" ? "pb--gold" : "pb--tonal"} cnt-act`} disabled={!can.lorod} onClick={() => s?.act("lorod")}>
                <span className="pb-face">
                  <Glyph name="lorod" />
                  <span>{t("action.lorod")}</span>
                </span>
              </button>
            )}
            {v?.stage === "jadi" && (
              <button type="button" className="pb pb--gold cnt-act" disabled={!v.png} onClick={save} data-saved={savedOnce ? "" : undefined}>
                <span className="pb-face">
                  <Icon name={savedOnce ? "share" : "download"} size={18} />
                  <span>{t("action.save")}</span>
                </span>
              </button>
            )}
          </div>
        </div>

        <details className="cnt-more">
          <summary>
            <Glyph name="pencil" />
            <span>{t("more")}</span>
          </summary>
          <div className="cnt-more-body">
            <div className="cnt-seg cnt-seg--guide" role="radiogroup" aria-label={t("guide.label")}>
              {([null, ...GUIDE_KINDS] as (GuideKind | null)[]).map((g) => (
                <button key={g ?? "none"} type="button" role="radio" aria-checked={(v?.guide ?? null) === g} className="cnt-seg-opt" onClick={() => s?.setGuide(g)}>
                  <span>{t(g ? (`guide.${g}` as CantingTextKey) : "guide.none")}</span>
                </button>
              ))}
            </div>
            <div className="cnt-more-acts">
              <button type="button" className="pb pb--tonal pb--sm" disabled={!v?.guide || !drawStage || busy} onClick={() => s?.trace()}>
                <span className="pb-face">
                  <Glyph name="pencil" />
                  <span>{t("guide.trace")}</span>
                </span>
              </button>
              <button type="button" className="pb pb--glass pb--icon pb--round pb--sm" aria-label={t("zoom.out")} onClick={() => s?.zoomBy(1 / 1.4)}>
                <span className="pb-face">
                  <Icon name="minus" size={18} />
                </span>
              </button>
              <button type="button" className="pb pb--glass pb--icon pb--round pb--sm" aria-label={t("zoom.in")} onClick={() => s?.zoomBy(1.4)}>
                <span className="pb-face">
                  <Icon name="plus" size={18} />
                </span>
              </button>
              <button
                type="button"
                className="pb pb--tonal pb--sm"
                onClick={() => {
                  if (window.confirm(t("restart.confirm"))) {
                    setSavedOnce(false);
                    s?.restart();
                  }
                }}
              >
                <span className="pb-face">
                  <Glyph name="restart" />
                  <span>{t("restart")}</span>
                </span>
              </button>
            </div>
            <p className="cnt-note">{t("keyboard.note")}</p>
            {calm && <p className="cnt-note">{t("calm.note")}</p>}
            <h2 className="cnt-about-title">{t("about.title")}</h2>
            <p className="cnt-note">{t("about.body")}</p>
            <ol className="cnt-process">
              {(["nyorek", "nglowong", "ngisen", "nembok", "medel", "ngerok", "mbironi", "nyoga", "nglorod"] as const).map((k) => (
                <li key={k}>{t(`process.${k}` as CantingTextKey)}</li>
              ))}
            </ol>
          </div>
        </details>
      </section>
      {showFps && <span className="cnt-fps">{stats}</span>}
    </main>
  );
}
