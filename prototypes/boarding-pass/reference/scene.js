// Gambar referensi Tugas 12 (boarding pass 3D dengan fisika) untuk Codex. Bukan kode produksi.
// Adegan three.js biasa (renderer, cahaya, dan post sendiri) supaya Codex bisa melihat arah rupa: kartu nila bertepi
// emas dengan foil timbul, mata ayam kuningan, tali emas pilin dua yang melewati lubang, tergantung di blandar pendapa,
// lampion di sampingnya. Pose diatur langsung (tanpa simulasi): fisika yang sebenarnya pekerjaan Codex.
// Nama tamu TIDAK ditulis di kode: dibaca dari ?name= saat runtime (pratinjau: "Jize").
// Jalankan: node prototypes/boarding-pass/reference/render.cjs <folder-keluaran>
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const qs = new URLSearchParams(location.search);
const GUEST = qs.get('name') || 'Your Name';
const LANG = qs.get('lang') === 'id' ? 'id' : 'en';

// ======================= FON (sama dengan situs, di-host sendiri) =======================
const FS = '/node_modules/@fontsource-variable';
const face = (fam, file, desc) => new FontFace(fam, `url(${FS}/${file})`, desc).load().then((f) => document.fonts.add(f));
const fontsReady = Promise.all([
  face('Fraunces', 'fraunces/files/fraunces-latin-wght-normal.woff2', { weight: '100 900' }),
  face('Fraunces', 'fraunces/files/fraunces-latin-wght-italic.woff2', { weight: '100 900', style: 'italic' }),
  face('Manrope', 'manrope/files/manrope-latin-wght-normal.woff2', { weight: '200 800' }),
]);
const SERIF = 'Fraunces, Georgia, serif';
const SANS = 'Manrope, Helvetica, Arial, sans-serif';

// ======================= DIMENSI KARTU =======================
// Semua tata letak dalam mm dari kiri-atas kartu (74 × 150 mm, karton 1,2 mm). Dunia 3D dalam meter, Y ke atas.
const W = 74, H = 150, C = 13, RB = 6, RN = 2.2, YN = 135.5; // potongan sudut atas, sudut bawah, takik sobekan
const HX = 37, HY = 11.5, HR = 4.2; // lubang tali
const CT = 0.0012;
const TW = 1536, P = TW / W, TH = Math.round(H * P);
const toM = (x, y) => new THREE.Vector2((x - W / 2) / 1000, (H / 2 - y) / 1000);

function arc(pts, cx, cy, r, a0, a1, n = 18) {
  for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
}
/** Garis tepi kartu (mm, y ke bawah), menjorok `i` mm: sudut atas dipotong 45°, takik sobekan di kedua sisi, sudut bawah membulat. */
function outline(i = 0) {
  const k = 0.4142 * i, pts = [], R = RN + i, s = Math.sqrt(Math.max(R * R - i * i, 0));
  pts.push([C + k, i], [W - C - k, i], [W - i, C + k], [W - i, YN - s]);
  arc(pts, W, YN, R, Math.atan2(-s, -i), Math.atan2(s, -i) - 2 * Math.PI);
  pts.push([W - i, H - RB]);
  arc(pts, W - RB, H - RB, RB - i, 0, Math.PI / 2);
  pts.push([RB, H - i]);
  arc(pts, RB, H - RB, RB - i, Math.PI / 2, Math.PI);
  pts.push([i, YN + s]);
  arc(pts, 0, YN, R, Math.atan2(s, i), Math.atan2(-s, i));
  pts.push([i, C + k]);
  return pts;
}
const trace = (g, i) => { const p = outline(i); g.beginPath(); g.moveTo(p[0][0] * P, p[0][1] * P); for (const q of p.slice(1)) g.lineTo(q[0] * P, q[1] * P); g.closePath(); };

// ======================= CETAKAN MUKA KARTU =======================
// Tiga kanvas per muka: warna, kekasaran+logam (G = roughness, B = metalness), timbul (putih = foil terangkat).
const STY = {
  c: { foil: null, ink: '#efe6d4', dim: '#8d93b3', paper: null },
  r: { foil: 'rgb(0,70,255)', ink: 'rgb(0,150,0)', dim: 'rgb(0,190,0)', paper: 'rgb(0,200,0)' },
  b: { foil: '#ffffff', ink: '#4a4a4a', dim: '#202020', paper: '#000000' },
};
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mk = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; };

