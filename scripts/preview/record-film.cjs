/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau film dalam gerak lambat (HD, mulus walau server tanpa GPU).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-film.cjs <data-trip.json> <keluaran.mp4> [desktop|iphone] [K=0.25] [film|gallery|stage|prolog|gong|kayon|kamera|datar|gerbang]
// film (bawaan) = tur dari prolog sampai credits; gallery = satu hari penuh di gallery Hari 1 (siklus waktu:
// matahari mengikuti jam), di iphone termasuk satu scrub jari yang ditahan di tengah jalan; stage = tur pendek
// panggung 3D (prolog, sapuan ke Hari 1, satu hari di gallery, gong); prolog = empat slide pertama sesudah gunungan
// dicabut (hero, headline, intro, fakta pertama: tempat audit host 14 Nov); gong = gong ageng 3D (prolog, kamera
// mengitari gong, lalu slide gong penutup Hari 1: dipukul sendiri saat tiba, lalu dipukul lagi dengan klik);
// kayon = sapuan gunungan 3D: maju ke Hari 1 (muka Agung), mundur ke prolog (muka Murka, api geni naik), maju lagi;
// kamera = gerak pandang di slide gong (desktop): parallax kursor, dua tahap gulir (dekat), zoom − dan +, menjauh,
// lalu pindah slide dengan kedalaman ikut gulir; datar = gerak pandang film 2,5D (pakai STAGE=static): parallax
// kursor dan bidang teks yang memutar, lalu perpindahan slide yang bergerak dalam kedalaman; gerbang = gunungan
// pembuka dan penutup (Tugas 7): tertancap di depan kelir, kursor menggeser lampu dan bayangan (desktop), dibalik ke
// muka Murka dan kembali, dicabut dengan gulir (di iphone dengan jari, ditahan di tengah), lalu lompat ke credits dan
// gunungan ditancapkan lagi. Film 3D yang dibuka di slide pertama selalu mulai dengan gunungan tertancap, jadi di tur
// lain langkah pertama mencabutnya.
// Panggung 3D: STAGE=high|medium|low memaksa tier (`?stage=`), dan tur baru dimulai sesudah kanvas tampil.
// Di server tanpa GPU kanvas digambar di CPU (±1–2 frame per detik di 1080p) dan selama itu seluruh halaman
// tertahan. Supaya tiap frame video punya gambar baru, K harus ≤ (fps nyata ÷ 60): pakai K = 0,02 atau lebih
// kecil, dan jangan menjalankan pekerjaan berat lain selama merekam. Rekaman 38 detik memakan ±35 menit.
// Semua frame screencast diambil (everyNthFrame 1): melewatkan frame membuat video patah-patah.
// <data-trip.json> = respons trip-data (JANGAN menaruh data tamu asli di repo; simpan di luar repo). Aturan host 14 Nov:
// pratinjau memakai trip klien April, dibuat dengan `pnpm -s exec tsx scripts/preview/client-data.ts <keluaran.json>`.
// Teknik sama dengan record-flow.cjs: waktu halaman diperlambat K kali (animasi CSS/WAAPI dan jam rAF lewat CDP
// Animation.setPlaybackRate; timer dan performance.now diskalakan), frame screencast dialirkan ke ffmpeg pada jam virtual
// 60 fps. desktop = 1920×1080, iphone = 1080 px lebar (tegak). Butuh: playwright (Chromium), ffmpeg.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const [DATA, out, device = 'desktop', kArg, tour = 'film'] = process.argv.slice(2);
  const K = +(kArg || 0.25);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const STAGE = process.env.STAGE || '';
  const FPS = 60;
  const phone = device === 'iphone';
  const dpr = phone ? 3 : 1.5;
  const base = phone ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1280, height: 720 } };
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`] });
  const ctx = await b.newContext({ ...base, deviceScaleFactor: dpr });
  await ctx.addInitScript((k) => {
    sessionStorage.setItem('lakon.session', JSON.stringify({ token: 'e2e.guest-token-123', role: 'guest', exp: 4102444800 }));
    const pn = performance.now.bind(performance), t0 = pn(), dn = Date.now, d0 = dn();
    performance.now = () => t0 + (pn() - t0) * k;
    Date.now = () => d0 + (dn() - d0) * k;
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms / k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms / k, ...a);
    // Jam rAF sudah diperlambat Animation.setPlaybackRate (rAF memakai jam document.timeline), jadi tidak diskalakan
    // lagi di sini: dulu terskala dua kali dan jam panggung 3D berjalan K kali terlalu lambat. Sebelum laju itu
    // terpasang (awal muat halaman) jam rAF masih jam nyata; di situ dipakai jam virtual.
    window.requestAnimationFrame = (cb) => raf((ts) => cb(Math.min(ts, performance.now())));
  }, K);
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const { width, height } = p.viewportSize();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${phone ? 1080 : 1920}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  /** Kamera berjalan: selama menunggu panggung 3D dimuat, frame diterima tetapi tidak ditulis ke video. */
  let rolling = true;
  const emitUntil = (tv) => { while (last && tick / FPS <= tv) { ff.stdin.write(last); tick++; written++; } };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (!rolling) return;
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
  rolling = !STAGE || STAGE === 'static';
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(width * dpr), maxHeight: Math.round(height * dpr), everyNthFrame: 1 });
  await p.goto(`${BASE}/film/${STAGE ? `?stage=${STAGE}` : ''}${tour === 'gallery' ? '#day-1' : tour === 'kamera' ? '#day-2' : ''}`, { waitUntil: 'commit' });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  await p.waitForSelector('.film');
  if (STAGE && STAGE !== 'static') {
    // tunggu kanvas 3D tampil penuh, lalu mulai video dari sini (bukan dari layar muat)
    await p.waitForSelector('.film[data-stage="on"]', { timeout: 600000 });
    rolling = true;
  }
  /** Akhiri rekaman: tutup aliran ke ffmpeg dan laporkan. */
  const finish = async () => {
    await cdp.send('Page.stopScreencast');
    await new Promise((r) => setTimeout(r, 300));
    if (last) { ff.stdin.write(last); written++; }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1), keluaran: out }));
    await b.close();
  };

  if (tour === 'stage') {
    await w(3200); // hero: pendapa, blencong, langit malam
    await key('ArrowDown', 3000); // pembuka: kamera mengitari panggung
    await key('ArrowDown', 2800); // intro
    await key('ArrowDown', 2800); // fakta 1
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 4200); // lompat ke Hari 1: sapuan kayon
    await key('ArrowDown', 3400); // intro hari: kamera turun ke tepi pendapa, memandang Lawu
    await key('ArrowDown', 2800); // panel pertama: naik ke atas lanskap
    for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await key('ArrowDown', 2500); // subuh → siang → senja → malam
    await w(2600); // gong penutup hari
    await finish();
    return;
  }

  if (tour === 'prolog') {
    await w(3000); // hero sesudah gunungan dicabut: pendapa, blencong, langit malam
    await key('ArrowDown', 3600); // headline: gayor dan kedua naga utuh di HP tegak (audit host 14 Nov "ke crop")
    await key('ArrowDown', 3200); // intro prolog
    await key('ArrowDown', 3400); // fakta "A royal city": blencong dari dekat
    await finish();
    return;
  }

  if (tour === 'gong') {
    await w(2600); // prolog: gong ageng di tengah pendapa
    await key('ArrowDown', 3200); // pembuka: kamera mengitari gong ke kanan
    await key('ArrowDown', 2800); // intro: mundur, seluruh pendapa
    await tap(p.locator('.fl-rail-list li:nth-child(3) button'), 4200); // lompat ke Hari 2: sapuan kayon
    await key('ArrowUp', 6800); // mundur ke gong penutup Hari 1: begitu tiba gong dipukul sendiri, kedua naga menyembur api
    await tap(p.locator(".fl-layer[data-pos='cur'] .fs-strike"), 5400); // dipukul lagi dengan klik (tabuh terangkat saat kursor di atas gong)
    await finish();
    return;
  }

  if (tour === 'datar') {
    const glide = async (x, y, ms) => { await p.mouse.move(x, y, { steps: 24 }); await w(ms); };
    await w(1400); // prolog
    await glide(1240, 300, 1800); // kursor ke kanan: langit bergeser berlawanan, judul searah dan memutar
    await glide(60, 620, 1800); // ke kiri bawah
    await glide(640, 360, 1000);
    await key('ArrowDown', 2600); // perpindahan slide: yang lama membesar, yang baru tumbuh dari kedalaman
    await key('ArrowDown', 2600);
    await glide(1200, 360, 1500);
    await glide(100, 360, 1500);
    await glide(640, 360, 800);
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 3400); // lompat bab: bayangan kayon, kedalaman di baliknya
    await key('ArrowDown', 2600); // ke gallery Hari 1
    await glide(1200, 300, 1500);
    await glide(100, 520, 1500);
    await glide(640, 360, 800);
    await finish();
    return;
  }

  if (tour === 'kamera') {
    const glide = async (x, y, ms) => { await p.mouse.move(x, y, { steps: 24 }); await w(ms); };
    await w(1200); // judul Hari 2
    await key('ArrowUp', 3600); // ke gong penutup Hari 1: dipukul sendiri
    await glide(640, 360, 600);
    await glide(1240, 300, 2200); // kursor ke kanan: kamera bergeser, perspektif berubah
    await glide(60, 640, 2400); // ke kiri bawah
    await glide(640, 360, 1600);
    await p.mouse.wheel(0, 100); await w(2800); // gulir pertama: mendekat ke gong
    await glide(900, 300, 1800); // parallax saat dekat
    await glide(640, 360, 1000);
    await key('-', 1600); // zoom menjauh sedikit
    await key('+', 1600); // mendekat lagi
    await p.mouse.wheel(0, -100); await w(2600); // gulir mundur saat dekat: menjauh dulu
    await p.mouse.wheel(0, 100); await w(2200); // dekat lagi
    await p.mouse.wheel(0, 100); await w(3200); // gulir berikutnya: pindah slide, kamera maju mengikuti gulir
    await finish();
    return;
  }

  if (tour === 'gerbang') {
    const glide = async (x, y, ms) => { await p.mouse.move(x, y, { steps: 24 }); await w(ms); };
    // video dimulai saat gunungan pembuka sudah tertancap (tekstur siap), termasuk saat ia memudar masuk
    rolling = false;
    await p.waitForSelector('.film[data-gate="head"]', { timeout: 600000 });
    rolling = true;
    await w(2600); // tertancap di gedebog, kelir disinari blencong
    if (!phone) {
      await glide(1200, 240, 2200); // kursor ke kanan atas: lampu ikut, bayangan bergeser ke kiri, lembaran berpaling
      await glide(90, 560, 2400); // ke kiri bawah
      await glide(640, 380, 1000);
    }
    await tap(p.locator('.fl-kayon'), 3600); // dibalik: muka Murka, api geni menyala lalu membara
    if (!phone) {
      await glide(980, 280, 1400); // pupil barong mengikuti kursor
      await glide(300, 420, 1400);
      await glide(640, 380, 600);
    }
    await tap(p.locator('.fl-kayon'), 2600); // kembali ke muka Agung
    if (phone) {
      // dicabut dengan jari: naik pelan, ditahan di tengah (gunungan ikut diam), lalu dilepas
      const y0 = Math.round(height * 0.78);
      const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(width / 2), y }] });
      await touch('touchStart', y0);
      for (let i = 1; i <= 30; i++) { await touch('touchMove', y0 - i * 6); await w(30); }
      await w(1200);
      for (let i = 31; i <= 50; i++) { await touch('touchMove', y0 - i * 6); await w(24); }
      await touch('touchEnd', 0);
      await w(4200);
    } else {
      await p.mouse.wheel(0, 120); // dicabut: naik dari gedebog, disapukan ke kanan bersama kelir, kamera maju ke prolog
      await w(4600);
    }
    await key('End', 4200); // lompat ke credits
    await key('ArrowDown', 4400); // tancep kayon: gunungan masuk dari kiri, credits memudar, gong saat menancap
    await finish();
    return;
  }

  if (tour === 'kayon') {
    await w(1800); // prolog
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 3400); // maju ke Hari 1: muka Agung melintas kiri → kanan
    await tap(p.locator('.fl-rail-list li:nth-child(1) button'), 3400); // mundur ke prolog: muka Murka kanan → kiri, api geni naik dari kaki
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 3000); // maju lagi
    await finish();
    return;
  }

  if (tour === 'gallery') {
    // jari tiruan: titik yang mengikuti sentuhan, hanya di rekaman
    const finger = async (type, x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await p.evaluate(([t, fx, fy]) => {
        let dot = document.getElementById('rec-finger');
        if (!dot) {
          dot = document.body.appendChild(document.createElement('div'));
          dot.id = 'rec-finger';
          dot.style.cssText = 'position:fixed;z-index:999;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgb(255 255 255 / .28);box-shadow:0 0 0 1.5px rgb(255 255 255 / .6);pointer-events:none';
        }
        dot.style.display = t === 'touchEnd' ? 'none' : 'block';
        dot.style.transform = `translate(${fx}px, ${fy}px)`;
      }, [type, x, y]);
    };
    /** Seret jari menyamping dari x0 ke x1 dalam `ms` (waktu video). */
    const pull = async (x0, x1, y, ms) => {
      const steps = Math.max(2, Math.round(ms / 16));
      for (let i = 1; i <= steps; i++) { await finger('touchMove', x0 + ((x1 - x0) * i) / steps, y); await w(ms / steps); }
    };
    await w(3000); // judul hari
    await key('ArrowDown', 3400); // intro hari
    await key('ArrowDown', 2600); // panel pertama (sarapan: matahari belum tampak)
    await key('ArrowDown', 2600); // jadwal pertama setelah sarapan: matahari muncul perlahan
    if (phone) {
      // scrub: tarik, tahan (matahari ikut diam), lanjut, lepas
      const y = Math.round(height * 0.62);
      const x0 = Math.round(width * 0.8);
      await finger('touchStart', x0, y);
      await pull(x0, x0 - width * 0.22, y, 700);
      await w(900);
      await pull(x0 - width * 0.22, x0 - width * 0.5, y, 800);
      await w(500);
      await finger('touchEnd', 0, 0);
      await w(2200);
    }
    for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await key('ArrowDown', 2400); // siang → senja → malam
    await w(2400); // gong penutup hari
    await cdp.send('Page.stopScreencast');
    await new Promise((r) => setTimeout(r, 300));
    if (last) { ff.stdin.write(last); written++; }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1), keluaran: out }));
    await b.close();
    return;
  }

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
