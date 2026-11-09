// Prototipe: "Tiket Lakon", boarding pass bertali (Lakon Tiga Hari), satu bahasa visual dengan gong, gunungan, keris.
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass, UnrealBloomPass, canvas, width, height).
// Satu tamu, satu tag, digantung pada benang emas. Tali = verlet (produksi: Rapier rope joint), kartu = badan kaku 4 titik.
// Kartu nila dengan cetak foil emas (berkilau & sedikit timbul), mata ayam kuningan. Depan: nama tamu, rute TJQ → CGK → SOC,
// tanggal, gate "Kulonuwun", "Admit one". Belakang: kawung + monogram inisial + "Matur nuwun".
// NAMA TIDAK DITULIS DI KODE: dibaca dari window.__guestName saat runtime (produksi: dari data privat trip-data).
// SERET KARTU = tarik lalu lepas; kartu berayun, berputar, lalu tenang kembali.

// ======================= RENDERER & SCENE =======================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070e);
scene.fog = new THREE.Fog(0x06070e, 0.7, 2.2);
const camera = new THREE.PerspectiveCamera(34, width / height, 0.01, 10);
camera.position.set(0.012, -0.024, 0.34);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -0.036, 0); controls.enableDamping = true; controls.minDistance = 0.18; controls.maxDistance = 1.6;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

// ======================= FONT (Fraunces & Manrope, sama dengan web) =======================
const DISPLAY = 'Fraunces, Georgia, "DejaVu Serif", serif';
const UI = 'Manrope, "Helvetica Neue", Arial, sans-serif';
const loadFont = (fam, url, desc) => (typeof FontFace === 'undefined' ? Promise.resolve() : new FontFace(fam, `url(${url})`, desc).load().then((f) => document.fonts.add(f)).catch(() => {}));
const fontsReady = Promise.all([
  loadFont('Fraunces', 'fonts/fraunces-latin-wght-normal.woff2', { weight: '100 900' }),
  loadFont('Fraunces', 'fonts/fraunces-latin-wght-italic.woff2', { weight: '100 900', style: 'italic' }),
  loadFont('Manrope', 'fonts/manrope-latin-wght-normal.woff2', { weight: '200 800' }),
]);

// ======================= DIMENSI KARTU (meter) =======================
const CW = 0.074, CH = 0.15, CT = 0.0011;          // 7,4 × 15 cm, karton 1,1 mm
const CHAMF = 0.013, RB = 0.006;                    // sudut atas dipotong (gaya luggage tag), sudut bawah membulat
const HOLE_Y = CH / 2 - 0.0115, HOLE_R = 0.0041;    // lubang tali
const LOOP_R = 0.0062;                              // simpul benang melewati lubang; poros kartu = puncak simpul
const PIVOT = new THREE.Vector3(0, HOLE_Y + LOOP_R, 0);
const TW = 1024, TH = Math.round(1024 * CH / CW);   // tekstur 1024 × 2076 (rasio kartu)
const PX = TW / CW;                                 // piksel per meter
const tx = (x) => (x + CW / 2) * PX, ty = (y) => (CH / 2 - y) * PX; // meter (pusat kartu) → piksel kanvas

const cardShape = () => {
  const s = new THREE.Shape(), w = CW / 2, h = CH / 2;
  s.moveTo(-w + RB, -h); s.lineTo(w - RB, -h); s.quadraticCurveTo(w, -h, w, -h + RB);
  s.lineTo(w, h - CHAMF); s.lineTo(w - CHAMF, h); s.lineTo(-w + CHAMF, h); s.lineTo(-w, h - CHAMF);
  s.lineTo(-w, -h + RB); s.quadraticCurveTo(-w, -h, -w + RB, -h);
  const hole = new THREE.Path(); hole.absarc(0, HOLE_Y, HOLE_R, 0, Math.PI * 2, true); s.holes.push(hole);
  return s;
};
const tracePath = (g, inset) => { // garis tepi kartu di kanvas, menjorok `inset` meter
  const w = CW / 2 - inset, h = CH / 2 - inset, c = CHAMF - inset * 0.4, rb = Math.max(0.001, RB - inset * 0.5);
  g.beginPath(); g.moveTo(tx(-w + rb), ty(-h)); g.lineTo(tx(w - rb), ty(-h)); g.quadraticCurveTo(tx(w), ty(-h), tx(w), ty(-h + rb));
  g.lineTo(tx(w), ty(h - c)); g.lineTo(tx(w - c), ty(h)); g.lineTo(tx(-w + c), ty(h)); g.lineTo(tx(-w), ty(h - c));
  g.lineTo(tx(-w), ty(-h + rb)); g.quadraticCurveTo(tx(-w), ty(-h), tx(-w + rb), ty(-h)); g.closePath();
};