function foilFill(g, mode) {
  if (mode !== 'c') return STY[mode].foil;
  const gr = g.createLinearGradient(0, 0, TW, TH);
  gr.addColorStop(0, '#ecd096'); gr.addColorStop(0.35, '#b88f4c'); gr.addColorStop(0.62, '#e2c482'); gr.addColorStop(1, '#9c7638');
  return gr;
}
function paper(g, mode) {
  g.fillStyle = '#000'; g.fillRect(0, 0, TW, TH);
  trace(g, 0); g.save(); g.clip();
  if (mode === 'c') {
    const gr = g.createRadialGradient(TW * 0.5, 0, 0, TW * 0.5, TH * 0.35, TH * 0.95);
    gr.addColorStop(0, '#1d2552'); gr.addColorStop(0.55, '#121736'); gr.addColorStop(1, '#0a0d21');
    g.fillStyle = gr;
  } else g.fillStyle = STY[mode].paper;
  g.fillRect(0, 0, TW, TH);
  seed = 7;
  if (mode === 'c' || mode === 'b') {
    // serat kertas: goresan pendek acak + butir
    for (let n = 0; n < 26000; n++) {
      const x = rnd() * TW, y = rnd() * TH, a = rnd() * Math.PI, l = 2 + rnd() * 9, v = rnd();
      g.strokeStyle = mode === 'c' ? `rgba(${v > 0.5 ? '210,205,255' : '0,0,8'},${0.018 + v * 0.03})` : `rgba(255,255,255,${0.02 + v * 0.05})`;
      g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  }
}
function text(g, s, x, y, { font, size, sp = 0, align = 'left', fill }) {
  g.font = `${font.replace('$', `${(size * P).toFixed(1)}px`)}`;
  g.letterSpacing = `${(sp * P).toFixed(1)}px`;
  g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = fill;
  g.fillText(s, x * P, y * P);
  g.letterSpacing = '0px';
}
function kawung(g, fill, cell, lw) { // empat kelopak elips mengelilingi titik + titik tengah: kawung
  g.save(); g.strokeStyle = fill; g.fillStyle = fill; g.lineWidth = lw * P;
  const c = cell * P;
  for (let y = -c, row = 0; y < TH + c; y += c / 2, row++) for (let x = (row % 2) * c / 2 - c; x < TW + c; x += c) {
    for (let k = 0; k < 4; k++) {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4 + (k * Math.PI) / 2); g.translate(c * 0.2, 0);
      g.beginPath(); g.ellipse(0, 0, c * 0.17, c * 0.1, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(c * 0.03, 0, c * 0.026, c * 0.026, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(x, y, c * 0.03, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
function plane(g, x, y, s, fill) {
  g.save(); g.translate(x * P, y * P); g.rotate(Math.PI); g.scale(s * P, s * P); g.fillStyle = fill; g.beginPath();
  g.moveTo(0, -1); g.bezierCurveTo(0.12, -0.9, 0.12, -0.35, 0.12, -0.2); g.lineTo(0.95, 0.25); g.lineTo(0.95, 0.42); g.lineTo(0.12, 0.2);
  g.lineTo(0.1, 0.72); g.lineTo(0.36, 0.9); g.lineTo(0.36, 1.0); g.lineTo(0, 0.92); g.lineTo(-0.36, 1.0); g.lineTo(-0.36, 0.9); g.lineTo(-0.1, 0.72);
  g.lineTo(-0.12, 0.2); g.lineTo(-0.95, 0.42); g.lineTo(-0.95, 0.25); g.lineTo(-0.12, -0.2); g.bezierCurveTo(-0.12, -0.35, -0.12, -0.9, 0, -1); g.fill(); g.restore();
}
function frame(g, foil) {
  g.strokeStyle = foil; g.lineWidth = 0.42 * P; trace(g, 3.0); g.stroke();
  g.lineWidth = 0.16 * P; trace(g, 4.0); g.stroke();
  g.lineWidth = 0.3 * P; g.beginPath(); g.arc(HX * P, HY * P, (HR + 2.4) * P, 0, Math.PI * 2); g.stroke();
}
function perforation(g, fill) {
  g.fillStyle = fill;
  for (let x = 6; x <= W - 6; x += 1.6) { g.beginPath(); g.arc(x * P, YN * P, 0.32 * P, 0, Math.PI * 2); g.fill(); }
}
function fitSize(g, s, font, max, width) {
  let size = max;
  for (; size > 4; size -= 0.2) { g.font = font.replace('$', `${(size * P).toFixed(1)}px`); if (g.measureText(s).width <= width * P) break; }
  return size;
}

const TXT = {
  en: { kicker: 'BOARDING PASS', admit: 'ADMIT ONE', title: 'A Three-Day Lakon', passenger: 'PASSENGER', sub: 'Guest of honour · Belitung → Solo', date: 'DATE', seat: 'SEAT', gate: 'GATE', no: 'TICKET', seatV: 'With the host', noV: '1 of 1', hosted: 'HOSTED BY', host: 'your host', thanks: 'thank you for coming', back2: 'Solo · 7–11 April 2027' },
  id: { kicker: 'BOARDING PASS', admit: 'UNTUK SATU ORANG', title: 'Lakon Tiga Hari', passenger: 'PENUMPANG', sub: 'Tamu kehormatan · Belitung → Solo', date: 'TANGGAL', seat: 'KURSI', gate: 'GERBANG', no: 'TIKET', seatV: 'Bersama host', noV: '1 dari 1', hosted: 'TUAN RUMAH', host: 'host-mu', thanks: 'terima kasih sudah datang', back2: 'Solo · 7–11 April 2027' },
}[LANG];
const DATE = LANG === 'id' ? 'Rab, 7 Apr 2027' : 'Wed 07 Apr 2027';
const ROUTE = [
  ['TJQ', 'Tanjung Pandan', 'Belitung · H.A.S. Hanandjoeddin'],
  ['CGK', 'Jakarta', 'Soekarno–Hatta · transit'],
  ['SOC', 'Solo', 'Surakarta · Adi Soemarmo'],
];

function drawFront(g, mode) {
  const st = STY[mode], foil = foilFill(g, mode);
  paper(g, mode);
  if (mode === 'c') { g.globalAlpha = 0.07; kawung(g, '#c8a25a', 16, 0.18); g.globalAlpha = 1; }
  frame(g, foil);
  const L = 9, R = W - 9;
  text(g, TXT.kicker, L, 24, { font: `800 $ ${SANS}`, size: 2.25, sp: 0.55, fill: foil });
  text(g, TXT.admit, R, 24, { font: `800 $ ${SANS}`, size: 2.25, sp: 0.55, align: 'right', fill: foil });
  text(g, TXT.title, L, 33.2, { font: `italic 560 $ ${SERIF}`, size: 6.1, fill: foil });
  g.fillStyle = foil; g.fillRect(L * P, 36.6 * P, (R - L) * P, 0.24 * P);
  text(g, TXT.passenger, L, 43.5, { font: `800 $ ${SANS}`, size: 1.9, sp: 0.5, fill: st.dim });
  const nf = `italic 600 $ ${SERIF}`;
  text(g, GUEST, L - 0.4, 55.5, { font: nf, size: fitSize(g, GUEST, nf, 11.5, R - L), fill: st.ink });
  text(g, TXT.sub, L, 61, { font: `600 $ ${SANS}`, size: 2.05, fill: st.dim });
  // rute: benang bertitik dengan pesawat kecil di antara kota
  const ys = [74, 89, 104];
  g.fillStyle = foil;
  for (let y = ys[0]; y <= ys[2]; y += 1.25) { g.beginPath(); g.arc(12 * P, y * P, 0.22 * P, 0, Math.PI * 2); g.fill(); }
  plane(g, 12, (ys[0] + ys[1]) / 2, 1.7, foil); plane(g, 12, (ys[1] + ys[2]) / 2, 1.7, foil);
  ROUTE.forEach(([code, city, sub], n) => {
    const y = ys[n];
    g.strokeStyle = foil; g.lineWidth = 0.35 * P; g.fillStyle = mode === 'c' ? '#121736' : STY[mode].paper;
    g.beginPath(); g.arc(12 * P, (y - 2.6) * P, 1.15 * P, 0, Math.PI * 2); g.fill(); g.stroke();
    if (n === 2) { g.fillStyle = foil; g.beginPath(); g.arc(12 * P, (y - 2.6) * P, 0.6 * P, 0, Math.PI * 2); g.fill(); }
    text(g, code, 16.5, y, { font: `800 $ ${SANS}`, size: 7.4, sp: 0.2, fill: st.ink });
    text(g, city, R, y - 3.4, { font: `700 $ ${SANS}`, size: 2.3, align: 'right', fill: n === 2 ? foil : st.ink });
    text(g, sub, R, y - 0.4, { font: `600 $ ${SANS}`, size: 1.55, align: 'right', fill: st.dim });
  });
  g.fillStyle = foil; g.fillRect(L * P, 111 * P, (R - L) * P, 0.2 * P);
  const cell = (x, y, k, v, vf) => { text(g, k, x, y, { font: `800 $ ${SANS}`, size: 1.75, sp: 0.45, fill: st.dim }); text(g, v, x, y + 4.4, vf); };
  cell(L, 117, TXT.date, DATE, { font: `700 $ ${SANS}`, size: 2.7, fill: st.ink });
  cell(41, 117, TXT.seat, TXT.seatV, { font: `700 $ ${SANS}`, size: 2.7, fill: st.ink });
  cell(L, 126.2, TXT.gate, 'Kulonuwun', { font: `italic 600 $ ${SERIF}`, size: 3.6, fill: foil });
  cell(41, 126.2, TXT.no, TXT.noV, { font: `700 $ ${SANS}`, size: 2.7, fill: st.ink });
  perforation(g, mode === 'c' ? '#05060d' : mode === 'b' ? '#000' : STY.r.paper);
  // potongan bawah: barcode foil dan tuan rumah
  seed = 99; g.fillStyle = foil;
  for (let x = L; x < 44;) { const w = 0.25 + Math.floor(rnd() * 4) * 0.28; g.fillRect(x * P, 138.6 * P, w * P, 6.2 * P); x += w + 0.3 + rnd() * 0.5; }
  text(g, TXT.hosted, R, 140.4, { font: `800 $ ${SANS}`, size: 1.55, sp: 0.45, align: 'right', fill: st.dim });
  text(g, TXT.host, R, 144.6, { font: `italic 600 $ ${SERIF}`, size: 3.3, align: 'right', fill: foil });
  g.restore();
}

function drawBack(g, mode) {
  const st = STY[mode], foil = foilFill(g, mode);
  paper(g, mode);
  frame(g, foil);
  // ladang kawung foil di dalam bingkai, memudar di sekitar medali
  g.save(); trace(g, 5.2); g.clip();
  g.globalAlpha = mode === 'c' ? 0.55 : 0.9; kawung(g, foil, 10.5, 0.2); g.globalAlpha = 1;
  g.restore();
  const cx = W / 2, cy = 66;
  g.fillStyle = mode === 'c' ? '#11163a' : STY[mode].paper;
  g.beginPath(); g.arc(cx * P, cy * P, 21.5 * P, 0, Math.PI * 2); g.fill();
  g.strokeStyle = foil; g.lineWidth = 0.45 * P; g.beginPath(); g.arc(cx * P, cy * P, 19.6 * P, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 0.16 * P; g.beginPath(); g.arc(cx * P, cy * P, 18.6 * P, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 4; k++) { // empat ukel kecil di poros medali
    const a = (k * Math.PI) / 2 - Math.PI / 2;
    g.save(); g.translate((cx + Math.cos(a) * 19.6) * P, (cy + Math.sin(a) * 19.6) * P); g.rotate(a + Math.PI / 4);
    g.fillStyle = mode === 'c' ? '#11163a' : STY[mode].paper; g.fillRect(-1.5 * P, -1.5 * P, 3 * P, 3 * P);
    g.strokeStyle = foil; g.lineWidth = 0.3 * P; g.strokeRect(-1.1 * P, -1.1 * P, 2.2 * P, 2.2 * P); g.restore();
  }
  const ini = GUEST.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  text(g, ini, cx, cy + 8.2, { font: `italic 640 $ ${SERIF}`, size: ini.length > 1 ? 18 : 25, align: 'center', fill: foil });
  g.fillStyle = mode === 'c' ? '#11163a' : STY[mode].paper;
  g.fillRect(12 * P, 95 * P, 50 * P, 24 * P);
  text(g, 'Matur nuwun', cx, 104.5, { font: `italic 560 $ ${SERIF}`, size: 7.2, align: 'center', fill: foil });
  text(g, TXT.thanks.toUpperCase(), cx, 110.6, { font: `800 $ ${SANS}`, size: 1.7, sp: 0.5, align: 'center', fill: st.dim });
  text(g, TXT.back2, cx, 115.4, { font: `600 $ ${SANS}`, size: 2.0, align: 'center', fill: st.dim });
  perforation(g, mode === 'c' ? '#05060d' : mode === 'b' ? '#000' : STY.r.paper);
  g.restore();
}

// ======================= RENDERER, ADEGAN, POST =======================
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);
const aniso = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.01, 60);

// langit malam "gerbang": nila pekat dengan bintang
const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color('#02030a') }, mid: { value: new THREE.Color('#0b0f2c') }, low: { value: new THREE.Color('#140f1e') } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(mid, top, smoothstep(0.05, 0.7, h)); c = mix(c, low, smoothstep(0.05, -0.4, h)); gl_FragColor = vec4(c, 1.); }',
}));
scene.add(sky);
{
  seed = 3; const n = 1800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, y = Math.abs(u) * 0.9 + 0.05, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 35, y * 35, Math.sin(a) * r * 35], k * 3);
    const b = 0.12 + rnd() ** 3 * 0.8, w = rnd(); col.set([b * (0.85 + w * 0.15), b * 0.9, b * (1.05 - w * 0.2)], k * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, depthWrite: false })));
}

