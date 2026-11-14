/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-expressions -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau Today 2,5D (permintaan host 14 Nov) dalam gerak lambat, mulus walau server tanpa GPU.
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-today.cjs <data-trip.json> <keluaran.mp4> [iphone|desktop] [K=0.2]
// <data-trip.json> = respons trip-data tiruan (JANGAN pakai data tamu asli di repo; simpan di luar repo).
// Tur: sebelum trip (judul, kemiringan HP / kursor menggeser latar dan memutar kartu, gulir ke Before you go,
// dua kotak dicentang), lalu hari pertama trip (Now/Next, gulir pelan: kartu datang dari kedalaman dan latar turun,
// Rain plan, sheet SOS dibuka dan ditutup, kembali ke atas). Jamnya diputar lewat Date.now (tanpa banner pratinjau).
// Teknik sama dengan record-flow.cjs: waktu halaman diperlambat K kali, frame screencast dialirkan ke ffmpeg pada jam
// virtual 60 fps. iphone = 1080 px lebar (tegak), desktop = 1920×1080. Butuh: playwright (Chromium), ffmpeg.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const [DATA, out, device = 'iphone', kArg] = process.argv.slice(2);
  const K = +(kArg || 0.2);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const FPS = 60;
  const phone = device === 'iphone';
  const dpr = phone ? 3 : 1.5;
  // jam WIB yang diputar: sebelum trip, dan hari pertama pukul 10.45
  const BEFORE = Date.parse('2027-03-20T19:30:00+07:00');
  const DURING = Date.parse('2027-04-08T10:45:00+07:00');
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`] });
  const ctx = await b.newContext({ ...(phone ? devices['iPhone 14 Pro'] : { viewport: { width: 1280, height: 720 } }), deviceScaleFactor: dpr });
  await ctx.addInitScript(([k, times]) => {
    sessionStorage.setItem('lakon.session', JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }));
    const rec = new URLSearchParams(location.search).get('rec');
    const target = rec === 'during' ? times[1] : times[0];
    const pn = performance.now.bind(performance), t0 = pn(), dn = Date.now, d0 = dn();
    performance.now = () => t0 + (pn() - t0) * k;
    Date.now = () => target + (dn() - d0) * k;
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
    window.requestAnimationFrame = (cb) => raf((ts) => cb(t0 + (ts - t0) * k));
    // gulir halus mengikuti jam virtual
    window.__glide = (px, ms) => new Promise((res) => { const y0 = scrollY, s = performance.now(); const step = () => { const p = Math.min(1, (performance.now() - s) / ms); scrollTo(0, y0 + px * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)); p < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
    // kemiringan HP tiruan (gamma kiri-kanan, beta depan-belakang) selama `ms`, kembali ke netral
    window.__tilt = (ms) => new Promise((res) => { const s = performance.now(); const step = () => { const p = Math.min(1, (performance.now() - s) / ms); const g = 14 * Math.sin(p * Math.PI * 2); const bt = 50 - 9 * Math.sin(p * Math.PI); window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: bt, gamma: g })); p < 1 ? requestAnimationFrame(step) : res(); }; window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 50, gamma: 0 })); requestAnimationFrame(step); });
  }, [K, [BEFORE, DURING]]);
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const { width, height } = p.viewportSize();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${phone ? 1080 : 1920}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '19', '-preset', 'medium', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  const emitUntil = (tv) => { while (last && tick / FPS <= tv) { ff.stdin.write(last); tick++; written++; } };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (t0 === null) t0 = metadata.timestamp;
    emitUntil((metadata.timestamp - t0) * K);
    last = Buffer.from(data, 'base64');
  });
  const w = (ms) => p.waitForTimeout(ms / K);
  const glide = (px, ms) => p.evaluate(([a, c]) => window.__glide(a, c), [px, ms]);
  /** Ketuk di HP (sentuhan, bukan kursor: kursor akan menggerakkan parallax), klik di desktop. */
  const press = async (loc, dwell) => {
    if (phone) await loc.tap();
    else await loc.click();
    await p.evaluate(() => document.activeElement instanceof HTMLElement && !document.activeElement.closest('dialog') && document.activeElement.blur());
    await w(dwell);
  };
  /** Gerak pandang: kemiringan HP tiruan, atau kursor yang menyapu layar di desktop. */
  const look = async (ms) => {
    if (phone) return p.evaluate((d) => window.__tilt(d), ms);
    await p.mouse.move(width * 0.92, height * 0.2, { steps: 30 });
    await w(ms * 0.35);
    await p.mouse.move(width * 0.1, height * 0.75, { steps: 40 });
    await w(ms * 0.4);
    await p.mouse.move(width * 0.5, height * 0.45, { steps: 20 });
    await w(ms * 0.25);
  };

  await p.goto('about:blank');
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(width * dpr), maxHeight: Math.round(height * dpr), everyNthFrame: 1 });
  await p.goto(`${BASE}/today/?rec=before`, { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await p.waitForSelector('.td');
  await w(3600); // judul, sapaan, hitung mundur, tiket
  await look(3200); // latar bergeser menurut kedalaman, kartu memutar
  await glide(height * 1.15, 2600); // gulir: kartu datang dari kedalaman, latar turun
  await w(900);
  const boxes = p.locator('.byg-item');
  if ((await boxes.count()) > 0) await press(boxes.nth(0), 1000); // centang: medali emas, cincin memancar
  if ((await boxes.count()) > 1) await press(boxes.nth(1), 1300);
  await glide(height * 0.9, 2200);
  await w(1200);

  await p.goto(`${BASE}/today/?rec=during`, { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await p.waitForSelector('.td');
  await w(3400); // hari pertama: judul, Now/Next
  await look(3000);
  await glide(height * 0.8, 2400);
  await w(700);
  await press(p.locator('.rain'), 1600); // Rain plan
  await glide(height * 0.9, 2400);
  await w(800);
  await press(p.locator('.dock-sos'), 2400); // sheet darurat
  await press(p.locator('.sheet-x'), 1200);
  await glide(-p.viewportSize().height * 3, 2600); // kembali ke atas: latar naik lagi
  await w(1400);

  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));
  if (last) { ff.stdin.write(last); written++; }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1), keluaran: out }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
