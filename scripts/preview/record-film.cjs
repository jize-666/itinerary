/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau film dalam gerak lambat (HD, mulus walau server tanpa GPU).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-film.cjs <data-trip.json> <keluaran.mp4> [desktop|iphone] [K=0.25]
// <data-trip.json> = respons trip-data (JANGAN menaruh data tamu asli di repo; simpan di luar repo).
// Teknik sama dengan record-flow.cjs: waktu halaman diperlambat K kali (animasi CSS/WAAPI lewat CDP
// Animation.setPlaybackRate; timer & rAF diskalakan), frame screencast dialirkan ke ffmpeg pada jam virtual
// 60 fps. desktop = 1920×1080, iphone = 1080 px lebar (tegak). Butuh: playwright (Chromium), ffmpeg.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const [DATA, out, device = 'desktop', kArg] = process.argv.slice(2);
  const K = +(kArg || 0.25);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const FPS = 60;
  const phone = device === 'iphone';
  const dpr = phone ? 3 : 1.5;
  const base = phone ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1280, height: 720 } };
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`] });
  const ctx = await b.newContext({ ...base, deviceScaleFactor: dpr });
  await ctx.addInitScript((k) => {
    localStorage.setItem('lakon.session', JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }));
    const pn = performance.now.bind(performance), t0 = pn(), dn = Date.now, d0 = dn();
    performance.now = () => t0 + (pn() - t0) * k;
    Date.now = () => d0 + (dn() - d0) * k;
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
    window.requestAnimationFrame = (cb) => raf((ts) => cb(t0 + (ts - t0) * k));
  }, K);
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const { width, height } = p.viewportSize();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${phone ? 1080 : 1920}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  const emitUntil = (tv) => { while (last && tick / FPS <= tv) { ff.stdin.write(last); tick++; written++; } };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (t0 === null) t0 = metadata.timestamp;
    emitUntil((metadata.timestamp - t0) * K); // jam virtual = jam nyata × K
    last = Buffer.from(data, 'base64');
  });
  const w = (ms) => p.waitForTimeout(ms / K);
  const key = async (k, dwell) => { await p.keyboard.press(k); await w(dwell); };
  const tap = async (loc, dwell) => {
    const bx = await loc.boundingBox();
    if (!bx) return;
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await w(220); await p.mouse.down(); await w(240); await p.mouse.up();
    await p.evaluate(() => document.activeElement instanceof HTMLElement && !document.activeElement.closest('dialog') && document.activeElement.blur()); // tanpa cincin fokus di rekaman
    await w(dwell);
  };
  const slide = () => p.locator('.film').getAttribute('data-slide');
  const kind = () => p.locator('.film').getAttribute('data-kind');

  await p.goto('about:blank');
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(width * dpr), maxHeight: Math.round(height * dpr), everyNthFrame: 1 });
  await p.goto(`${BASE}/film/`, { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await p.waitForSelector('.film');

  await w(5200); // hero: judul lahir sebagai bayangan
  await key('ArrowDown', 3000); // pembuka
  await key('ArrowDown', 2800); // intro
  await key('ArrowDown', 2800); // fakta 1
  await key('ArrowDown', 2600); // fakta 2
  await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 4200); // lompat ke Hari 1: sapuan kayon
  await key('ArrowDown', 3400); // intro hari
  for (let i = 0; i < 3; i++) await key('ArrowDown', 2300); // tiga panel pertama
  await tap(p.locator('.gal-card[data-cur] .gal-acts button').first(), 3000); // cerita
  await tap(p.locator('.fl-sheet .sheet-x'), 1400);
  await tap(p.locator('.lang-toggle .seg-opt').nth(1), 2200); // ganti ke ID di tempat
  for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await key('ArrowDown', 1900); // sisa hari: siang → senja → malam
  await w(2200); // gong penutup hari
  await key('ArrowDown', 4200); // sapuan kayon → judul hari berikutnya
  await tap(p.locator('.lang-toggle .seg-opt').nth(0), 1600); // kembali ke EN
  const chapters = await p.locator('.fl-rail-list li').count();
  await tap(p.locator(`.fl-rail-list li:nth-child(${chapters - 1}) button`), 5200); // epilog
  for (let i = 0; i < 6 && (await slide()) !== 'credits'; i++) await key('ArrowDown', 3200);
  await w(1800);

  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));
  if (last) { ff.stdin.write(last); written++; }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1), keluaran: out }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
