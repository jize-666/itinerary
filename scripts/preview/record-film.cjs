/* eslint-disable @typescript-eslint/no-require-imports -- skrip dev CommonJS mandiri (bukan kode aplikasi); dijalankan langsung dengan node */
// Perekam pratinjau film dalam gerak lambat (HD, mulus walau server tanpa GPU).
// Pemakaian: pnpm build && pnpm preview (port 4173), lalu
//   node scripts/preview/record-film.cjs <data-trip.json> <keluaran.mp4> [desktop|iphone|hp916] [K=0.25] [film|gallery|stage|prolog|gong|kayon|kamera|datar|gerbang|judul|kitar|clawd|dimensi|diorama|lawu|canting]
// canting = halaman membatik /canting/ (Tugas 11.2): menggambar bebas (klowong, cecek, tembok, mbleber), celup canting,
// mulai lagi dengan pola kawung yang ditorehkan canting, nila, mbironi, soga, lorod, simpan. CANT_Q=high|medium|low
// (bawaan high), DIO_LANG=en|id. Di HP goresan memakai sentuhan jari (CDP).
// lawu = eleven Day 2 stops, frame-stepped on desktop 1440×900 or phone 1080×1920 at 24 fps (record-lawu.cjs).
// Use the April client-data fixture. Optional PREVIEW_BROWSER selects a locally installed headless Chromium.
// diorama = tur otomatis maket 3D /diorama/ (64 dtk; tanpa suara, VOICE diabaikan): DIO_Q=high|medium|low (bawaan high)
// mengunci kualitas, DIO_LANG=en|id (bawaan en, lewat localStorage lakon.lang), QUERY menambah parameter URL. Video
// mulai begitu .dio-root[data-ready="true"] (mesin maket hidup, tur otomatis jalan dari detik 0; STAGE diabaikan) dan
// berhenti saat data-tour="done" + ±1,5 dtk virtual, batas aman 70 dtk virtual. Contoh:
//   DIO_Q=high node scripts/preview/record-film.cjs <client.json> out.mp4 desktop 0.03 diorama
// dimensi = gerbang dimensi di gallery (permintaan host 17 Nov): judul Hari 1 → intro → tiga panel maju (masuk
// dimensi), satu mundur (keluar dimensi), maju lagi; di HP satu geser jari ditahan di tengah gerbang. Bengawan Solo
// dan larung lampion ikut tampak. QUERY=clawd=0 menambah parameter URL (mis. tanpa Clawd).
// clawd = Clawd, maskot pemandu (perkenalan, petunjuk di gunungan, hero, gallery, gong penutup, spam klik); film 3D
// (STAGE=high) atau film 2,5D (STAGE=static, tanpa gunungan pembuka).
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
// gunungan ditancapkan lagi; judul = Tugas 7b: judul Hari 1 tersedot ke gong dan gong ditabuh tanpa hentakan kamera,
// mundur (huruf keluar lagi), ditabuh lagi, intro hari, gallery dengan letak Z dan depth of field (di iphone satu
// geser jari ditahan di tengah), lalu lompat ke prolog dan tahap gong hero; kitar = zoom dan kamera mengitari gong ±90°
// (permintaan host 14 Nov "dua dua nya, 90derajat") di judul Hari 1: seret ke kanan sampai samping gong, dilepas
// (kembali ke depan), seret ke kiri, zoom masuk dan keluar, gong ditabuh saat sudah dikitari, lalu gong penutup hari. Film 3D yang dibuka di slide pertama selalu mulai dengan gunungan tertancap, dan judul hari serta
// hero punya tahap gong: `advance` mencabut gunungan dan menjalankan tahap gong lebih dulu bila perlu.
// Bersuara: VOICE=<suara.json> mencatat kapan tiap klip suara Clawd mulai dan berhenti (waktu VIDEO), karena rekaman
// Playwright tidak membawa audio. Rekaman lalu dimulai dari beranda seperti tamu: tombol "Begin the lakon" ditekan
// (itu yang menyalakan suara; film dibuka lewat navigasi klien dengan ?stage= / QUERY / #hari yang sama), bahasa EN,
// dan Chromium boleh memutar tanpa gestur. Berkas JSON berisi {K, fps, events:[{t, type:"start"|"stop"|"hush", name}]}; hush = gelembung mulai memudar.
// Sesudahnya: python3 -I scripts/preview/mix-voice.py . <video.mp4> <suara.json> <keluaran.mp4>. Web Audio halaman
// berjalan dengan jam nyata (tidak ikut diperlambat), jadi hanya saat start dan stop eksplisit yang dipakai.
// Contoh: STAGE=static VOICE=suara.json node scripts/preview/record-film.cjs data.json film.mp4 desktop 0.25 clawd
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
  if (tour === 'lawu') return require('./record-lawu.cjs')(DATA, out, device);
  const K = +(kArg || 0.25);
  const BASE = process.env.BASE_URL || 'http://localhost:4173';
  const STAGE = process.env.STAGE || '';
  const FPS = 60;
  // hp916 = HP tegak tepat 9:16 (1080 × 1920; permintaan host 15 Nov "record di 9:16")
  const phone = device === 'iphone' || device === 'hp916';
  const dpr = phone ? 3 : 1.5;
  const base = device === 'hp916' ? { ...devices['iPhone 14 Pro'], viewport: { width: 360, height: 640 }, screen: { width: 360, height: 640 } } : phone ? { ...devices['iPhone 14 Pro'] } : { viewport: { width: 1280, height: 720 } };
  const dio = tour === 'diorama';
  const cant = tour === 'canting';
  const VOICE = dio || cant ? '' : process.env.VOICE || '';
  const b = await chromium.launch({ args: [`--force-device-scale-factor=${dpr}`, ...(VOICE ? ['--autoplay-policy=no-user-gesture-required'] : [])] });
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
  /**
   * Peristiwa suara Clawd (jam dinding nyata `tw`). Waktu video t = (tw − t0) × K dihitung saat ditulis; peristiwa
   * sebelum video mulai (film 3D: Clawd sudah bicara selagi panggung dimuat) mendapat t negatif, dan mix-voice.py
   * memotong awal klipnya. Log ditulis tiap peristiwa: bila rekaman terputus (container di-restart), isinya tidak hilang.
   */
  const voiceEvents = [];
  const dumpVoice = (selesai) => {
    if (t0 === null) return;
    const events = voiceEvents.map(({ tw, type, name }) => ({ t: +((tw - t0) * K).toFixed(3), type, name }));
    fs.writeFileSync(VOICE, JSON.stringify({ K, fps: FPS, events, selesai }, null, 1));
  };
  if (VOICE) {
    await ctx.exposeFunction('__voiceEv', (type, name) => {
      voiceEvents.push({ tw: Date.now() / 1000, type, name });
      dumpVoice(false);
    });
    await ctx.addInitScript(() => {
      localStorage.setItem('lakon.lang', 'en');
      const names = new WeakMap(); // ArrayBuffer / AudioBuffer klip Clawd -> nama klip
      const nameOf = (u) => (/\/audio\/clawd\/(?:[^/?#]+\/)?([^/?#]+)\.mp3/.exec(u) || [])[1];
      const f = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const n = nameOf(typeof input === 'string' ? input : input instanceof Request ? input.url : String(input));
        const pr = f(input, init);
        return !n ? pr : pr.then((r) => {
          const ab = r.arrayBuffer.bind(r);
          r.arrayBuffer = () => ab().then((buf) => { names.set(buf, n); return buf; });
          return r;
        });
      };
      const dd = BaseAudioContext.prototype.decodeAudioData;
      BaseAudioContext.prototype.decodeAudioData = function (buf, ok, err) {
        const n = names.get(buf); // dicatat sebelum aslinya jalan: ArrayBuffer dilepas sesudahnya
        const done = (ab) => { if (n) names.set(ab, n); return ab; };
        const r = dd.call(this, buf, ok && ((ab) => ok(done(ab))), err);
        return n ? r.then(done) : r;
      };
      const proto = AudioBufferSourceNode.prototype;
      for (const type of ['start', 'stop']) {
        const orig = proto[type];
        proto[type] = function (...a) {
          const n = this.buffer && names.get(this.buffer);
          if (n) window.__voiceEv(type, n);
          return orig.apply(this, a);
        };
      }
      // Klip di halaman berjalan dengan jam nyata dan biasanya sudah habis sebelum dihentikan, jadi `stop` jarang
      // terpanggil. Aplikasi menghentikan suara begitu gelembung mulai memudar (fade < 1, session.ts → hush), jadi
      // saat opacity gelembung turun dari 1 dicatat sebagai `hush`: klip yang sedang berbunyi di video berhenti.
      const seen = new WeakSet();
      const watch = (el) => {
        let was = 1;
        new MutationObserver(() => {
          const o = parseFloat(el.style.opacity || '1');
          if (was >= 1 && o < 1) window.__voiceEv('hush', '');
          was = o;
        }).observe(el, { attributes: true, attributeFilter: ['style'] });
      };
      const find = () => { for (const el of document.querySelectorAll('.clawd-bubble')) if (!seen.has(el)) { seen.add(el); watch(el); } };
      document.addEventListener('DOMContentLoaded', () => { find(); new MutationObserver(find).observe(document.body, { childList: true, subtree: true }); });
    });
    // Jam audio ikut diperlambat K, seperti performance.now dan Date.now di atas. Tanpa ini, di film 3D (CPU sibuk
    // menggambar panggung, 1–2 frame/dtk) klip yang selesai dimuat lebih dari VOICE_LATE (0,6 dtk jam audio NYATA)
    // sesudah diminta dianggap terlambat dan tidak diputar, padahal dalam waktu film jedanya hanya puluhan milidetik.
    await ctx.addInitScript((k) => {
      const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');
      const starts = new WeakMap();
      Object.defineProperty(BaseAudioContext.prototype, 'currentTime', {
        configurable: true,
        get() {
          const real = d.get.call(this);
          if (!starts.has(this)) starts.set(this, real);
          const s = starts.get(this);
          return s + (real - s) * k;
        },
      });
    }, K);
  }
  await ctx.route('**/functions/v1/trip-data', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(DATA, 'utf8') }));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const { width, height } = p.viewportSize();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${phone ? 1080 : 1920}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let last = null, t0 = null, tick = 0, written = 0;
  if (VOICE) ff.on('close', () => dumpVoice(true));
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
  /**
   * Maju satu slide. Gunungan pembuka yang masih tertancap dicabut dulu, dan di judul hari / hero tahap gongnya
   * dijalankan dulu (Tugas 7b), masing-masing dengan jeda supaya terlihat di video.
   */
  const advance = async (dwell) => {
    const film = p.locator('.film');
    if ((await film.getAttribute('data-gate')) === 'head') await key('ArrowDown', 4200);
    const k = await kind();
    if ((k === 'title' || k === 'hero') && (await film.getAttribute('data-beat')) !== 'out') await key('ArrowDown', 3600);
    await key('ArrowDown', dwell);
  };

  await p.goto('about:blank');
  rolling = dio || cant ? false : VOICE ? false : !STAGE || STAGE === 'static';
  await cdp.send('Animation.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(width * dpr), maxHeight: Math.round(height * dpr), everyNthFrame: 1 });
  if (dio || cant) await ctx.addInitScript((l) => { try { localStorage.setItem('lakon.lang', l); localStorage.removeItem('lakon.canting.v1'); } catch {} }, process.env.DIO_LANG || 'en');
  const query = [STAGE ? `stage=${STAGE}` : '', process.env.QUERY || ''].filter(Boolean).join('&');
  const hash = ['gallery', 'judul', 'kitar', 'dimensi'].includes(tour) ? '#day-1' : tour === 'kamera' ? '#day-2' : '';
  const dioQuery = ['tur=1', `q=${process.env.DIO_Q || 'high'}`, process.env.QUERY || ''].filter(Boolean).join('&');
  const cantQuery = [`q=${process.env.CANT_Q || 'high'}`, process.env.QUERY || ''].filter(Boolean).join('&');
  const filmUrl = dio ? `/diorama/?${dioQuery}` : cant ? `/canting/?${cantQuery}` : `/film/${query ? `?${query}` : ''}${hash}`;
  if (VOICE) {
    // bersuara: mulai dari beranda dan tekan "Begin the lakon" seperti tamu (itu yang menyalakan suara). Navigasi
    // klien ke /film/ membuang query dan hash, jadi pushState/replaceState menambahkannya kembali.
    // query (mis. ?stage=high) sudah ada di beranda: StageMount membaca location.search saat film dipasang, sebelum
    // router memanggil pushState, jadi query yang baru ditambahkan bungkus pushState di bawah terlambat terbaca
    await p.goto(`${BASE}/${query ? `?${query}` : ''}${hash}`, { waitUntil: 'commit' });
    await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
    await p.evaluate((target) => {
      const [path, rest] = [target.split(/[?#]/)[0], target.slice(target.split(/[?#]/)[0].length)];
      for (const m of ['pushState', 'replaceState']) {
        const orig = history[m].bind(history);
        history[m] = (state, title, url) => {
          const u = url == null ? null : new URL(String(url), location.href);
          if (u && u.pathname === path && !u.search && !u.hash && rest) return orig(state, title, path + rest);
          return orig(state, title, url);
        };
      }
    }, filmUrl);
    // batas tunggu ikut diperlambat K (film 3D: K = 0,02, transisi beranda → film memakan puluhan detik nyata)
    await p.waitForSelector('.hm-begin', { timeout: 60000 / K });
    await w(2500); // sambutan tampil dulu
    await tap(p.locator('.hm-begin'), 0);
    await p.waitForURL(/\/film\//, { timeout: 60000 / K, waitUntil: 'commit' });
  } else {
    await p.goto(`${BASE}${filmUrl}`, { waitUntil: 'commit' });
    await cdp.send('Animation.setPlaybackRate', { playbackRate: K });
  }
  if (!dio && !cant) await p.waitForSelector('.film');
  if (!dio && !cant && STAGE && STAGE !== 'static') {
    // tunggu kanvas 3D tampil penuh, lalu mulai video dari sini (bukan dari layar muat)
    await p.waitForSelector('.film[data-stage="on"]', { timeout: 600000 });
    rolling = true;
  }
  if (VOICE) rolling = true;
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

  if (cant) {
    // halaman membatik /canting/ (Tugas 11.2): menggambar bebas, celup canting, pola kawung, nila, mbironi, soga,
    // lorod, simpan. Semua jeda dalam waktu virtual, jadi kejadian pointer rapat seperti tangan sungguhan.
    await p.waitForSelector('.cnt-root[data-ready="true"]', { timeout: 600000 });
    rolling = true;
    p.on('dialog', (d) => d.accept()); // "Mulai lagi?"
    const box = async () => {
      const c = await p.locator('.cnt-canvas').boundingBox();
      const top = (await p.locator('.cnt-top').boundingBox()) || { y: 0, height: 0 };
      const dock = (await p.locator('.cnt-dock').boundingBox()) || { y: c.height };
      const y0 = top.y + top.height, y1 = dock.y;
      return { x: c.x + c.width / 2, y: (y0 + y1) / 2, w: Math.min(c.width * 0.8, (y1 - y0) * 1.5), h: (y1 - y0) * 0.8 };
    };
    const at = (b, u, v) => [b.x + u * b.w * 0.5, b.y + v * b.h * 0.5]; // u, v: −1..1 di area kain
    const stroke = async (pts, hold = 0) => {
      if (phone) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
        for (const [x, y] of pts) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await w(16); }
        if (hold) await w(hold);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await p.mouse.move(pts[0][0], pts[0][1]);
        await p.mouse.down();
        for (const [x, y] of pts) { await p.mouse.move(x, y); await w(16); }
        if (hold) await w(hold);
        await p.mouse.up();
      }
    };
    const ring = (b, cu, cv, ru, rv, n = 90) => Array.from({ length: n + 1 }, (_, i) => at(b, cu + ru * Math.cos((i / n) * Math.PI * 2), cv + rv * Math.sin((i / n) * Math.PI * 2)));
    const button = (name) => p.getByRole('button', { name }).first();
    const radio = (name) => p.getByRole('radio', { name, exact: true }).first();
    await w(3200); // Clawd menyapa
    let b = await box();
    // klowong: empat kelopak kawung di tengah, satu lingkaran, satu gelombang yang berakhir diam (mbleber)
    for (const [cu, cv] of [[-0.18, 0], [0.18, 0], [0, -0.28], [0, 0.28]]) await stroke(ring(b, cu, cv, 0.15, 0.22, 70));
    await w(600);
    await stroke(Array.from({ length: 120 }, (_, i) => at(b, -0.85 + (i / 119) * 1.7, 0.72 + 0.08 * Math.sin(i / 8))), 1600);
    await w(2500); // malam mendingin dari bening ke krem
    // cecek: titik di sekeliling
    await tap(radio('Cecek'), 400);
    b = await box();
    for (let i = 0; i < 16; i++) {
      await stroke([at(b, 0.5 * Math.cos((i / 16) * Math.PI * 2), 0.62 * Math.sin((i / 16) * Math.PI * 2))]);
      await w(90);
    }
    // tembok: menutup pusat
    await tap(radio('Tembok'), 400);
    b = await box();
    await stroke(Array.from({ length: 60 }, (_, i) => at(b, -0.06 + 0.12 * (i % 2 ? 1 : 0) + (i % 2 ? -0.01 : 0.01), -0.08 + (i / 59) * 0.16)));
    await w(800);
    // celup canting ke wajan
    await tap(p.locator('.cnt-dip'), 2200);
    // mulai lagi dengan pola pensil kawung, lalu canting menorehkannya sendiri
    await tap(p.locator('.cnt-more summary'), 900);
    await tap(p.getByRole('button', { name: /Start over|Mulai dari awal/ }).first(), 1200);
    await tap(radio('Kawung'), 1500);
    await tap(button(/Let the canting trace it|menelusurinya/i), 0);
    await p.waitForSelector('.cnt-root[data-tracing]', { timeout: 20000 / K }).catch(() => {});
    await p.waitForSelector('.cnt-root:not([data-tracing])', { timeout: 120000 / K });
    await w(1800);
    await tap(p.locator('.cnt-more summary'), 600); // tutup panel pola
    // nila → kerok → biru; mbironi: dua goresan sesudah nila
    await tap(button(/Dip in indigo|Celup nila/), 0);
    await p.waitForSelector('.cnt-root[data-stage="biru"]', { timeout: 60000 / K });
    await w(2600);
    await tap(radio('Klowong'), 300);
    b = await box();
    await stroke(ring(b, 0, 0, 0.32, 0.46, 110));
    await w(1200);
    await tap(button(/Dip in soga|Celup soga/), 0);
    await p.waitForSelector('.cnt-root[data-stage="coklat"]', { timeout: 60000 / K });
    await w(1500);
    await tap(button(/Boil off the wax|Lorod/), 0);
    await p.waitForSelector('.cnt-root[data-png="true"]', { timeout: 90000 / K });
    await w(2500);
    await tap(button(/Save my batik|Simpan batikku/), 3500);
    return finish();
  }

  if (dio) {
    // mulai saat mesin maket hidup dan tur berjalan (kanvas sudah menggambar), bukan dengan waktu tetap
    // (data-ready = mesin ada, kanvas sudah menggambar; tur otomatis langsung jalan dari detik 0)
    await p.waitForSelector('.dio-root[data-ready="true"]', { timeout: 600000 });
    rolling = true;
    // tur selesai = data-tour="done"; batas aman 70 dtk virtual (waktu nyata = 70 / K)
    await p.waitForSelector('.dio-root[data-tour="done"]', { timeout: 70000 / K }).catch(() => console.error('tur belum selesai di batas 70 dtk virtual'));
    await w(1500);
    return finish();
  }

  if (tour === 'clawd') {
    // M3: Clawd memandu di film 3D. Gunungan tertancap, Clawd muncul dan memperkenalkan diri, satu klik memajukan
    // kalimat, petunjuk gunungan; cabut → hero (petunjuk tahap gong), gong ditabuh (Clawd terkejut, lalu petunjuk
    // zoom); gallery Hari 1 (petunjuk geser); gong penutup Hari 1 (petunjuk pukul, dipukul); spam klik = marah.
    // film 3D: tombol tak terlihat di atas Clawd; film 2,5D (STAGE=static): Clawd CSS 3D itu sendiri tombolnya
    const clawd = p.locator('.clawd-hit, .clawd-flat').first();
    await w(8500);
    await tap(clawd, 3200);
    await w(13500);
    await key('ArrowDown', 6500);
    await key('ArrowDown', 9000);
    await p.evaluate(() => { location.hash = '#day-1'; });
    await w(3500);
    await advance(3200);
    await advance(3000);
    await w(8500);
    await p.evaluate(() => { location.hash = '#day-2'; });
    await w(2500);
    await key('ArrowUp', 6500);
    await tap(p.locator('.fl-layer[data-pos="cur"] .fs-strike'), 5500);
    await clawd.evaluate((b) => { for (let i = 0; i < 6; i++) b.click(); });
    await w(5000);
    return finish();
  }

  if (tour === 'kitar') {
    // seret: mouse di desktop, satu jari di iphone; `to` = letak akhir sebagai bagian lebar layar
    const drag = async (from, to, ms, hold) => {
      const y = Math.round(height * 0.58);
      const steps = Math.max(8, Math.round(ms / 40));
      if (phone) {
        const finger = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y }] });
        await finger('touchStart', width * from);
        for (let i = 1; i <= steps; i++) { await finger('touchMove', width * (from + ((to - from) * i) / steps)); await w(ms / steps); }
        await w(hold);
        await finger('touchEnd', 0);
      } else {
        await p.mouse.move(width * from, y);
        await p.mouse.down();
        for (let i = 1; i <= steps; i++) { await p.mouse.move(width * (from + ((to - from) * i) / steps), y); await w(ms / steps); }
        await w(hold);
        await p.mouse.up();
      }
    };
    /** Cubit dua jari (iphone) atau tombol +/− (desktop). */
    const zoomTo = async (inward, ms) => {
      if (!phone) {
        await key(inward ? '+' : '-', 500);
        await key(inward ? '+' : '-', ms);
        return;
      }
      const [cx, cy] = [width / 2, height * 0.45];
      const pts = (r) => [{ x: Math.round(cx - r), y: Math.round(cy), id: 0 }, { x: Math.round(cx + r), y: Math.round(cy), id: 1 }];
      const [r0, r1] = inward ? [40, 150] : [150, 40];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(r0) });
      for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(r0 + ((r1 - r0) * i) / 20) }); await w(35); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await w(ms);
    };
    await w(3000); // judul Hari 1 di depan gayor, gong, dan kedua naga
    await drag(0.35, 0.97, 2200, 1600); // seret ke kanan: kamera ke kiri sampai samping gong (−90°), teks memudar
    await w(2600); // dilepas: kamera kembali pelan ke depan
    await drag(0.65, 0.03, 2000, 1400); // seret ke kiri: sisi kanan gong
    await w(2400);
    await zoomTo(true, 2200); // zoom masuk: gong mendekat, teks memudar
    await zoomTo(false, 2000); // zoom keluar
    await drag(0.5, 0.82, 1400, 400); // dikitari sedikit lalu dilepas...
    await key('ArrowDown', 4600); // ...dan langsung ditabuh: huruf tersedot ke letak gong yang sedang tampil
    await tap(p.locator('.fl-rail-list li:nth-child(3) button'), 3600); // lompat ke Hari 2
    await key('ArrowUp', 4200); // gong penutup Hari 1: dipukul sendiri
    await drag(0.4, 0.92, 1800, 1200); // gong penutup juga bisa dikitari
    await w(2600);
    await finish();
    return;
  }

  if (tour === 'judul') {
    const glide = async (x, y, ms) => { await p.mouse.move(x, y, { steps: 24 }); await w(ms); };
    await w(3400); // judul Hari 1 lahir sebagai bayangan, di depan gayor, gong, dan kedua naga
    if (!phone) {
      await glide(1100, 260, 1600); // parallax kamera dan perspective shift sebelum gong ditabuh
      await glide(640, 360, 900);
    }
    await key('ArrowDown', 4600); // tahap gong: huruf tersedot ke pencu, gong ditabuh, kamera tetap di tempat
    await key('ArrowUp', 3000); // mundur: huruf keluar lagi dari gong ke tempatnya, tanpa pukulan
    await key('ArrowDown', 4400); // ditabuh lagi
    await key('ArrowDown', 3600); // langkah berikutnya: pindah ke intro hari (memandang Lawu)
    await key('ArrowDown', 3600); // ke gallery: depth of field masuk, lanskap di belakang kartu lembut
    if (phone) {
      // geser jari pelan, ditahan di tengah: fokus tertarik ke lanskap mengikuti jari, lapisan tanah bergeser berbeda
      const y = Math.round(height * 0.62);
      const x0 = Math.round(width * 0.82);
      const finger = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await finger('touchStart', x0);
      for (let i = 1; i <= 24; i++) { await finger('touchMove', x0 - i * 6); await w(40); }
      await w(1400);
      for (let i = 25; i <= 44; i++) { await finger('touchMove', x0 - i * 6); await w(30); }
      await finger('touchEnd', 0);
      await w(3000);
      await key('ArrowRight', 3000);
    } else {
      await key('ArrowRight', 3000); // geser: kamera bergeser (letak Z), fokus ditarik ke lanskap lalu kembali
      await key('ArrowRight', 3000);
      await glide(1150, 300, 1600); // parallax kamera di gallery
      await glide(640, 360, 900);
    }
    await key('ArrowRight', 3200);
    await tap(p.locator('.fl-rail-list li:nth-child(1) button'), 3600); // lompat ke prolog: hero
    await key('ArrowDown', 4600); // tahap gong hero
    await finish();
    return;
  }

  if (tour === 'stage') {
    await w(3200); // hero: pendapa, blencong, langit malam
    await advance(3000); // pembuka: kamera mengitari panggung
    await advance(2800); // intro
    await advance(2800); // fakta 1
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 4200); // lompat ke Hari 1: sapuan kayon
    await advance(3400); // intro hari: kamera turun ke tepi pendapa, memandang Lawu
    await advance(2800); // panel pertama: naik ke atas lanskap
    for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await advance(2500); // subuh → siang → senja → malam
    await w(2600); // gong penutup hari
    await finish();
    return;
  }

  if (tour === 'prolog') {
    await w(3000); // hero sesudah gunungan dicabut: pendapa, blencong, langit malam
    await advance(3600); // headline: gayor dan kedua naga utuh di HP tegak (audit host 14 Nov "ke crop")
    await advance(3200); // intro prolog
    await advance(3400); // fakta "A royal city": blencong dari dekat
    await finish();
    return;
  }

  if (tour === 'gong') {
    await w(2600); // prolog: gong ageng di tengah pendapa
    await advance(3200); // pembuka: kamera mengitari gong ke kanan
    await advance(2800); // intro: mundur, seluruh pendapa
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
    await advance(2600); // perpindahan slide: yang lama membesar, yang baru tumbuh dari kedalaman
    await advance(2600);
    await glide(1200, 360, 1500);
    await glide(100, 360, 1500);
    await glide(640, 360, 800);
    await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 3400); // lompat bab: bayangan kayon, kedalaman di baliknya
    await advance(2600); // ke gallery Hari 1
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
    await advance(4400); // tancep kayon: gunungan masuk dari kiri, credits memudar, gong saat menancap
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

  if (tour === 'dimensi') {
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
    const pull = async (x0, x1, y, ms) => {
      const steps = Math.max(2, Math.round(ms / 16));
      for (let i = 1; i <= steps; i++) { await finger('touchMove', x0 + ((x1 - x0) * i) / steps, y); await w(ms / steps); }
    };
    await w(1600); // judul hari
    await advance(2600); // intro hari (tahap gong judul dijalankan dulu)
    await advance(2600); // panel pertama: perahu di lampion pertama
    await advance(2400); // masuk dimensi
    await advance(2400); // masuk dimensi lagi (jam berganti)
    await key('ArrowUp', 2400); // keluar dimensi
    await advance(2400); // masuk lagi
    if (phone) {
      // geser jari ditahan tepat di tengah gerbang, lalu dilanjutkan
      const y = Math.round(height * 0.62);
      const x0 = Math.round(width * 0.82);
      await finger('touchStart', x0, y);
      await pull(x0, x0 - width * 0.3, y, 700);
      await w(1300);
      await pull(x0 - width * 0.3, x0 - width * 0.62, y, 600);
      await finger('touchEnd', 0, 0);
      await w(2200);
    } else await advance(2600);
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
    await advance(3400); // intro hari
    await advance(2600); // panel pertama (sarapan: matahari belum tampak)
    await advance(2600); // jadwal pertama setelah sarapan: matahari muncul perlahan
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
    for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await advance(2400); // siang → senja → malam
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
  await advance(3000); // pembuka
  await advance(2800); // intro
  await advance(2800); // fakta 1
  await advance(2600); // fakta 2
  await tap(p.locator('.fl-rail-list li:nth-child(2) button'), 4200); // lompat ke Hari 1: sapuan kayon
  await advance(3400); // intro hari
  for (let i = 0; i < 3; i++) await advance(2300); // tiga panel pertama
  await tap(p.locator('.gal-card[data-cur] .gal-acts button').first(), 3000); // cerita
  await tap(p.locator('.fl-sheet .sheet-x'), 1400);
  await tap(p.locator('.lang-toggle .seg-opt').nth(1), 2200); // ganti ke ID di tempat
  for (let i = 0; i < 12 && (await kind()) === 'panel'; i++) await advance(1900); // sisa hari: siang → senja → malam
  await w(2200); // gong penutup hari
  await advance(4200); // sapuan kayon → judul hari berikutnya
  await tap(p.locator('.lang-toggle .seg-opt').nth(0), 1600); // kembali ke EN
  const chapters = await p.locator('.fl-rail-list li').count();
  await tap(p.locator(`.fl-rail-list li:nth-child(${chapters - 1}) button`), 5200); // epilog
  for (let i = 0; i < 6 && (await slide()) !== 'credits'; i++) await advance(3200);
  await w(1800);

  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));
  if (last) { ff.stdin.write(last); written++; }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(JSON.stringify({ frame_video: written, detik: (written / FPS).toFixed(1), keluaran: out }));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