// lingkungan untuk pantulan foil: langit nila, lampion hangat di kanan, nyala blencong kecil di kiri atas
function makeEnv() {
  const e = new THREE.Scene();
  e.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 c = mix(vec3(0.03,0.035,0.08), vec3(0.01,0.012,0.03), smoothstep(-0.2,0.8,vP.y)); c += vec3(0.08,0.04,0.02) * smoothstep(0.2,-0.6,vP.y); gl_FragColor = vec4(c,1.); }',
  })));
  const glow = (color, k, pos, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) })); m.position.copy(pos); e.add(m); };
  glow('#ff9d52', 9, new THREE.Vector3(5, -1, -2), 1.4); // lampion
  glow('#ffd59a', 30, new THREE.Vector3(-4, 6, 3), 0.45); // blencong
  glow('#7f93ff', 1.2, new THREE.Vector3(-6, 2, 5), 2.5); // langit dingin
  glow('#ffe7c2', 3, new THREE.Vector3(0, 3, 7), 1.6); // pantulan dari arah kamera
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(e, 0.02).texture; pm.dispose(); return t;
}
scene.environment = makeEnv();
scene.environmentIntensity = 1;

const lanternPos = new THREE.Vector3(0.3, 0.05, -0.65);
const lampLight = new THREE.PointLight('#ffa257', 0.55, 0, 2); lampLight.position.copy(lanternPos); scene.add(lampLight);
const moon = new THREE.DirectionalLight('#8796ff', 0.5); moon.position.set(-2, 3, 2.5); scene.add(moon);
const rim = new THREE.DirectionalLight('#ffcf8f', 1.6); rim.position.set(-1.2, 2.2, -2.5); scene.add(rim);
const fill = new THREE.DirectionalLight('#ffe3bf', 0.7); fill.position.set(0.4, 0.3, 3); scene.add(fill);
scene.add(new THREE.HemisphereLight('#26306a', '#1a0f08', 0.35));

