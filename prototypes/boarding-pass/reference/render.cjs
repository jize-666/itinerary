// Merender gambar referensi Tugas 12 dari scene.js (Chromium bawaan container, WebGL lewat SwiftShader).
// Pakai: node prototypes/boarding-pass/reference/render.cjs <folder-keluaran> [nama] [preset,...]
// Nama tamu hanya lewat argumen (pratinjau: "Jize"); tidak ada nama di repo.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.resolve(process.argv[2] || 'ref-out');
const NAME = process.argv[3] || 'Your Name';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

const SHOTS = [
  // [nama berkas, preset, lebar, tinggi, dpr]
  ['ref-01-hero', 'hero', 1440, 900, 2],
  ['ref-02-macro', 'macro', 1440, 900, 2],
  ['ref-03-back', 'back', 1440, 900, 2],
  ['ref-04-motion', 'motion', 1440, 900, 2],
  ['ref-05-phone', 'phone', 393, 852, 3],
  ['sb-1-descend', 'descend', 960, 600, 1.5],
  ['sb-2-settle', 'hero', 960, 600, 1.5],
  ['sb-3-pull', 'pull', 960, 600, 1.5],
  ['sb-4-edge', 'edge', 960, 600, 1.5],
  ['sb-5-back', 'back', 960, 600, 1.5],
  ['sb-6-side', 'side', 960, 600, 1.5],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/prototypes/boarding-pass/reference/index.html?name=${encodeURIComponent(NAME)}`;
  const browser = await chromium.launch();
  for (const [file, preset, w, h, dpr] of SHOTS) {
    if (ONLY && !ONLY.includes(file) && !ONLY.includes(preset)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    page.on('pageerror', (e) => console.error('pageerror', e.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.evaluate((p) => window.__shot(p), preset);
    await page.screenshot({ path: path.join(OUT, `${file}.png`) });
    if (file === 'ref-01-hero') {
      const f = await page.evaluate(() => window.__faces());
      for (const k of ['front', 'back']) fs.writeFileSync(path.join(OUT, `face-${k}.png`), Buffer.from(f[k].split(',')[1], 'base64'));
    }
    await page.close();
    console.log('ok', file);
  }
  // lembar komposisi: storyboard dan spesifikasi
  const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString('base64')}`;
  const have = (fs2) => fs2.every((f) => fs.existsSync(path.join(OUT, f)));
  const FONT = `@font-face{font-family:Fraunces;src:url(${base.split('/prototypes')[0]}/node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2);font-style:italic;font-weight:100 900}
    @font-face{font-family:Manrope;src:url(${base.split('/prototypes')[0]}/node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2);font-weight:200 800}`;
  const CSS = `${FONT} body{margin:0;background:#06070f;color:#efe6d4;font:500 14px/1.45 Manrope,sans-serif} h1{font:italic 600 30px/1.1 Fraunces,serif;color:#e2c482;margin:0 0 4px} .k{font:800 11px/1 Manrope;letter-spacing:.18em;text-transform:uppercase;color:#d2ab62} .dim{color:#8d93b3}`;
  const sheet = async (file, html, w) => {
    const page = await browser.newPage({ viewport: { width: w, height: 600 }, deviceScaleFactor: 2 });
    await page.goto(base.replace(/index\.html.*$/, 'blank.html'));
    await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${file}.png`), fullPage: true });
    await page.close();
    console.log('ok', file);
  };
  const SB = [
    ['sb-1-descend', '1 · Descend', 'Scroll-driven depth. Scrolling into the pass slide lowers the ticket out of the dark roof toward the camera; scrolling back raises it. It stops when the scroll stops.'],
    ['sb-2-settle', '2 · Settle', 'It comes to rest in front of the camera and sways a little in the breeze. The foil catches the lantern.'],
    ['sb-3-pull', '3 · Grab and pull', 'Grab the card or the thread (raycast hit) and pull. The thread goes taut and the card pivots at the eyelet.'],
    ['sb-4-edge', '4 · Flick and spin', 'Let go with a flick. The card spins on its thread and shows its gilded edge and the thickness of the board.'],
    ['sb-5-back', '5 · Back', 'Tap, click or Enter flips it with a physical turn: kawung foil, monogram, "Matur nuwun". Tap again to turn it back.'],
    ['sb-6-side', '6 · Parallax', 'The cursor or phone tilt moves the real camera. Perspective shift shows the card edge; pillars, gong and lantern move at their own depth.'],
  ];
  if (have(SB.map(([f]) => `${f}.png`))) await sheet('ref-06-storyboard', `<div style="padding:40px 44px 36px">
    <div class="k">Task 12 · boarding pass 3D with physics</div><h1>Reference storyboard</h1>
    <p class="dim" style="margin:0 0 26px">Rendered with three.js as a reference for pose, light and mood. Not production code and not a spec: the physics, the final design and the choreography are yours to improve.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px 18px">${SB.map(([f, t, d]) => `<figure style="margin:0"><img src="${img(`${f}.png`)}" style="width:100%;display:block;border-radius:10px;border:1px solid #2a2f52"><figcaption style="margin-top:10px"><div class="k">${t}</div><div style="margin-top:6px">${d}</div></figcaption></figure>`).join('')}</div></div>`, 1600);
  if (have(['face-front.png', 'face-back.png'])) {
    const sw = (c, n) => `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><span style="width:34px;height:22px;border-radius:5px;background:${c};border:1px solid #333a66"></span><span><b>${c}</b> <span class="dim">${n}</span></span></div>`;
    const dim = (t) => `<span style="font:700 12px Manrope;color:#f2d79b">${t}</span>`;
    await sheet('ref-07-spec', `<div style="padding:40px 44px;display:grid;grid-template-columns:auto 1fr;gap:48px">
      <div>
        <div class="k">Task 12 · boarding pass 3D with physics</div><h1>Card faces and specs</h1>
        <p class="dim" style="margin:0 0 22px">Flat print layers (colour map). Foil areas also go into the metal/roughness and emboss maps.</p>
        <div style="display:flex;gap:56px;align-items:flex-start">
          ${['front', 'back'].map((k) => `<div style="position:relative;padding:0 0 0 30px"><div class="k" style="margin-bottom:10px">${k === 'front' ? 'Front' : 'Back (after flip)'}</div>
            <img src="${img(`face-${k}.png`)}" style="width:300px;display:block">
            ${k === 'front' ? `<div style="position:absolute;left:0;top:26px;height:608px;border-left:1px solid #f2d79b;width:0"></div><div style="position:absolute;left:-20px;top:320px;transform:rotate(-90deg)">${dim('150 mm')}</div>
            <div style="margin-top:8px;border-top:1px solid #f2d79b;width:300px;text-align:center;padding-top:4px">${dim('74 mm')}</div>` : ''}</div>`).join('')}
        </div>
      </div>
      <div style="padding-top:64px;max-width:560px">
        <div class="k">Physical object</div>
        <ul style="padding-left:18px;margin:8px 0 22px">
          <li>Luggage-tag shape, 74 × 150 mm, board about 1.2 mm thick. Top corners cut at 45° (13 mm), bottom corners rounded (6 mm).</li>
          <li>Hole Ø 8.4 mm, centre 11.5 mm from the top, lined with a brass eyelet on both faces.</li>
          <li>Tear line at 135.5 mm: perforation dots and a half-round notch on each side.</li>
          <li>Gilded edge all round. Foil is raised (emboss), with metal and low roughness; paper is matte with a fine fibre tooth and a little sheen at grazing angles.</li>
          <li>Thread: two-ply twisted gold silk cord, about 1.4 mm. A loop passes through the eyelet and is bound with a short whipping; a single cord rises to a fixed hook.</li>
        </ul>
        <div class="k">Palette</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:6px 0 22px">
          ${sw('#1d2552', 'nila, top glow')}${sw('#121736', 'nila, paper')}${sw('#0a0d21', 'nila, bottom')}${sw('#efe6d4', 'ink, cream')}
          ${sw('#8d93b3', 'dim labels')}${sw('#ecd096', 'foil highlight')}${sw('#b88f4c', 'foil mid')}${sw('#9c7638', 'foil shadow')}
          ${sw('#c39a5c', 'brass eyelet')}${sw('#ff9a45', 'lantern glow')}${sw('#3d140c', 'red lacquer pillar')}${sw('#02030a', 'night sky')}
        </div>
        <div class="k">Type (self-hosted, same as the site)</div>
        <p style="margin:8px 0 22px"><span style="font:italic 600 22px Fraunces">Fraunces Variable, italic</span> <span class="dim">for the title, the guest name, the gate and "Matur nuwun"</span><br>
        <span style="font:800 18px Manrope;letter-spacing:.04em">MANROPE VARIABLE 600–800</span> <span class="dim">for labels, airport codes and details</span></p>
        <div class="k">Content</div>
        <p style="margin:8px 0 0">Everything on the card is <b>runtime data</b> passed in by the film: guest name and initials (private, never in code, assets or logs), route codes and city names, the date, and the bilingual labels (EN/ID). "Kulonuwun" stays Javanese in both languages. Name shown here: the host's own name for previews.</p>
      </div></div>`, 1600);
  }
  await browser.close();
  server.close();
})();
