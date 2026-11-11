/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Ukur kehalusan home (gerbang & sambutan 2,5D) tanpa perekam (standar: 0 frame > 50 ms di momen kunci).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/measure-home.cjs <data-trip.json> [desktop|iphone]
// <data-trip.json> = respons trip-data tiruan (simpan di luar repo). Yang diukur: jeda antar-frame di thread utama
// (requestAnimationFrame) dan Long Animation Frames selama tiap momen. Catatan: ayunan lapisan di layar sentuh dan
// semua animasi masuk berjalan di compositor; angka ini menjaga thread utama tetap lega. Kehalusan compositor
// sendiri hanya bisa dinilai di perangkat nyata.
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const [DATA, device = 'desktop'] = process.argv.slice(2);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const b = await chromium.launch();
  const ctx = await b.newContext(device === 'iphone' ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    const m = (window.__m = { gaps: [], loaf: [] });
    let last = performance.now();
    const loop = (t) => { m.gaps.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.loaf.push(Math.round(e.duration)); }).observe({ type: 'long-animation-frame', buffered: true }); } catch { /* browser lama */ }
  });
  let ok = false;
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  await ctx.route('**/functions/v1/verify-access', (r) =>
    ok ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'tok.guest-abcdef', role: 'guest', exp: 4102444800 }) })
       : r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'wrong_code', remaining: 2 }) }));
  const p = await ctx.newPage();
  const rows = [];
  /** Jalankan satu momen dan catat frame terpanjangnya. */
  const moment = async (name, act, tail = 1200) => {
    await p.evaluate(() => { window.__m.gaps.length = 0; window.__m.loaf.length = 0; });
    await act();
    await p.waitForTimeout(tail);
    const r = await p.evaluate(() => ({ gaps: window.__m.gaps.slice(2), loaf: window.__m.loaf.slice() }));
    const sorted = [...r.gaps].sort((x, y) => y - x);
    rows.push({ momen: name, frame: r.gaps.length, 'terpanjang (ms)': Math.round(sorted[0] || 0), 'p95 (ms)': Math.round(sorted[Math.floor(sorted.length * 0.05)] || 0), '> 50 ms': r.gaps.filter((g) => g > 50).length, 'LoAF > 50 ms': r.loaf.filter((d) => d > 50).length });
  };
  const input = p.locator('.hm-code-input');

  await p.goto(`${BASE}/`);
  await input.waitFor();
  await p.waitForTimeout(300); // muat & hidrasi tidak dihitung
  await moment('gerbang: kartu berayun masuk, judul, baki kode', async () => {}, 3200);
  if (device === 'iphone') await moment('gerbang diam: lapisan dan kartu berayun (CSS)', async () => {}, 2500);
  else await moment('kursor menyapu layar: lapisan dan kartu ikut', async () => { await p.mouse.move(80, 120); await p.mouse.move(1360, 780, { steps: 45 }); await p.mouse.move(200, 700, { steps: 45 }); }, 900);
  await moment('mengetik kode (salah): huruf jatuh, goyang, kilat merah', () => input.pressSequentially('AB12CD345', { delay: 45 }), 1500);
  ok = true;
  await moment('kode benar: huruf menyala, kayon menyibak, kartu berbalik', () => input.pressSequentially('ABC123XYZ', { delay: 45 }), 1400);
  await moment('sambutan: pass berbalik masuk, judul, tombol', async () => {}, 3600);
  await moment('mulai: cap jatuh, tirai menutup', () => p.getByRole('button', { name: 'Begin the lakon' }).click(), 1400);
  console.table(rows);
  const bad = rows.filter((r) => r['> 50 ms'] > 0);
  console.log(bad.length ? `PERLU DICEK: ${bad.map((r) => r.momen).join('; ')}` : 'OK: 0 frame > 50 ms di semua momen');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
