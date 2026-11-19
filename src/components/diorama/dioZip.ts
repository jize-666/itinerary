import { zipSync } from "three/addons/libs/fflate.module.js";

/** The JPEG/PNG encoder has already compressed each image. Both code paths use STORE. */
export function packPhotos(files: Record<string, Uint8Array>): Uint8Array<ArrayBuffer> {
  return new Uint8Array(zipSync(files, { level: 0 }));
}
