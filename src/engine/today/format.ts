import type { Lang } from "@/engine/i18n/lang";
import { translate } from "@/engine/i18n/strings";
import { durationParts, TRIP_TZ, wibClock } from "./schedule";

/** Format tampilan Today. Semua jam dibaca di WIB, berapa pun zona perangkat. */
const locale = (lang: Lang) => (lang === "id" ? "id-ID" : "en-GB");

/** "Thu 8 Apr" / "Kam, 8 Apr" */
export const fmtDay = (date: string, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: TRIP_TZ }).format(new Date(`${date}T12:00:00+07:00`));

/** Jam WIB HH:MM, sama dengan penulisan jam di data trip. */
export function fmtClock(at: number) {
  const { minutes } = wibClock(at);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "08:30–10:15" atau "08:30" */
export const fmtSpan = (start: string, end?: string) => (end ? `${start}–${end}` : start);

/** Durasi pendek untuk hitung mundur: "45 min", "1 h 20 min", "1 d 2 h", "3 days". */
export function fmtDur(ms: number, lang: Lang) {
  const { d, h, m } = durationParts(ms);
  if (d >= 2) return translate(lang, "today.dur.d", { d });
  if (d === 1) return translate(lang, "today.dur.dh", { d, h });
  if (h && m) return translate(lang, "today.dur.hm", { h, m });
  if (h) return translate(lang, "today.dur.h", { h });
  return translate(lang, "today.dur.m", { m });
}

/** "baru saja", "5 menit yang lalu", lalu tanggal + jam WIB untuk yang lebih dari sehari. */
export function fmtAgo(savedAt: number, now: number, lang: Lang) {
  const diff = Math.max(0, now - savedAt);
  if (diff < 60_000) return translate(lang, "today.justNow");
  const rtf = new Intl.RelativeTimeFormat(lang === "id" ? "id" : "en", { numeric: "auto" });
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  return `${fmtDay(wibClock(savedAt).date, lang)}, ${fmtClock(savedAt)}`;
}

/** Nomor WhatsApp → digit internasional (08… → 628…). Kosong bila tidak masuk akal. */
export function waNumber(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return intl.length >= 8 && intl.length <= 15 ? intl : "";
}

/** Tautan wa.me dengan pesan yang sudah terisi. */
export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

/**
 * Tautan tel: nomor panjang dinormalkan ke +62 (bisa dipanggil dari SIM mana pun);
 * nomor pendek darurat (112, 119, 110) dibiarkan apa adanya.
 */
export function telHref(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return `tel:${digits}`;
  if (raw.trim().startsWith("+")) return `tel:+${digits}`;
  return `tel:+${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}
