/**
 * Klip suara Clawd (`src/engine/mascot/voice.ts`). Sumber suara: rekaman pesan suara teman host (sudah setuju
 * suaranya dipakai untuk proyek ini), ditiru dengan Chatterbox (model TTS open source Resemble AI, lisensi MIT) yang
 * dijalankan di CPU container. Rekaman mentah dan WAV hasil Chatterbox disimpan di luar repo; hanya MP3 olahan yang
 * masuk. Hanya bahasa Inggris (pilihan host 18 Nov); suara ElevenLabs "clawd-deep-6" yang lama tidak dipakai lagi.
 *
 *   pnpm -s exec tsx scripts/audio/clawd-voice.ts list [en|id]   kalimat yang perlu direkam (nama<TAB>emosi<TAB>teks)
 *   pnpm -s exec tsx scripts/audio/clawd-voice.ts build <mentah>  olah <mentah>/<lang>/<nama>.(mp3|wav) ke public/
 *   pnpm -s exec tsx scripts/audio/clawd-voice.ts check           semua kalimat punya klip, voice-clips.json cocok
 *
 * Olahan tiap klip: mono, hening di awal dan akhir dipangkas (sisa 40 ms), jeda di tengah klip paling lama ±0,6 dtk
 * (Chatterbox kadang memberi jeda 1–1,5 dtk di antara dua kalimat), kenyaringan disamakan dengan audio situs
 * lainnya (-16 LUFS, puncak di bawah -1,5 dBTP), MP3 48 kbps. Lalu lama tiap klip ditulis ke `voice-clips.json`, yang
 * dipakai gelembung untuk menunggu klip selesai. Rekaman mentah disimpan di luar repo (scratchpad).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { voiceLines } from "../../src/engine/mascot/voice";

// Hanya EN: pilihan host 18 Nov ("gausa kasih indo"). Saat film berbahasa Indonesia, Clawd tampil tanpa suara.
const LANGS = ["en"] as const;
const OUT = "public/audio/clawd";
const MANIFEST = "src/engine/mascot/voice-clips.json";
const TARGET_LUFS = -16;

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${r.stderr}`);
  return r.stderr + r.stdout;
}

/** Kenyaringan terpadu (LUFS) sebuah berkas. */
function lufs(file: string) {
  const out = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=framelog=quiet", "-f", "null", "-"]);
  const m = out.match(/^\s+I:\s+(-?[\d.]+) LUFS/m);
  if (!m) throw new Error(`${file}: kenyaringan tidak terbaca`);
  return Number(m[1]);
}

const seconds = (file: string) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim());

const TRIM = "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04";
/**
 * Jeda di tengah klip dipendekkan: hening di bawah −50 dB yang lebih panjang dari ±0,6 dtk disisakan ±0,6 dtk (di
 * ffmpeg 6.1 sisa jeda ≈ stop_duration + stop_silence). Jeda yang lebih pendek tidak berubah.
 */
const PAUSE = "silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB:stop_silence=0.3";
function build(raw: string) {
  const tmp = join(raw, ".olah");
  mkdirSync(tmp, { recursive: true });
  let n = 0;
  for (const lang of LANGS) {
    mkdirSync(join(OUT, lang), { recursive: true });
    for (const { name } of voiceLines()) {
      const src = ["mp3", "wav"].map((ext) => join(raw, lang, `${name}.${ext}`)).find(existsSync);
      if (!src) continue;
      const trimmed = join(tmp, `${lang}.${name}.wav`);
      run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "44100", "-af", `${TRIM},areverse,${TRIM},areverse,${PAUSE}`, trimmed]);
      const gain = TARGET_LUFS - lufs(trimmed);
      const dst = join(OUT, lang, `${name}.mp3`);
      run("ffmpeg", ["-y", "-loglevel", "error", "-i", trimmed, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false`, "-c:a", "libmp3lame", "-b:a", "48k", dst]);
      console.log(`${dst}  ${seconds(dst).toFixed(2)} dtk  ${lufs(dst).toFixed(1)} LUFS`);
      n++;
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  writeManifest();
  console.log(`${n} klip diolah`);
}

/** Lama semua klip yang ada di public/ (ms), urut seperti `voiceLines()`. */
function writeManifest() {
  const manifest: Record<string, Record<string, number>> = {};
  for (const lang of LANGS) {
    manifest[lang] = {};
    for (const { name } of voiceLines()) {
      const file = join(OUT, lang, `${name}.mp3`);
      if (existsSync(file)) manifest[lang]![name] = Math.round(seconds(file) * 1000);
    }
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

function check() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<string, Record<string, number>>;
  const problems: string[] = [];
  for (const lang of LANGS) {
    const names = new Set(voiceLines().map((l) => l.name));
    const files = existsSync(join(OUT, lang)) ? readdirSync(join(OUT, lang)).map((f) => f.replace(/\.mp3$/, "")) : [];
    for (const name of names) {
      if (!files.includes(name)) problems.push(`${lang}/${name}: klip belum ada`);
      else if (!((manifest[lang]?.[name] ?? 0) > 0)) problems.push(`${lang}/${name}: lamanya tidak ada di ${MANIFEST}`);
    }
    for (const f of files) if (!names.has(f)) problems.push(`${lang}/${f}.mp3: bukan kalimat Clawd`);
  }
  for (const p of problems) console.error(`✖ ${p}`);
  if (problems.length) process.exit(1);
  console.log(`✓ ${voiceLines().length * LANGS.length} klip suara Clawd lengkap`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "list") for (const l of voiceLines()) console.log(`${l.name}\t${l.mood}\t${arg === "id" ? l.id : l.en}`);
else if (cmd === "build" && arg) build(arg);
else if (cmd === "check") check();
else {
  console.error("Pemakaian: tsx scripts/audio/clawd-voice.ts list [en|id] | build <mentah> | check");
  process.exit(1);
}