// ======================= CETAKAN (warna / roughness+metal / timbul) =======================
// mode 'c' = warna, 'r' = roughness (G) + metalness (B), 'b' = timbul (foil lebih tinggi dari kertas)
const STY = {
  c: { bg: '#0d1228', bg2: '#141c3e', foil: '#d2ab62', ink: '#efe7d8', dim: '#9aa0bd', hole: '#05060b' },
  r: { bg: 'rgb(0,214,0)', bg2: 'rgb(0,214,0)', foil: 'rgb(0,62,255)', ink: 'rgb(0,150,0)', dim: 'rgb(0,170,0)', hole: 'rgb(0,230,0)' },
  b: { bg: '#000', bg2: '#000', foil: '#fff', ink: '#3a3a3a', dim: '#1a1a1a', hole: '#000' },
};
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; };
const texOf = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const grain = Array.from({ length: 9000 }, () => [rnd() * TW, rnd() * TH, rnd()]);

const kawung = (g, st, cell, alpha, foil) => { // empat kelopak elips mengelilingi titik: motif kawung
  g.save(); g.globalAlpha = alpha; g.fillStyle = foil ? st.foil : st.bg2; g.strokeStyle = foil ? st.foil : st.bg2; g.lineWidth = cell * 0.035;
  for (let y = -cell; y < TH + cell; y += cell) for (let x = -cell; x < TW + cell; x += cell) {
    const ox = ((Math.round(y / cell) % 2) * cell) / 2;
    for (let k = 0; k < 4; k++) {
      g.save(); g.translate(x + ox, y); g.rotate(Math.PI / 4 + (k * Math.PI) / 2); g.translate(cell * 0.24, 0);
      g.beginPath(); g.ellipse(0, 0, cell * 0.2, cell * 0.11, 0, 0, Math.PI * 2); foil ? g.stroke() : g.fill();
      g.beginPath(); g.ellipse(cell * 0.02, 0, cell * 0.035, cell * 0.035, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  g.restore();
};

const paperBase = (g, st, mode) => {
  g.fillStyle = st.hole; g.fillRect(0, 0, TW, TH);
  tracePath(g, 0); g.save(); g.clip();
  if (mode === 'c') { const gr = g.createLinearGradient(0, 0, 0, TH); gr.addColorStop(0, st.bg2); gr.addColorStop(0.55, st.bg); gr.addColorStop(1, '#0a0e20'); g.fillStyle = gr; }
  else g.fillStyle = st.bg;
  g.fillRect(0, 0, TW, TH);
  if (mode === 'c') { for (const [x, y, a] of grain) { g.fillStyle = `rgba(${a > 0.5 ? '255,240,220' : '0,0,10'},${0.02 + a * 0.025})`; g.fillRect(x, y, 1.6, 1.6); } }
  return () => g.restore();
};

const spaced = (g, text, x, y, sp, align = 'left') => { // teks berjarak huruf (letterSpacing bila didukung)
  if ('letterSpacing' in g) { g.letterSpacing = `${sp}px`; g.textAlign = align; g.fillText(text, x, y); g.letterSpacing = '0px'; return; }
  let w = 0; for (const ch of text) w += g.measureText(ch).width + sp; let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.textAlign = 'left'; for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
};

const plane = (g, x, y, s, rot) => { // pesawat kecil (siluet) di benang rute
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.beginPath();
  g.moveTo(0, -1); g.bezierCurveTo(0.12, -0.9, 0.12, -0.35, 0.12, -0.2); g.lineTo(0.95, 0.25); g.lineTo(0.95, 0.42); g.lineTo(0.12, 0.2);
  g.lineTo(0.1, 0.72); g.lineTo(0.36, 0.9); g.lineTo(0.36, 1.0); g.lineTo(0, 0.92); g.lineTo(-0.36, 1.0); g.lineTo(-0.36, 0.9); g.lineTo(-0.1, 0.72);
  g.lineTo(-0.12, 0.2); g.lineTo(-0.95, 0.42); g.lineTo(-0.95, 0.25); g.lineTo(-0.12, -0.2); g.bezierCurveTo(-0.12, -0.35, -0.12, -0.9, 0, -1); g.fill(); g.restore();
};

const drawFront = (g, mode, guest) => {
  const st = STY[mode], end = paperBase(g, st, mode);
  kawung(g, st, 150, mode === 'c' ? 0.22 : 0, false);           // watermark kawung samar di kertas
  const L = 92, R = TW - 92;
  // bingkai foil ganda mengikuti potongan kartu
  g.strokeStyle = st.foil; g.lineWidth = 5; tracePath(g, 0.0032); g.stroke(); g.lineWidth = 1.6; tracePath(g, 0.0042); g.stroke();
  // cincin penguat di sekitar lubang
  g.beginPath(); g.arc(tx(0), ty(HOLE_Y), HOLE_R * PX + 30, 0, Math.PI * 2); g.lineWidth = 3; g.stroke();
  g.fillStyle = st.foil; g.textBaseline = 'alphabetic';
  g.font = `700 30px ${UI}`; spaced(g, 'BOARDING PASS', L, 300, 7); spaced(g, 'ADMIT ONE', R, 300, 7, 'right');
  g.fillStyle = st.ink; g.font = `italic 400 92px ${DISPLAY}`; g.textAlign = 'left'; g.fillText('A Three-Day Lakon', L - 4, 405);
  g.fillStyle = st.foil; g.fillRect(L, 450, R - L, 3);
  // penumpang
  g.font = `700 26px ${UI}`; g.fillStyle = st.foil; spaced(g, 'PASSENGER', L, 530, 6);
  g.fillStyle = st.ink; g.textAlign = 'left'; let fs = 104; // nama selalu muat satu baris
  do { g.font = `italic 500 ${fs}px ${DISPLAY}`; fs -= 4; } while (g.measureText(guest.name).width > R - L && fs > 48);
  g.fillText(guest.name, L - 4, 635);
  g.fillStyle = st.dim; g.font = `500 30px ${UI}`; g.fillText(guest.note, L, 685);
  // rute: tiga bandara disambung benang emas
  const stops = [
    { code: 'TJQ', city: 'Tanjung Pandan', sub: 'Belitung · H.A.S. Hanandjoeddin', y: 870 },
    { code: 'CGK', city: 'Jakarta', sub: 'Soekarno–Hatta · transit', y: 1130 },
    { code: 'SOC', city: 'Solo', sub: 'Surakarta · Adi Soemarmo', y: 1390 },
  ];
  const lx = L + 22;
  g.strokeStyle = st.foil; g.lineWidth = 4; g.setLineDash([2, 14]); g.lineCap = 'round';
  g.beginPath(); g.moveTo(lx, stops[0].y - 34); g.lineTo(lx, stops[2].y - 34); g.stroke(); g.setLineDash([]);
  g.fillStyle = st.foil;
  plane(g, lx, (stops[0].y + stops[1].y) / 2 - 34, 24, Math.PI); plane(g, lx, (stops[1].y + stops[2].y) / 2 - 34, 24, Math.PI);
  stops.forEach((s, i) => {
    g.beginPath(); g.arc(lx, s.y - 34, i === 2 ? 17 : 13, 0, Math.PI * 2); g.fillStyle = st.foil; g.fill();
    if (i !== 2) { g.beginPath(); g.arc(lx, s.y - 34, 7, 0, Math.PI * 2); g.fillStyle = st.bg; g.fill(); }
    g.fillStyle = st.ink; g.font = `800 ${i === 2 ? 132 : 112}px ${UI}`; g.textAlign = 'left'; spaced(g, s.code, lx + 58, s.y + (i === 2 ? 12 : 0), 4);
    g.font = `600 36px ${UI}`; g.fillStyle = i === 2 ? st.foil : st.ink; g.textAlign = 'right'; g.fillText(s.city, R, s.y - 56);
    g.font = `500 25px ${UI}`; g.fillStyle = st.dim; g.fillText(s.sub, R, s.y - 16);
  });
  // info 2 × 2
  const cell = (x, y, label, val, foil) => { g.textAlign = 'left'; g.font = `700 24px ${UI}`; g.fillStyle = st.foil; spaced(g, label, x, y, 5); g.font = `${foil ? 'italic 500' : '600'} ${foil ? 46 : 40}px ${foil ? DISPLAY : UI}`; g.fillStyle = foil ? st.foil : st.ink; g.fillText(val, x, y + 56); };
  g.fillStyle = st.foil; g.fillRect(L, 1480, R - L, 2);
  cell(L, 1545, 'DATE', 'Wed 07 Apr 2027'); cell(TW / 2 + 40, 1545, 'DAY', 'Hari 0');
  cell(L, 1665, 'GATE', 'Kulonuwun', true); cell(TW / 2 + 40, 1665, 'SEAT', 'With the host');
  // perforasi sobekan
  const py = 1790; g.fillStyle = st.hole;
  for (let x = 40; x < TW - 30; x += 34) { g.beginPath(); g.arc(x, py, 6, 0, Math.PI * 2); g.fill(); }
  // sobekan: barcode foil + host
  let bx = L, k = 0; g.fillStyle = st.foil;
  const bars = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 4, 1, 2, 1, 1, 3, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 4, 2, 1, 3, 1, 2];
  while (bx < L + 520) { const w = bars[k % bars.length] * 6; if (k % 2 === 0) g.fillRect(bx, 1850, w, 120); bx += w + 6; k++; }
  g.textAlign = 'right'; g.font = `700 24px ${UI}`; g.fillStyle = st.foil; spaced(g, 'HOSTED BY', R, 1880, 5, 'right');
  g.font = `italic 500 44px ${DISPLAY}`; g.fillStyle = st.ink; g.fillText(guest.host, R, 1934);
  g.font = `600 24px ${UI}`; g.fillStyle = st.dim; g.fillText(guest.ref, R, 1972);
  end();
};

const drawBack = (g, mode) => {
  const st = STY[mode], end = paperBase(g, st, mode);
  kawung(g, st, 132, 0.85, true);                                  // kawung foil penuh
  g.strokeStyle = st.foil; g.lineWidth = 5; tracePath(g, 0.0032); g.stroke();
  // medali tengah
  const cx = TW / 2, cy = TH * 0.56, rw = 330, rh = 400;
  g.fillStyle = st.bg; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = st.foil; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, cy, rw - 22, rh - 22, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, rw - 36, rh - 36, 0, 0, Math.PI * 2); g.stroke();
  if (GUEST.initials) { g.fillStyle = st.foil; g.textAlign = 'center'; g.font = `italic 500 74px ${DISPLAY}`; g.fillText(GUEST.initials, cx, cy - 190);
    g.fillRect(cx - 70, cy - 158, 140, 3); }
  g.fillStyle = st.ink; g.textAlign = 'center'; g.font = `italic 400 96px ${DISPLAY}`; g.fillText('Matur', cx, cy - 40); g.fillText('nuwun', cx, cy + 62);
  g.fillStyle = st.foil; g.font = `700 26px ${UI}`; spaced(g, 'SEE YOU IN SOLO', cx, cy + 150, 6, 'center');
  g.fillStyle = st.dim; g.font = `500 26px ${UI}`; g.textAlign = 'center'; g.fillText('7 – 11 April 2027', cx, cy + 196);
  end();
};

// tamu tunggal: nama dari runtime (window.__guestName), bukan dari kode
const GUEST_NAME = (typeof window !== 'undefined' && window.__guestName) || 'Your Name';
const GUEST = {
  name: GUEST_NAME,
  initials: window.__guestName ? GUEST_NAME.split(/\s+/).map((w) => w[0]).join(' · ').toUpperCase() : '',
  note: 'Guest of honour · Singapore → Solo', host: '[host]', ref: 'LKN · SOC · 0407 · 1/1',
};
const GUESTS = [GUEST];
const backC = { c: mkCanvas(), r: mkCanvas(), b: mkCanvas() };
const backMat = new THREE.MeshPhysicalMaterial({ map: texOf(backC.c, true), roughnessMap: texOf(backC.r), metalnessMap: texOf(backC.r), bumpMap: texOf(backC.b), bumpScale: 0.6, metalness: 1, roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 1.2 });
const frontSets = GUESTS.map(() => ({ c: mkCanvas(), r: mkCanvas(), b: mkCanvas() }));
const frontMats = frontSets.map((s) => new THREE.MeshPhysicalMaterial({ map: texOf(s.c, true), roughnessMap: texOf(s.r), metalnessMap: texOf(s.r), bumpMap: texOf(s.b), bumpScale: 0.6, metalness: 1, roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 1.2 }));
const paintAll = () => {
  for (const m of ['c', 'r', 'b']) {
    drawBack(backC[m].getContext('2d', { willReadFrequently: true }), m);
    frontSets.forEach((s, i) => drawFront(s[m].getContext('2d', { willReadFrequently: true }), m, GUESTS[i]));
  }
  for (const mat of [backMat, ...frontMats]) for (const k of ['map', 'roughnessMap', 'metalnessMap', 'bumpMap']) mat[k].needsUpdate = true;
};
paintAll();
fontsReady.then(() => { paintAll(); window.__texturesReady = true; });

// ======================= GEOMETRI KARTU =======================
const shape = cardShape();
const capGeo = new THREE.ShapeGeometry(shape, 24);
{ const p = capGeo.attributes.position, uv = capGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + CW / 2) / CW, (p.getY(i) + CH / 2) / CH); }
const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: CT, bevelEnabled: false, curveSegments: 24 });
const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc9a159, metalness: 1, roughness: 0.32 }); // tepi bersepuh emas
const hidden = new THREE.MeshBasicMaterial({ visible: false });
const brass = new THREE.MeshPhysicalMaterial({ color: 0xb9893f, metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const cordTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 256);
  for (let y = -64; y < 320; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#303030'); gr.addColorStop(0.5, '#e0e0e0'); gr.addColorStop(1, '#303030'); g.save(); g.transform(1, 0.5, 0, 1, 0, 0); g.fillStyle = gr; g.fillRect(0, y - 32, 64, 16); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 60); return t; })();
const cordMat = new THREE.MeshPhysicalMaterial({ color: 0xd8b064, metalness: 0.85, roughness: 0.38, bumpMap: cordTex, bumpScale: 2.5, sheen: 0.6, sheenColor: new THREE.Color(0xffdca0) });

const buildCard = (i) => {
  const g = new THREE.Group(); const body = new THREE.Group(); body.position.copy(PIVOT).multiplyScalar(-1); g.add(body);
  const front = new THREE.Mesh(capGeo, frontMats[i]); front.position.z = CT / 2 + 0.00002;
  const back = new THREE.Mesh(capGeo, backMat); back.rotation.y = Math.PI; back.position.z = -CT / 2 - 0.00002;
  const edge = new THREE.Mesh(edgeGeo, [hidden, edgeMat]); edge.position.z = -CT / 2;
  const eyelet = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R + 0.0007, 0.0009, 12, 40), brass); eyelet.position.set(0, HOLE_Y, 0); eyelet.scale.z = 1.6;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(LOOP_R, 0.00075, 10, 40, Math.PI * 1.25), cordMat); // simpul benang melewati lubang
  loop.position.set(0, HOLE_Y, 0); loop.rotation.set(0, Math.PI / 2, Math.PI / 2 - Math.PI * 0.125);
  for (const m of [front, back, edge, eyelet, loop]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }
  g.userData.pick = [front, back, edge];
  return g;
};