// ======================= KARTU =======================
const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const shapeM = (() => {
  const p = outline(0).map(([x, y]) => toM(x, y)), s = new THREE.Shape(p);
  const h = new THREE.Path(); const c = toM(HX, HY); h.absarc(c.x, c.y, HR / 1000, 0, Math.PI * 2, true); s.holes.push(h);
  return s;
})();
function faceGeo(back) {
  const g = new THREE.ShapeGeometry(shapeM, 24), uv = g.attributes.uv, pos = g.attributes.position;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / (W / 1000) + 0.5, pos.getY(k) / (H / 1000) + 0.5);
  if (back) g.rotateY(Math.PI);
  g.translate(0, 0, back ? -CT / 2 : CT / 2);
  return g;
}
const faces = { front: {}, back: {} };
function paintFaces() {
  for (const side of ['front', 'back']) for (const mode of ['c', 'r', 'b']) {
    const c = faces[side][mode] || (faces[side][mode] = mk());
    (side === 'front' ? drawFront : drawBack)(c.getContext('2d'), mode);
  }
}
const paperMat = (side) => new THREE.MeshPhysicalMaterial({
  map: tex(faces[side].c, true), roughnessMap: tex(faces[side].r), metalnessMap: tex(faces[side].r), roughness: 1, metalness: 1,
  bumpMap: tex(faces[side].b), bumpScale: 2.2, sheen: 0.55, sheenColor: new THREE.Color('#4b55a0'), sheenRoughness: 0.7,
  envMapIntensity: 1.15,
});
const gold = new THREE.MeshStandardMaterial({ color: '#d1a75e', metalness: 1, roughness: 0.3, envMapIntensity: 1.4 });
const brass = new THREE.MeshStandardMaterial({ color: '#c39a5c', metalness: 1, roughness: 0.24, envMapIntensity: 1.6 });
const cordMat = new THREE.MeshPhysicalMaterial({ color: '#dcb46a', metalness: 0.7, roughness: 0.36, sheen: 1, sheenColor: new THREE.Color('#ffd98f'), sheenRoughness: 0.4, envMapIntensity: 1.3 });

