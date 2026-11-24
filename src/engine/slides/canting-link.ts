/** Tautan masuk ke halaman membatik (/canting/): hanya tempat singgah bengkel batik yang membawanya. */
const BENGKEL = new Set(["laweyan"]);

export function cantingFor(stopId: string): boolean {
  return BENGKEL.has(stopId);
}

/** Garis miring penutup mengikuti `trailingSlash` ekspor statis. */
export const CANTING_HREF = "/canting/";