// ======================= FISIKA: benang verlet + kartu kaku =======================
const N = 18, G = new THREE.Vector3(0, -9.81, 0), STEP = 1 / 240;
const LOCAL = { B: new THREE.Vector3(0, -(HOLE_Y + LOOP_R + CH / 2) + 0.004, 0), R: new THREE.Vector3(CW / 2 - 0.006, -0.05, 0), L: new THREE.Vector3(-CW / 2 + 0.006, -0.05, 0) };
const tags = [
  { x: 0.0, z: 0.0, rope: 0.25, yaw: 0.3, goal: 0.12, guest: 0 },
].map((cfg) => {
  const anchor = new THREE.Vector3(cfg.x, 0.3, cfg.z);
  const seg = cfg.rope / N;
  const P = [], prev = [], inv = [];
  for (let k = 0; k <= N; k++) { const p = anchor.clone().add(new THREE.Vector3(0, -seg * k, 0)); P.push(p); prev.push(p.clone()); inv.push(k === 0 ? 0 : 60); }
  const pivot = P[N];
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cfg.yaw);
  const add = (lp, w) => { const p = lp.clone().applyQuaternion(q).add(pivot); P.push(p); prev.push(p.clone()); inv.push(w); return P.length - 1; };
  inv[N] = 6; // ujung benang = puncak simpul, ikut menanggung berat kartu
  const iB = add(LOCAL.B, 2.2), iR = add(LOCAL.R, 3), iL = add(LOCAL.L, 3);
  const rigid = [[N, iB], [N, iR], [N, iL], [iB, iR], [iB, iL], [iR, iL]].map(([a, b]) => [a, b, P[a].distanceTo(P[b])]);
  const card = buildCard(cfg.guest); scene.add(card);
  const ropeMesh = new THREE.Mesh(new THREE.BufferGeometry(), cordMat); ropeMesh.castShadow = true; scene.add(ropeMesh);
  return { cfg, anchor, seg, P, prev, inv, iB, iR, iL, rigid, card, ropeMesh, yawGoal: cfg.goal, phase: cfg.x * 31 + 2, grab: null };
});
const hero = tags[0];

