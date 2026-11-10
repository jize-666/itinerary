/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Ukur kehalusan film tanpa perekam (standar: 0 frame > 50 ms di momen kunci).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/measure-film.cjs <data-trip.json> [desktop|iphone]
// <data-trip.json> = respons trip-data tiruan (simpan di luar repo). Yang diukur: jeda antar-frame di thread
// utama (requestAnimationFrame) dan Long Animation Frames selama tiap momen. Catatan: transisi slide berjalan
// di compositor, jadi angka ini menjaga thread utama tetap lega (scrub jari, React, nanti WebGL); kehalusan
// compositor sendiri hanya bisa dinilai di perangkat nyata.
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const [DATA, device = 'desktop'] = process.argv.slice(2);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const b = await chromium.launch();
  const ctx = await b.newContext(device === 'iphone' ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('lakon.session', JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }));
    const m = (window.__m = { gaps: [], loaf: [] });
    let last = performance.now();
    const loop = (t) => { m.gaps.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.loaf.push(Math.round(e.duration)); }).observe({ type: 'long-animation-frame', buffered: true }); } catch { /* browser lama */ }
  });
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  const p = await ctx.newPage();
  const settle = () => p.waitForFunction(() => !document.querySelector('.film').hasAttribute('data-moving'));
  const rows = [];
  /** Jalankan satu momen dan catat frame terpanjangnya. */
  const moment = async (name, act, tail = 1400) => {
    await p.evaluate(() => { window.__m.gaps.length = 0; window.__m.loaf.length = 0; });
    await act();
    await p.waitForTimeout(tail);
    const r = await p.evaluate(() => ({ gaps: window.__m.gaps.slice(2), loaf: window.__m.loaf.slice() }));
    const sorted = [...r.gaps].sort((x, y) => y - x);
    rows.push({ momen: name, frame: r.gaps.length, 'terpanjang (ms)': Math.round(sorted[0] || 0), 'p95 (ms)': Math.round(sorted[Math.floor(sorted.length * 0.05)] || 0), '> 50 ms': r.gaps.filter((g) => g > 50).length, 'LoAF > 50 ms': r.loaf.filter((d) => d > 50).length });
  };
  const step = async (key = 'ArrowDown') => { await p.keyboard.press(key); await p.waitForTimeout(120); await settle(); };
  const until = async (id) => { for (let i = 0; i < 40 && (await p.locator('.film').getAttribute('data-slide')) !== id; i++) await step(); };

  await p.goto(`${BASE}/film/`);
  await p.waitForSelector('.film');
  await p.waitForTimeout(600);
  await moment('judul hero (reveal Bayang)', async () => {}, 3200);
  await moment('slide → slide', () => step());
  await moment('slide → slide (mundur)', () => step('ArrowUp'));
  const first = await p.evaluate(() => document.querySelector('.fl-rail-list li:nth-child(2) button') !== null);
  if (first) {
    await moment('sapuan kayon (lompat bab)', async () => { await p.locator('.fl-rail-list li:nth-child(2) button').click(); await p.waitForTimeout(120); await settle(); }, 2600);
    await step(); // intro hari
    await moment('masuk gallery', () => step());
    await moment('gallery: geser panel', () => step());
    await moment('gallery: geser panel (2)', () => step());
    await moment('buka sheet detail', () => p.locator('.gal-card[data-cur] .gal-acts button').click(), 1100);
    await moment('tutup sheet detail', () => p.keyboard.press('Escape'), 900);
    if (device === 'iphone') {
      const cdp = await ctx.newCDPSession(p);
      const { width, height } = p.viewportSize();
      const pt = (x, y) => [{ x: Math.round(x), y: Math.round(y) }];
      await moment('scrub jari di gallery (ikut jari, lalu dilepas)', async () => {
        const x0 = width * 0.8, x1 = width * 0.25, y = height * 0.5;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y) });
        for (let i = 1; i <= 40; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + ((x1 - x0) * i) / 40, y) }); await p.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForTimeout(120); await settle();
      });
    }
    await until((await p.locator('.film').getAttribute('data-slide')).split('/')[0] + '/gong');
    await moment('gong penutup → judul bab berikutnya', () => step(), 2600);
  }
  console.table(rows);
  const bad = rows.filter((r) => r['> 50 ms'] > 0);
  console.log(bad.length ? `PERLU DICEK: ${bad.map((r) => r.momen).join('; ')}` : 'OK: 0 frame > 50 ms di semua momen');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
