// Prototipe Tugas 1 v3 — "Gong Murka": gong ageng 3D interaktif (Lakon Tiga Hari)
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height). Semua geometri & tekstur dibuat prosedural.
// Satu bahasa visual dengan Gunungan v3 "Murka":
//  · kepingan bara berkumpul → gong muncul membara lalu mendingin jadi perunggu
//  · gong punya "jantung": pencu berdenyut merah (deg-deg) seirama mata kala
//  · puncak gayor = Batara Kala, wayang kulit gagrak Surakarta (menyamping, bertatah), matanya menyala berdenyut
//  · naga gayor garang: rahang menganga, taring, mulut berbara, mata merah, tanduk
//  · KLIK GONG: tabuh menghantam → retakan bara menjalar dari pencu, riak merah, gelombang kejut,
//    semburan bara, kedua naga menyemburkan api, mata Batara Kala menyala terang, kamera bergetar

// ======================= RENDERER & SCENE =======================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const NIGHT = 0x050306;
const scene = new THREE.Scene();
scene.background = new THREE.Color(NIGHT);
scene.fog = new THREE.Fog(0x080405, 4.5, 13);

const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 60);
camera.position.set(3.0, 1.35, 4.7);                         // sudut agak rendah: gayor & kala menjulang
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.62, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.28;
controls.minDistance = 1.3;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.55;

const rand = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// raster CPU (willReadFrequently): jauh lebih cepat untuk ribuan gradasi/path dibanding kanvas ber-GPU
const makeCanvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d', { willReadFrequently: true }), w, h); return c; };
const tex = (c, srgb, rep) => {
  const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};
const radialTex = (stops, size = 128) => tex(makeCanvas(size, size, (g) => { const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, size, size); }), true);
const dotTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 64);

// ======================= ENVIRONMENT (pantulan logam, hangat kemerahan) =======================
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x050304, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 1, 0); env.add(m);
  };
  panel(7, 3.5, [-4, 5, 4.5], [1.0, 0.7, 0.42], 4.2);
  panel(0.7, 5, [5, 1.8, 2.5], [1.0, 0.85, 0.7], 5);
  panel(5, 2.2, [-2, 2.5, -6], [0.9, 0.16, 0.08], 1.8);
  panel(9, 1.2, [0, -0.4, 6], [0.8, 0.22, 0.08], 1.4);
  panel(6, 4, [1.5, 2.4, 6.5], [1.0, 0.6, 0.32], 1.6);
  panel(2.5, 2.5, [-1.2, 0.6, 5.5], [1.0, 0.36, 0.12], 1.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.025).texture;
  pmrem.dispose();
}

// ======================= TEKSTUR =======================
// Perunggu gong (UV planar dari depan; pusat = pencu). Patina lebih gelap, tepi menghitam.
const TS = 2048, C = TS / 2, PX = C / 0.52, R_PENCU = 0.125 * PX;
const bronzeBump = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, TS, TS);
  for (let r = R_PENCU + 6; r < C; r += 2 + rand() * 5) {
    const v = 116 + rand() * 24; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + rand() * 1.5;
    g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke();
  }
  for (let i = 0; i < 3600; i++) {
    const a = rand() * Math.PI * 2, rr = R_PENCU + 14 + Math.sqrt(rand()) * (C - R_PENCU - 14);
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr, r = 6 + rand() * 13;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(78,78,78,0.5)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
});
const bronzeRough = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(84,84,84)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1500; i++) {
    const x = rand() * TS, y = rand() * TS, r = 20 + rand() * 90, v = 60 + rand() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.35)`); gr.addColorStop(1, 'rgba(84,84,84,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createRadialGradient(C, C, 0, C, C, R_PENCU * 1.1);
  gr.addColorStop(0, 'rgba(30,30,30,1)'); gr.addColorStop(0.85, 'rgba(38,38,38,1)'); gr.addColorStop(1, 'rgba(84,84,84,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(C, C, R_PENCU * 1.1, 0, Math.PI * 2); g.fill();
});
const bronzeColor = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(200,196,190)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1500; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * C, x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const r = 25 + rand() * 120, al = 0.1 + 0.26 * (rr / C);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(40,26,14,${al})`); gr.addColorStop(1, 'rgba(200,196,190,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const edge = g.createRadialGradient(C, C, C * 0.62, C, C, C); edge.addColorStop(0, 'rgba(20,12,8,0)'); edge.addColorStop(1, 'rgba(20,12,8,0.55)');
  g.fillStyle = edge; g.fillRect(0, 0, TS, TS);
  const pg = g.createRadialGradient(C, C, 0, C, C, R_PENCU);
  pg.addColorStop(0, 'rgb(255,248,230)'); pg.addColorStop(1, 'rgb(226,212,186)');
  g.fillStyle = pg; g.beginPath(); g.arc(C, C, R_PENCU, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(40,26,14,0.65)'; g.lineWidth = 16; g.beginPath(); g.arc(C, C, R_PENCU + 10, 0, Math.PI * 2); g.stroke();
});
// Peta bara: jantung di pencu (berdenyut), retakan & cincin recep yang hanya menyala saat dipukul
const bronzeEmber = makeCanvas(TS, TS, (g) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, TS, TS);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < 22; k++) {
    let a = (k / 22) * Math.PI * 2 + rand() * 0.2, r = R_PENCU * 1.08;
    const pts = [[C + Math.cos(a) * r, C + Math.sin(a) * r]];
    while (r < 0.47 * PX) { r += 16 + rand() * 30; a += (rand() - 0.5) * 0.14; pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]); }
    for (const [w, col] of [[12, 'rgba(110,18,4,0.55)'], [4.5, 'rgba(255,120,40,0.95)']]) {
      g.strokeStyle = col; g.lineWidth = w * (0.7 + rand() * 0.6); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
    if (rand() < 0.6) { const [x0, y0] = pts[Math.floor(pts.length * (0.3 + rand() * 0.4))]; let b = a + (rand() > 0.5 ? 0.5 : -0.5), x = x0, y = y0; g.strokeStyle = 'rgba(220,80,20,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 4; i++) { x += Math.cos(b) * 26; y += Math.sin(b) * 26; b += (rand() - 0.5) * 0.4; g.lineTo(x, y); } g.stroke(); }
  }
  for (const rr of [0.19, 0.33]) { g.strokeStyle = 'rgba(160,30,6,0.55)'; g.lineWidth = 9; g.beginPath(); g.arc(C, C, rr * PX, 0, Math.PI * 2); g.stroke(); }
  const pg = g.createRadialGradient(C, C, 0, C, C, R_PENCU * 1.3);
  pg.addColorStop(0, '#ffc070'); pg.addColorStop(0.5, '#ff5a18'); pg.addColorStop(1, 'rgba(90,14,4,0)');
  g.fillStyle = pg; g.beginPath(); g.arc(C, C, R_PENCU * 1.3, 0, Math.PI * 2); g.fill();
});

// Lak merah darah + ukiran lung-lungan emas (warna, metal/rough, bump) untuk gayor & tiang pendopo
const LW = 1024;
const lungLung = (g, mode) => { // mode: 'c' warna, 'm' metal/rough, 'b' bump
  const base = mode === 'c' ? '#3a0b07' : mode === 'm' ? 'rgb(0,110,0)' : 'rgb(110,110,110)';
  const gold = mode === 'c' ? '#b8924c' : mode === 'm' ? 'rgb(0,70,255)' : 'rgb(210,210,210)';
  g.fillStyle = base; g.fillRect(0, 0, LW, LW);
  if (mode === 'c') for (let i = 0; i < 260; i++) { const x = rand() * LW, y = rand() * LW, r = 30 + rand() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(10,2,1,0.28)'); gr.addColorStop(1, 'rgba(10,2,1,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = gold; g.fillStyle = gold; g.lineCap = 'round';
  g.lineWidth = 10; [26, LW - 26].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); });
  g.lineWidth = 3; [46, LW - 46].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); });
  for (let row = 0; row < 3; row++) {
    const y0 = 170 + row * 340, amp = 70;
    g.lineWidth = 7; g.beginPath();
    for (let x = 0; x <= LW; x += 8) { const y = y0 + Math.sin((x / LW) * Math.PI * 4 + row) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    for (let k = 0; k < 4; k++) {
      const x = (k + 0.5) * (LW / 4), y = y0 + Math.sin(((x / LW) * Math.PI * 4) + row) * amp, dir = k % 2 ? 1 : -1;
      g.lineWidth = 5; g.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40, a = dir * t * Math.PI * 2.4, r = 52 * (1 - t * 0.85); const px = x + Math.cos(a) * r * 0.9, py = y + dir * 40 + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      // lidah api kecil menggantikan daun
      g.save(); g.translate(x + 30, y - dir * 18); g.rotate(-dir * 0.8);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(14, -16, 36, -8, 56, -14); g.bezierCurveTo(40, 4, 18, 12, 0, 0); g.fill(); g.restore();
      g.beginPath(); g.arc(x - 34, y + dir * 6, 7, 0, Math.PI * 2); g.fill();
    }
  }
};
const lacC = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'c')), true), lacM = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'm'))), lacB = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'b')));
const lacquer = (rx, ry) => {
  const set = (t) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  return new THREE.MeshStandardMaterial({ map: set(lacC), metalnessMap: set(lacM), roughnessMap: set(lacM), bumpMap: set(lacB), bumpScale: 1.2, metalness: 1, roughness: 1, envMapIntensity: 1.1 });
};