function buildCard() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(faceGeo(false), paperMat('front')));
  g.add(new THREE.Mesh(faceGeo(true), paperMat('back')));
  const side = new THREE.ExtrudeGeometry(shapeM, { depth: CT, bevelEnabled: false, curveSegments: 24 });
  side.translate(0, 0, -CT / 2);
  g.add(new THREE.Mesh(side, [new THREE.MeshBasicMaterial({ visible: false }), gold]));
  const hc = toM(HX, HY);
  for (const z of [1, -1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(HR / 1000 + 0.0011, 0.00105, 14, 48), brass);
    ring.scale.z = 0.55; ring.position.set(hc.x, hc.y, z * (CT / 2 + 0.0004)); g.add(ring);
  }
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(HR / 1000 + 0.0002, HR / 1000 + 0.0002, CT + 0.0012, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#a37f48', metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
  sleeve.rotation.x = Math.PI / 2; sleeve.position.set(hc.x, hc.y, 0); g.add(sleeve);
  return g;
}

// tali emas pilin dua (sutra berlapis emas) di sepanjang lengkung
function cord(points, { radius = 0.00072, closed = false, twist = 260, seg = 160 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const len = curve.getLength(), n = Math.max(24, Math.round(seg * Math.min(len / 0.1, 6)));
  const fr = curve.computeFrenetFrames(n, closed), g = new THREE.Group();
  for (let ply = 0; ply < 2; ply++) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, p = curve.getPointAt(t), a = t * len * twist + ply * Math.PI, nn = fr.normals[Math.min(k, n)], bb = fr.binormals[Math.min(k, n)];
      pts.push(p.clone().addScaledVector(nn, Math.cos(a) * radius * 0.5).addScaledVector(bb, Math.sin(a) * radius * 0.5));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), n * 2, radius * 0.56, 10, closed), cordMat));
  }
  return g;
}

// rangkaian gantung: kait (asal) → tali → simpul berlilit → jerat melewati lubang → kartu
const LB = 0.016; // dari simpul ke dasar jerat
function buildRig() {
  const rig = new THREE.Group(), spin = new THREE.Group(), tilt = new THREE.Group(), card = buildCard();
  rig.add(spin); spin.add(tilt); tilt.add(card);
  const loop = cord([
    new THREE.Vector3(0, 0.0005, 0.0006), new THREE.Vector3(0, -0.005, 0.0026), new THREE.Vector3(0, -0.0115, 0.003),
    new THREE.Vector3(0, -LB + 0.0013, 0.0019), new THREE.Vector3(0, -LB, 0), new THREE.Vector3(0, -LB + 0.0013, -0.0019),
    new THREE.Vector3(0, -0.0115, -0.003), new THREE.Vector3(0, -0.005, -0.0026), new THREE.Vector3(0, 0.0005, -0.0006),
  ], { closed: true, seg: 120 });
  spin.add(loop);
  for (let k = 0; k < 6; k++) { // lilitan pengikat di atas jerat
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.0013, 0.00042, 8, 24), cordMat);
    t.rotation.x = Math.PI / 2; t.position.y = 0.0008 + k * 0.00078; spin.add(t);
  }
  const hookStem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.02, 12), brass); hookStem.position.y = 0.014;
  const hookRing = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0011, 12, 32), brass); hookRing.position.y = 0.0;
  rig.add(hookStem, hookRing);
  tilt.position.y = -LB;
  const hole = toM(HX, HY);
  card.position.set(-hole.x, -(hole.y + HR / 1000 - 0.0007), 0);
  let upper = null;
  return {
    rig, spin, tilt, card,
    pose({ L = 0.16, theta = 0, roll = 0, psi = 0, phi = 0, chi = 0, bend = 0, bendZ = 0 } = {}) {
      spin.position.set(0, -L, 0); spin.rotation.set(0, psi, 0);
      tilt.rotation.set(chi, 0, phi);
      rig.rotation.set(roll, 0, theta);
      if (upper) { rig.remove(upper); upper.traverse((o) => o.geometry?.dispose()); }
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8, s = Math.sin(Math.PI * t); pts.push(new THREE.Vector3(bend * s, -0.004 - (L - 0.0035) * t, bendZ * s)); }
      upper = cord(pts, { seg: 220 }); rig.add(upper);
    },
  };
}

