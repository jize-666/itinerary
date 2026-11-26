/**
 * Isi tiket 3D (Tugas 12b) dari data trip dan kamus situs. Nama tamu dari data privat runtime (`data.private`), rute
 * (kode bandara dan nama kota dari label rute) dan tanggal dari data trip runtime, label dari i18n: tidak ada nama tamu
 * atau data trip yang tertanam di bundle (tes `smoke.spec.ts`). Tiket 3D butuh tepat tiga kota
 * (asal, transit, tujuan) seperti rupa kartunya; selain itu (atau tanpa nama tamu) hanya tiket DOM yang tampil.
 */
import type { PassContent, RouteStop } from "@/components/film/stage3d/pass3d/content";
import type { Lang } from "@/engine/i18n/lang";
import { type StringKey, translate } from "@/engine/i18n/strings";
import type { TripView } from "@/lib/trip";
import { fmtDate, hasPass } from "./Pass";

const MONTHS: Record<Lang, readonly string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
};

/** "7–11 April 2027" (bulan dan tahun sama), selain itu kedua tanggal lengkap. */
function span(first: string, last: string, lang: Lang): string {
  const [y1, m1, d1] = first.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = last.split("-").map(Number) as [number, number, number];
  const month = (m: number) => MONTHS[lang][m - 1] ?? "";
  if (y1 === y2 && m1 === m2) return d1 === d2 ? `${d1} ${month(m1)} ${y1}` : `${d1}–${d2} ${month(m1)} ${y1}`;
  return `${d1} ${month(m1)} ${y1} – ${d2} ${month(m2)} ${y2}`;
}

const initialsOf = (name: string) =>
  name
    .normalize("NFC")
    .trim()
    .split(/\s+/u)
    .map((w) => [...w][0] ?? "")
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();

export function buildPassContent(data: TripView, lang: Lang): PassContent | null {
  if (!hasPass(data)) return null;
  const legs = data.trip.route?.legs ?? [];
  const name = data.private?.party?.name;
  const days = data.trip.days;
  const first = days[0];
  const last = days[days.length - 1];
  if (legs.length !== 3 || !name || !first || !last) return null;
  const t = (key: StringKey) => translate(lang, key);
  const up = (key: StringKey) => t(key).toLocaleUpperCase(lang === "id" ? "id-ID" : "en-GB");
  // nama kota dari label rute ("Belitung → Jakarta → Solo"); bila jumlahnya tidak cocok, kode bandara saja
  const label = data.trip.route?.label;
  const named = (label?.en ?? "").split(/\s*(?:→|->)\s*/u).map((x) => x.trim()).filter(Boolean);
  const places = named.length === 3 ? named : legs;
  const stop = (i: 0 | 1 | 2): RouteStop => ({ code: legs[i]!, city: places[i]!, detail: i === 1 ? t("ticket.transit") : "" });
  const route = [stop(0), stop(1), stop(2)] as const;
  const [from, , to] = places as [string, string, string];
  return {
    lang,
    name,
    initials: initialsOf(name),
    route,
    date: fmtDate(first.date, lang),
    seat: t("ticket.seatValue"),
    gate: "Kulonuwun",
    ticketNo: t("ticket.numberValue"),
    labels: {
      kicker: up("ticket.kicker"),
      admit: up("ticket.admit"),
      title: t("film.title"),
      passenger: up("ticket.passenger"),
      passengerNote: `${t("ticket.note")} · ${from} → ${to}`,
      date: up("ticket.date"),
      seat: up("ticket.seat"),
      gate: up("ticket.gate"),
      ticket: up("ticket.number"),
      hostedBy: up("ticket.hostedBy"),
      host: t("ticket.host"),
      thanks: "Matur nuwun",
      thanksCaption: up("ticket.thanksCaption"),
      occasion: `${to} · ${span(first.date, last.date, lang)}`,
    },
  };
}
