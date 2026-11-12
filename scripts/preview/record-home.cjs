/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau gerak lambat untuk home (gerbang → kode salah → kode benar → sambutan → mulai).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-home.cjs <data-trip.json> <keluaran.mp4> [desktop|iphone] [en|id] [K=0.25]
// <data-trip.json> = respons trip-data tiruan (JANGAN pakai data tamu asli di repo; simpan di luar repo).
// Teknik sama dengan record-flow.cjs: waktu halaman diperlambat K kali (CSS lewat CDP Animation.setPlaybackRate; JS
// lewat jam/timer/rAF yang diskalakan), frame screencast dialirkan ke ffmpeg pada jam virtual 60 fps, sehingga video
// akhir mulus di kecepatan asli walau server tanpa GPU. Butuh: playwright (Chromium terpasang), ffmpeg.
// Di desktop kursor ikut direkam sebagai titik emas, supaya terlihat lapisan dan kartu mengikutinya.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const [DATA, out, device = 'desktop', lang = 'en'] = process.argv.slice(2);
  const K = +(process.argv[6] || 0.25);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const FPS = 60;
  const phone = device === 'iphone';
  const dpr = phone ? 3 : 1.5;
  const size = phone ? { width: 393, height: 852 } : { width: 1280, height: 800 };
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`] });
  const ctx = await b.newContext(phone ? { ...devices['iPhone 14 Pro'], deviceScaleFactor: dpr } : { viewport: size, deviceScaleFactor: dpr });
  await ctx.addInitScript(([k, l, cursor]) => {
    localStorage.setItem('lakon.lang', l);
    const pn = performance.now.bind(performance), t0 = pn(), dn = Date.now, d0 = dn();
    performance.now = () => t0 + (pn() - t0) * k;
    Date.now = () => d0 + (dn() - d0) * k;
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
    window.requestAnimationFrame = (cb) => raf((ts) => cb(t0 + (ts - t0) * k));
    if (cursor) {
      addEventListener('DOMContentLoaded', () => {
        const dot = document.createElement('i');
        dot.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #f2ebdd;background:rgba(200,162,90,.55);pointer-events:none;transform:translate(-99px,-99px)';
        document.body.appendChild(dot);
        addEventListener('pointermove', (e) => { dot.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
      });
    }
  }, [K, lang, !phone]);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${phone ? 1080 : 1920}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-profile:v', 'high', '-tune', 'animation', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  const emitUntil = (tv) => { while (last && tick / FPS <= tv) { ff.stdin.write(last); tick++; written++; } };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (t0 === null) t0 = metadata.timestamp;
    emitUntil((metadata.timestamp - t0) * K); // jam virtual = jam nyata × K
    last = Buffer.from(data, 'base64');
  });
  const w = (ms) => p.waitForTimeout(ms / K);
  /** Kursor meluncur ke (x, y) selama `ms` jam virtual. */
  const glide = async (x, y, ms) => { const steps = Math.max(8, Math.round(ms / 16)); await p.mouse.move(x, y, { steps }); };
  let ok = false;
  await p.goto('about:blank');
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: size.width * dpr, maxHeight: size.height * dpr, everyNthFrame: 1 });
  await ctx.route('**/functions/v1/verify-access', (r) =>
    ok ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }) })
       : r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'wrong_code', remaining: 2 }) }));
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: require('fs').readFileSync(DATA, 'utf8') }));
  const tap = async (loc, hold = 300) => { const bx = await loc.boundingBox(); await glide(bx.x + bx.width / 2, bx.y + bx.height / 2, 500); await w(260); await p.mouse.down(); await w(hold); await p.mouse.up(); };
  const code = p.locator('.hm-code-input');
  if (!phone) await p.mouse.move(size.width / 2, size.height * 0.7);
  await p.goto(BASE + '/', { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await code.waitFor({ timeout: 60000 });
  await w(3600);
  if (!phone) { // kursor berkeliling: lapisan bergeser dengan jarak berbeda, kartu miring
    await glide(size.width * 0.08, size.height * 0.14, 1100); await w(500);
    await glide(size.width * 0.93, size.height * 0.2, 1500); await w(400);
    await glide(size.width * 0.86, size.height * 0.9, 1100); await w(300);
    await glide(size.width * 0.5, size.height * 0.62, 900); await w(300);
  } else await w(2400); // HP: lapisan dan kartu berayun sendiri
  await code.pressSequentially('lakon2026', { delay: 120 / K }); // kode salah
  await w(1900);
  ok = true;
  await code.pressSequentially('lakon2027', { delay: 120 / K }); // kode benar
  await p.locator('.hm-begin').waitFor({ timeout: 60000 });
  await w(4400);
  if (!phone) {
    await glide(size.width * 0.12, size.height * 0.3, 1100); await w(400);
    await glide(size.width * 0.9, size.height * 0.5, 1400); await w(400);
  } else await w(1600);
  await tap(p.locator('.sound-toggle'), 240); await w(900);
  await tap(p.locator('.sound-toggle'), 240); await w(700);
  await tap(p.locator('.hm-begin'), 320);
  await w(1500);
  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));
  if (last) { ff.stdin.write(last); written++; }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1) }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
