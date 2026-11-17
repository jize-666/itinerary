/**
 * Suara Clawd (arahan host 17 Nov: suara perempuan "Clawd", Voice Design ElevenLabs "clawd-deep-6"). Semua kalimat
 * Clawd tetap (tanpa nama tamu), jadi tiap kalimat direkam sekali per bahasa dan diputar saat gelembungnya muncul.
 *
 * - Nama klip = kunci kalimat di gelembung (`intro.0`, `tip.gong.0`, `angry.1`), ditambah `.touch` untuk varian layar
 *   sentuh ("ketuk", "geser").
 * - Berkas: `public/audio/clawd/<lang>/<nama>.mp3`, dibuat `scripts/audio/clawd-voice.sh`.
 * - Lama tiap klip (ms) ada di `voice-clips.json`, ditulis skrip yang sama. Gelembung memakai angka ini untuk menunggu
 *   klip selesai, tanpa menunggu peristiwa audio (otak Clawd tetap murni dan bisa dites).
 * - Kalimat tanpa klip tetap tampil seperti biasa, hanya tanpa suara.
 */
import type { Lang } from "@/engine/i18n/lang";
import { INTRO, SAY, type SpeechKey, type Text, TIPS, type TipId, WELCOME_BACK } from "./lines";
import clips from "./voice-clips.json";

/** Satu klip yang perlu direkam. */
export type VoiceLine = Readonly<{ name: string; en: string; id: string }>;

/** Nama klip untuk kalimat `id`; `touch` = varian layar sentuh dipakai. */
export const clipName = (id: string, touch: boolean) => (touch ? `${id}.touch` : id);

export const clipUrl = (lang: Lang, name: string) => `/audio/clawd/${lang}/${name}.mp3`;

/** Semua klip Clawd, urut seperti di `lines.ts`. Satu kalimat dengan varian sentuh = dua klip. */
export function voiceLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  const add = (id: string, t: Text) => {
    out.push({ name: clipName(id, false), en: t.en, id: t.id });
    if (t.touch) out.push({ name: clipName(id, true), en: t.touch.en, id: t.touch.id });
  };
  INTRO.forEach((t, i) => add(`intro.${i}`, t));
  WELCOME_BACK.forEach((t, i) => add(`welcome.${i}`, t));
  for (const tip of Object.keys(TIPS) as TipId[]) TIPS[tip].forEach((t, i) => add(`tip.${tip}.${i}`, t));
  for (const key of Object.keys(SAY) as SpeechKey[]) SAY[key].forEach((t, i) => add(`${key}.${i}`, t));
  return out;
}

const DURATIONS = clips as Readonly<Partial<Record<Lang, Readonly<Record<string, number>>>>>;

/** Lama klip (ms), atau null bila klip itu belum ada. */
export function clipMs(lang: Lang, name: string): number | null {
  const ms = DURATIONS[lang]?.[name];
  return typeof ms === "number" && ms > 0 ? ms : null;
}

export const VOICE = {
  /** Sesudah klip selesai, gelembung masih ditahan sebentar sebelum kalimat berikutnya (ms). */
  tail: 450,
  /** Klip yang baru siap lebih lambat dari ini sesudah kalimatnya muncul tidak diputar lagi (dtk). */
  late: 0.6,
  /** Kekuatan suara Clawd terhadap bus efek. */
  gain: 1,
  /** Gendhing direndahkan selama Clawd bicara supaya kata-katanya jelas. */
  duck: 0.3,
} as const;
