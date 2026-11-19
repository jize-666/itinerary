"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { directions, tr, type Lang } from "@/engine/diorama/strings";
import { archiveShots, takeShot, type PhotoFormat, type Shot } from "./photos";
import type { DioramaController } from "./controller";
import { DioDialog } from "./Dialog";
import { Icon } from "./Icons";

type Job = { shots: Shot[]; output: File | null; url: string; busy: boolean; failed: boolean };
const emptyJob = (): Job => ({ shots: [], output: null, url: "", busy: false, failed: false });
export function PhotoRoom({
  engine,
  lang,
  initial,
  onClose,
}: {
  engine: DioramaController;
  lang: Lang;
  initial: "single" | "all";
  onClose: () => void;
}) {
  const [group, setGroup] = useState(initial === "all"),
    [format, setFormat] = useState<PhotoFormat>(() =>
      matchMedia("(pointer:coarse)").matches ? "jpeg" : "png",
    );
  const [job, setJob] = useState<Job>(emptyJob),
    [saveFailed, saveError] = useState(false),
    [attempted, setAttempted] = useState(false);
  const abort = useRef<AbortController | null>(null),
    urls = useRef(new Set<string>()),
    live = useRef(true);
  const frame = useRef(engine.livePose),
    aspect = useRef(engine.viewAspect),
    jobLang = useRef(lang);
  const text = (key: Parameters<typeof tr>[1]) => tr(lang, key);
  const clear = useCallback(() => {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
  }, []);
  const run = useCallback(
    async (all: boolean, kind: PhotoFormat, keep: Shot[] = []) => {
      abort.current?.abort();
      if (!keep.length) clear();
      const task = new AbortController();
      abort.current = task;
      const shots = [...keep];
      saveError(false);
      setAttempted(false);
      setJob({ shots, output: null, url: "", busy: true, failed: false });
      try {
        const count = all ? 9 : 1;
        for (let i = shots.length; i < count; i++) {
          task.signal.throwIfAborted();
          const shot = await takeShot(
            engine,
            all ? i : -1,
            jobLang.current,
            all ? kind : "png",
            frame.current,
            aspect.current,
          );
          if (task.signal.aborted) {
            URL.revokeObjectURL(shot.url);
            return;
          }
          urls.current.add(shot.url);
          shots.push(shot);
          setJob({ shots: [...shots], output: null, url: "", busy: true, failed: false });
          if (all) await new Promise<void>((r) => setTimeout(r, 0));
        }
        const blob = all ? await archiveShots(shots, task.signal) : shots[0]!.file;
        task.signal.throwIfAborted();
        const file = all
          ? new File(
              [blob],
              jobLang.current === "id" ? "diorama-solo-sembilan-sudut.zip" : "diorama-solo-nine-views.zip",
              { type: "application/zip" },
            )
          : shots[0]!.file;
        const url = all ? URL.createObjectURL(file) : shots[0]!.url;
        urls.current.add(url);
        if (live.current) setJob({ shots, output: file, url, busy: false, failed: false });
      } catch {
        if (!task.signal.aborted && live.current)
          setJob({ shots, output: null, url: "", busy: false, failed: true });
      }
    },
    [engine, clear],
  );
  useEffect(() => {
    live.current = true;
    engine.freeze(true);
    const firstFrame =
      initial === "single"
        ? requestAnimationFrame(() => {
            void run(false, "png");
          })
        : 0;
    return () => {
      cancelAnimationFrame(firstFrame);
      live.current = false;
      abort.current?.abort();
      clear();
      engine.freeze(false);
    };
  }, [engine, initial, run, clear]);
  function chooseGroup() {
    abort.current?.abort();
    clear();
    setGroup(true);
    setJob(emptyJob());
  }
  function changeFormat(next: PhotoFormat) {
    if (next !== format) {
      clear();
      setFormat(next);
      setJob(emptyJob());
      saveError(false);
    }
  }
  async function share(file: File) {
    try {
      await navigator.share({ files: [file], title: file.name });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) saveError(true);
    }
  }
  const canShare = job.output && !!navigator.canShare?.({ files: [job.output] });
  return (
    <DioDialog lang={lang} wide title={text(group ? "allPhotos" : "photoReady")} onClose={onClose}>
      {group && (
        <div className="dio-format">
          <span>{text("format")}</span>
          <div className="dio-segment">
            {(["jpeg", "png"] as const).map((f) => (
              <button
                type="button"
                key={f}
                className="pb pb--glass pb--sm dio-pick"
                data-sfx="ui-tok"
                disabled={job.busy}
                aria-pressed={format === f}
                onClick={() => changeFormat(f)}
              >
                <span className="pb-face">{f.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!group && job.shots[0] && (
        <a
          className="dio-single"
          href={job.shots[0].url}
          target="_blank"
          rel="noopener"
          aria-label={text("fullSize")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local, one-use capture blob */}
          <img src={job.shots[0].url} alt={text("photoReady")} />
        </a>
      )}
      {group && job.shots.length > 0 && (
        <div className="dio-contact">
          {job.shots.map((s) => (
            <div key={s.index}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                aria-label={text("fullSize") + " · " + directions[s.index]![lang]}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- temporary photo blob */}
                <img src={s.url} alt={directions[s.index]![lang]} />
              </a>
              <a download={s.file.name} href={s.url}>
                {directions[s.index]![lang]} <Icon name="download" size={13} />
              </a>
            </div>
          ))}
        </div>
      )}
      {job.busy && (
        <p role="status" className="dio-note">
          {text("working")} {group && job.shots.length + " / 9"}
        </p>
      )}
      {(job.failed || saveFailed) && (
        <p role="alert" className="dio-note">
          {text("failed")}
        </p>
      )}
      <div className="dio-dialog-actions">
        {group && !job.output && !job.busy && (
          <button
            type="button"
            className="pb pb--gold pb--sm dio-primary"
            data-sfx="ui-tok"
            onClick={() => void run(true, format, job.failed ? job.shots : [])}
          >
            <span className="pb-face">
              <Icon name="camera" />
              {text(job.failed ? "retry" : "allPhotos")}
            </span>
          </button>
        )}
        {!group && job.failed && (
          <button
            className="pb pb--gold pb--sm dio-primary"
            data-sfx="ui-tok"
            onClick={() => void run(false, "png")}
          >
            <span className="pb-face">{text("retry")}</span>
          </button>
        )}
        {job.output && (
          <a
            className="pb pb--gold pb--sm dio-primary"
            data-sfx="ui-tok"
            href={job.url}
            download={job.output.name}
            onClick={() => {
              saveError(false);
              setAttempted(true);
            }}
          >
            <span className="pb-face">
              <Icon name="download" size={17} />
              {saveFailed || attempted ? text("retry") : text("save")} {group ? "ZIP" : "PNG"}
            </span>
          </a>
        )}
        {canShare && (
          <button
            className="pb pb--tonal pb--sm dio-quiet"
            data-sfx="ui-tok"
            onClick={() => void share(job.output!)}
          >
            <span className="pb-face">
              <Icon name="share" />
              {text("share")}
            </span>
          </button>
        )}
        {!group && !job.busy && (
          <button className="pb pb--tonal pb--sm dio-quiet" data-sfx="ui-tok" onClick={chooseGroup}>
            <span className="pb-face">
              <Icon name="grid" size={17} />
              {text("allPhotos")}
            </span>
          </button>
        )}
      </div>
    </DioDialog>
  );
}