// ======================= BLANDAR, LAMPION, LATAR PENDAPA =======================
function beamTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = 1024; b.height = 512; const h = b.getContext('2d');
  g.fillStyle = '#2b170d'; g.fillRect(0, 0, 1024, 512); h.fillStyle = '#5a5a5a'; h.fillRect(0, 0, 1024, 512);
  seed = 21;
  for (let n = 0; n < 900; n++) { const y = rnd() * 512, v = rnd(); g.strokeStyle = `rgba(${v > 0.5 ? '90,52,28' : '12,6,3'},${0.08 + v * 0.12})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(340, y + rnd() * 10 - 5, 680, y + rnd() * 10 - 5, 1024, y + rnd() * 6 - 3); g.stroke(); }
  // pita ukiran lung-lungan berprada emas di tengah muka balok
  const band = (ctx, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(1024, 150); ctx.moveTo(0, 362); ctx.lineTo(1024, 362); ctx.stroke();
    for (let x = 0; x < 1024; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, 256); ctx.bezierCurveTo(x + 64, 170, x + 128, 170, x + 128, 256); ctx.bezierCurveTo(x + 128, 342, x + 192, 342, x + 256, 256); ctx.stroke();
      for (const [cx, cy, d] of [[x + 64, 214, 1], [x + 192, 298, -1]]) { ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 1.6 * d, d < 0); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 9 * d, cy, 10, 0, Math.PI * 2); ctx.stroke(); }
    }
  };
  band(g, '#b8904f', 9); band(h, '#ffffff', 16);
  const t1 = tex(c, true), t2 = tex(b); for (const t of [t1, t2]) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); }
  return [t1, t2];
}
const [bt, bb] = beamTex();
const beam = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.13), new THREE.MeshStandardMaterial({ map: bt, bumpMap: bb, bumpScale: 3, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.8 }));
scene.add(beam);

function buildLantern() {
  const g = new THREE.Group(), prof = [];
  for (let k = 0; k <= 24; k++) { const t = k / 24; prof.push(new THREE.Vector2(0.012 + 0.074 * Math.pow(Math.sin(Math.PI * t), 0.75), -0.1 + 0.2 * t)); }
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#e8541a'); gr.addColorStop(0.5, '#ff9a45'); gr.addColorStop(1, '#d9481a');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 256); x.strokeStyle = 'rgba(70,20,5,0.55)'; x.lineWidth = 3;
  for (let i = 0; i < 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: '#2a0f05', emissive: '#ffffff', emissiveMap: tex(c, true), emissiveIntensity: 0.95, roughness: 0.9 }));
  g.add(shell);
  for (const y of [0.104, -0.104]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), new THREE.MeshStandardMaterial({ color: '#1c0d06', roughness: 0.5 })); cap.position.y = y; g.add(cap); const rimm = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0018, 8, 32), gold); rimm.rotation.x = Math.PI / 2; rimm.position.y = y; g.add(rimm); }
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.009, 0.07, 12), new THREE.MeshStandardMaterial({ color: '#8c1a12', roughness: 0.8 })); tassel.position.y = -0.145; g.add(tassel);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.5, 6), cordMat); string.position.y = 0.36; g.add(string);
  return g;
}
const lantern = buildLantern(); lantern.position.copy(lanternPos); scene.add(lantern);

// pendapa jauh di belakang: soko guru berlak merah berpita emas, gong ageng dengan kilau, atap tumpang sari
{
  const lac = new THREE.MeshStandardMaterial({ color: '#3d140c', roughness: 0.45, metalness: 0.1, envMapIntensity: 0.7 });
  for (const [x, z] of [[-1.25, -2.6], [1.35, -2.9], [-2.7, -3.6], [2.8, -3.9]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 6, 24), lac); p.position.set(x, 0.5, z); scene.add(p);
    for (const y of [-0.6, 0.9, 1.25]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.05, 24), gold); b.position.set(x, y, z); scene.add(b); }
  }
  const bronze = new THREE.MeshStandardMaterial({ color: '#4f3418', metalness: 1, roughness: 0.42, envMapIntensity: 0.55 });
  const gong = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 64), bronze); disc.rotation.x = Math.PI / 2; gong.add(disc);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bronze); boss.rotation.x = Math.PI / 2; boss.position.z = 0.04; gong.add(boss);
  gong.position.set(-2.1, 0.55, -5.6); gong.rotation.y = 0.3; scene.add(gong);
  const warm = new THREE.PointLight('#ffb36b', 1.2, 0, 2); warm.position.set(-0.7, 1.3, -3.6); scene.add(warm);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ color: '#160b07', roughness: 0.8 })); roof.rotation.x = Math.PI / 2; roof.position.set(0, 2.1, -3); scene.add(roof);
}

// ======================= POST =======================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 0.7, aperture: 0.004, maxblur: 0.012 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uSeed: { value: 0.37 }, uVig: { value: 0.55 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed, uVig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uSeed) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1. - uVig * smoothstep(0.25, 0.85, length(d * vec2(1.1, 1.))); c.rgb *= v; c.rgb += (h(vUv * 1024.) - 0.5) * 0.028; gl_FragColor = c; }`,
});
composer.addPass(grain);

// ======================= PRESET =======================
await fontsReady;
paintFaces();
const main = buildRig(); scene.add(main.rig);
const HOOK = new THREE.Vector3(0, 0.255, 0);
main.rig.position.copy(HOOK);
beam.position.set(0, HOOK.y + 0.078, 0);

const ghosts = [];
function clearGhosts() { for (const g of ghosts.splice(0)) { scene.remove(g); g.traverse((o) => o.geometry?.dispose()); } }
const outlineGeo = (() => { const p = outline(0).map(([x, y]) => { const v = toM(x, y); return new THREE.Vector3(v.x, v.y, 0); }); p.push(p[0].clone()); return new THREE.BufferGeometry().setFromPoints(p); })();
function ghost(pose, alpha) { // bayangan bawang: garis tepi kartu dan tali pada pose lain
  const r = buildRig(); r.pose(pose); r.rig.position.copy(HOOK);
  r.card.clear();
  const line = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: '#f0cf8a', transparent: true, opacity: alpha }));
  r.card.add(line);
  r.rig.traverse((o) => { if (o.isMesh && o.material === cordMat) { o.material = new THREE.MeshBasicMaterial({ color: '#d2ab62', transparent: true, opacity: alpha * 0.8 }); } });
  scene.add(r.rig); ghosts.push(r.rig);
}

