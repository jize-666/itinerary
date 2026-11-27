/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Campur "biip" Clawd ke video pratinjau. Rekaman Playwright tidak membawa audio, dan Web Audio di halaman yang
// diperlambat berjalan dengan jam nyata, jadi biipnya dibangkitkan ulang: record-film.cjs dengan BEEP=<biip.json>
// mencatat tiap nada (waktu VIDEO), lalu skrip ini menjalankan renderBeep (src/engine/audio/beep-synth.ts) di
// OfflineAudioContext (Chromium) menurut catatan itu.
//
//   node scripts/preview/mix-beep.cjs <video.mp4> <biip.json> <keluaran.mp4>
//
// Bila video sudah bersuara (mis. hasil mix-batik.cjs), audionya ikut dicampur. Gain = bus efek aplikasi (SFX_LEVEL di
// src/engine/audio/catalog.ts); hasil disamakan ke ±-18 LUFS (limiter -1 dBTP), 48 kHz stereo, AAC 160k.
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SR = 48000;
(async () => {
  const [video, log, out] = process.argv.slice(2);
  if (!video || !log || !out) throw new Error('pemakaian: mix-beep.cjs <video.mp4> <biip.json> <keluaran.mp4>');
  const repo = path.resolve(__dirname, '../..');
  const { events } = JSON.parse(fs.readFileSync(log, 'utf8'));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', video], { encoding: 'utf8' });
  const info = JSON.parse(probe.stdout);
  const dur = parseFloat(info.format.duration);
  const hasAudio = (info.streams || []).some((s) => s.codec_type === 'audio');
  const sfx = parseFloat(/export const SFX_LEVEL\s*=\s*([0-9.]+)/.exec(fs.readFileSync(path.join(repo, 'src/engine/audio/catalog.ts'), 'utf8'))[1]);

  const esbuild = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx/package.json', { paths: [repo] }))] }));
  const bundle = esbuild.buildSync({ entryPoints: [path.join(repo, 'src/engine/audio/beep-synth.ts')], bundle: true, format: 'iife', globalName: 'BeepSynth', write: false, target: 'es2022' }).outputFiles[0].text;

  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addScriptTag({ content: bundle });
  const b64 = await p.evaluate(async ({ events, dur, SR, sfx }) => {
    const off = new OfflineAudioContext(1, Math.ceil(dur * SR), SR);
    const gain = off.createGain();
    gain.gain.value = sfx;
    gain.connect(off.destination);
    for (const e of events) if (e.t >= 0 && e.t < dur) BeepSynth.renderBeep(off, gain, e.tone, e.t);
    const buf = await off.startRendering();
    const f32 = buf.getChannelData(0);
    const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { events, dur, SR, sfx });
  await b.close();

  const raw = out + '.beep.f32';
  fs.writeFileSync(raw, Buffer.from(b64, 'base64'));
  const args = ['-y', '-v', 'error', '-i', video, '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw];
  const norm = 'loudnorm=I=-18:TP=-1:LRA=11,aresample=48000';
  const filter = hasAudio
    ? `[1:a]aformat=channel_layouts=stereo[b];[0:a][b]amix=inputs=2:normalize=0,${norm}[a]`
    : `[1:a]aformat=channel_layouts=stereo,${norm}[a]`;
  const r = spawnSync('ffmpeg', [...args, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(raw, { force: true });
  if (r.status !== 0) process.exit(r.status || 1);
  const n = events.filter((e) => e.t >= 0 && e.t < dur).length;
  console.log(JSON.stringify({ biip: n, dilewati: events.length - n, detik: dur.toFixed(1), keluaran: out }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