// Tikar pandan gelap dengan tepi merah darah
const tikarTex = tex(makeCanvas(1024, 640, (g, w, h) => {
  g.fillStyle = '#6a5232'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
    const odd = ((x + y) / 16) % 2;
    g.fillStyle = odd ? 'rgba(40,26,12,0.4)' : 'rgba(255,230,190,0.07)'; g.fillRect(x, y, 16, 16);
    g.strokeStyle = 'rgba(30,18,8,0.3)'; g.strokeRect(x + 0.5, y + 0.5, 15, 15);
  }
  g.fillStyle = '#4a0e09'; g.fillRect(0, 0, w, 44); g.fillRect(0, h - 44, w, 44); g.fillRect(0, 0, 44, h); g.fillRect(w - 44, 0, 44, h);
  g.fillStyle = '#b8924c';
  for (let x = 60; x < w - 60; x += 36) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x + 10, 12); g.lineTo(x + 20, 22); g.lineTo(x + 10, 32); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x, h - 22); g.lineTo(x + 10, h - 32); g.lineTo(x + 20, h - 22); g.lineTo(x + 10, h - 12); g.closePath(); g.fill(); }
}), true);

// Lantai batu gelap berpetak
const floorTex = tex(makeCanvas(1024, 1024, (g, w) => {
  g.fillStyle = '#0e0b0c'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 400; i++) { const x = rand() * w, y = rand() * w, r = 20 + rand() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,40,40,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3;
  for (let k = 0; k <= w; k += 256) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, w); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); }
}), true, [10, 10]);

