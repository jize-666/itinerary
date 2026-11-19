import type { Mesh, Object3D, PerspectiveCamera, Scene } from "three";
import type { Film } from "@/engine/slides/build-slides";
import type { Cursor } from "@/engine/stage/cue";
import type { TierSpec } from "@/engine/stage/tier";
import type { Shared } from "./shared";

export type ChapterFrame = {
  camera: PerspectiveCamera;
  cursor: Cursor;
  t: number;
  look: { x: number; y: number };
  pixels: number;
  readyFraction?: number;
};
export interface ChapterWorld {
  group: Object3D;
  ground: Mesh;
  source: string;
  update(f: ChapterFrame): { amount: number; passed: number; focus: number; minute: number } | null;
  dispose(): void;
}
type Loader = (shared: Shared, spec: TierSpec, film: Film, signal: AbortSignal) => Promise<ChapterWorld | null>;
const worlds: Partial<Record<string, Loader>> = {
  lawu: async (shared, spec, film, signal) => {
    const [module, bytes] = await Promise.all([
      import("./lawu/world"),
      fetch("/stage/lawu/relief.bin", { signal })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null),
    ]);
    return signal.aborted ? null : module.createWorld(shared, spec, film, bytes);
  },
};
// One owner per film stage. Chapters can share this seam without changing the render loop.
// Carry a world for two adjacent slides to support reverse scrubs and in-flight tier changes.
export function chapterWorlds(scene: Scene, shared: Shared, spec: TierSpec, film: Film, root: () => HTMLElement | null) {
  const sections = film.chapters.flatMap((c) => {
    const theme = film.slides[c.first]?.theme,
      load = theme && worlds[theme];
    return load ? [{ ...c, key: theme, load }] : [];
  });
  let active: ChapterWorld | null = null,
    pending: AbortController | null = null,
    key = "",
    last = "",
    mountedAt = -1;
  const status = (ready: string, source: string, visible: string, passed: number, minute: number) => {
    const value = [ready, source, visible, passed, minute].join("|");
    if (value === last) return;
    last = value;
    const host = root();
    if (!host) return;
    host.dataset.worldReady = ready;
    host.dataset.world = visible;
    host.dataset.relief = source;
    host.dataset.stopLights = String(passed);
    host.dataset.worldMinute = String(minute);
  };
  const release = () => {
    pending?.abort();
    pending = null;
    if (active) {
      scene.remove(active.group);
      active.dispose();
      active = null;
    }
    key = "";
    mountedAt = -1;
  };
  return {
    update(f: ChapterFrame) {
      const c = f.cursor;
      const section = sections.find((s) => [c.from, c.to].some((i) => i >= s.first - 3 && i <= s.last + 2));
      if ((section?.key ?? "") !== key) {
        release();
        if (section) {
          key = section.key;
          const job = new AbortController();
          pending = job;
          section
            .load(shared, spec, film, job.signal)
            .then((result) => {
              if (!result) return;
              if (job.signal.aborted) {
                result.dispose();
                return;
              }
              active = result;
              result.group.visible = false;
              scene.add(result.group);
            })
            .catch(() => {
              /* The shared stage remains available if the chunk itself is unavailable. */
            });
        }
      }
      if (active && mountedAt < 0) mountedAt = f.t;
      const state = active?.update({ ...f, readyFraction: Math.min(1, Math.max(0, (f.t - mountedAt) / 0.42)) });
      const visible = Boolean(state && state.amount >= 0.5);
      if (active) active.group.visible = visible;
      status(
        active ? key : "",
        active?.source ?? "",
        visible ? key : "shared",
        visible && state ? Math.floor(state.passed + 0.0001) : 0,
        visible && state ? Math.round(state.minute) : -1,
      );
      return {
        visible,
        ground: visible ? active?.ground : null,
        focus: state?.focus ?? 30,
        mist: state && state.amount < 1 ? Math.max(0, 1 - Math.abs(2 * state.amount - 1)) ** 1.7 : 0,
      };
    },
    dispose() {
      release();
      const e = root();
      if (e) for (const name of ["worldReady", "world", "relief", "stopLights", "worldMinute"]) delete e.dataset[name];
    },
  };
}