const tmp = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), nrm = new THREE.Vector3(), basis = new THREE.Matrix4();
const satisfy = (T, a, b, rest) => {
  const pa = T.P[a], pb = T.P[b], wa = T.inv[a], wb = T.inv[b], w = wa + wb; if (!w) return;
  tmp.subVectors(pb, pa); const d = tmp.length() || 1e-9; const diff = (d - rest) / (d * w);
  pa.addScaledVector(tmp, diff * wa); pb.addScaledVector(tmp, -diff * wb);
};
const frameOf = (T) => { // sumbu kartu dari empat titik
  const P = T.P; up.subVectors(P[N], P[T.iB]).normalize(); right.subVectors(P[T.iR], P[T.iL]); right.addScaledVector(up, -right.dot(up)).normalize();
  nrm.crossVectors(right, up).normalize(); return { up, right, nrm };
};
let simT = 0, wind = 0;
const stepSim = (t) => {
  for (const T of tags) {
    const { P, prev, inv } = T;
    // gaya: gravitasi, angin pelan, puntir benang (kartu perlahan kembali menghadap depan), tarikan tangan
    const f = frameOf(T); const yaw = Math.atan2(f.nrm.x, f.nrm.z); const goal = T.yawGoal + Math.sin(t * 0.37 + T.phase) * 0.18;
    let dy = goal - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const tw = dy * 0.9; // N·m semu: dorong titik kanan/kiri berlawanan arah sepanjang normal
    for (let k = 1; k < P.length; k++) {
      if (!inv[k]) continue;
      const v = tmp.subVectors(P[k], prev[k]).multiplyScalar(k >= T.iB ? 0.9965 : 0.993); prev[k].copy(P[k]);
      P[k].add(v).addScaledVector(G, STEP * STEP);
      const gust = 0.014 * Math.sin(t * 0.9 + T.phase) + 0.008 * Math.sin(t * 2.3 + T.phase * 2) + wind;
      P[k].x += gust * STEP * STEP * (k >= T.iB ? 1 : 0.4);
      P[k].z += 0.4 * gust * STEP * STEP * Math.cos(t * 0.7 + T.phase);
    }
    P[T.iR].addScaledVector(f.nrm, -tw * STEP * STEP); P[T.iL].addScaledVector(f.nrm, tw * STEP * STEP);
    if (T.grab) { const gp = P[T.grab.i]; gp.lerp(T.grab.target, 0.12); }
    for (let it = 0; it < 14; it++) {
      for (let k = 0; k < N; k++) satisfy(T, k, k + 1, T.seg);
      for (const [a, b, r] of T.rigid) satisfy(T, a, b, r);
    }
  }
};
const settle = () => { for (let i = 0; i < 240 * 3; i++) stepSim(i * STEP); };
settle();

