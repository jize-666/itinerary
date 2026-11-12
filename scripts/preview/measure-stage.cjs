/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Ukur beban panggung 3D per tier: draw call, segitiga, waktu CPU per frame, ukuran kanvas, ukuran bundle 3D,
// dan lama sampai frame pertama.
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/measure-stage.cjs <data-trip.json> [desktop|iphone]
// <data-trip.json> = respons trip-data tiruan (simpan di luar repo).
// Catatan: Chromium di server tanpa GPU menggambar WebGL di CPU (SwiftShader), jadi fps di sini BUKAN ukuran
// kehalusan di perangkat. Yang berarti dari sini: jumlah draw call dan segitiga (sama di perangkat mana pun),
// waktu CPU thread utama per frame (JS + perintah GL), dan ukuran unduhan. fps nyata: buka /film/?fps di perangkat.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const zlib = require('zlib');
(async () => {
  const [DATA, device = 'desktop'] = process.argv.slice(2);
  if (!DATA) throw new Error('pemakaian: node scripts/preview/measure-stage.cjs <data-trip.json> [desktop|iphone]');
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const b = await chromium.launch();
  const base = device === 'iphone' ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

  /** Buka film pada satu tier; kembalikan halaman, JS yang diunduh, dan lama sampai frame pertama. */
  const open = async (tier) => {
    const ctx = await b.newContext(base);
    await ctx.addInitScript(() => sessionStorage.setItem('lakon.session', JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 })));
    await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
    const p = await ctx.newPage();
    const js = new Map();
    p.on('response', async (r) => {
      const url = r.url().split('?')[0];
      if (!url.includes('/_next/') || !url.endsWith('.js')) return;
      try { js.set(url, await r.body()); } catch { /* dibatalkan */ }
    });
    const t0 = Date.now();
    await p.goto(`${BASE}/film/?stage=${tier}`);
    await p.waitForSelector('.film');
    let first = null;
    if (tier !== 'static') {
      await p.waitForSelector('.film[data-stage]', { timeout: 60000 });
      first = Date.now() - t0;
      await p.waitForSelector('.film[data-stage="on"]', { timeout: 60000 });
    }
    await p.waitForLoadState('networkidle');
    return { ctx, p, js, first };
  };
  const size = (js) => { let raw = 0, gz = 0; for (const body of js.values()) { raw += body.length; gz += zlib.gzipSync(body, { level: 9 }).length; } return { raw, gz }; };
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

  // ---- ukuran unduhan: film 2,5D vs film + panggung 3D ----
  const flat = await open('static');
  const flatSize = size(flat.js);
  await flat.ctx.close();

  const rows = [];
  let stageSize = null;
  for (const tier of ['high', 'medium', 'low']) {
    const { ctx, p, js, first } = await open(tier);
    if (!stageSize) stageSize = size(js);
    const settle = () => p.waitForFunction(() => !document.querySelector('.film').hasAttribute('data-moving'));
    const step = async () => { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(120); await settle(); };
    const kind = () => p.locator('.film').getAttribute('data-kind');
    const slide = () => p.locator('.film').getAttribute('data-slide');
    /** Catat angka panggung di slide sekarang, sesudah beberapa frame diam. */
    const mark = async (name) => {
      await p.waitForTimeout(1600);
      const s = await p.evaluate(() => ({ ...window.__lakonStage, w: document.querySelector('.fl-canvas canvas').width, h: document.querySelector('.fl-canvas canvas').height }));
      rows.push({ tier, slide: name, kanvas: `${s.w}×${s.h}`, 'draw call': s.calls, segitiga: s.triangles, 'CPU/frame (ms)': +s.work.toFixed(2), 'frame pertama (ms)': name === 'hero' ? first : '' });
    };
    await mark('hero');
    // satu contoh per jenis slide; di gallery satu per fase langit (subuh, siang, senja, malam)
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      await step();
      const k = await kind();
      if (!['route', 'title', 'panel', 'gong', 'credits'].includes(k)) continue;
      const sky = k === 'panel' ? await p.locator('.fl-layer[data-pos="cur"] .gal-card[data-cur]').getAttribute('data-phase').catch(() => null) : null;
      const key = k === 'panel' ? `panel ${sky ?? (await slide()).split('/').pop()}` : k;
      if (!seen.has(key)) {
        seen.add(key);
        await mark(key);
      }
      if (k === 'credits') break;
    }
    await ctx.close();
  }
  console.table(rows);
  console.log(`Unduhan JS film 2,5D        : ${kb(flatSize.raw)} mentah, ${kb(flatSize.gz)} gzip`);
  console.log(`Unduhan JS film + panggung 3D: ${kb(stageSize.raw)} mentah, ${kb(stageSize.gz)} gzip`);
  console.log(`Tambahan bundle 3D (lazy)    : ${kb(stageSize.raw - flatSize.raw)} mentah, ${kb(stageSize.gz - flatSize.gz)} gzip`);
  const worst = Math.max(...rows.map((r) => r['CPU/frame (ms)']));
  console.log(worst < 4 ? `OK: CPU thread utama ≤ ${worst} ms per frame di semua tier (anggaran 60 fps = 16,7 ms)` : `PERLU DICEK: CPU per frame sampai ${worst} ms`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