// Kain pembungkus kepala tabuh (merah tua + ikatan gelap)
const clothTex = tex(makeCanvas(512, 256, (g, w, h) => {
  g.fillStyle = '#6a160e'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`; g.fillRect(0, y, w, 1); }
  g.fillStyle = '#1a0805'; [40, 120, 200].forEach((y) => g.fillRect(0, y, w, 10));
  g.fillStyle = '#b8924c'; [56, 136, 216].forEach((y) => g.fillRect(0, y, w, 3));
}), true);

// ======================= BATARA KALA, wayang kulit gagrak Surakarta, untuk puncak gayor =======================
// Tokoh paling ditakuti di pewayangan Jawa (lakon ruwatan Murwakala). Konvensi wayang Solo: wajah menyamping
// (menghadap kanan, kelompok kiwa/raksasa), bahu tampak depan, kaki melangkah lebar (jangkahan).
// Atribut [V cek dalang/guide]: makutha + garuda mungkur, praba (tanda dewa), rambut gimbal, mata plelengan,
// irung bentulan, mulut gusen bersiung, brengos & jenggot, kain bokongan bermotif parang, kuku panjang.
// Konstruksi wayang: gapit + cempurit (tanduk) dan tuding di kedua tangan. Bertatah: lubang tembus cahaya.
// 4 kanvas: alpha (lubang), warna (sungging + prada), metal/rough, emisi (mata menyala). Koordinat lokal: (0,0) = tapak kaki, y ke atas negatif.
const BW = 1000, BH = 1400, BOX = 480, BOY = 1330;
const mkB = () => { const c = document.createElement('canvas'); c.width = BW; c.height = BH; return c; };
const bA = mkB(), bC = mkB(), bM = mkB(), bE = mkB();
{ const e = bE.getContext('2d', { willReadFrequently: true }); e.fillStyle = '#000'; e.fillRect(0, 0, BW, BH); }
const bctxs = [[bA, 'a'], [bC, 'c'], [bM, 'm'], [bE, 'e']].map(([c, m]) => [c.getContext('2d', { willReadFrequently: true }), m]);
const sty = (g, mode, color, metal, hole, glow) => {
  if (mode === 'a') return hole ? '#000' : '#fff';
  if (mode === 'e') return hole || !glow ? '#000' : glow;
  if (mode === 'c') {
    if (hole) return '#0c0503';
    if (color && typeof color === 'object') { const gr = color.lin ? g.createLinearGradient(...color.lin) : g.createRadialGradient(...color.rad); color.stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
    return color;
  }
  return metal ? 'rgb(0,80,255)' : 'rgb(0,170,0)';
};
const P = () => new Path2D();
const GOLD = '#c9a052', GOLD_D = '#7a5a24', INK = '#140804', IVORY = '#eadcbc', EYE_GLOW = '#ff3a10';
const SKIN = (x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, '#b83c26'], [0.55, '#7a1a10'], [1, '#3e0a06']] });
const BONE = (x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, '#fff6e0'], [1, '#c4ad80']] });
const PRADA = (x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, '#f0d488'], [1, '#8a6424']] });
const fs = (g, s, p, col, metal, lw = 5, glow) => { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = s(INK, false); g.stroke(p); g.fillStyle = s(col, metal, false, glow); g.fill(p); };
const holes = (g, s, pts, r) => { g.fillStyle = s(INK, false, true); for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } };
const along = (path, n) => { const out = []; for (let i = 0; i < n; i++) out.push(path(i / (n - 1))); return out; };
const quad = (a, c, b) => (t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const spiral = (g, s, x, y, r0, dir, lw, turns = 2.2) => {
  const p = P(); for (let k = 0; k <= 40; k++) { const t = k / 40, a = dir * t * Math.PI * turns, r = r0 * (1 - t * 0.82); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? p.lineTo(px, py) : p.moveTo(px, py); }
  g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = lw + 5; g.stroke(p); g.strokeStyle = s(GOLD, true); g.lineWidth = lw; g.stroke(p);
};
const drawBatara = (g, s) => {
  const F = (p, col, metal, lw = 5, glow) => fs(g, s, p, col, metal, lw, glow);
  const sungging = (p, w = 7) => { g.save(); g.clip(p); g.strokeStyle = s(GOLD, true); g.lineWidth = w; g.stroke(p); g.restore(); };
  const FS = (p, col, lw = 6) => { F(p, col, false, lw); sungging(p); };
  const skin = SKIN(-200, -1100, 260, -200);
  g.save(); g.translate(0, 80);   // tubuh atas turun: kaki lebih pendek, berdiri jangkahan
  // --- praba: hiasan sayap di punggung (tanda dewa), menjulang dengan ujung melengkung, bertatah ---
  const praba = P(); praba.moveTo(-80, -870); praba.bezierCurveTo(-170, -880, -260, -900, -300, -960); praba.bezierCurveTo(-330, -1010, -320, -1080, -282, -1132);
  praba.bezierCurveTo(-256, -1168, -206, -1182, -176, -1160); praba.bezierCurveTo(-160, -1146, -168, -1124, -186, -1122); praba.bezierCurveTo(-204, -1120, -210, -1138, -198, -1146);
  praba.bezierCurveTo(-240, -1130, -236, -1060, -196, -1010); praba.bezierCurveTo(-160, -966, -120, -930, -90, -910); praba.closePath();
  F(praba, PRADA(-330, -1180, -80, -870), true, 6);
  g.save(); g.clip(praba);
  const inner = P(); inner.moveTo(-100, -892); inner.bezierCurveTo(-180, -900, -248, -920, -276, -970); inner.bezierCurveTo(-296, -1020, -286, -1080, -258, -1110); inner.bezierCurveTo(-262, -1050, -240, -1000, -200, -960); inner.bezierCurveTo(-170, -930, -130, -906, -100, -892); inner.closePath();
  F(inner, { lin: [0, -1110, 0, -890], stops: [[0, '#8a2015'], [1, '#3e0b07']] }, false, 4);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 4;
  for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-110 - k * 6, -898 - k * 4); g.bezierCurveTo(-190 - k * 4, -910 - k * 14, -250 + k * 6, -940 - k * 26, -268 + k * 8, -980 - k * 22); g.stroke(); }
  holes(g, s, along(quad([-120, -906], [-220, -930], [-266, -1000]), 9), 5);
  holes(g, s, along(quad([-150, -930], [-220, -970], [-250, -1060]), 7), 4.5);
  g.restore();
  spiral(g, s, -186, -1136, 18, 1, 5, 2);
  // --- rambut gimbal terurai di punggung ---
  for (let k = 0; k < 8; k++) {
    const x0 = -40 - k * 6, y0 = -1010 + k * 12, lock = P(); lock.moveTo(x0, y0);
    for (let i = 1; i <= 16; i++) { const t = i / 16; lock.lineTo(x0 - t * (130 + k * 14) + Math.sin(t * 10 + k * 1.7) * 9, y0 + t * (300 + k * 26)); }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 17; g.stroke(lock);
    g.strokeStyle = s('#1c0d08', false); g.lineWidth = 11; g.stroke(lock); g.strokeStyle = s(GOLD_D, true); g.lineWidth = 2.2; g.stroke(lock);
  }
  // --- lengan belakang: menggantung, kuku panjang, tuding ---
  const armB = P(); armB.moveTo(-100, -885); armB.bezierCurveTo(-150, -860, -190, -800, -200, -740); armB.bezierCurveTo(-210, -690, -222, -640, -226, -600);
  armB.lineTo(-196, -598); armB.bezierCurveTo(-190, -650, -176, -700, -166, -742); armB.bezierCurveTo(-152, -790, -126, -830, -96, -850); armB.closePath();
  FS(armB, skin);
  const handB = P(); handB.ellipse(-212, -585, 26, 22, 0.4, 0, Math.PI * 2); F(handB, skin, false, 5);
  for (let k = 0; k < 4; k++) { const n = P(), x = -228 + k * 12, y = -572 + k * 4; n.moveTo(x, y); n.quadraticCurveTo(x - 6, y + 34, x + 14, y + 52); n.quadraticCurveTo(x + 6, y + 30, x + 9, y + 2); n.closePath(); F(n, BONE(x, y, x, y + 52), false, 3); }
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-232, -618); g.lineTo(-192, -612); g.stroke();
  const kelatB = P(); kelatB.moveTo(-160, -830); kelatB.lineTo(-118, -850); kelatB.lineTo(-108, -826); kelatB.lineTo(-150, -806); kelatB.closePath(); F(kelatB, GOLD, true, 4);
  g.restore();
  // --- kaki belakang: lutut menekuk, betis berotot, telapak menghadap depan ---
  const legB = P(); legB.moveTo(-100, -410); legB.bezierCurveTo(-150, -350, -176, -300, -178, -250); legB.bezierCurveTo(-184, -200, -180, -140, -176, -64);
  legB.bezierCurveTo(-190, -40, -204, -20, -204, -4); legB.lineTo(-86, 2); legB.lineTo(-84, -10); legB.bezierCurveTo(-100, -26, -120, -34, -132, -46);
  legB.bezierCurveTo(-134, -100, -128, -170, -116, -250); legB.bezierCurveTo(-96, -320, -70, -370, -40, -410); legB.closePath();
  FS(legB, skin);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-182, -74); g.lineTo(-130, -70); g.stroke();
  holes(g, s, [[-170, -74], [-156, -73], [-142, -72]], 3);
  // --- kain bokongan bermotif parang bertatah: menutup paha, menggembung di belakang pinggul ---
  const kain = P(); kain.moveTo(-104, -530); kain.lineTo(112, -530); kain.bezierCurveTo(132, -470, 152, -400, 180, -330);
  kain.bezierCurveTo(140, -310, 100, -302, 64, -300); kain.bezierCurveTo(30, -288, -10, -290, -44, -310); kain.bezierCurveTo(-80, -330, -110, -340, -130, -350);
  kain.bezierCurveTo(-200, -360, -270, -390, -302, -440); kain.bezierCurveTo(-322, -480, -306, -520, -270, -534); kain.bezierCurveTo(-240, -546, -214, -526, -226, -506);
  kain.bezierCurveTo(-236, -492, -258, -500, -252, -514); kain.bezierCurveTo(-210, -540, -150, -540, -104, -530); kain.closePath();
  F(kain, { lin: [0, -540, 0, -300], stops: [[0, '#24525c'], [1, '#0c262c']] }, false, 6);
  g.save(); g.clip(kain); g.strokeStyle = s(GOLD, true); g.lineCap = 'round';
  for (let k = -560; k < 400; k += 34) {
    g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, x = k + t * 280, y = -560 + t * 280 + Math.sin(t * Math.PI * 4) * 7; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  const dots = []; for (let k = -543; k < 400; k += 34) for (let i = 1; i < 8; i++) { const t = i / 8; dots.push([k + t * 280, -560 + t * 280]); }
  holes(g, s, dots, 3.5);
  g.restore();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 12; g.beginPath(); g.moveTo(176, -336); g.bezierCurveTo(120, -312, 40, -290, -44, -316); g.bezierCurveTo(-120, -350, -220, -370, -290, -440); g.stroke();
  holes(g, s, along((t) => { const [x, y] = t < 0.5 ? quad([176, -336], [70, -296], [-44, -316])(t * 2) : quad([-44, -316], [-200, -360], [-290, -440])((t - 0.5) * 2); return [x, y]; }, 22), 3.2);
  g.save(); g.translate(0, 80);
  // sabuk (stagen) emas + timang + uncal menjuntai
  const belt = P(); belt.moveTo(-108, -612); belt.lineTo(112, -612); belt.lineTo(112, -582); belt.lineTo(-108, -582); belt.closePath(); F(belt, PRADA(0, -612, 0, -582), true, 5);
  holes(g, s, along((t) => [-90 + t * 190, -597], 9), 4);
  const timang = P(); timang.ellipse(30, -597, 18, 16, 0, 0, Math.PI * 2); F(timang, '#b0180c', false, 4, '#3a0602');
  const uncal = P(); uncal.moveTo(20, -580); uncal.lineTo(40, -580); uncal.bezierCurveTo(46, -500, 40, -420, 30, -360); uncal.bezierCurveTo(22, -420, 16, -500, 20, -580); uncal.closePath(); F(uncal, PRADA(20, -580, 40, -360), true, 4);
  // --- badan: dada bidang, perut buncit raksasa ---
  const body = P(); body.moveTo(-30, -912); body.lineTo(50, -912); body.bezierCurveTo(90, -905, 112, -890, 122, -862);
  body.bezierCurveTo(146, -820, 176, -764, 178, -704); body.bezierCurveTo(180, -644, 156, -602, 112, -588); body.lineTo(-100, -588);
  body.bezierCurveTo(-124, -640, -132, -720, -122, -800); body.bezierCurveTo(-118, -850, -96, -896, -30, -912); body.closePath();
  FS(body, skin, 7);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(118, -800); g.bezierCurveTo(150, -760, 162, -704, 146, -646); g.stroke();
  g.beginPath(); g.moveTo(-20, -820); g.bezierCurveTo(20, -836, 70, -834, 100, -812); g.stroke();
  g.fillStyle = s(INK, false); g.beginPath(); g.ellipse(122, -668, 7, 5, 0, 0, Math.PI * 2); g.fill();
  // kalung ulur-ulur + bandul
  const kalung = P(); kalung.moveTo(-96, -880); kalung.bezierCurveTo(-40, -820, 60, -824, 120, -866); kalung.lineTo(122, -848); kalung.bezierCurveTo(60, -800, -40, -798, -104, -862); kalung.closePath();
  F(kalung, PRADA(0, -880, 0, -800), true, 4);
  holes(g, s, along(quad([-80, -858], [14, -808], [110, -852]), 8), 3.5);
  const bandul = P(); bandul.moveTo(10, -812); bandul.lineTo(30, -786); bandul.lineTo(10, -754); bandul.lineTo(-10, -786); bandul.closePath(); F(bandul, '#b0180c', false, 4, '#3a0602');
  g.restore();
  // --- kaki depan melangkah lebar (jangkahan), lutut menekuk ke depan ---
  const legF = P(); legF.moveTo(20, -400); legF.bezierCurveTo(70, -350, 110, -310, 128, -280); legF.bezierCurveTo(146, -220, 152, -140, 164, -64);
  legF.bezierCurveTo(164, -40, 160, -20, 160, -4); legF.lineTo(300, 2); legF.lineTo(298, -12); legF.bezierCurveTo(270, -24, 244, -34, 222, -50);
  legF.bezierCurveTo(214, -110, 212, -190, 206, -290); legF.bezierCurveTo(190, -360, 150, -410, 110, -440); legF.closePath();
  FS(legF, skin);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(160, -76); g.lineTo(218, -70); g.stroke();
  holes(g, s, [[174, -74], [188, -73], [202, -72]], 3);
  for (const x of [256, 272, 288]) { const n = P(); n.moveTo(x, -6); n.quadraticCurveTo(x + 10, -10, x + 14, 2); n.lineTo(x, 2); n.closePath(); F(n, IVORY, false, 2); }
  g.save(); g.translate(0, 80);
  // --- lengan depan terangkat, cakar menerkam, tuding ---
  const armF = P(); armF.moveTo(96, -890); armF.bezierCurveTo(150, -880, 200, -840, 232, -790); armF.bezierCurveTo(260, -820, 290, -858, 312, -890);
  armF.lineTo(336, -872); armF.bezierCurveTo(316, -836, 282, -790, 246, -752); armF.bezierCurveTo(232, -742, 214, -746, 204, -760); armF.bezierCurveTo(180, -800, 140, -836, 100, -850); armF.closePath();
  FS(armF, skin);
  const kelatF = P(); kelatF.moveTo(150, -878); kelatF.lineTo(186, -852); kelatF.lineTo(170, -830); kelatF.lineTo(136, -856); kelatF.closePath(); F(kelatF, GOLD, true, 4);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.beginPath(); g.moveTo(296, -894); g.lineTo(326, -870); g.stroke();
  const handF = P(); handF.ellipse(330, -902, 28, 24, -0.6, 0, Math.PI * 2); F(handF, skin, false, 5);
  [[-115, 40], [-85, 48], [-55, 46], [-25, 38]].forEach(([deg, len]) => {
    const a = (deg * Math.PI) / 180, bx = 330 + Math.cos(a) * 20, by = -902 + Math.sin(a) * 20, kx = bx + Math.cos(a) * len, ky = by + Math.sin(a) * len;
    g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.strokeStyle = s(INK, false); g.lineWidth = 17; g.stroke(); g.strokeStyle = s('#b23a24', false); g.lineWidth = 11; g.stroke();
    const a2 = a + 0.5, n = P(); n.moveTo(kx - Math.sin(a) * 6, ky + Math.cos(a) * 6); n.quadraticCurveTo(kx + Math.cos(a) * 26, ky + Math.sin(a) * 26, kx + Math.cos(a2) * 40, ky + Math.sin(a2) * 40); n.lineTo(kx + Math.sin(a) * 6, ky - Math.cos(a) * 6); n.closePath(); F(n, BONE(kx, ky, kx, ky - 40), false, 3);
  });
  // --- kepala menyamping, besar seperti raksasa wayang ---
  g.save(); g.translate(40, -900); g.scale(1.22, 1.22); g.translate(-40, 900);
  const head = P(); head.moveTo(-70, -1046); head.bezierCurveTo(-50, -1070, 20, -1078, 90, -1068); head.bezierCurveTo(112, -1062, 126, -1048, 130, -1034);
  head.bezierCurveTo(156, -1034, 192, -1016, 194, -986); head.bezierCurveTo(196, -960, 176, -952, 158, -960); head.lineTo(160, -948);
  head.lineTo(98, -944); head.lineTo(150, -912); head.bezierCurveTo(156, -900, 146, -886, 124, -884); head.bezierCurveTo(90, -884, 60, -888, 40, -894);
  head.bezierCurveTo(0, -898, -40, -904, -56, -920); head.bezierCurveTo(-76, -946, -82, -1000, -70, -1046); head.closePath();
  F(head, { lin: [-60, -1070, 180, -900], stops: [[0, '#c4442c'], [1, '#4a0e08']] }, false, 7); sungging(head, 6);
  const mouth = P(); mouth.moveTo(98, -944); mouth.lineTo(160, -950); mouth.bezierCurveTo(168, -936, 162, -920, 150, -912); mouth.closePath();
  g.fillStyle = s('#2a0503', false, false, '#5a0c02'); g.fill(mouth);
  g.strokeStyle = s('#e0707a', false); g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(104, -946); g.lineTo(156, -950); g.stroke();   // gusen
  for (let k = 0; k < 5; k++) { const x = 108 + k * 10, t = P(); t.moveTo(x, -946); t.lineTo(x + 8, -946); t.lineTo(x + 4, -936); t.closePath(); F(t, IVORY, false, 1.5); }
  const siungA = P(); siungA.moveTo(140, -950); siungA.lineTo(150, -950); siungA.lineTo(148, -918); siungA.closePath(); F(siungA, BONE(140, -950, 148, -918), false, 2.5);
  const siungB = P(); siungB.moveTo(130, -914); siungB.bezierCurveTo(144, -926, 156, -950, 160, -984); siungB.bezierCurveTo(150, -956, 142, -934, 124, -918); siungB.closePath(); F(siungB, BONE(130, -914, 160, -984), false, 2.5);
  // brengos (kumis) & jenggot
  // hidung bentulan: tonjolan bulat bergaris emas + cuping
  const nose = P(); nose.moveTo(132, -1030); nose.bezierCurveTo(158, -1032, 188, -1016, 190, -988); nose.bezierCurveTo(192, -964, 174, -956, 158, -964); nose.bezierCurveTo(146, -972, 136, -1000, 132, -1030); nose.closePath();
  F(nose, { rad: [176, -996, 4, 176, -990, 40], stops: [[0, '#e0603e'], [1, '#7a1d12']] }, false, 4); g.strokeStyle = s(GOLD, true); g.lineWidth = 2.5; g.stroke(nose);
  g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(166, -968, 8, 4.5, -0.25, 0, Math.PI * 2); g.fill();
  // brengos: helai-helai kumis melengkung ke belakang
  g.lineCap = 'round';
  for (let k = 0; k < 6; k++) { const y0 = -962 + k * 2.2, b = P(); b.moveTo(148, y0); b.bezierCurveTo(126, y0 - 10 - k, 98, y0 - 8, 80 - k * 3, y0 + 4 + k * 2); g.strokeStyle = s(INK, false); g.lineWidth = 4.5; g.stroke(b); }
  for (let k = 0; k < 7; k++) { const x0 = 120 - k * 18, y0 = -892 + k * 2, j = P(); j.moveTo(x0, y0); for (let i = 1; i <= 8; i++) { const t = i / 8; j.lineTo(x0 - t * 26 + Math.sin(t * 9 + k) * 5, y0 + t * (54 + k * 4)); } g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 8; g.stroke(j); g.strokeStyle = s('#1c0d08', false); g.lineWidth = 5; g.stroke(j); }
  // mata plelengan menyala + alis murka berbulu api
  g.fillStyle = s(INK, false); g.beginPath(); g.arc(78, -1006, 27, 0, Math.PI * 2); g.fill();
  g.fillStyle = s({ rad: [74, -1012, 4, 78, -1006, 24], stops: [[0, '#fbf3df'], [1, '#cdb894']] }, false); g.beginPath(); g.arc(78, -1006, 23, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s('#a01e12', false); g.lineWidth = 1.6; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(78 + Math.cos(a) * 21, -1006 + Math.sin(a) * 21); g.lineTo(78 + Math.cos(a + 0.15) * 15, -1006 + Math.sin(a + 0.15) * 15); g.stroke(); }
  g.fillStyle = s({ rad: [84, -1006, 2, 84, -1006, 14], stops: [[0, '#ff7a28'], [1, '#6a0a05']] }, false, false, EYE_GLOW); g.beginPath(); g.arc(84, -1006, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(86, -1006, 3.5, 9, 0, 0, Math.PI * 2); g.fill();
  const brow = P(); brow.moveTo(40, -1040); brow.bezierCurveTo(70, -1060, 110, -1058, 132, -1036); brow.lineTo(122, -1026); brow.bezierCurveTo(104, -1040, 72, -1042, 48, -1028); brow.closePath(); F(brow, PRADA(40, -1060, 130, -1026), true, 4);
  for (let k = 0; k < 6; k++) { const x = 52 + k * 14, y = -1046 - Math.sin((k / 5) * Math.PI) * 8, f = P(); f.moveTo(x - 6, y + 4); f.quadraticCurveTo(x, y - 18, x + 12, y - 26 - k); f.quadraticCurveTo(x + 4, y - 8, x + 7, y + 4); f.closePath(); F(f, GOLD, true, 2.5); }
  g.strokeStyle = s(INK, false); g.lineWidth = 3; g.beginPath(); g.moveTo(112, -1000); g.quadraticCurveTo(128, -984, 132, -962); g.stroke();
  // telinga, sumping & anting
  const sumping = P(); sumping.moveTo(-10, -1010); sumping.bezierCurveTo(-60, -1020, -96, -990, -100, -950); sumping.bezierCurveTo(-80, -970, -54, -980, -30, -980); sumping.bezierCurveTo(-60, -960, -70, -930, -66, -900); sumping.bezierCurveTo(-40, -940, -20, -960, -4, -970); sumping.closePath();
  F(sumping, PRADA(-100, -1020, -4, -900), true, 4);
  holes(g, s, [[-60, -992], [-44, -968], [-56, -938]], 4);
  const ear = P(); ear.ellipse(0, -990, 14, 20, 0.2, 0, Math.PI * 2); F(ear, skin, false, 4);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 4; g.beginPath(); g.arc(2, -960, 10, 0, Math.PI * 2); g.stroke();
  const drop = P(); drop.moveTo(2, -950); drop.lineTo(12, -926); drop.lineTo(2, -904); drop.lineTo(-8, -926); drop.closePath(); F(drop, '#b0180c', false, 3, '#3a0602');
  // --- makutha bertingkat + jamang + garuda mungkur ---
  const jamang = P(); jamang.moveTo(-72, -1048); jamang.bezierCurveTo(0, -1080, 70, -1082, 116, -1060); jamang.lineTo(110, -1040); jamang.bezierCurveTo(60, -1058, 0, -1058, -66, -1028); jamang.closePath();
  F(jamang, PRADA(0, -1082, 0, -1030), true, 5);
  holes(g, s, along(quad([-56, -1044], [20, -1068], [100, -1054]), 9), 3.5);
  const mk = P(); mk.moveTo(-64, -1060); mk.bezierCurveTo(-82, -1110, -78, -1170, -50, -1214); mk.bezierCurveTo(-30, -1246, 0, -1262, 24, -1258);
  mk.bezierCurveTo(44, -1254, 58, -1238, 56, -1222); mk.bezierCurveTo(74, -1196, 92, -1150, 100, -1066); mk.closePath();
  F(mk, PRADA(-80, -1262, 100, -1060), true, 6); sungging(mk, 8);
  g.save(); g.clip(mk);
  g.strokeStyle = s(INK, false); g.lineWidth = 4;
  for (const y of [-1098, -1136, -1176]) { g.beginPath(); g.moveTo(-100, y + 8); g.quadraticCurveTo(10, y - 10, 120, y + 6); g.stroke(); }
  g.strokeStyle = s(GOLD_D, true); g.lineWidth = 3;
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(18 + k * 22, -1070); g.quadraticCurveTo(14 + k * 16, -1170, 6 + k * 8, -1250); g.stroke(); }
  holes(g, s, along(quad([-56, -1084], [20, -1100], [94, -1082]), 8), 4.5);
  holes(g, s, along(quad([-60, -1120], [16, -1138], [88, -1118]), 7), 4.2);
  holes(g, s, along(quad([-54, -1160], [12, -1178], [74, -1158]), 6), 4);
  holes(g, s, along(quad([-38, -1200], [8, -1216], [56, -1198]), 4), 3.6);
  g.restore();
  // turida: hiasan daun api di puncak depan makutha
  const turida = P(); turida.moveTo(40, -1240); turida.bezierCurveTo(70, -1262, 96, -1256, 104, -1230); turida.bezierCurveTo(88, -1240, 70, -1236, 58, -1222); turida.closePath(); F(turida, GOLD, true, 3);
  const gem = P(); gem.ellipse(18, -1086, 12, 10, 0, 0, Math.PI * 2); F(gem, '#b0180c', false, 3, '#5a0a02');
  spiral(g, s, -98, -1112, 46, -1, 9, 2.3);
  const mungkurTail = P(); mungkurTail.moveTo(-64, -1074); mungkurTail.quadraticCurveTo(-96, -1100, -130, -1086); mungkurTail.quadraticCurveTo(-110, -1072, -70, -1060); mungkurTail.closePath(); F(mungkurTail, GOLD, true, 3);
  g.restore();   // akhir skala kepala
  g.restore();   // akhir geser tubuh atas
  // --- gapit (tanduk) di sepanjang badan + tuding di kedua tangan ---
  g.lineCap = 'round'; g.strokeStyle = s('#2a160a', false); g.lineWidth = 6; g.beginPath(); g.moveTo(14, -1150); g.bezierCurveTo(18, -900, -4, -500, 0, 64); g.stroke();
  g.strokeStyle = s('#5a3a1e', false); g.lineWidth = 2; g.stroke();
  for (const [hx, hy, ex] of [[-212, -505, -250], [330, -822, 300]]) { g.strokeStyle = s('#2a160a', false); g.lineWidth = 5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, 64); g.stroke(); }
  // mas-masan: titik emas di tepi badan
};
bctxs.forEach(([g, mode]) => { g.save(); g.translate(BOX, BOY); drawBatara(g, (col, metal, hole, glow) => sty(g, mode, col, metal, hole, glow)); g.restore(); });
window.__batara = { bA, bC, bE };

// ======================= GONG =======================
// Profil depan (r, z): pencu → leher → rai dengan dua punggung halus (recep) → pundak → bau
const front = new THREE.SplineCurve([
  [0.0, 0.112], [0.045, 0.106], [0.08, 0.086], [0.104, 0.052], [0.12, 0.024], [0.135, 0.011],
  [0.165, 0.006], [0.19, 0.011], [0.215, 0.004], [0.3, 0.0], [0.33, 0.004], [0.355, -0.003],
  [0.4, -0.011], [0.452, -0.027], [0.488, -0.06], [0.503, -0.11],
  [0.506, -0.175], [0.499, -0.218], [0.486, -0.238],
].map(([r, z]) => new THREE.Vector2(r, z)));
const N = 180, THICK = 0.013;
const fpts = front.getSpacedPoints(N);
const bpts = fpts.map((p, i) => {
  const a = fpts[Math.max(0, i - 1)], b = fpts[Math.min(N, i + 1)];
  const t = new THREE.Vector2().subVectors(b, a).normalize();
  const q = new THREE.Vector2(p.x + t.y * THICK, p.y - t.x * THICK); q.x = Math.max(0, q.x); return q;
});
fpts[0].x = 0; bpts[0].x = 0;
const gongGeo = new THREE.LatheGeometry([...fpts, ...bpts.slice().reverse()], 192);
gongGeo.rotateX(Math.PI / 2);
{ const pos = gongGeo.attributes.position, uv = gongGeo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.04 + 0.5, pos.getY(i) / 1.04 + 0.5); }
const bronze = new THREE.MeshPhysicalMaterial({
  color: 0xa07a46, metalness: 1, roughness: 0.32,
  map: tex(bronzeColor, true), roughnessMap: tex(bronzeRough), bumpMap: tex(bronzeBump), bumpScale: 1.4,
  envMapIntensity: 1.2, emissive: 0xffffff, emissiveMap: tex(bronzeEmber, true), emissiveIntensity: 0, transparent: true, opacity: 0,
});
const GONG_Y = 1.1, HANG_Y = 1.64;
const gong = new THREE.Mesh(gongGeo, bronze);
gong.castShadow = gong.receiveShadow = true;
const gongPivot = new THREE.Group(); gongPivot.position.set(0, HANG_Y, 0);
gong.position.set(0, GONG_Y - HANG_Y, 0); gongPivot.add(gong); scene.add(gongPivot);
const ringMat = new THREE.MeshStandardMaterial({ color: 0xb8924c, metalness: 1, roughness: 0.3 });
for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 10, 24), ringMat); r.position.set(s * 0.15, GONG_Y + 0.47 - HANG_Y, -0.13); r.rotation.y = Math.PI / 2; gongPivot.add(r); }

// ======================= GAYOR (lak merah darah + prada + naga garang + kala) =======================
const prada = new THREE.MeshStandardMaterial({ color: 0xb8924c, roughness: 0.3, metalness: 1, envMapIntensity: 1.2 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.42, metalness: 0.05 });
const gayor = new THREE.Group(); scene.add(gayor);
const add = (m) => { m.castShadow = m.receiveShadow = true; gayor.add(m); return m; };
const POST_X = 0.86, BAR_Y = 1.88;
const postMat = lacquer(2, 3);
for (const s of [-1, 1]) {
  const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.064, 1.92, 28), postMat)); post.position.set(s * POST_X, 0.96 + 0.06, 0);
  const fsh = new THREE.Shape(); fsh.moveTo(-0.26, 0); fsh.lineTo(0.26, 0); fsh.quadraticCurveTo(0.28, 0.07, 0.16, 0.09); fsh.lineTo(-0.16, 0.09); fsh.quadraticCurveTo(-0.28, 0.07, -0.26, 0);
  const fg = new THREE.ExtrudeGeometry(fsh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }); fg.translate(0, 0, -0.1); fg.rotateY(Math.PI / 2);
  const foot = add(new THREE.Mesh(fg, lacquer(1, 1))); foot.position.set(s * POST_X, 0, 0);
  [0.13, 1.72].forEach((y) => { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 28), prada)); b.position.set(s * POST_X, y, 0); });
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 28, 18), prada)); knob.position.set(s * POST_X, BAR_Y + 0.12, 0);
  // ujung tiang: tiga lidah api emas, bukan kerucut polos
  for (let k = -1; k <= 1; k++) { const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.02 - Math.abs(k) * 0.005, 0.13 - Math.abs(k) * 0.04, 14), prada)); f.position.set(s * POST_X + k * 0.022, BAR_Y + 0.21 - Math.abs(k) * 0.03, 0); f.rotation.z = -k * 0.35; }
}
{ // palang lurus berbevel
  const sh = new THREE.Shape(); sh.moveTo(-0.97, -0.058); sh.lineTo(0.97, -0.058); sh.lineTo(0.97, 0.058); sh.lineTo(-0.97, 0.058); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 }); g.translate(0, 0, -0.055);
  const m = lacquer(0.55, 2.2); const bar = add(new THREE.Mesh(g, m)); bar.position.y = BAR_Y;
  const list = add(new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.022, 0.136), prada)); list.position.y = BAR_Y - 0.068;
}
// Naga di kedua ujung palang: badan bersisik & bersirip, kepala bertanduk, rahang menganga berbara
const taperTube = (curve, segs, r0, r1, radial = 14) => {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, Pt = curve.getPointAt(u), r = r0 + (r1 - r0) * Math.pow(u, 0.9);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; const v = new THREE.Vector3().fromBufferAttribute(pos, k).sub(Pt).multiplyScalar(r).add(Pt); pos.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals(); return g;
};
const redLac = new THREE.MeshStandardMaterial({ color: 0x4a0e09, roughness: 0.4, metalness: 0.1 });
const mawMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.32, 0.06).multiplyScalar(2.2) });
const nagaEyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.16, 0.03).multiplyScalar(3) });
const nagaHeads = [];
const makeNaga = (s) => {
  const grp = new THREE.Group();
  const pts = [[0.9, 0.0], [1.02, -0.03], [1.14, 0.0], [1.21, 0.1], [1.2, 0.22], [1.13, 0.3], [1.16, 0.4], [1.27, 0.45]].map(([x, y]) => new THREE.Vector3(s * x, BAR_Y + y, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const body = new THREE.Mesh(taperTube(curve, 90, 0.058, 0.03), prada); body.castShadow = true; grp.add(body);
  for (let i = 1; i < 9; i++) {
    const u = i / 10, Pt = curve.getPointAt(u), T = curve.getTangentAt(u), r = 0.058 + (0.03 - 0.058) * u;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.006, 8, 24), redLac); ring.position.copy(Pt);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), T); grp.add(ring);
  }
  // sirip punggung: duri emas di sisi luar lengkungan
  for (let i = 1; i < 18; i++) {
    const u = i / 19, Pt = curve.getPointAt(u), T = curve.getTangentAt(u), r = 0.058 + (0.03 - 0.058) * u;
    const out = new THREE.Vector3(s, 0.35, 0).normalize(), nrm = out.clone().sub(T.clone().multiplyScalar(out.dot(T))).normalize();
    const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 1.1, 8), prada);
    spike.position.copy(Pt).addScaledVector(nrm, r * 1.15); spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm.clone().addScaledVector(T, -0.5).normalize()); grp.add(spike);
  }
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1);
  const head = new THREE.Group(); head.position.copy(end); head.lookAt(end.clone().add(dir)); grp.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 16), prada); skull.scale.set(0.9, 0.78, 1.5); skull.position.z = 0.04; head.add(skull);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), prada); upper.scale.set(0.82, 0.42, 1.9); upper.position.set(0, 0.006, 0.11); head.add(upper);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 12), prada); jaw.scale.set(0.78, 0.36, 1.75); jaw.position.set(0, -0.056, 0.095); jaw.rotation.x = 0.6; head.add(jaw);
  const maw = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), mawMat); maw.scale.set(0.62, 0.55, 1.4); maw.position.set(0, -0.03, 0.1); head.add(maw);
  const tooth = (x, y, z, h, down) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0055, h, 8), boneMat); c.position.set(x, y, z); c.rotation.x = down ? Math.PI : 0; head.add(c); };
  for (let k = 0; k < 5; k++) { const z = 0.07 + k * 0.024; for (const e of [-1, 1]) { tooth(e * 0.021, -0.012, z, 0.018, true); tooth(e * 0.019, -0.058 + (z - 0.07) * -0.55, z - 0.01, 0.016, false); } }
  for (const e of [-1, 1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 10), boneMat); f.position.set(e * 0.017, -0.03, 0.172); f.rotation.x = Math.PI + 0.25; head.add(f); }
  for (const e of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), nagaEyeMat); eye.position.set(e * 0.033, 0.024, 0.06); head.add(eye);
    const brow = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 8), prada); brow.position.set(e * 0.03, 0.045, 0.05); brow.rotation.set(-1.35, 0, -e * 0.5); head.add(brow);
    const horn = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(e * 0.024, 0.045, 0.01), new THREE.Vector3(e * 0.05, 0.085, -0.04), new THREE.Vector3(e * 0.06, 0.1, -0.11), new THREE.Vector3(e * 0.05, 0.13, -0.16)]), 24, 0.012, 0.002, 10), boneMat); head.add(horn);
    const wk = []; for (let i = 0; i <= 20; i++) { const t = i / 20; wk.push(new THREE.Vector3(e * (0.02 + t * 0.07), 0.0 - t * 0.03 + Math.sin(t * 6) * 0.01, 0.17 - t * 0.06)); }
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wk), 30, 0.003, 6), prada));
  }
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.075 + (i === 2 ? 0.03 : 0), 10), prada); const a = (i - 2) * 0.32; f.position.set(Math.sin(a) * 0.03, 0.055 + Math.cos(a) * 0.012, -0.02 - Math.abs(i - 2) * 0.008); f.rotation.z = -a; f.rotation.x = -0.45; head.add(f); }
  const bp2 = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 2, r = 0.035 * (1 - t * 0.8); bp2.push(new THREE.Vector3(Math.cos(a) * r * 0.4, -0.08 - t * 0.02 + Math.sin(a) * r, 0.03 + Math.sin(a) * r * 0.5)); }
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp2), 50, 0.007, 8), prada));
  nagaHeads.push(head);
  return grp;
};
gayor.add(makeNaga(-1), makeNaga(1));
// Puncak: Batara Kala (wayang kulit gagrak Surakarta) ditancapkan di tengah palang lewat cempurit
const BPX = 1.05 / 1250;   // meter per piksel: tinggi figur ±1,05 m, mengisi ruang di antara kedua naga
const bkMat = new THREE.MeshStandardMaterial({ map: tex(bC, true), alphaMap: tex(bA), alphaTest: 0.5, metalnessMap: tex(bM), roughnessMap: tex(bM), metalness: 1, roughness: 1, emissive: 0xffffff, emissiveMap: tex(bE, true), emissiveIntensity: 1, side: THREE.DoubleSide, envMapIntensity: 1.1 });
const FEET_Y = BAR_Y + 0.058 + 0.05;
const batara = new THREE.Mesh(new THREE.PlaneGeometry(BW * BPX, BH * BPX), bkMat);
batara.position.set(0, FEET_Y + (BOY - BH / 2) * BPX, 0.0); batara.geometry.translate((BW / 2 - BOX) * BPX, 0, 0); batara.rotation.y = 0.3;   // sedikit menghadap penonton
batara.castShadow = true; batara.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: bkMat.alphaMap, alphaTest: 0.5, side: THREE.DoubleSide });
gayor.add(batara);
const auraMat = new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(255,90,30,0.55)'], [0.35, 'rgba(200,30,10,0.22)'], [1, 'rgba(120,10,4,0)']], 256), color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const aura = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.7), auraMat); aura.position.set(-0.02, FEET_Y + 0.56, -0.08); aura.rotation.y = 0.3; gayor.add(aura);   // aura merah samar di belakang figur
{ // cempurit (gagang tanduk) masuk ke soket emas di atas palang
  const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.006, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.4 }))); rod.position.set(0, BAR_Y + 0.058 + 0.04, 0);
  const sock = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 20), prada)); sock.position.set(0, BAR_Y + 0.058 + 0.015, 0);
}
// tali merah dari palang ke cincin di bibir gong
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x5a140c, roughness: 0.85 });
for (const s of [-1, 1]) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.2, BAR_Y - 0.06, 0), new THREE.Vector3(s * 0.185, 1.72, -0.05), new THREE.Vector3(s * 0.15, GONG_Y + 0.47, -0.13)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.011, 8), ropeMat));
}

// ======================= TABUH (pemukul) =======================
const mallet = new THREE.Group(); scene.add(mallet);
{
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 20), new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.9 }));
  headMesh.scale.set(1, 1, 0.82); headMesh.castShadow = true; headMesh.name = 'malletHead'; mallet.add(headMesh);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.04, 20), prada); ferrule.rotation.x = Math.PI / 2; ferrule.position.z = 0.085; mallet.add(ferrule);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.56, 16), new THREE.MeshStandardMaterial({ color: 0x2a160a, roughness: 0.55 }));
  handle.rotation.x = Math.PI / 2; handle.position.z = 0.38; handle.castShadow = true; mallet.add(handle);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10), prada); cap.position.z = 0.66; mallet.add(cap);
}
const M_REST = new THREE.Vector3(0.66, 0.92, 0.5), M_WIND = new THREE.Vector3(0.7, 1.32, 0.92), M_HIT = new THREE.Vector3(0.05, 1.095, 0.195);
const M_GRIP = new THREE.Vector3(0.46, 0.3, 0.4);

// ======================= RUANG: lantai, tikar, tiang pendopo, berkas cahaya =======================
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0, envMapIntensity: 0.5 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const tikar = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.7), new THREE.MeshStandardMaterial({ map: tikarTex, roughness: 0.92 }));
tikar.rotation.x = -Math.PI / 2; tikar.position.y = 0.003; tikar.receiveShadow = true; scene.add(tikar);
const pillarMat = lacquer(1.5, 6), stone = new THREE.MeshStandardMaterial({ color: 0x24222a, roughness: 0.85 });
for (const [x, z] of [[-2.6, -2.1], [2.6, -2.1], [-3.7, 1.1], [3.7, 1.1]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.6, 24), pillarMat); p.position.set(x, 2.3 + 0.28, z); p.castShadow = p.receiveShadow = true; scene.add(p);
  const u = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.28, 4), stone); u.rotation.y = Math.PI / 4; u.position.set(x, 0.14, z); u.receiveShadow = true; scene.add(u);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.12, 24), prada); cap.position.set(x, 4.2, z); scene.add(cap);
}
// berkas cahaya (palsu-volumetrik) dari kiri atas ke gong, kini kemerahan & lebih redup
const shaftMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1.0, 0.5, 0.26) }, uI: { value: 0.05 } },
  vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 uColor; uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float along = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y)); gl_FragColor = vec4(uColor * uI * edge * along, 1.0); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const SHAFT_FROM = new THREE.Vector3(-1.8, 4.3, 2.1), SHAFT_TO = new THREE.Vector3(0.05, 0.9, 0.0);
{
  const len = SHAFT_FROM.distanceTo(SHAFT_TO);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.78, len, 48, 1, true), shaftMat);
  shaft.position.copy(SHAFT_FROM).add(SHAFT_TO).multiplyScalar(0.5);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SHAFT_FROM.clone().sub(SHAFT_TO).normalize()); scene.add(shaft);
}
// bara yang naik dari lantai (pengganti debu cerah)
const EMB = 300, embGeo = new THREE.BufferGeometry(), epos = new Float32Array(EMB * 3), eseed = new Float32Array(EMB);
const spawnEmber = (i, anyY) => { const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 2.2; epos[i * 3] = Math.cos(a) * r; epos[i * 3 + 1] = anyY ? Math.random() * 2.8 : Math.random() * 0.2; epos[i * 3 + 2] = Math.sin(a) * r * 0.8; };
for (let i = 0; i < EMB; i++) { spawnEmber(i, true); eseed[i] = Math.random() * 100; }
embGeo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
const embMat = new THREE.PointsMaterial({ size: 0.022, map: dotTex, color: new THREE.Color(1, 0.4, 0.1).multiplyScalar(2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(embGeo, embMat));

// ======================= CAHAYA =======================
const key = new THREE.SpotLight(0xffcf9e, 62, 0, 0.46, 0.85, 2);
key.position.set(1.7, 3.4, 2.8); key.target.position.set(0, GONG_Y + 0.25, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key, key.target);
const beam = new THREE.SpotLight(0xffa868, 10, 0, 0.28, 0.9, 2); beam.position.copy(SHAFT_FROM); beam.target.position.copy(SHAFT_TO); scene.add(beam, beam.target);
const rim = new THREE.SpotLight(0xff2a12, 30, 8, 0.42, 0.7, 2); rim.position.set(-2.4, 3.3, -3.0); rim.target.position.set(0, 1.75, 0); scene.add(rim, rim.target);   // rim merah darah dari belakang ke gayor, kala & naga
scene.add(new THREE.HemisphereLight(0x1c1626, 0x140604, 0.2));
const flicker = new THREE.PointLight(0xff8a30, 1.6, 0, 2); flicker.position.set(-1.1, 1.0, 1.4); scene.add(flicker);
const ember = new THREE.PointLight(0xff3010, 1.0, 2.2, 2); ember.position.set(0, 0.3, 0.9); scene.add(ember);   // bara dari bawah (lampu horor)
const strikeLight = new THREE.PointLight(0xff7a30, 0, 0, 2); strikeLight.position.set(0, GONG_Y, 0.45); scene.add(strikeLight);
const breathLights = [-1, 1].map((s) => { const l = new THREE.PointLight(0xff6a20, 0, 2.5, 2); l.position.set(s * 1.32, BAR_Y + 0.5, 0.1); scene.add(l); return l; });

// ======================= KEPINGAN BARA (pembukaan) =======================
const SHARDS = 750;
const shardMat = new THREE.MeshStandardMaterial({ color: 0x5a3c1c, metalness: 1, roughness: 0.3, emissive: new THREE.Color(1, 0.3, 0.05), emissiveIntensity: 3.5 });
const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.02), shardMat, SHARDS);
scene.add(shards);
const zAt = (r) => { for (let i = 1; i < fpts.length; i++) if (fpts[i].x >= r) { const a = fpts[i - 1], b = fpts[i], k = (r - a.x) / Math.max(1e-6, b.x - a.x); return a.y + (b.y - a.y) * k; } return fpts[fpts.length - 1].y; };
const shardData = Array.from({ length: SHARDS }, () => {
  const r = Math.sqrt(rand()) * 0.49, a = rand() * Math.PI * 2;
  const to = new THREE.Vector3(Math.cos(a) * r, GONG_Y + Math.sin(a) * r, zAt(r) + 0.004);
  const from = to.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize().multiplyScalar(1.4 + rand() * 2.2));
  return { from, to, delay: rand() * 0.9, spin: new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(9) };
});

// ======================= EFEK PUKULAN: riak merah, semburan bara, napas api naga =======================
const ripples = [0, 1, 2, 3].map((i) => {
  const thin = i % 2 === 0;
  const m = new THREE.Mesh(new THREE.RingGeometry(thin ? 0.97 : 0.86, 1.0, 180),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.24, 0.05).multiplyScalar(thin ? 1.5 : 0.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, GONG_Y, 0.13); scene.add(m); return m;
});
const SPARKS = 220, sparkGeo = new THREE.BufferGeometry(), spos = new Float32Array(SPARKS * 3), svel = [];
for (let i = 0; i < SPARKS; i++) { const a = rand() * Math.PI * 2, el = rand() * 1.15; svel.push(new THREE.Vector3(Math.cos(a) * Math.sin(el), Math.sin(a) * Math.sin(el), Math.cos(el)).multiplyScalar(0.5 + rand() * 1.8)); }
sparkGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
const sparkMat = new THREE.PointsMaterial({ size: 0.03, map: dotTex, color: new THREE.Color(1, 0.5, 0.15).multiplyScalar(3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(sparkGeo, sparkMat));
// napas api: partikel ber-warna-per-titik keluar dari mulut kedua naga
const BR = 520, brGeo = new THREE.BufferGeometry(), brPos = new Float32Array(BR * 3), brCol = new Float32Array(BR * 3), brVel = new Float32Array(BR * 3), brLife = new Float32Array(BR).fill(2);
brGeo.setAttribute('position', new THREE.BufferAttribute(brPos, 3)); brGeo.setAttribute('color', new THREE.BufferAttribute(brCol, 3));
const brMat = new THREE.PointsMaterial({ size: 0.13, map: dotTex, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(brGeo, brMat));
scene.updateMatrixWorld(true);
const mouths = nagaHeads.map((h) => ({ pos: h.localToWorld(new THREE.Vector3(0, -0.03, 0.14)), dir: h.localToWorld(new THREE.Vector3(0, -0.12, 1)).sub(h.getWorldPosition(new THREE.Vector3())).normalize() }));
let brNext = 0;
const emitBreath = (count) => {
  for (let k = 0; k < count; k++) {
    const m = mouths[k % mouths.length], i = brNext; brNext = (brNext + 1) % BR;
    brPos.set([m.pos.x, m.pos.y, m.pos.z], i * 3);
    const sp = 0.5, v = 1.0 + Math.random() * 1.0;
    brVel.set([(m.dir.x + (Math.random() - 0.5) * sp) * v, (m.dir.y + (Math.random() - 0.3) * sp) * v, (m.dir.z + (Math.random() - 0.5) * sp) * v], i * 3);
    brLife[i] = 0;
  }
};

// ======================= POST: bloom + gelombang kejut + aberasi + grade + vignette + grain =======================
let composer = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uShock: { value: -1 }, uBeat: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: width / height } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uShock, uBeat, uAspect; uniform vec2 uCenter; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 off = vec2(0.0);
      if (uShock >= 0.0 && uShock < 1.8) {
        vec2 d = uv - uCenter; d.x *= uAspect; float dist = length(d);
        float radius = uShock * 0.8, w = 0.08;
        float ring = smoothstep(radius - w, radius, dist) * (1.0 - smoothstep(radius, radius + w, dist));
        vec2 dir = d / max(dist, 1e-4); dir.x /= uAspect;
        off = dir * ring * 0.022 * exp(-uShock * 1.6);
      }
      vec2 dc = vUv - 0.5; float ca = 0.0016 + 0.003 * uBeat;
      vec4 c = texture2D(tDiffuse, uv - off);
      c.r = texture2D(tDiffuse, uv - off * 1.6 + dc * ca).r; c.b = texture2D(tDiffuse, uv - off * 0.4 - dc * ca).b;
      gl_FragColor = c;
      gl_FragColor.rgb *= smoothstep(0.92, 0.22, distance(vUv, vec2(0.5))) * (0.94 + 0.06 * uBeat);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 g = gl_FragColor.rgb; float l = dot(g, vec3(0.299, 0.587, 0.114));
      g = pow(max(mix(vec3(l), g, 1.1), 0.0), vec3(1.1));
      g += vec3(0.035, -0.004, -0.02) * smoothstep(0.3, 0.9, l) + vec3(-0.006, -0.004, 0.012) * (1.0 - smoothstep(0.0, 0.3, l));
      g += (hash(vUv * 1000.0) - 0.5) * 0.045;
      gl_FragColor.rgb = g;
    }`,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let bloomPass = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.55, 0.82); composer.addPass(bloomPass);
  composer.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {},
    render(r, w, read) { outMat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(null); r.render(quadScene, quadCam); } });
} catch (e) { composer = null; }

