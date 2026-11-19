/** Tautan masuk ke halaman maket (/diorama/): pemetaan tempat singgah → lokasi maket. */
export type DioramaLokasi = "pendhapa" | "pasar" | "laweyan";

/** id tempat singgah di content/trips/solo/trip.ts → lokasi maket; null bila tempat itu tidak ada di maket. */
const LOKASI: Record<string, DioramaLokasi> = {
  mangkunegaran: "pendhapa",
  "pasar-gede": "pasar",
  laweyan: "laweyan",
};

export function dioramaFor(stopId: string): DioramaLokasi | null {
  return Object.hasOwn(LOKASI, stopId) ? LOKASI[stopId]! : null;
}

/** Tanpa lokasi: maket dibuka di tampilan awal. Garis miring penutup mengikuti `trailingSlash` ekspor statis. */
export function dioramaHref(lokasi?: DioramaLokasi): string {
  return lokasi ? `/diorama/?lokasi=${lokasi}` : "/diorama/";
}