const curvePts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
const syncMeshes = () => {
  for (const T of tags) {
    const f = frameOf(T); basis.makeBasis(f.right, f.up, f.nrm); T.card.quaternion.setFromRotationMatrix(basis); T.card.position.copy(T.P[N]);
    for (let k = 0; k <= N; k++) curvePts[k].copy(T.P[k]);
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePts), 72, 0.00075, 7, false); T.ropeMesh.geometry.dispose(); T.ropeMesh.geometry = geo;
  }
};

// ======================= ENVIRONMENT, CAHAYA, LATAR =======================
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x05060c, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m); };
  panel(5, 1.4, [-2.5, 3.5, 3.5], [1, 0.8, 0.55], 3.0);   // jendela hangat kiri atas: kilau foil
  panel(0.8, 5, [3.5, 0.5, 2.5], [1, 0.88, 0.7], 1.8);
  panel(6, 2, [0, -3, 3], [0.55, 0.32, 0.12], 1.0);
  panel(4, 3, [0, 1, -4], [0.18, 0.22, 0.45], 0.8);       // pantulan nila dari belakang
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
}
const radialTex = (stops, size = 256) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(70,52,30,1)'], [0.4, 'rgba(26,24,40,0.8)'], [1, 'rgba(6,7,14,0)']]), transparent: true, depthWrite: false, fog: false }));
glow.position.set(-0.05, 0.0, -0.55); scene.add(glow);
const key = new THREE.SpotLight(0xffd9a8, 5.5, 0, 0.42, 0.75, 2); key.position.set(-0.38, 0.42, 0.55); key.target.position.set(0, -0.03, 0); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0002; key.shadow.radius = 4; scene.add(key, key.target);
const rim = new THREE.SpotLight(0xc8c4e8, 0.55, 0, 0.6, 0.8, 2); rim.position.set(0.45, 0.25, -0.5); rim.target.position.set(0, -0.03, 0); scene.add(rim, rim.target);
const fill = new THREE.PointLight(0xffd2a0, 0.12, 2, 2); fill.position.set(0.25, -0.12, 0.45); scene.add(fill);
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.ShadowMaterial({ opacity: 0.35 })); backdrop.position.set(0, 0, -0.42); backdrop.receiveShadow = true; scene.add(backdrop);
// debu melayang di berkas cahaya
const dotTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']], 64);
const DUST = 180, dgeo = new THREE.BufferGeometry(), dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) { dpos.set([(rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.45, -0.35 + rnd() * 0.55], i * 3); dseed[i] = rnd() * 100; }
dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 0.0025, map: dotTex, color: 0xffd9a0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// ======================= POST =======================
let composer = null, bloomPass = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      vec2 dc = vUv - 0.5; vec4 c = texture2D(tDiffuse, vUv); c.r = texture2D(tDiffuse, vUv + dc * 0.0016).r; c.b = texture2D(tDiffuse, vUv - dc * 0.0016).b;
      gl_FragColor = c; gl_FragColor.rgb *= smoothstep(0.95, 0.25, distance(vUv, vec2(0.5)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 g = gl_FragColor.rgb; float l = dot(g, vec3(0.299, 0.587, 0.114));
      g += vec3(0.03, 0.006, -0.02) * smoothstep(0.35, 0.95, l) + vec3(-0.004, -0.002, 0.014) * (1.0 - smoothstep(0.0, 0.3, l));
      g += (hash(vUv * 1000.0) - 0.5) * 0.035; gl_FragColor.rgb = g; }`,
  depthTest: false, depthWrite: false,
});
const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat)); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
try {
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.45, 0.9); composer.addPass(bloomPass);
  composer.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {}, render(r, w, read) { outMat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(null); r.render(qs, qc); } });
} catch (e) { composer = null; }

// ======================= INTERAKSI: seret kartu =======================
const clock = new THREE.Clock();
const now = () => (window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), dragPlane = new THREE.Plane(), hitP = new THREE.Vector3();
const setNdc = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); ray.setFromCamera(ndc, camera); };
let dragging = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  setNdc(e);
  const hits = ray.intersectObjects(tags.flatMap((T) => T.card.userData.pick), false); if (!hits.length) return;
  const T = tags.find((x) => x.card.userData.pick.includes(hits[0].object));
  let best = T.iB, bd = Infinity; for (const i of [T.iB, T.iR, T.iL]) { const d = T.P[i].distanceTo(hits[0].point); if (d < bd) { bd = d; best = i; } }
  dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hitP).negate(), hits[0].point);
  T.grab = { i: best, target: hits[0].point.clone() }; dragging = T; controls.enabled = false; hint.style.opacity = '0';
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => { if (!dragging) return; setNdc(e); if (ray.ray.intersectPlane(dragPlane, hitP)) dragging.grab.target.copy(hitP); });
const release = () => { if (dragging) { dragging.grab = null; dragging = null; controls.enabled = true; } };
renderer.domElement.addEventListener('pointerup', release); renderer.domElement.addEventListener('pointercancel', release);
const hint = document.createElement('div');
hint.textContent = 'Seret tiketnya · tarik lalu lepas';
Object.assign(hint.style, { position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', font: '600 11px/1.2 system-ui, sans-serif', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,225,210,0.7)', pointerEvents: 'none', transition: 'opacity .8s', opacity: window.__fixedT === undefined ? '1' : '0' });
if (canvas.parentElement) { if (getComputedStyle(canvas.parentElement).position === 'static') canvas.parentElement.style.position = 'relative'; canvas.parentElement.appendChild(hint); }

// Tarikan terjadwal untuk preview (t dalam detik). window.__tug(t0) memicunya lagi; window.__showBack() memutar tiket utama.
let tugAt = 2.0;
window.__tug = (t0) => { tugAt = t0 ?? now() + 0.05; };
window.__showBack = (on = true) => { hero.yawGoal = on ? Math.PI + 0.25 : hero.cfg.goal; };
const tugTarget = (t) => { // tangan tak terlihat menarik sudut kanan tiket ke kiri-depan, lalu melepas
  const a = t - tugAt; if (a < 0 || a > 0.75) return null;
  const k = a < 0.55 ? Math.sin((a / 0.55) * Math.PI * 0.5) : 1;
  return new THREE.Vector3(hero.cfg.x - 0.07 * k, -0.075 + 0.045 * k, 0.07 * k);
};

// ======================= PRESET KAMERA (preview) =======================
const PRESETS = { wide: [[0.012, -0.024, 0.34], [0, -0.036, 0]], film: [[0.012, -0.024, 0.38], [0, -0.036, 0]], hero: [[0.035, -0.028, 0.205], [0.002, -0.047, 0]], back: [[-0.03, -0.028, 0.205], [0.002, -0.047, 0]] };
let dolly = false;
window.__applyPreset = (p) => {
  const [pos, tgt] = PRESETS[p] || PRESETS.wide; camera.position.set(...pos); controls.target.set(...tgt); controls.update();
  dolly = p === 'film'; if (p === 'hero' || p === 'back') tugAt = 1e9; if (p === 'back') window.__showBack(true);
};

// ======================= LOOP =======================
let raf = 0, lastT = 0;
function animate() {
  raf = requestAnimationFrame(animate);
  const t = now();
  if (t < simT - 0.5) { simT = t; }                     // waktu mundur (uji): lanjut dari keadaan sekarang
  const tt = tugTarget(t);
  if (!dragging) hero.grab = tt ? { i: hero.iR, target: tt } : null;
  let steps = 0; while (simT + STEP <= t && steps < 480) { simT += STEP; stepSim(simT); steps++; }
  syncMeshes();
  const dt = Math.min(Math.max(t - lastT, 0), 0.05); lastT = t;
  for (let i = 0; i < DUST; i++) { const j = i * 3; dpos[j] += Math.sin(t * 0.3 + dseed[i]) * 0.00004; dpos[j + 1] += 0.00003 + Math.sin(t * 0.5 + dseed[i] * 2) * 0.00003; if (dpos[j + 1] > 0.24) dpos[j + 1] = -0.22; }
  dgeo.attributes.position.needsUpdate = true;
  if (dolly) { const k = Math.min(1, t / 7.5); const e = k * k * (3 - 2 * k); camera.position.set(0.012 + 0.022 * e, -0.024 - 0.006 * e, 0.38 - 0.11 * e); controls.target.set(0.002 * e, -0.036 - 0.008 * e, 0); }
  controls.update();
  outMat.uniforms.uTime.value = t;
  if (composer) composer.render(); else renderer.render(scene, camera);
}
animate();
if (typeof __host !== 'undefined') __host.dispose = () => { cancelAnimationFrame(raf); hint.remove(); renderer.dispose(); };