// ======================= INTERAKSI: klik gong untuk memukul =======================
const clock = new THREE.Clock();
const now = () => (window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime());
const T_ASSEMBLE = 2.6, T_AUTO = 4.2;
let strikeAt = T_AUTO, userStruck = false, hovered = false, lastPointer = -10, lastT = 0;
const strike = () => { const t = now(); if (t - strikeAt > 0.75 && t > T_ASSEMBLE + 0.6) { strikeAt = t; userStruck = true; hint.style.opacity = '0'; controls.autoRotate = false; lastPointer = t; } };
window.__strikeGong = strike;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pick = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); ray.setFromCamera(ndc, camera); return ray.intersectObjects([gong, mallet], true).length > 0; };
let downAt = null;
renderer.domElement.addEventListener('pointermove', (e) => { hovered = pick(e); renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab'; });
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => { if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && pick(e)) strike(); downAt = null; });
const hint = document.createElement('div');
hint.textContent = 'Klik gong untuk memukul · Click the gong';
Object.assign(hint.style, { position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', font: '600 11px/1.2 system-ui, sans-serif', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,225,210,0.7)', pointerEvents: 'none', transition: 'opacity .8s', opacity: '0' });
if (canvas.parentElement) { if (getComputedStyle(canvas.parentElement).position === 'static') canvas.parentElement.style.position = 'relative'; canvas.parentElement.appendChild(hint); }