const CARD_C = () => main.card.getWorldPosition(new THREE.Vector3());
const PRESETS = {
  hero: () => { main.pose({ theta: 0.02, psi: -0.22, phi: 0.015, bend: 0.0015 }); return { pos: [0.06, 0.03, 0.5], look: [0.004, 0.035, 0], fov: 27, focus: 'card', aperture: 0.007, maxblur: 0.02 }; },
  macro: () => { main.pose({ theta: 0.0, psi: -0.5, phi: 0.0 }); return { pos: [0.06, 0.135, 0.13], look: [0.0, 0.068, 0], fov: 30, focus: 0.142, aperture: 0.03, maxblur: 0.02 }; },
  back: () => { main.pose({ theta: -0.03, psi: Math.PI + 0.28, phi: -0.02, bend: -0.002 }); return { pos: [-0.06, 0.03, 0.5], look: [0.0, 0.035, 0], fov: 27, focus: 'card', aperture: 0.007, maxblur: 0.02 }; },
  pull: () => { main.pose({ theta: -0.42, psi: -0.55, phi: 0.38, chi: 0.1 }); return { pos: [0.02, 0.06, 0.7], look: [-0.06, 0.05, 0], fov: 30, focus: 'card', aperture: 0.006, maxblur: 0.02, ann: 'pull' }; },
  edge: () => { main.pose({ theta: 0.12, psi: 1.25, phi: -0.05, bend: 0.004 }); return { pos: [0.06, 0.035, 0.52], look: [0.015, 0.04, 0], fov: 27, focus: 'card', aperture: 0.007, maxblur: 0.02 }; },
  side: () => { main.pose({ theta: 0.0, psi: -0.1, phi: 0 }); return { pos: [0.42, 0.11, 0.5], look: [0.0, 0.05, 0], fov: 27, focus: 'card', aperture: 0.0035 }; },
  descend: () => { main.pose({ L: 0.16, theta: 0.03, psi: 0.5 }); main.rig.position.set(0, HOOK.y + 0.0, -0.25); return { pos: [0.02, -0.12, 0.78], look: [0, 0.22, -0.25], fov: 30, focus: 'card', aperture: 0.0025 }; },
  phone: () => { main.pose({ theta: 0.01, psi: -0.16, phi: 0.01, bend: 0.001 }); return { pos: [0.025, -0.005, 0.48], look: [0.0, -0.008, 0], fov: 36, focus: 'card', aperture: 0.006, maxblur: 0.02, ann: 'phone' }; },
  motion: () => {
    main.pose({ theta: -0.5, psi: -0.35, phi: 0.42, chi: 0.08 });
    const swing = [[0.34, 0.7, 0.9], [0.21, 1.6, 0.7], [-0.12, 2.8, 0.55], [0.06, 3.9, 0.42], [-0.025, 4.8, 0.32]];
    swing.forEach(([theta, psi, a]) => ghost({ theta, psi, phi: -theta * 0.25, bend: -theta * 0.01 }, a));
    return { pos: [0.0, 0.06, 0.7], look: [0.0, 0.07, 0], fov: 32, focus: 'card', aperture: 0.0015, dim: true, ann: 'motion' };
  },
};

function reset() { clearGhosts(); main.rig.position.copy(HOOK); document.getElementById('ann').innerHTML = ''; }
async function shot(name) {
  reset();
  const s = PRESETS[name]();
  camera.fov = s.fov; camera.aspect = innerWidth / innerHeight; camera.position.set(...s.pos); camera.lookAt(...s.look); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  const focus = s.focus === 'card' ? camera.position.distanceTo(CARD_C()) : s.focus;
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = s.aperture; bokeh.uniforms.maxblur.value = s.maxblur ?? 0.012;
  sky.visible = true; lantern.visible = !s.dim; lampLight.intensity = s.dim ? 0.3 : 0.55;
  for (let k = 0; k < 3; k++) composer.render();
  if (s.ann === 'motion') annotateMotion();
  if (s.ann === 'pull') annotatePull();
  if (s.ann === 'phone') annotatePhone();
  return true;
}

