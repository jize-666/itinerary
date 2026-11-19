import { anglePose, DIRECTIONS, type Pose } from "@/engine/diorama/camera";
import type { Lang } from "@/engine/diorama/strings";
import type { DioramaController } from "./controller";

export type PhotoFormat = "jpeg" | "png";
export type Shot = { file: File; url: string; index: number };
export function photoName(index: number, lang: Lang, format: PhotoFormat) {
  const suffix = index < 0 ? (lang === "id" ? "potret" : "photo") : DIRECTIONS[index]![lang];
  return "diorama-solo-" + suffix + "." + (format === "jpeg" ? "jpg" : "png");
}
export async function takeShot(
  engine: DioramaController,
  index: number,
  lang: Lang,
  format: PhotoFormat,
  frozen: Pose,
  aspect = engine.viewAspect,
) {
  const pose = index < 0 ? frozen : anglePose(index, aspect);
  const blob = await engine.capture(pose, format, aspect);
  const file = new File([blob], photoName(index, lang, format), { type: blob.type });
  return { file, url: URL.createObjectURL(file), index };
}
const cancelError = () => new DOMException("Canceled", "AbortError");
export async function archiveShots(shots: Shot[], signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  const entries: { name: string; bytes: ArrayBuffer }[] = [];
  for (const shot of shots) {
    entries.push({ name: shot.file.name, bytes: await shot.file.arrayBuffer() });
    signal.throwIfAborted();
  }
  let worker: Worker | undefined;
  try {
    worker = new Worker(new URL("./dioZip.worker.ts", import.meta.url), { type: "module" });
    const w = worker;
    return await new Promise<Blob>((resolve, reject) => {
      const stop = () => reject(cancelError());
      signal.addEventListener("abort", stop, { once: true });
      w.onmessage = (e: MessageEvent<{ archive?: ArrayBuffer }>) => {
        signal.removeEventListener("abort", stop);
        if (e.data.archive) resolve(new Blob([e.data.archive], { type: "application/zip" }));
        else reject(Error("zip"));
      };
      w.onerror = () => {
        signal.removeEventListener("abort", stop);
        reject(Error("worker"));
      };
      w.postMessage(
        entries,
        entries.map((e) => e.bytes),
      );
    });
  } catch (error) {
    if (signal.aborted) throw error;
    // Some embedded browsers disallow workers. Re-read the blobs if ownership was transferred.
    const { packPhotos } = await import("./dioZip");
    const data: Record<string, Uint8Array> = {};
    for (const shot of shots) {
      signal.throwIfAborted();
      data[shot.file.name] = new Uint8Array(await shot.file.arrayBuffer());
    }
    return new Blob([packPhotos(data)], { type: "application/zip" });
  } finally {
    worker?.terminate();
  }
}
