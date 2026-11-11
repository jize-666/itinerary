/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-expressions -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau gerak lambat (alur lengkap gerbang → sambutan → film → Today).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-flow.cjs <data-trip.json> <keluaran.mp4> [dpr=3] [K=0.25]
// <data-trip.json> = respons trip-data tiruan (JANGAN pakai data tamu asli di repo; simpan di luar repo).
// Teknik: waktu halaman diperlambat K kali (CSS lewat CDP Animation.setPlaybackRate; JS lewat jam/timer/rAF
// yang diskalakan), frame screencast dialirkan ke ffmpeg pada jam virtual 60 fps, sehingga video akhir mulus
// di kecepatan asli walau server tanpa GPU. Butuh: playwright (Chromium terpasang), ffmpeg.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const [DATA, out, dpr, K] = [process.argv[2], process.argv[3], +(process.argv[4] || 3), +(process.argv[5] || 0.25)];
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const FPS = 60;
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`] });
  const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: dpr });
  await ctx.addInitScript((k) => {
    const pn = performance.now.bind(performance), t0 = pn(), dn = Date.now, d0 = dn();
    performance.now = () => t0 + (pn() - t0) * k;
    Date.now = () => d0 + (dn() - d0) * k;
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
    window.requestAnimationFrame = (cb) => raf((ts) => cb(t0 + (ts - t0) * k));
    // scroll halus mengikuti jam virtual (untuk merekam Today)
    window.__glide = (px, ms) => new Promise((res) => { const y0 = scrollY, s = performance.now(); const step = () => { const p = Math.min(1, (performance.now() - s) / ms); scrollTo(0, y0 + px * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)); p < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  }, K);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:-2:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-profile:v', 'high', '-tune', 'animation', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  const emitUntil = (tv) => { while (last && tick / FPS <= tv) { ff.stdin.write(last); tick++; written++; } };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (t0 === null) t0 = metadata.timestamp;
    emitUntil((metadata.timestamp - t0) * K); // jam virtual = jam nyata × K
    last = Buffer.from(data, 'base64');
  });
  const w = (ms) => p.waitForTimeout(ms / K);
  await p.goto('about:blank');
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 393 * dpr, maxHeight: 852 * dpr, everyNthFrame: 1 });
  await ctx.route('**/functions/v1/verify-access', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }) }));
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: require('fs').readFileSync(DATA, 'utf8') }));
  const tap = async (loc, hold = 300) => { await loc.scrollIntoViewIfNeeded(); const bx = await loc.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await w(260); await p.mouse.down(); await w(hold); await p.mouse.up(); };
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await w(4200);
  await p.getByLabel('Booking code').pressSequentially('lakon2027', { delay: 130 / K });
  await p.locator('.begin-btn').waitFor({ timeout: 60000 });
  await w(4300);
  await tap(p.locator('.sound-toggle'), 260); await w(1200);
  await tap(p.locator('.sound-toggle'), 260); await w(1100);
  await tap(p.locator('.begin-btn'), 380);
  await p.waitForURL(/\/film\/$/, { timeout: 60000, waitUntil: 'commit' });
  await w(3800);
  await tap(p.locator('.fl-corner a'), 340); // tombol Today di pojok film (film sendiri direkam record-film.cjs)
  await p.waitForURL(/\/today\/$/, { timeout: 60000, waitUntil: 'commit' });
  await w(3400);
  await tap(p.locator('.lang-toggle .seg-opt').nth(1), 260); await w(1800);
  await p.evaluate(() => window.__glide(620, 2400)); await w(1000);
  await tap(p.locator('.byg-item').nth(0), 260); await w(700);
  await tap(p.locator('.byg-item').nth(2), 260); await w(1200);
  await p.evaluate(() => window.__glide(900, 2600)); await w(800);
  await tap(p.locator('.dp-tab').nth(2), 260); await w(1500);
  await tap(p.locator('.dock-sos'), 320); await w(2000);
  await tap(p.locator('.sheet-x'), 260); await w(1200);
  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));
  if (last) { ff.stdin.write(last); written++; }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1) }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
