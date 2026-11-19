import { packPhotos } from "./dioZip";

self.onmessage = (event: MessageEvent<{ name: string; bytes: ArrayBuffer }[]>) => {
  try {
    const files: Record<string, Uint8Array> = {};
    for (const entry of event.data) files[entry.name] = new Uint8Array(entry.bytes);
    // PNG and JPEG are already compressed. STORE avoids recompressing nine large images.
    const archive = packPhotos(files);
    self.postMessage({ archive: archive.buffer }, { transfer: [archive.buffer] });
  } catch {
    self.postMessage({ error: true });
  }
};