// ======================= ANIMASI =======================
const ease4 = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
const easeIn3 = (t) => { t = Math.min(Math.max(t, 0), 1); return t * t * t; };
const easeOutBack = (t) => { t = Math.min(Math.max(t, 0), 1); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const beat = (t) => { const ph = ((t % 2.1) + 2.1) % 2.1; return Math.exp(-(ph * ph) / 0.004) + 0.65 * Math.exp(-((ph - 0.3) ** 2) / 0.005); };
const dummy = new THREE.Object3D(), headPos = new THREE.Vector3(), pencuScreen = new THREE.Vector3(), shakeOff = new THREE.Vector3(), fireC = new THREE.Color();
let raf = 0;
function animate() {
  raf = requestAnimationFrame(animate);
  const t = now(), dt = Math.min(Math.max(t - lastT, 0), 0.05) || 1 / 60; lastT = t;
  const hb = beat(t);

  // 1) kepingan bara berkumpul → gong muncul membara → mendingin
  if (shards.visible) {
    for (let i = 0; i < SHARDS; i++) {
      const d = shardData[i], k = ease4((t - d.delay) / 1.7);
      dummy.position.lerpVectors(d.from, d.to, k); dummy.rotation.set(d.spin.x * (1 - k), d.spin.y * (1 - k), d.spin.z * (1 - k));
      dummy.scale.setScalar(Math.max(0.0001, 1 - ease4((t - T_ASSEMBLE) / 0.7))); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true; shardMat.emissiveIntensity = 0.5 + 3.0 * (1 - ease4(Math.max(0, t - 1.6) / 1.2));   // membara selama terbang, mendingin saat menyatu
    if (t > T_ASSEMBLE + 0.8) shards.visible = false;
  }
  const appear = ease4((t - (T_ASSEMBLE - 0.3)) / 0.9);
  bronze.opacity = appear; if (appear >= 1 && bronze.transparent) { bronze.transparent = false; bronze.needsUpdate = true; }
  const cooling = 2.2 * Math.max(0, 1 - (t - (T_ASSEMBLE - 0.3)) / 1.8) * (appear > 0 ? 1 : 0);
  mallet.visible = appear > 0.6;
  if (t > T_ASSEMBLE + 1 && !userStruck) hint.style.opacity = t > T_AUTO + 1.2 ? '1' : '0';

  // 2) tabuh: diam bergoyang → ancang-ancang → hantam → kembali
  const p = t - strikeAt, IMPACT = 0.24;
  if (p < 0 || p > 0.95) {
    const lift = hovered ? 0.18 : 0;
    headPos.copy(M_REST).lerp(M_WIND, lift).add(new THREE.Vector3(Math.sin(t * 1.3) * 0.01, Math.sin(t * 1.7) * 0.012, 0));
  } else if (p < 0.16) headPos.copy(M_REST).lerp(M_WIND, ease4(p / 0.16));
  else if (p < IMPACT) headPos.copy(M_WIND).lerp(M_HIT, easeIn3((p - 0.16) / (IMPACT - 0.16)));
  else headPos.copy(M_HIT).lerp(M_REST, easeOutBack((p - IMPACT) / 0.7));
  mallet.position.copy(headPos); mallet.lookAt(headPos.clone().add(M_GRIP));

  // 3) jantung gong, mata kala & naga ikut denyut; efek setelah hantaman
  const st = p - IMPACT;
  let heat = 0.04 + 0.2 * hb + (hovered ? 0.1 : 0) + cooling, flare = 0;   // diam: hanya pencu berdenyut; retakan menyala saat dipukul
  gongPivot.rotation.x = 0; gong.rotation.z = 0; strikeLight.intensity = 0; outMat.uniforms.uShock.value = -1; shakeOff.set(0, 0, 0);
  ripples.forEach((m) => { m.material.opacity = 0; }); sparkMat.opacity = 0;
  if (st >= 0 && st < 6) {
    flare = Math.exp(-st * 1.4);
    gongPivot.rotation.x = -0.045 * Math.exp(-st * 1.2) * Math.sin(st * 4.2);
    gong.rotation.z = 0.006 * Math.exp(-st * 2.2) * Math.sin(st * 43);
    heat += 2.2 * Math.exp(-st * 1.3);
    strikeLight.intensity = 2.2 * Math.exp(-st * 3);
    if (bloomPass) bloomPass.strength = 0.7 + 0.45 * Math.exp(-st * 2.2);
    ripples.forEach((m, i) => { const rt = st - i * 0.16, k = Math.min(Math.max(rt / 1.7, 0), 1); m.scale.setScalar(0.12 + ease4(k) * (0.62 + i * 0.05)); m.material.opacity = rt > 0 ? (1 - k) * (i % 2 ? 0.45 : 0.8) : 0; });
    const pa = sparkGeo.attributes.position, life = Math.min(st / 1.8, 1);
    for (let i = 0; i < SPARKS; i++) { const v = svel[i]; pa.setXYZ(i, v.x * st, GONG_Y + v.y * st - 0.45 * st * st, 0.13 + v.z * st); }
    pa.needsUpdate = true; sparkMat.opacity = 1 - life;
    if (st < 1.2) emitBreath(24);
    pencuScreen.set(0, GONG_Y, 0.11).project(camera); outMat.uniforms.uCenter.value.set(pencuScreen.x * 0.5 + 0.5, pencuScreen.y * 0.5 + 0.5); outMat.uniforms.uShock.value = st;
    const sh = 0.02 * Math.exp(-st * 6);
    shakeOff.set(Math.sin(st * 73) * sh, Math.cos(st * 61) * sh, 0);
  } else if (bloomPass) bloomPass.strength = 0.7;
  bronze.emissiveIntensity = heat;
  const breathK = st >= 0 && st < 1.8 ? Math.min(1, st * 8) * Math.max(0, 1 - st / 1.8) : 0;
  breathLights.forEach((l) => { l.intensity = 2.5 * breathK * (0.8 + 0.2 * Math.sin(t * 40)); });
  bkMat.emissiveIntensity = 0.55 + 1.6 * hb + 3.5 * flare;
  auraMat.opacity = 0.35 + 0.35 * hb + 0.6 * flare;
  nagaEyeMat.color.setRGB(1, 0.16, 0.03).multiplyScalar(2 + 3 * hb + 6 * flare);
  mawMat.color.setRGB(1, 0.32, 0.06).multiplyScalar(1.4 + 1.2 * hb + 4 * flare);
  ember.intensity = (0.6 + 1.6 * hb + 2.5 * flare) * (0.88 + 0.12 * Math.sin(t * 9.1));

  // 4) napas api: naik karena panas, warna putih-kuning → jingga → merah → padam
  for (let i = 0; i < BR; i++) {
    if (brLife[i] > 1) { brCol[i * 3] = brCol[i * 3 + 1] = brCol[i * 3 + 2] = 0; continue; }
    brLife[i] += dt / 1.0; const j = i * 3, L = brLife[i];
    brPos[j] += brVel[j] * dt; brPos[j + 1] += brVel[j + 1] * dt; brPos[j + 2] += brVel[j + 2] * dt;
    brVel[j] *= 0.95; brVel[j + 1] = brVel[j + 1] * 0.95 + 0.9 * dt; brVel[j + 2] *= 0.95;
    fireC.setRGB(1, Math.max(0.1, 0.78 - L * 1.0), Math.max(0, 0.38 - L * 1.2)).multiplyScalar(1.5 * (1 - L) * (1 - L * 0.6));
    brCol[j] = fireC.r; brCol[j + 1] = fireC.g; brCol[j + 2] = fireC.b;
  }
  brGeo.attributes.position.needsUpdate = true; brGeo.attributes.color.needsUpdate = true;

  // 5) blencong berkedip, bara naik, kamera kembali berputar setelah diam
  flicker.intensity = 1.5 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 13.3) * 0.15;
  for (let i = 0; i < EMB; i++) { const j = i * 3; epos[j] += Math.sin(t * 1.3 + eseed[i]) * 0.0008; epos[j + 1] += 0.002 + (eseed[i] % 1) * 0.002; if (epos[j + 1] > 2.9) spawnEmber(i, false); }
  embGeo.attributes.position.needsUpdate = true; embMat.opacity = 0.7 + 0.25 * hb;
  if (!controls.autoRotate && t - lastPointer > 8) controls.autoRotate = true;

  controls.update();
  camera.position.add(shakeOff);
  outMat.uniforms.uTime.value = t; outMat.uniforms.uBeat.value = Math.min(1, hb + flare);
  if (composer) composer.render(); else renderer.render(scene, camera);
  camera.position.sub(shakeOff);
}
animate();
if (typeof __host !== 'undefined') __host.dispose = () => { cancelAnimationFrame(raf); hint.remove(); renderer.dispose(); };