// ======================= ANOTASI STUDI GERAK =======================
const proj = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight]; };
function annotateMotion() {
  const svg = document.getElementById('ann');
  const local = (pt) => main.card.localToWorld(new THREE.Vector3(pt.x, pt.y, CT));
  const grab = proj(local(toM(62, 138)));
  const hook = proj(HOOK.clone());
  const [gx, gy] = grab;
  const el = [];
  el.push(ARROW);
  // titik tangkap + arah seret
  el.push(`<circle cx="${gx}" cy="${gy}" r="16" fill="none" stroke="#f2d79b" stroke-width="2"/><circle cx="${gx}" cy="${gy}" r="4" fill="#f2d79b"/>`);
  el.push(`<path d="M${gx - 20},${gy + 14} L${gx - 150},${gy + 70}" stroke="#f2d79b" stroke-width="2" fill="none" marker-end="url(#a)"/>`);
  el.push(`<text x="${gx - 300}" y="${gy + 96}" class="k">GRAB + DRAG</text><text x="${gx - 300}" y="${gy + 116}">raycast hit on card or thread = physics;</text><text x="${gx - 300}" y="${gy + 134}">anywhere else = film swipe</text>`);
  // ayunan sesudah dilepas
  const r = 0.345, pts = [];
  for (let a = -0.55; a <= 0.38; a += 0.02) pts.push(proj(new THREE.Vector3(HOOK.x + Math.sin(a) * r, HOOK.y - Math.cos(a) * r, 0)));
  el.push(`<path d="M${pts.map((p) => p.join(',')).join(' L')}" stroke="#f2d79b" stroke-width="1.6" stroke-dasharray="6 6" fill="none" marker-end="url(#a)"/>`);
  const e = pts[pts.length - 1];
  el.push(`<text x="${e[0] + 18}" y="${e[1] - 8}" class="k">RELEASE → SWING</text><text x="${e[0] + 18}" y="${e[1] + 12}">energy damps naturally,</text><text x="${e[0] + 18}" y="${e[1] + 30}">at rest within a few seconds</text>`);
  // putaran pada benang
  const k = proj(new THREE.Vector3(HOOK.x, HOOK.y - 0.075, 0));
  el.push(`<ellipse cx="${k[0]}" cy="${k[1]}" rx="34" ry="9" fill="none" stroke="#f2d79b" stroke-width="1.6" stroke-dasharray="4 4"/><path d="M${k[0] + 30},${k[1] + 5} L${k[0] + 18},${k[1] + 9}" stroke="#f2d79b" stroke-width="1.6" marker-end="url(#a)"/>`);
  el.push(`<text x="${k[0] + 66}" y="${k[1] - 4}" class="k">FLICK → SPIN ON THREAD</text><text x="${k[0] + 66}" y="${k[1] + 16}">tap / click / Enter = flip to back</text>`);
  // gravitasi miring mengikuti HP, angin
  const gx0 = innerWidth * 0.1, gy0 = innerHeight * 0.18;
  el.push(`<line x1="${gx0}" y1="${gy0}" x2="${gx0}" y2="${gy0 + 90}" stroke="#8d93b3" stroke-width="1.5" stroke-dasharray="3 5"/>`);
  el.push(`<line x1="${gx0}" y1="${gy0}" x2="${gx0 + 22}" y2="${gy0 + 88}" stroke="#f2d79b" stroke-width="2" marker-end="url(#a)"/>`);
  el.push(`<text x="${gx0 - 6}" y="${gy0 - 16}" class="k">g TILTS WITH THE PHONE</text><text x="${gx0 + 34}" y="${gy0 + 64}">a few degrees,</text><text x="${gx0 + 34}" y="${gy0 + 82}">camera-relative</text>`);
  const wy = innerHeight * 0.14, wx = innerWidth * 0.72;
  for (let n = 0; n < 3; n++) el.push(`<path d="M${wx},${wy + n * 16} q 30,-10 60,0 t 60,0 t 60,0" stroke="#8d93b3" stroke-width="1.4" fill="none" ${n === 1 ? 'marker-end="url(#a)"' : ''}/>`);
  el.push(`<text x="${wx}" y="${wy + 60}" class="k">BREEZE</text><text x="${wx}" y="${wy + 80}">soft, occasional; fast cursor near the card = small gust</text>`);
  el.push(`<text x="${hook[0] + 20}" y="${hook[1] + 4}" class="k">FIXED PIVOT</text>`);
  svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  svg.innerHTML = el.join('');
}

const ARROW = '<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f2d79b"/></marker></defs>';
function annotatePull() { // titik tangkap di sudut kartu, arah tarikan
  const svg = document.getElementById('ann');
  const t = toM(64, 140), [gx, gy] = proj(main.card.localToWorld(new THREE.Vector3(t.x, t.y, CT)));
  svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  svg.innerHTML = `${ARROW}<circle cx="${gx}" cy="${gy}" r="14" fill="none" stroke="#f2d79b" stroke-width="2"/><circle cx="${gx}" cy="${gy}" r="3.5" fill="#f2d79b"/>
    <path d="M${gx + 18},${gy + 8} L${gx + 110},${gy + 40}" stroke="#f2d79b" stroke-width="2" fill="none" marker-start="url(#a)"/>`;
}
function annotatePhone() { // zona Clawd dan UI film: tiket tidak boleh tertutup
  const svg = document.getElementById('ann'), w = innerWidth, h = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<rect x="14" y="${h - 190}" width="128" height="150" rx="14" fill="none" stroke="#e8875a" stroke-width="1.4" stroke-dasharray="5 5"/>
    <text x="24" y="${h - 168}" class="k" style="fill:#e8875a">CLAWD</text><text x="24" y="${h - 150}" style="font-size:10px">mascot guide;</text><text x="24" y="${h - 136}" style="font-size:10px">never covers</text><text x="24" y="${h - 122}" style="font-size:10px">the ticket</text>
    <rect x="12" y="14" width="${w - 24}" height="40" rx="12" fill="none" stroke="#8d93b3" stroke-width="1.2" stroke-dasharray="4 5"/>
    <text x="24" y="39" class="k" style="fill:#8d93b3">FILM UI · SOUND · LANGUAGE</text>`;
}

// tekstur datar muka depan/belakang untuk lembar spesifikasi
function faceImages() { return { front: faces.front.c.toDataURL('image/png'), back: faces.back.c.toDataURL('image/png') }; }

window.__shot = shot;
window.__faces = faceImages;
window.__ready = true;
