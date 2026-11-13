// Pelukis gunungan untuk panggung 3D (kode browser; dijalankan oleh scripts/assets/bake-gunungan.cjs).
// Asalnya bagian "1. GAMBAR GUNUNGAN" di prototypes/gunungan/scene.js (rupa "Murka", disetujui host 8 Nov 2026),
// disalin ke sini supaya gambar produksi bisa berkembang tanpa mengubah prototipe acuan.
// Rancangan sekarang (arahan host 13 Nov 2026, dengan foto kayon gapuran gaya Surakarta sebagai acuan: "jangan
// mirip 100%, cukup jadi acuan"): siluet berbahu dengan palemahan merah, bidang sungging merah tua penuh
// lung-lungan prada (lekuknya ditatah tembus), pohon hayat dililit seekor naga, banteng dan macan, gapura
// dengan pintu hijau dan undakan, sepasang lar (sayap), dan dua raksasa penjaga bertameng.
// - rupa "agung": atap tumpang, makara biru mengapit atap, dan kala kecil (banaspati) di puncak gapura;
// - rupa "murka": wajah kala/barong besar yang disetujui 8 Nov tetap ada (host: "untuk mode murka tetap harus
//   ada muka barong/wayangan nya"), menggantikan atap gapura, dengan surai api, tanduk, dan tangan bercakar.
// Empat kanvas dilukis sekaligus: alpha (lubang tatahan), warna (sungging), logam (prada), dan emisi (yang menyala).
/* eslint-disable -- kode gambar padat hasil salinan prototipe; dipakai hanya saat memanggang tekstur */
function paintGunungan(THREE, variant) {
const AGUNG = variant === 'agung';
const W = 1400, H = 2000, CX = 700;
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const cA = mk(), cC = mk(), cM = mk(), cE = mk();      // alpha (lubang), warna (sungging), metal/rough, emisi (bagian menyala)
{ const e = cE.getContext('2d', { willReadFrequently: true }); e.fillStyle = '#000'; e.fillRect(0, 0, W, H); }
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true }); // raster CPU: jauh lebih cepat untuk ribuan path ber-clip
const ctxs = [[ctx2d(cA), 'a'], [ctx2d(cC), 'c'], [ctx2d(cM), 'm'], [ctx2d(cE), 'e']];
// warna boleh berupa gradasi: { lin:[x0,y0,x1,y1] | rad:[x0,y0,r0,x1,y1,r1], stops:[[o,c],...] }
const sty = (g, mode, color, metal, hole, glow) => {
  if (mode === 'a') return hole ? '#000' : '#fff';
  if (mode === 'e') return hole || !glow ? '#000' : glow;
  if (mode === 'c') {
    if (hole) return '#0c0503';
    if (color && typeof color === 'object') { const gr = color.lin ? g.createLinearGradient(...color.lin) : g.createRadialGradient(...color.rad); color.stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
    return color;
  }
  return metal ? 'rgb(0,80,255)' : 'rgb(0,170,0)';     // G = roughness, B = metalness
};
const layer = (fn) => ctxs.forEach(([g, mode]) => { g.save(); fn(g, (col, metal, hole, glow) => sty(g, mode, col, metal, hole, glow), mode); g.restore(); });
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const P = () => new Path2D();
const bez = (a, b, c, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };

const GOLD = '#c9a052', GOLD_D = '#7a5a24', GOLD_L = '#f1dc9a', INK = '#140804', RED = '#8f2418', RED_B = '#c8321e', RED_D = '#4a0f0a', IVORY = '#eadcbc', LEATHER = '#c4a273';
const GREEN = '#2f9a4e', GREEN_D = '#0f4a26', BLUE = '#2a62b8', BLUE_D = '#143a7c', BLUE_L = '#a6d8ee', WHITE = '#f6f1e2', SOOT = '#261c1a';
const EYE_GLOW = '#ff3a10';
const SKIN = (x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, '#c9432c'], [1, '#5c140c']] });
const BONE = (x0, y0, x1, y1) => ({ lin: [x0, y0, x1, y1], stops: [[0, '#fff6e0'], [1, '#c4ad80']] });
const LEAF_G = [[0, '#0b1912'], [1, '#3a6a48']], LEAF_R = [[0, '#360806'], [1, '#c0361d']];

// isi + garis tatah tinta
const fs = (g, s, p, col, metal, lw = 5, glow) => { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = s(INK, false); g.stroke(p); g.fillStyle = s(col, metal, false, glow); g.fill(p); };
const ukel = (g, s, x, y, r0, dir, lw) => {
  const p = P(); for (let k = 0; k <= 36; k++) { const t = k / 36, a = dir * t * Math.PI * 2.2, r = r0 * (1 - t * 0.8); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? p.lineTo(px, py) : p.moveTo(px, py); }
  g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = lw + 5; g.stroke(p); g.strokeStyle = s(GOLD, true); g.lineWidth = lw; g.stroke(p);
};

// Siluet (acuan kayon gapuran): pucuk lancip, bahu melekuk (lengkeh), badan paling lebar di tengah, menyempit ke
// palemahan (pita dasar merah) yang sudutnya menjungkit; garis dasar datar + tangkai
const FLOOR_TOP = 1622, PALE_TOP = 1716, BASE = 1815;
const sil = new THREE.Shape();
sil.moveTo(700, 30);
sil.bezierCurveTo(742, 118, 826, 248, 880, 334);
sil.bezierCurveTo(934, 420, 1012, 520, 1078, 640);
sil.bezierCurveTo(1112, 702, 1236, 770, 1292, 906);
sil.bezierCurveTo(1346, 1036, 1338, 1236, 1276, 1424);
sil.bezierCurveTo(1242, 1528, 1190, 1632, 1162, PALE_TOP);
sil.bezierCurveTo(1190, 1712, 1222, 1700, 1240, 1672);
sil.bezierCurveTo(1246, 1716, 1226, 1768, 1176, 1796);
sil.bezierCurveTo(1150, 1810, 1120, BASE, 1090, BASE);
sil.lineTo(770, BASE); sil.lineTo(748, 1990); sil.lineTo(652, 1990); sil.lineTo(630, BASE);
sil.lineTo(310, BASE);
sil.bezierCurveTo(280, BASE, 250, 1810, 224, 1796);
sil.bezierCurveTo(174, 1768, 154, 1716, 160, 1672);
sil.bezierCurveTo(178, 1700, 210, 1712, 238, PALE_TOP);
sil.bezierCurveTo(210, 1632, 158, 1528, 124, 1424);
sil.bezierCurveTo(62, 1236, 54, 1036, 108, 906);
sil.bezierCurveTo(164, 770, 288, 702, 322, 640);
sil.bezierCurveTo(388, 520, 466, 420, 520, 334);
sil.bezierCurveTo(574, 248, 658, 118, 700, 30);
const silPts = sil.getSpacedPoints(900);
const toPath2D = (pts) => { const p = new Path2D(); pts.forEach((v, i) => i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)); p.closePath(); return p; };
const SIL = toPath2D(silPts);
const inset = (d) => silPts.map((p, i) => {
  const a = silPts[(i + silPts.length - 1) % silPts.length], b = silPts[(i + 1) % silPts.length];
  let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }
  return new THREE.Vector2(p.x + nx * d, p.y + ny * d);
});
// setengah lebar siluet per tinggi (per 10 px)
const HALF = new Float32Array(H / 10 + 1);
silPts.forEach((p) => { if (p.y > PALE_TOP) return; const k = Math.round(p.y / 10); HALF[k] = Math.max(HALF[k], Math.abs(p.x - CX)); });
for (let k = 1; k < HALF.length; k++) if (!HALF[k]) HALF[k] = HALF[k - 1];
const halfAt = (y) => HALF[Math.max(0, Math.min(HALF.length - 1, Math.round(y / 10)))];
const outerEdge = toPath2D(inset(6)), innerEdge = toPath2D(inset(46)), midEdge = toPath2D(inset(36)), FIELD_EDGE = toPath2D(inset(44));
// bidang gambar: di dalam bingkai, di atas lantai gapura
const FIELD = (g) => { g.clip(SIL); g.clip(FIELD_EDGE); g.beginPath(); g.rect(0, 130, W, FLOOR_TOP - 130); g.clip(); };

// 1a. dasar kulit
layer((g, s) => { g.fillStyle = s(LEATHER, false); g.fill(SIL); });
// 1b. bidang dalam: sungging merah tua (bukan renda tembus); bingkai merah
layer((g, s) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, FLOOR_TOP); g.clip();
  g.fillStyle = s({ lin: [0, 100, 0, FLOOR_TOP], stops: AGUNG ? [[0, '#3c0e0a'], [0.5, '#561810'], [1, '#33100b']] : [[0, '#2a0605'], [0.5, '#470c08'], [1, '#1f0403']] }, false); g.fillRect(0, 0, W, FLOOR_TOP);
  g.lineJoin = 'round'; g.strokeStyle = s({ lin: [0, 0, 0, FLOOR_TOP], stops: AGUNG ? [[0, '#7a1a10'], [0.5, '#a52a18'], [1, '#6a150d']] : [[0, '#4a0c08'], [0.55, '#8a2215'], [1, '#330805']] }, false); g.lineWidth = 92; g.stroke(SIL);
});
layer((g, s) => {
  g.clip(SIL);
  g.lineJoin = 'round'; g.strokeStyle = s(GOLD, true); g.lineWidth = 16; g.stroke(SIL);   // tepi luar prada, utuh sampai sudut palemahan
  g.beginPath(); g.rect(0, 150, W, FLOOR_TOP - 150); g.clip();
  g.lineWidth = 9; g.stroke(innerEdge); g.lineWidth = 3; g.stroke(midEdge);
});
// lubang bubukan + mas-masan sepanjang bingkai
const ringPts = inset(23);
layer((g, s) => {
  for (let i = 0; i < ringPts.length; i += 6) { const p = ringPts[i]; if (p.y > FLOOR_TOP - 14 || p.y < 78) continue; g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(p.x, p.y, 7.5, 0, Math.PI * 2); g.fill(); }
  for (let i = 3; i < ringPts.length; i += 6) { const p = ringPts[i]; if (p.y > FLOOR_TOP - 14 || p.y < 110) continue; g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fill(); }
});
// sorot di tepi dalam bingkai: rupa Agung = tumpal ramping menunjuk ke dalam; rupa Murka = gigi api condong ke atas
layer((g, s) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, FLOOR_TOP - 20); g.clip();
  const E = inset(50);
  for (let i = 0; i < E.length; i += AGUNG ? 5 : 11) {
    const p = E[i], q = E[(i + 2) % E.length]; if (p.y > FLOOR_TOP - 44 || p.y < 280) continue;
    let tx = q.x - p.x, ty = q.y - p.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = -ty, ny = tx; if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }
    const f = P();
    if (AGUNG) { const L = 30, w = 9; f.moveTo(p.x - tx * w, p.y - ty * w); f.lineTo(p.x + nx * L, p.y + ny * L); f.lineTo(p.x + tx * w, p.y + ty * w); f.closePath(); }
    else {
      const L = 36, w = 10, ux = nx * 0.7, uy = (ny - 0.7) * 0.7, ul = Math.hypot(ux, uy) || 1, dx = ux / ul, dy = uy / ul;
      f.moveTo(p.x - tx * w, p.y - ty * w);
      f.quadraticCurveTo(p.x + nx * L * 0.5, p.y + ny * L * 0.5, p.x + dx * L, p.y + dy * L);
      f.quadraticCurveTo(p.x + nx * L * 0.3 + tx * w * 0.6, p.y + ny * L * 0.3 + ty * w * 0.6, p.x + tx * w, p.y + ty * w); f.closePath();
    }
    fs(g, s, f, GOLD, true, 3);
  }
});

// tatahan garis ganda (tinta + warna) dan daun
const strokeBoth = (g, s, path, w, col, metal) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = s(INK, false); g.lineWidth = w + 7; g.stroke(path);
  g.strokeStyle = s(col, metal); g.lineWidth = w; g.stroke(path);
};
const leaf = (g, s, x, y, ang, len, red) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  const p = P(); p.moveTo(0, 0); p.bezierCurveTo(len * 0.35, -len * 0.42, len * 0.8, -len * 0.25, len, 0);
  p.bezierCurveTo(len * 0.8, len * 0.25, len * 0.35, len * 0.42, 0, 0);
  g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(p);
  g.fillStyle = s({ lin: [0, 0, len, 0], stops: red ? LEAF_R : LEAF_G }, false); g.fill(p);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.moveTo(len * 0.12, 0); g.lineTo(len * 0.85, 0); g.stroke();
  g.restore();
};

// 1d. lung-lungan: sulur berombak dari batang ke bingkai. Tiap lekuk berisi pilin dan kembang; dasar lekuknya
//     ditatah tembus, jadi cahaya blencong menyala di sela pilin (pengganti renda belah ketupat rancangan lama).
const KEMBANG = [RED_B, WHITE, BLUE];
// burung kecil di dahan (acuan: burung di sela sulur). Menghadap +x, kaki di (0, 0). Kunci BIRDS = "baris:lekuk".
const BIRDS = { '9:2': 0, '10:3': 1, '11:1': 2, '13:1': 0 };
const bird = (g, s, kind) => {
  const [body, wingC] = [[WHITE, BLUE], [RED_B, GOLD], [BLUE_L, RED_B]][kind];
  const tail = P(); tail.moveTo(-10, -12); tail.lineTo(-40, -26); tail.lineTo(-34, -14); tail.lineTo(-42, -6); tail.lineTo(-12, -4); tail.closePath(); fs(g, s, tail, wingC, wingC === GOLD, 3.5);
  const b = P(); b.moveTo(-16, -10); b.bezierCurveTo(-12, -30, 14, -32, 22, -20); b.bezierCurveTo(22, -6, 4, 0, -8, -2); b.closePath(); fs(g, s, b, body, false, 4);
  const w = P(); w.moveTo(-10, -18); w.bezierCurveTo(-2, -26, 10, -24, 12, -14); w.bezierCurveTo(4, -8, -6, -8, -14, -6); w.closePath(); fs(g, s, w, wingC, wingC === GOLD, 3);
  const hd = P(); hd.arc(22, -27, 9.5, 0, Math.PI * 2); fs(g, s, hd, body, false, 4);
  const bk = P(); bk.moveTo(29, -31); bk.lineTo(42, -26); bk.lineTo(29, -22); bk.closePath(); fs(g, s, bk, GOLD, true, 3);
  const cr = P(); cr.moveTo(18, -35); cr.lineTo(12, -46); cr.lineTo(24, -37); cr.closePath(); fs(g, s, cr, RED_B, false, 2.5);
  g.fillStyle = s(INK, false); g.beginPath(); g.arc(24, -28, 2.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(2, -3); g.lineTo(4, 5); g.moveTo(-5, -3); g.lineTo(-4, 5); g.stroke();
};
const lungRow = (g, s, y0, sd, k, holes) => {
  const yEnd = y0 - 52, hw = halfAt(yEnd) - 94; if (hw < 64) return;
  const a = [CX + sd * 10, y0], b = [CX + sd * hw * 0.34, y0 + 10], c = [CX + sd * hw * 0.7, y0 - 30], d = [CX + sd * hw, yEnd];
  const M = 120, pts = [], acc = [0];
  for (let i = 0; i <= M; i++) { pts.push(bez(a, b, c, d, i / M)); if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
  const len = acc[M], n = Math.max(1, Math.round(len / 70)), h = len / n, R = Math.min(34, h * 0.5);
  // titik pada sulur dasar sejauh q: [x, y, arah-x, arah-y]; normal "atas" = (sd·ty, −sd·tx)
  const at = (q) => { let i = 1; while (i < M && acc[i] < q) i++; const f = (q - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]), p0 = pts[i - 1], p1 = pts[i], tx = p1[0] - p0[0], ty = p1[1] - p0[1], l = Math.hypot(tx, ty) || 1; return [p0[0] + tx * f, p0[1] + ty * f, tx / l, ty / l]; };
  const lw = Math.max(6, 10 - k * 0.25);
  for (let j = 0; j < n; j++) {
    const sg = (j + k) % 2 ? -1 : 1, [cx, cy, tx, ty] = at((j + 0.5) * h), nx = sd * ty * sg, ny = -sd * tx * sg;
    if (holes) {
      // tatahan sabit di antara sulur dan pilin; tengah lekuk tetap kulit (bantalan merah tempat pilin)
      g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(cx, cy, R - 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = s(AGUNG ? '#7a1f14' : '#5e120b', false); g.beginPath(); g.arc(cx - nx * 7, cy - ny * 7, R - 15, 0, Math.PI * 2); g.fill();
      continue;
    }
    // sulur: setengah gelombang mengitari lekuk
    const stem = P();
    for (let i = 0; i <= 14; i++) { const [x, y, ux, uy] = at((j + i / 14) * h), o = R * Math.sin(Math.PI * i / 14) * sg; const px = x + sd * uy * o, py = y - sd * ux * o; i ? stem.lineTo(px, py) : stem.moveTo(px, py); }
    strokeBoth(g, s, stem, lw, GOLD, true);
    // pilin: bertunas dari pangkal lekuk, memilin searah sulur, berakhir di kembang
    const [ix, iy] = at(j * h), vx = ix - cx, vy = iy - cy, r0 = Math.hypot(vx, vy), a0 = Math.atan2(vy, vx), dir = sd * sg;
    const sp = P(); let ex = cx, ey = cy;
    for (let i = 0; i <= 44; i++) { const th = (i / 44) * Math.PI * 2.5, rr = r0 * (0.45 + 0.55 * Math.exp(-th / 0.5)) * (1 - 0.29 * th / Math.PI); ex = cx + Math.cos(a0 + dir * th) * rr; ey = cy + Math.sin(a0 + dir * th) * rr; i ? sp.lineTo(ex, ey) : sp.moveTo(ex, ey); }
    strokeBoth(g, s, sp, lw * 0.6, GOLD, true);
    g.fillStyle = s(GOLD_L, true); g.beginPath(); g.arc(ex, ey, 4.4, 0, Math.PI * 2); g.fill();
    // burung bertengger di punggung lekuk (beberapa saja), selebihnya daun yang condong ke arah ujung sulur
    const perch = sg > 0 ? BIRDS[k + ':' + j] : undefined;
    if (perch !== undefined) { g.save(); g.translate(cx + nx * (R + 7), cy + ny * (R + 7)); g.rotate(Math.atan2(ty, tx)); if (sd < 0) g.scale(1, -1); bird(g, s, perch); g.restore(); }
    else leaf(g, s, cx + nx * (R + 2), cy + ny * (R + 2), Math.atan2(ny, nx) + sd * sg * 0.75, 22, (j + k) % 3 === 0);
    // kuncup kembang di pangkal lekuk, di sisi luar sulur
    if (j) { const bx = ix - nx * 15, by = iy - ny * 15; g.fillStyle = s(INK, false); g.beginPath(); g.arc(bx, by, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(bx, by, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = s(KEMBANG[(j + 2 * k) % 3], false); g.beginPath(); g.arc(bx, by, 4.2, 0, Math.PI * 2); g.fill(); }
  }
};
const ROWS = []; for (let y0 = FLOOR_TOP - 36, k = 0; y0 > 320; y0 -= 88, k++) ROWS.push([y0, k]);
layer((g, s) => {
  FIELD(g);
  for (const holes of [true, false]) for (const [y0, k] of ROWS) for (const sd of [-1, 1]) lungRow(g, s, y0, sd, k, holes);
});

// 1d'. kepala naga: bermahkota, rahang menganga
const nagaHead = (g, s) => {
  const crown = P(); crown.moveTo(4, -24); crown.lineTo(8, -50); crown.lineTo(18, -44); crown.lineTo(24, -74); crown.lineTo(34, -48); crown.lineTo(44, -60); crown.lineTo(48, -30); crown.closePath();
  fs(g, s, crown, GOLD, true, 4);
  const lower = P(); lower.moveTo(22, 4); lower.bezierCurveTo(50, 12, 80, 28, 98, 42); lower.bezierCurveTo(74, 46, 40, 38, 4, 22); lower.closePath();
  fs(g, s, lower, { lin: [0, 0, 100, 40], stops: [[0, '#13301f'], [1, '#3d7a52']] }, false, 5);
  const upper = P(); upper.moveTo(0, -24); upper.bezierCurveTo(22, -42, 62, -42, 90, -24); upper.lineTo(108, -14);
  upper.bezierCurveTo(90, -4, 60, -2, 30, 2); upper.bezierCurveTo(16, 4, 4, 2, 0, -4); upper.closePath();
  fs(g, s, upper, { lin: [0, -40, 100, 0], stops: [[0, '#13301f'], [1, '#4c8a60']] }, false, 5);
  const mouth = P(); mouth.moveTo(30, 2); mouth.lineTo(104, -12); mouth.bezierCurveTo(102, 10, 99, 26, 96, 38); mouth.bezierCurveTo(70, 24, 48, 12, 30, 2); mouth.closePath();
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  // lidah bercabang
  const tg = P(); tg.moveTo(40, 12); tg.bezierCurveTo(80, 22, 110, 8, 132, 20); g.lineCap = 'round'; g.strokeStyle = s('#b8301c', false); g.lineWidth = 6; g.stroke(tg);
  g.lineWidth = 4; g.beginPath(); g.moveTo(132, 20); g.lineTo(150, 10); g.moveTo(132, 20); g.lineTo(148, 32); g.stroke();
  for (const [a, b, c] of [[[78, -10], [86, -10], [80, 14]], [[96, -12], [102, -12], [99, 6]], [[84, 32], [90, 34], [84, 14]]]) { const f = P(); f.moveTo(...a); f.lineTo(...b); f.lineTo(...c); f.closePath(); fs(g, s, f, IVORY, false, 2.5); }
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(52, -22, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = s('#c01e0e', false, false, EYE_GLOW); g.beginPath(); g.arc(54, -22, 5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(INK, false); g.lineWidth = 5; g.beginPath(); g.moveTo(36, -36); g.lineTo(70, -24); g.stroke();
  // jenggot api di bawah rahang
  for (let k = 0; k < 4; k++) { const x = 14 + k * 18, y = 24 + k * 4; const f = P(); f.moveTo(x - 8, y); f.quadraticCurveTo(x - 10, y + 20, x - 22, y + 34 - k * 3); f.quadraticCurveTo(x, y + 18, x + 8, y + 2); f.closePath(); fs(g, s, f, GOLD, true, 3); }
};
// naga melilit batang dari pucuk (ekor) sampai di atas kepala satwa; lilitan di balik batang digambar lebih dulu
const TREE_FOOT = AGUNG ? 1000 : 900, TREE_TOP = 262;
const NAGA = (() => {
  const yA = 306, yB = AGUNG ? 728 : 648, turns = Math.round((yB - yA) / 150 - 0.75) + 0.75, A = 46, n = Math.round((yB - yA) / 3), Q = [], front = [];
  for (let i = 0; i <= n; i++) { const u = i / n, ph = Math.PI * 2 * turns * u; Q.push([CX + A * Math.min(1, 0.35 + u * 4) * Math.sin(ph), yA + (yB - yA) * u]); front.push(Math.cos(ph) > 0); }
  // leher: dari lilitan terakhir (kiri) mengayun di depan batang lalu naik di kanan; kepala menghadap kanan-atas
  const a = [CX - A, yB], b = [CX - A, yB + 52], c = [CX + 34, yB + 74], d = [CX + 104, yB + 22];
  for (let i = 1; i <= 26; i++) { Q.push(bez(a, b, c, d, i / 26)); front.push(true); }
  return { Q, front };
})();
const nagaDraw = (g, s, isFront) => {
  const { Q, front } = NAGA, N = Q.length - 1, wAt = (i) => 5 + 20 * Math.pow(i / N, 0.8);
  const pass = (extra, col, metal, wf = 1) => { g.lineCap = 'round'; g.strokeStyle = s(col, metal); for (let i = 1; i <= N; i++) { if (front[i] !== isFront) continue; g.lineWidth = wAt(i) * wf + extra; g.beginPath(); g.moveTo(Q[i - 1][0], Q[i - 1][1]); g.lineTo(Q[i][0], Q[i][1]); g.stroke(); } };
  pass(8, INK, false); pass(0, GREEN_D, false); pass(0, GREEN, false, 0.5);
  for (let i = 4; i < N - 2; i += 5) {
    if (front[i] !== isFront) continue;
    const p = Q[i], q = Q[i + 1], w = wAt(i);
    let tx = q[0] - p[0], ty = q[1] - p[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const nx = -ty, ny = tx;
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(p[0], p[1], Math.max(2, w * 0.14), 0, Math.PI * 2); g.fill();
    if (i % 10 === 4) { // sirip punggung, menyapu ke arah ekor
      const bx = p[0] + nx * w * 0.45, by = p[1] + ny * w * 0.45, f = P();
      f.moveTo(bx + tx * w * 0.35, by + ty * w * 0.35); f.lineTo(bx + nx * w * 0.75 - tx * w * 0.5, by + ny * w * 0.75 - ty * w * 0.5); f.lineTo(bx - tx * w * 0.35, by - ty * w * 0.35); f.closePath();
      fs(g, s, f, GOLD, true, 3);
    }
  }
  if (!isFront) return;
  const e = Q[N], b = Q[N - 5];
  g.save(); g.translate(e[0], e[1]); g.rotate(Math.atan2(e[1] - b[1], e[0] - b[0])); g.scale(1.05, 1.05); g.translate(-6, 0); nagaHead(g, s); g.restore();
};
// pohon hayat: batang prada, mega (awan) biru-putih dan kudhup di pucuk
layer((g, s) => {
  FIELD(g);
  nagaDraw(g, s, false);
  const tw = (y) => 8 + 9 * Math.min(1, Math.max(0, (y - TREE_TOP) / 640));
  const trunk = P(); trunk.moveTo(CX - tw(TREE_FOOT), TREE_FOOT);
  for (let y = TREE_FOOT; y >= TREE_TOP; y -= 18) trunk.lineTo(CX - tw(y), y);
  for (let y = TREE_TOP; y <= TREE_FOOT; y += 18) trunk.lineTo(CX + tw(y), y);
  trunk.closePath();
  fs(g, s, trunk, { lin: [CX - 17, 0, CX + 17, 0], stops: [[0, GOLD_D], [0.4, GOLD_L], [1, '#8a6a2c']] }, true, 6);
  g.strokeStyle = s(INK, false); g.lineWidth = 2.5; g.lineCap = 'round';
  for (let y = TREE_FOOT - 24; y > TREE_TOP + 20; y -= 30) { const w = tw(y) - 3; g.beginPath(); g.moveTo(CX - w, y - 6); g.quadraticCurveTo(CX, y + 6, CX + w, y - 6); g.stroke(); }
  nagaDraw(g, s, true);
  for (const [ox, r, col] of [[-34, 13, BLUE], [34, 13, BLUE], [-17, 15, BLUE_L], [17, 15, BLUE_L], [0, 17, WHITE]]) { const c = P(); c.arc(CX + ox, TREE_TOP - 9 + r, r, 0, Math.PI * 2); fs(g, s, c, col, false, 4); }
  const bud = P(); bud.moveTo(CX, TREE_TOP - 4); bud.bezierCurveTo(CX + 34, TREE_TOP - 40, CX + 22, TREE_TOP - 92, CX, TREE_TOP - 128); bud.bezierCurveTo(CX - 22, TREE_TOP - 92, CX - 34, TREE_TOP - 40, CX, TREE_TOP - 4);
  g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = s(INK, false); g.stroke(bud);
  g.fillStyle = s({ lin: [CX, TREE_TOP, CX, TREE_TOP - 128], stops: [[0, '#4a0c08'], [1, '#e0623f']] }, false, false, '#3a0802'); g.fill(bud); g.lineWidth = 5; g.strokeStyle = s(GOLD, true); g.stroke(bud);
});

// 1d''. banteng (kiri) vs macan (kanan) berhadapan di bawah pohon, siap bertarung
const banteng = (g, s) => {
  const hide = { lin: [-130, -70, 150, 50], stops: [[0, '#120805'], [1, '#4a2c1a']] };
  const sock = '#d9cba8';
  const F = (p, col, metal, lw = 5, glow) => fs(g, s, p, col, metal, lw, glow);
  const tail = P(); tail.moveTo(-122, -18); tail.bezierCurveTo(-146, -6, -150, 26, -142, 52); g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 9; g.stroke(tail); g.strokeStyle = s('#3a2214', false); g.lineWidth = 4; g.stroke(tail);
  const tuft = P(); tuft.moveTo(-148, 46); tuft.quadraticCurveTo(-156, 64, -146, 78); tuft.quadraticCurveTo(-138, 64, -136, 46); tuft.closePath(); F(tuft, GOLD, true, 3);
  const leg = (x0, x1, lean) => { const p = P(); p.moveTo(x0, 30); p.lineTo(x1, 30); p.lineTo(x1 + lean, 84); p.lineTo(x0 + lean - 2, 84); p.closePath(); F(p, hide);
    const k = P(); k.moveTo(x0 + lean * 0.55, 62); k.lineTo(x1 + lean * 0.55, 62); k.lineTo(x1 + lean, 84); k.lineTo(x0 + lean - 2, 84); k.closePath(); F(k, sock, false, 3);
    const h = P(); h.rect(x0 + lean - 3, 82, x1 - x0 + 3, 8); F(h, INK, false, 2); };
  leg(-104, -84, -8); leg(30, 50, -4);
  const body = P(); body.moveTo(-125, -5); body.bezierCurveTo(-125, -50, -60, -58, -10, -62); body.bezierCurveTo(30, -92, 70, -82, 88, -50);
  body.bezierCurveTo(98, -34, 104, -16, 104, 0); body.bezierCurveTo(100, 26, 80, 40, 60, 42); body.lineTo(-90, 42); body.bezierCurveTo(-118, 42, -128, 22, -125, -5); body.closePath();
  F(body, hide, false, 6);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3;
  g.beginPath(); g.moveTo(-20, -56); g.bezierCurveTo(20, -78, 60, -72, 82, -46); g.stroke();
  g.beginPath(); g.moveTo(40, -20); g.bezierCurveTo(56, 0, 58, 20, 48, 36); g.stroke();
  g.beginPath(); g.moveTo(-96, -20); g.bezierCurveTo(-80, 0, -84, 20, -96, 34); g.stroke();
  leg(-74, -54, 4); leg(64, 86, 14);
  const dew = P(); dew.moveTo(76, 24); dew.bezierCurveTo(84, 50, 100, 52, 108, 26); dew.closePath(); F(dew, hide, false, 4);
  const hornB = P(); hornB.moveTo(106, -40); hornB.bezierCurveTo(124, -72, 156, -88, 182, -82); hornB.bezierCurveTo(160, -76, 140, -60, 124, -34); hornB.closePath(); F(hornB, BONE(110, -40, 182, -82), false, 4);
  const head = P(); head.moveTo(84, -44); head.bezierCurveTo(110, -52, 132, -38, 142, -16); head.bezierCurveTo(152, 4, 160, 22, 166, 34);
  head.bezierCurveTo(168, 46, 152, 52, 138, 46); head.bezierCurveTo(120, 38, 100, 22, 92, 4); head.bezierCurveTo(86, -12, 80, -30, 84, -44); head.closePath();
  F(head, hide, false, 6);
  const hornF = P(); hornF.moveTo(118, -36); hornF.bezierCurveTo(142, -68, 178, -84, 204, -74); hornF.bezierCurveTo(180, -70, 156, -54, 136, -26); hornF.closePath(); F(hornF, BONE(120, -36, 204, -74), false, 4);
  const ear = P(); ear.moveTo(106, -30); ear.bezierCurveTo(92, -44, 76, -46, 70, -40); ear.bezierCurveTo(80, -32, 92, -26, 104, -24); ear.closePath(); F(ear, '#5a3420', false, 4);
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(128, -14, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = s('#c01e0e', false, false, EYE_GLOW); g.beginPath(); g.arc(130, -14, 5.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 5; g.beginPath(); g.moveTo(114, -30); g.lineTo(144, -18); g.stroke();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(158, 38, 6, 4, 0.6, 0, Math.PI * 2); g.fill();
  ukel(g, s, 184, 44, 12, 1, 3); ukel(g, s, 200, 30, 9, -1, 2.5);   // dengus napas
};
const macan = (g, s) => {
  const fur = { lin: [-130, -60, 140, 60], stops: [[0, '#6a240c'], [0.55, '#c86e1c'], [1, '#eaa646']] };
  const F = (p, col, metal, lw = 5, glow) => fs(g, s, p, col, metal, lw, glow);
  const tail = P(); tail.moveTo(-118, -14); tail.bezierCurveTo(-142, -40, -140, -84, -112, -100); tail.bezierCurveTo(-92, -110, -74, -98, -84, -84);
  g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 15; g.stroke(tail); g.strokeStyle = s('#c86e1c', false); g.lineWidth = 9; g.stroke(tail);
  ukel(g, s, -84, -86, 9, 1, 3);
  const legR = P(); legR.moveTo(-110, 6); legR.bezierCurveTo(-132, 38, -128, 62, -112, 76); legR.lineTo(-82, 78); legR.bezierCurveTo(-96, 60, -92, 40, -74, 22); legR.closePath(); F(legR, fur);
  const legF2 = P(); legF2.moveTo(36, 30); legF2.bezierCurveTo(44, 52, 42, 66, 36, 78); legF2.lineTo(64, 80); legF2.bezierCurveTo(62, 62, 64, 46, 62, 30); legF2.closePath(); F(legF2, fur);
  const body = P(); body.moveTo(-125, 0); body.bezierCurveTo(-122, -42, -50, -48, 20, -40); body.bezierCurveTo(60, -52, 95, -40, 100, -12);
  body.bezierCurveTo(104, 18, 82, 40, 52, 42); body.lineTo(-84, 40); body.bezierCurveTo(-112, 40, -128, 24, -125, 0); body.closePath();
  F(body, fur, false, 6);
  g.save(); g.clip(body); g.strokeStyle = s(INK, false); g.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const x = -110 + i * 22; g.lineWidth = 7 - (i % 2) * 2; g.beginPath(); g.moveTo(x, -50); g.quadraticCurveTo(x + 12, -18, x + 4, 14); g.stroke(); }
  g.restore();
  const legF = P(); legF.moveTo(66, 16); legF.bezierCurveTo(98, 26, 130, 42, 150, 56); legF.lineTo(160, 72); legF.lineTo(128, 72); legF.bezierCurveTo(110, 60, 86, 50, 58, 44); legF.closePath(); F(legF, fur);
  for (let k = 0; k < 3; k++) { const f = P(); const x = 150 + k * 5, y = 58 + k * 6; f.moveTo(x, y); f.quadraticCurveTo(x + 16, y - 2, x + 20, y + 10); f.quadraticCurveTo(x + 10, y + 4, x + 2, y + 6); f.closePath(); F(f, IVORY, false, 2.5); }
  // surai bergerigi di belakang kepala
  const ruff = P(); ruff.moveTo(86, -76); for (let k = 0; k < 6; k++) { ruff.lineTo(70 - (k % 2) * 14, -64 + k * 12); } ruff.lineTo(96, 4); ruff.closePath(); F(ruff, '#eaa646', false, 4);
  const head = P(); head.moveTo(78, -46); head.bezierCurveTo(84, -82, 120, -96, 150, -84); head.bezierCurveTo(168, -78, 182, -66, 186, -52); head.lineTo(190, -40);
  head.bezierCurveTo(176, -38, 160, -38, 146, -34); head.lineTo(178, -8); head.bezierCurveTo(160, 6, 128, 8, 104, 0); head.bezierCurveTo(88, -10, 76, -26, 78, -46); head.closePath();
  F(head, fur, false, 6);
  g.save(); g.clip(head); g.strokeStyle = s(INK, false); g.lineWidth = 5;
  for (const [x0, y0, x1, y1] of [[100, -86, 112, -60], [116, -94, 124, -70], [92, -40, 116, -30], [96, -22, 120, -14]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.restore();
  const mouth = P(); mouth.moveTo(140, -34); mouth.lineTo(188, -40); mouth.bezierCurveTo(186, -28, 182, -16, 177, -9); mouth.bezierCurveTo(162, -14, 150, -24, 140, -34); mouth.closePath();
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  for (const [a, b, c] of [[[170, -40], [178, -40], [174, -18]], [[182, -40], [188, -40], [185, -26]], [[160, -14], [167, -11], [166, -30]]]) { const f = P(); f.moveTo(...a); f.lineTo(...b); f.lineTo(...c); f.closePath(); F(f, IVORY, false, 2.5); }
  const ear = P(); ear.moveTo(96, -74); ear.lineTo(100, -104); ear.lineTo(120, -86); ear.closePath(); F(ear, '#c86e1c', false, 4);
  g.fillStyle = s(GOLD, true); g.beginPath(); g.ellipse(142, -66, 12, 7, -0.35, 0, Math.PI * 2); g.fill();
  g.fillStyle = s('#c01e0e', false, false, EYE_GLOW); g.beginPath(); g.ellipse(145, -67, 5, 5, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(INK, false); g.lineWidth = 6; g.beginPath(); g.moveTo(124, -82); g.lineTo(160, -66); g.stroke();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 2;
  for (const [x, y] of [[212, -52], [216, -40], [210, -28]]) { g.beginPath(); g.moveTo(180, -46); g.lineTo(x, y); g.stroke(); }
};

// 1e. lar: sepasang sayap di kiri-kanan gapura; bulunya mengipas dari bahu (digambar untuk sisi kiri, lalu dicerminkan)
const MAKARA = [266, 1276, 1];   // engsel rahang: jarak dari sumbu, tinggi, skala
const WING = AGUNG ? [CX - MAKARA[0] - 96, MAKARA[1] + 14] : [CX - 304, 1300];
const wing = (g, s) => {
  const feather = (ang, len, wid, stops, rib) => {
    g.save(); g.translate(WING[0], WING[1]); g.rotate(ang); g.scale(1, -1);
    const p = P(); p.moveTo(0, -wid * 0.5); p.bezierCurveTo(len * 0.4, -wid, len * 0.86, -wid * 0.8, len, -wid * 0.12);
    p.bezierCurveTo(len * 0.84, wid * 0.4, len * 0.4, wid * 0.6, 0, wid * 0.5); p.closePath();
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = s(INK, false); g.stroke(p);
    g.fillStyle = s({ lin: [0, 0, len, 0], stops }, false); g.fill(p);
    g.strokeStyle = s(GOLD, true); g.lineWidth = rib; g.lineCap = 'round'; g.beginPath(); g.moveTo(len * 0.12, 0); g.quadraticCurveTo(len * 0.55, -wid * 0.32, len * 0.9, -wid * 0.16); g.stroke();
    g.restore();
  };
  // panjang bulu sampai tepi dalam bingkai (tidak terpotong bingkai)
  const reach = (ang, max) => { let L = 80; for (; L < max; L += 6) { const x = WING[0] + Math.cos(ang) * L, y = WING[1] + Math.sin(ang) * L; if (Math.abs(x - CX) > halfAt(y) - 64) break; } return L; };
  const LONG = [[0, '#6a150d'], [0.22, '#efe4c4'], [0.6, '#e2c26a'], [0.84, '#2f8a48'], [1, '#0f4a26']];
  const MID = [[0, '#4a0f0a'], [0.3, '#c8321e'], [0.75, '#f0b04a'], [1, '#fff0b0']];
  const SHORT = [[0, BLUE_D], [0.5, BLUE], [1, BLUE_L]];
  for (let i = 0; i < 11; i++) { const a = Math.PI * (0.94 + 0.57 * i / 10); feather(a, reach(a, 322 - 7 * Math.abs(i - 6)), 46, LONG, 3.5); }
  for (let i = 0; i < 8; i++) { const a = Math.PI * (1.0 + 0.46 * i / 7); feather(a, Math.min(196 - 5 * Math.abs(i - 3.5), reach(a, 322) * 0.66), 40, MID, 3); }
  for (let i = 0; i < 6; i++) feather(Math.PI * (1.04 + 0.4 * i / 5), 110, 34, SHORT, 2.5);
  const boss = P(); boss.arc(WING[0], WING[1], 34, 0, Math.PI * 2);
  fs(g, s, boss, { rad: [WING[0] - 8, WING[1] - 8, 4, WING[0], WING[1], 34], stops: [[0, GOLD_L], [1, GOLD_D]] }, true, 6);
  ukel(g, s, WING[0], WING[1], 22, -1, 4);
};

// 1f. gapura: (rupa Agung) atap tumpang, lis, dinding merah berpintu hijau, undakan, lantai ubin, dan palemahan
const WALL_TOP = 1428;
const gate = (g, s) => {
  const F = (p, col, metal, lw = 6, glow) => fs(g, s, p, col, metal, lw, glow);
  const quad = (x0, x1, y0, x2, x3, y1) => { const p = P(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x3, y1); p.lineTo(x2, y1); p.closePath(); return p; };
  // lantai ubin berperspektif di kiri-kanan undakan
  {
    g.save(); g.beginPath(); g.rect(0, FLOOR_TOP, W, PALE_TOP - FLOOR_TOP); g.clip();
    g.fillStyle = s({ lin: [0, FLOOR_TOP, 0, PALE_TOP], stops: [[0, '#a8a290'], [1, '#e4decc']] }, false); g.fillRect(0, FLOOR_TOP, W, PALE_TOP - FLOOR_TOP);
    const ys = [0, 0.2, 0.46, 0.76, 1].map((t) => FLOOR_TOP + (PALE_TOP - FLOOR_TOP) * t), xAt = (k, y) => CX + k * (36 + 30 * (y - FLOOR_TOP) / (PALE_TOP - FLOOR_TOP));
    for (let r = 0; r < 4; r++) for (let k = -18; k < 18; k++) {
      if ((k + r) & 1) continue;
      const p = P(); p.moveTo(xAt(k, ys[r]), ys[r]); p.lineTo(xAt(k + 1, ys[r]), ys[r]); p.lineTo(xAt(k + 1, ys[r + 1]), ys[r + 1]); p.lineTo(xAt(k, ys[r + 1]), ys[r + 1]); p.closePath();
      g.fillStyle = s('#6f685a', false); g.fill(p);
    }
    g.strokeStyle = s(INK, false); g.lineWidth = 2;
    for (let k = -18; k <= 18; k++) { g.beginPath(); g.moveTo(xAt(k, FLOOR_TOP), FLOOR_TOP); g.lineTo(xAt(k, PALE_TOP), PALE_TOP); g.stroke(); }
    for (const y of ys) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.restore();
    g.strokeStyle = s(INK, false); g.lineWidth = 13; g.beginPath(); g.moveTo(0, FLOOR_TOP); g.lineTo(W, FLOOR_TOP); g.stroke();
    g.strokeStyle = s(GOLD, true); g.lineWidth = 7; g.stroke();
  }
  // palemahan: pita dasar merah, sudutnya menjungkit
  {
    g.save();
    const pale = P(); pale.rect(0, PALE_TOP, W, BASE - PALE_TOP);
    pale.moveTo(150, 1660); pale.lineTo(240, PALE_TOP + 2); pale.lineTo(150, PALE_TOP + 2); pale.closePath();
    pale.moveTo(W - 150, 1660); pale.lineTo(W - 240, PALE_TOP + 2); pale.lineTo(W - 150, PALE_TOP + 2); pale.closePath();
    g.clip(pale);
    g.fillStyle = s({ lin: [0, 1660, 0, BASE], stops: [[0, '#d23a22'], [1, '#6a120b']] }, false); g.fillRect(0, 1650, W, BASE - 1650);
    g.fillStyle = s(INK, false, true); for (let x = 262; x < 1150; x += 31) { if (Math.abs(x - CX) < 86) continue; g.beginPath(); g.arc(x, 1753, 6, 0, Math.PI * 2); g.fill(); }
    const wave = P(); for (let x = 200; x <= 1200; x += 6) { const y = 1784 + Math.sin((x - CX) * Math.PI / 31) * 6; x === 200 ? wave.moveTo(x, y) : wave.lineTo(x, y); }
    g.lineJoin = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 8; g.stroke(wave); g.strokeStyle = s(GOLD, true); g.lineWidth = 4; g.stroke(wave);
    g.lineJoin = 'round'; g.strokeStyle = s(GOLD, true); g.lineWidth = 16; g.stroke(SIL);
    g.restore();
    g.strokeStyle = s(INK, false); g.lineWidth = 13; g.beginPath(); g.moveTo(232, PALE_TOP); g.lineTo(W - 232, PALE_TOP); g.stroke();
    g.strokeStyle = s(GOLD, true); g.lineWidth = 7; g.stroke();
    ukel(g, s, 196, 1728, 15, 1, 4); ukel(g, s, W - 196, 1728, 15, -1, 4);
  }
  // gegel: pangkal tangkai tanduk di bawah garis dasar
  {
    const stub = P(); stub.moveTo(630, BASE); stub.lineTo(770, BASE); stub.lineTo(748, 1990); stub.lineTo(652, 1990); stub.closePath();
    g.fillStyle = s({ lin: [630, 0, 770, 0], stops: [[0, '#1c0e07'], [0.42, '#6e4828'], [0.58, '#6e4828'], [1, '#1c0e07']] }, false); g.fill(stub);
    g.save(); g.clip(stub); g.fillStyle = s(GOLD, true); for (const y of [1822, 1846, 1870]) g.fillRect(600, y, 200, 9); g.restore();
  }
  // undakan
  for (let i = 0; i < 5; i++) {
    const y0 = FLOOR_TOP + i * 19, hw = 158 + i * 22, p = P(); p.rect(CX - hw, y0, hw * 2, 19);
    F(p, { lin: [0, y0, 0, y0 + 19], stops: [[0, '#f6f1e2'], [0.42, '#e6dfcc'], [0.5, '#9a927f'], [1, '#c9c2ae']] }, false, 3);
  }
  // dinding, tiang, daun pintu
  const wall = P(); wall.rect(CX - 196, WALL_TOP, 392, FLOOR_TOP - WALL_TOP); F(wall, { lin: [0, WALL_TOP, 0, FLOOR_TOP], stops: [[0, '#b02a1a'], [1, '#5e120b']] }, false, 6);
  for (const sd of [-1, 1]) {
    const px = sd < 0 ? CX - 196 : CX + 152, pil = P(); pil.rect(px, WALL_TOP, 44, FLOOR_TOP - WALL_TOP);
    F(pil, { lin: [px, 0, px + 44, 0], stops: [[0, '#7a160d'], [0.5, '#d23a22'], [1, '#7a160d']] }, false, 5);
    g.fillStyle = s(GOLD, true); g.fillRect(px + 2, WALL_TOP + 16, 40, 9); g.fillRect(px + 2, FLOOR_TOP - 28, 40, 12);
    const dm = P(); dm.moveTo(px + 22, 1494); dm.lineTo(px + 35, 1524); dm.lineTo(px + 22, 1554); dm.lineTo(px + 9, 1524); dm.closePath(); F(dm, GOLD, true, 3);
    const dx = sd < 0 ? CX - 148 : CX + 6, door = P(); door.rect(dx, WALL_TOP + 22, 142, FLOOR_TOP - WALL_TOP - 22);
    F(door, { lin: [dx, WALL_TOP, dx + 142, FLOOR_TOP], stops: [[0, '#46b866'], [1, '#15582b']] }, false, 5);
    g.strokeStyle = s(GOLD, true); g.lineWidth = 3.5; g.strokeRect(dx + 11, WALL_TOP + 33, 120, FLOOR_TOP - WALL_TOP - 44);
    const mx = dx + 71, my = (WALL_TOP + 22 + FLOOR_TOP) / 2;
    const lz = (hw, hh) => { const p = P(); p.moveTo(mx, my - hh); p.lineTo(mx + hw, my); p.lineTo(mx, my + hh); p.lineTo(mx - hw, my); p.closePath(); return p; };
    F(lz(38, 68), GOLD, true, 4); F(lz(24, 45), { lin: [0, my - 45, 0, my + 45], stops: [[0, '#d23a22'], [1, '#7a160d']] }, false, 3);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, pt = P(); pt.ellipse(mx + Math.cos(a) * 9, my + Math.sin(a) * 9, 10, 5, a, 0, Math.PI * 2); F(pt, GOLD, true, 2); }
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(mx, my, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(mx, my, 4.5, 0, Math.PI * 2); g.fill();
    for (const oy of [-58, 58]) { g.fillStyle = s(WHITE, false); g.beginPath(); g.arc(mx, my + oy * 0.6, 3.2, 0, Math.PI * 2); g.fill(); }
    // gelang pintu
    g.strokeStyle = s(INK, false); g.lineWidth = 7; g.beginPath(); g.arc(CX + sd * 20, my + 6, 9, 0, Math.PI * 2); g.stroke(); g.strokeStyle = s(GOLD, true); g.lineWidth = 3.5; g.stroke();
  }
  g.strokeStyle = s(INK, false); g.lineWidth = 12; g.beginPath(); g.moveTo(CX, WALL_TOP + 22); g.lineTo(CX, FLOOR_TOP); g.stroke();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 4; g.stroke();
  // ambang atas dan lis (tritisan) bergerigi
  const lintel = P(); lintel.rect(CX - 152, WALL_TOP, 304, 22); F(lintel, { lin: [0, WALL_TOP, 0, WALL_TOP + 22], stops: [[0, GOLD_L], [1, GOLD_D]] }, true, 4);
  for (let x = CX - 286; x <= CX + 286; x += 22) { const t = P(); t.moveTo(x - 9, WALL_TOP - 2); t.lineTo(x + 9, WALL_TOP - 2); t.lineTo(x, WALL_TOP + 15); t.closePath(); F(t, GOLD, true, 2.5); }
  F(quad(CX - 292, CX + 292, WALL_TOP - 24, CX - 306, CX + 306, WALL_TOP), { lin: [0, WALL_TOP - 24, 0, WALL_TOP], stops: [[0, '#d23a22'], [1, '#7a160d']] }, false, 6);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3.5; g.beginPath(); g.moveTo(CX - 290, WALL_TOP - 12); g.lineTo(CX + 290, WALL_TOP - 12); g.stroke();
  if (!AGUNG) return;
  // atap bawah: emas, belah ketupat bertatah
  const ROOF = WALL_TOP - 24, roof = P(); roof.moveTo(CX - 152, 1200); roof.lineTo(CX + 152, 1200); roof.quadraticCurveTo(CX + 186, 1330, CX + 292, ROOF); roof.lineTo(CX - 292, ROOF); roof.quadraticCurveTo(CX - 186, 1330, CX - 152, 1200); roof.closePath();
  F(roof, { lin: [0, 1200, 0, ROOF], stops: [[0, '#ecd085'], [1, '#a47c38']] }, true, 7);
  g.save(); g.clip(roof);
  g.strokeStyle = s(GOLD_D, true); g.lineWidth = 2.5;
  for (let k = -640; k < 640; k += 30) { g.beginPath(); g.moveTo(CX + k, 1200); g.lineTo(CX + k + 230, 1430); g.stroke(); g.beginPath(); g.moveTo(CX + k, 1200); g.lineTo(CX + k - 230, 1430); g.stroke(); }
  g.fillStyle = s(INK, false, true);
  for (let r = 0; r < 14; r++) for (let k = -22; k <= 22; k++) { const x = CX + k * 30 + (r % 2) * 15, y = 1215 + r * 15; if (y > ROOF - 10) continue; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = s({ lin: [0, 1286, 0, 1304], stops: [[0, '#b02a1a'], [1, '#6a120b']] }, false); g.fillRect(0, 1286, W, 18);
  g.fillStyle = s(GOLD, true); g.fillRect(0, 1283, W, 4); g.fillRect(0, 1303, W, 4);
  g.restore();
  g.lineWidth = 3.5; g.strokeStyle = s(GOLD_L, true); g.stroke(roof);
  // bubungan dan atap atas: biru, sisik ombak putih
  F(quad(CX - 164, CX + 164, 1184, CX - 164, CX + 164, 1200), { lin: [0, 1184, 0, 1200], stops: [[0, '#d23a22'], [1, '#7a160d']] }, false, 5);
  const top = P(); top.moveTo(CX - 92, 1100); top.lineTo(CX + 92, 1100); top.quadraticCurveTo(CX + 112, 1150, CX + 148, 1184); top.lineTo(CX - 148, 1184); top.quadraticCurveTo(CX - 112, 1150, CX - 92, 1100); top.closePath();
  F(top, { lin: [0, 1100, 0, 1184], stops: [[0, BLUE_L], [1, BLUE]] }, false, 7);
  g.save(); g.clip(top); g.strokeStyle = s(WHITE, false); g.lineWidth = 3; g.lineCap = 'round';
  for (let r = 0; r < 6; r++) for (let k = -8; k <= 8; k++) { g.beginPath(); g.arc(CX + k * 26 + (r % 2) * 13, 1120 + r * 15, 12, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  g.restore();
  g.lineWidth = 3.5; g.strokeStyle = s(GOLD, true); g.stroke(top);
  F(quad(CX - 100, CX + 100, 1088, CX - 100, CX + 100, 1101), GOLD, true, 4);
};

// 1g. sepasang "merak" pengapit atap (rupa Agung; pada kayon acuan: kepala makara bersayap). Arahan host 13 Nov:
//     "seolah olah menelan pendapa" dan "lebih serem ... lebih kaya monster" (versi pertama ditolak: "kaya badut").
//     Rahangnya menganga lebar mengapit sisi atap dan atap terlihat di dalam mulutnya (rongga mulut bagian depan
//     sengaja tidak diisi; atap sudah tergambar di bawahnya). Mata melotot berurat dengan iris menyala, alis api,
//     tanduk, surai api, taring tak rata dan siung panjang, lidah bercabang, janggut api.
//     Digambar menghadap +x dengan engsel rahang di (0, 0).
const PALATE = [[0, -6], [40, -40], [90, -78], [128, -108]], GUM = [[0, 8], [40, 44], [78, 78], [112, 92]];
const makara = (g, s) => {
  const F = (p, col, metal, lw = 6, glow) => fs(g, s, p, col, metal, lw, glow);
  const hide = { lin: [-160, -130, 130, 130], stops: [[0, '#07163c'], [0.5, '#1a418f'], [1, '#5f9fce']] };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // surai api di tengkuk: dari ubun-ubun lewat belakang sampai bawah rahang, ujungnya menjilat ke atas
  const SC = [-74, -34];
  const mane = (scaleL, stops, lw) => {
    for (let i = 0; i < 10; i++) {
      const u = i / 9, a = Math.PI * (1.52 - 0.86 * u), sw = Math.sin(u * Math.PI);
      const R0 = 82, L = scaleL * (44 + 46 * sw), bw = 0.19, up = -Math.PI / 2, tipA = a + Math.atan2(Math.sin(up - a), Math.cos(up - a)) * 0.34;
      const pt = (ang, r) => [SC[0] + Math.cos(ang) * r, SC[1] + Math.sin(ang) * r];
      const [b1x, b1y] = pt(a - bw, R0), [b2x, b2y] = pt(a + bw, R0), [tx, ty] = pt(tipA, R0 + L);
      const [c1x, c1y] = pt(a - bw * 0.2, R0 + L * 0.62), [c2x, c2y] = pt(a + bw * 1.5, R0 + L * 0.42);
      const p = P(); p.moveTo(b1x, b1y); p.quadraticCurveTo(c1x, c1y, tx, ty); p.quadraticCurveTo(c2x, c2y, b2x, b2y); p.closePath();
      if (lw) { g.lineWidth = lw; g.strokeStyle = s(INK, false); g.stroke(p); }
      g.fillStyle = s({ rad: [SC[0], SC[1], R0 * 0.8, SC[0], SC[1], R0 + 100], stops }, false); g.fill(p);
    }
  };
  mane(1.0, [[0, '#2a62b8'], [0.5, '#102f6c'], [1, '#040b22']], 7);
  mane(0.6, [[0, '#f0b04a'], [0.6, '#c8321e'], [1, '#5a0f0a']], 4);
  // tanduk melengkung ke belakang
  {
    const o = [[-36, -112], [-66, -178], [-124, -208], [-184, -200]], n = [[-82, -104], [-102, -150], [-138, -180], [-184, -200]];
    const h = P(); h.moveTo(...o[0]); h.bezierCurveTo(...o[1], ...o[2], ...o[3]); h.bezierCurveTo(...n[2], ...n[1], ...n[0]); h.closePath();
    F(h, { lin: [-50, -110, -184, -200], stops: [[0, '#3a2410'], [0.45, '#b49a6a'], [1, '#fff4d8']] }, false, 7);
    g.strokeStyle = s(INK, false); g.lineWidth = 3;
    for (let k = 2; k < 9; k++) { const q = k / 10, c = bez(...o, q), d = bez(...n, q); g.beginPath(); g.moveTo(...c); g.lineTo(...d); g.stroke(); }
  }
  // moncong menekuk ke atas di ujung rahang atas
  const tr = P(); tr.moveTo(96, -128); tr.bezierCurveTo(120, -144, 140, -154, 142, -178);
  for (let k = 1; k <= 30; k++) { const q = k / 30, a = -q * Math.PI * 2.2, r = 19 * (1 - q * 0.8); tr.lineTo(123 + Math.cos(a) * r, -180 + Math.sin(a) * r); }
  g.strokeStyle = s(INK, false); g.lineWidth = 28; g.stroke(tr); g.strokeStyle = s('#1a418f', false); g.lineWidth = 18; g.stroke(tr); g.strokeStyle = s('#5f9fce', false); g.lineWidth = 4; g.stroke(tr);
  // kerongkongan gelap di pangkal rahang; ke depan terbuka
  const throat = P(); throat.moveTo(-30, -20); throat.lineTo(80, -68); throat.quadraticCurveTo(48, 0, 72, 64); throat.lineTo(-30, 24); throat.closePath();
  g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(throat);
  g.fillStyle = s({ lin: [-20, 0, 80, 0], stops: [[0, '#0e0201'], [0.6, '#5a0f0a'], [1, '#9a1c12']] }, false); g.fill(throat);
  // lidah bercabang menjulur ke atap
  const tg = P(); tg.moveTo(8, -4); tg.bezierCurveTo(50, 8, 86, 28, 114, 18); tg.lineTo(156, -4); tg.lineTo(130, 28); tg.lineTo(160, 46);
  tg.bezierCurveTo(120, 56, 76, 52, 8, 14); tg.closePath();
  F(tg, { lin: [0, 0, 150, 30], stops: [[0, '#4a0c08'], [0.5, '#c8321e'], [1, '#f0704a']] }, false, 5, '#2a0402');
  g.strokeStyle = s(INK, false); g.lineWidth = 3; g.beginPath(); g.moveTo(30, 12); g.bezierCurveTo(70, 30, 100, 36, 126, 28); g.stroke();
  // gigi: taring tak rata, menunjuk ke dalam mulut; siung panjang melengkung di ujung kedua rahang
  const tooth = (line, nx, ny, q, L, w, bend) => {
    const [x, y] = bez(...line, q), [x0, y0] = bez(...line, q - 0.02), [x1, y1] = bez(...line, Math.min(1, q + 0.02)), l = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / l, uy = (y1 - y0) / l;
    const ax = x + nx * L + ux * bend, ay = y + ny * L + uy * bend, f = P();
    f.moveTo(x - ux * w - nx * 5, y - uy * w - ny * 5); f.quadraticCurveTo(x - ux * w * 0.3 + nx * L * 0.6, y - uy * w * 0.3 + ny * L * 0.6, ax, ay);
    f.quadraticCurveTo(x + ux * w + nx * L * 0.45, y + uy * w + ny * L * 0.45, x + ux * w - nx * 5, y + uy * w - ny * 5); f.closePath();
    F(f, BONE(x, y, ax, ay), false, 3);
  };
  [[0.24, 16], [0.34, 26], [0.44, 18], [0.54, 30], [0.64, 20], [0.74, 28]].forEach(([q, L]) => tooth(PALATE, 0.62, 0.78, q, L, 7, 0));
  [[0.28, 15], [0.38, 24], [0.48, 16], [0.58, 26], [0.68, 18], [0.78, 24]].forEach(([q, L]) => tooth(GUM, 0.63, -0.77, q, L, 7, 0));
  tooth(PALATE, 0.62, 0.78, 0.9, 70, 11, -16); tooth(GUM, 0.63, -0.77, 0.93, 62, 11, -14);
  // janggut api di bawah rahang
  for (let k = 0; k < 6; k++) { const x = -44 + k * 28, y = 74 + k * 10, f = P(); f.moveTo(x - 9, y); f.quadraticCurveTo(x - 12, y + 24, x - 28, y + 42 - k * 2); f.quadraticCurveTo(x, y + 22, x + 9, y + 2); f.closePath(); F(f, k % 2 ? GOLD : '#c8321e', k % 2 === 1, 3); }
  // rahang bawah
  const jaw = P(); jaw.moveTo(-40, 6); jaw.lineTo(...GUM[0]); jaw.bezierCurveTo(...GUM[1], ...GUM[2], ...GUM[3]); jaw.bezierCurveTo(130, 96, 136, 120, 118, 130);
  jaw.bezierCurveTo(70, 142, 0, 112, -62, 58); jaw.closePath();
  F(jaw, hide, false, 7);
  g.strokeStyle = s(INK, false); g.lineWidth = 3;
  for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-10 + k * 26, 62 + k * 13, 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  // rahang atas: hidung berkerut, lubang hidung mengembang, duri tulang di punggung moncong
  for (let k = 0; k < 4; k++) { const [x, y] = bez([-30, -96], [10, -106], [60, -114], [100, -142], 0.2 + k * 0.22), f = P(); f.moveTo(x - 9, y + 6); f.lineTo(x - 6, y - 22 - k * 2); f.lineTo(x + 9, y + 2); f.closePath(); F(f, BONE(x, y, x, y - 24), false, 3); }
  const up = P(); up.moveTo(-40, -90); up.bezierCurveTo(10, -104, 60, -112, 100, -140); up.lineTo(...PALATE[3]); up.bezierCurveTo(...PALATE[2], ...PALATE[1], ...PALATE[0]); up.lineTo(-40, 0); up.closePath();
  F(up, hide, false, 7);
  g.strokeStyle = s(INK, false); g.lineWidth = 4;
  for (const [x0, y0, x1, y1, x2, y2] of [[34, -100, 52, -84, 46, -60], [58, -110, 76, -96, 72, -76], [80, -122, 96, -110, 94, -94]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke(); }
  g.fillStyle = s(INK, false); g.beginPath(); g.ellipse(106, -116, 9, 5.5, -0.7, 0, Math.PI * 2); g.fill();
  // tengkorak
  const head = P(); head.moveTo(-20, 32); head.bezierCurveTo(-60, 72, -150, 52, -158, -20); head.bezierCurveTo(-164, -84, -110, -128, -50, -124);
  head.bezierCurveTo(-10, -122, 12, -106, 26, -86); head.lineTo(0, -6); head.lineTo(0, 8); head.closePath();
  F(head, hide, false, 7);
  // gusi gelap di kedua rahang
  for (const line of [PALATE, GUM]) { const lip = P(); lip.moveTo(...line[0]); lip.bezierCurveTo(...line[1], ...line[2], ...line[3]); g.strokeStyle = s(INK, false); g.lineWidth = 12; g.stroke(lip); g.strokeStyle = s('#7a140c', false); g.lineWidth = 5; g.stroke(lip); }
  // sirip bergerigi di belakang mata
  const fin = P(); fin.moveTo(-100, -44); fin.lineTo(-156, -72); fin.lineTo(-132, -40); fin.lineTo(-166, -30); fin.lineTo(-130, -14); fin.lineTo(-154, 10); fin.lineTo(-104, -6); fin.closePath();
  F(fin, { lin: [-100, 0, -166, 0], stops: [[0, '#7a140c'], [1, '#e0462a']] }, false, 5);
  // mata melotot berurat; iris menyala, pupil celah; kelopak miring ke moncong
  const EX = -54, EY = -62, disc = (r, col, metal, hole, glow) => { g.fillStyle = s(col, metal, hole, glow); g.beginPath(); g.arc(EX, EY, r, 0, Math.PI * 2); g.fill(); };
  disc(64, { rad: [EX, EY, 28, EX, EY, 64], stops: [[0, 'rgba(3,6,20,0.92)'], [1, 'rgba(3,6,20,0)']] }, false);
  disc(35, INK, false); disc(31, GOLD, true); disc(26, { rad: [EX, EY, 10, EX, EY, 26], stops: [[0, '#f4ead0'], [1, '#c2a77c']] }, false);
  g.strokeStyle = s('#a01e12', false); g.lineWidth = 2;
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.3; g.beginPath(); g.moveTo(EX + Math.cos(a) * 25, EY + Math.sin(a) * 25); g.quadraticCurveTo(EX + Math.cos(a + 0.25) * 21, EY + Math.sin(a + 0.25) * 21, EX + Math.cos(a - 0.08) * 17, EY + Math.sin(a - 0.08) * 17); g.stroke(); }
  g.fillStyle = s({ rad: [EX + 3, EY, 3, EX + 3, EY, 16], stops: [[0, '#ffb040'], [0.5, '#ff5a18'], [1, '#5a0a05']] }, false, false, EYE_GLOW); g.beginPath(); g.arc(EX + 3, EY, 16, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(INK, false); g.lineWidth = 3; g.stroke();
  g.fillStyle = s(INK, false); g.beginPath(); g.ellipse(EX + 4, EY, 3.6, 13, 0.12, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(EX, EY, 32, 0, Math.PI * 2); g.clip();
  const lid = P(); lid.moveTo(EX - 40, EY - 26); lid.lineTo(EX + 40, EY - 4); lid.lineTo(EX + 40, EY - 44); lid.lineTo(EX - 40, EY - 44); lid.closePath();
  g.fillStyle = s({ lin: [0, EY - 40, 0, EY], stops: [[0, '#040b22'], [1, '#143a7c']] }, false); g.fill(lid);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 5; g.beginPath(); g.moveTo(EX - 40, EY - 26); g.lineTo(EX + 40, EY - 4); g.stroke();
  g.restore();
  // alis api: pangkal tebal di atas hidung, lidah-lidahnya menyala ke belakang
  const BROW = [[20, -62], [-10, -92], [-58, -112], [-112, -100]];
  const brow = P(); brow.moveTo(...BROW[0]); brow.bezierCurveTo(...BROW[1], ...BROW[2], ...BROW[3]); brow.lineTo(-104, -86); brow.bezierCurveTo(-60, -94, -20, -78, 8, -50); brow.closePath();
  F(brow, { lin: [0, -110, 0, -50], stops: [[0, '#f0d080'], [1, '#8a6224']] }, true, 6);
  for (let k = 0; k < 6; k++) { const [x, y] = bez(...BROW, 0.12 + k * 0.15), f = P(); f.moveTo(x + 9, y + 4); f.quadraticCurveTo(x - 2, y - 20, x - 20, y - 28 - k * 2); f.quadraticCurveTo(x - 6, y - 8, x - 9, y + 5); f.closePath(); F(f, GOLD, true, 3); }
  // pilin prada di pipi, sisik tinta, permata dahi
  ukel(g, s, -112, 4, 20, -1, 4); ukel(g, s, -50, 34, 13, 1, 3);
  g.strokeStyle = s(INK, false); g.lineWidth = 3;
  for (const [x, y] of [[-134, -40], [-84, -4], [-22, -22], [-78, 36], [-128, 34]]) { g.beginPath(); g.arc(x, y, 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
};

// 1h. kala kecil (banaspati) di puncak gapura rupa Agung, dengan mega rambut gelap tempat banteng dan macan berpijak.
//     Pusat muka di (0, 0).
const kalaAlit = (g, s) => {
  const F = (p, col, metal, lw = 5, glow) => fs(g, s, p, col, metal, lw, glow);
  // mega: gumpalan-gumpalan menyatu (garis luar bergelombang), pilin prada di dalamnya
  const puffs = []; for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) puffs.push([sd * (56 + 37 * k), -30 + (k % 2) * 12 + (k > 6 ? 6 : 0), 36 - (k % 3) * 4 - (k > 6 ? 6 : 0), sd, k]);
  g.lineJoin = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 11;
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  for (const [x, y, r] of puffs) { g.fillStyle = s({ rad: [x, y - r * 0.4, 3, x, y, r], stops: [[0, '#5a4842'], [1, SOOT]] }, false); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  for (const [x, y, r, sd, k] of puffs) if (k % 2 === 0) ukel(g, s, x, y, r * 0.5, sd, 3);
  const crown = P(); crown.moveTo(-52, -64); crown.lineTo(-42, -98); crown.lineTo(-24, -80); crown.lineTo(0, -122); crown.lineTo(24, -80); crown.lineTo(42, -98); crown.lineTo(52, -64); crown.closePath(); F(crown, GOLD, true, 5);
  const face = P(); face.moveTo(-64, -18); face.bezierCurveTo(-68, -66, -34, -84, 0, -84); face.bezierCurveTo(34, -84, 68, -66, 64, -18);
  face.bezierCurveTo(62, 30, 38, 64, 0, 70); face.bezierCurveTo(-38, 64, -62, 30, -64, -18); face.closePath();
  F(face, { rad: [0, -20, 8, 0, 0, 84], stops: [[0, '#d8442c'], [0.7, '#8a1f14'], [1, '#4a0f0a']] }, false, 7);
  g.lineWidth = 3.5; g.strokeStyle = s(GOLD, true); g.stroke(face);
  g.fillStyle = s('#b0180c', false, false, '#5a0a02'); g.beginPath(); g.arc(0, -92, 6, 0, Math.PI * 2); g.fill();
  for (const sd of [-1, 1]) {
    const ex = sd * 27, ey = -28, disc = (r, col, metal, hole, glow) => { g.fillStyle = s(col, metal, hole, glow); g.beginPath(); g.arc(ex, ey, r, 0, Math.PI * 2); g.fill(); };
    disc(20, INK, false); disc(17.5, GOLD, true); disc(13.5, IVORY, false); disc(8, '#c01e0e', false, false, EYE_GLOW); disc(3.4, INK, false, true);
    g.save(); g.beginPath(); g.arc(ex, ey, 18, 0, Math.PI * 2); g.clip();
    const lid = P(); lid.moveTo(ex + sd * 24, ey - 16); lid.lineTo(ex - sd * 24, ey - 5); lid.lineTo(ex - sd * 24, ey - 30); lid.lineTo(ex + sd * 24, ey - 30); lid.closePath();
    g.fillStyle = s('#6a150d', false); g.fill(lid); g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.moveTo(ex + sd * 24, ey - 16); g.lineTo(ex - sd * 24, ey - 5); g.stroke();
    g.restore();
    const brow = P(); brow.moveTo(sd * 4, -50); brow.quadraticCurveTo(sd * 30, -72, sd * 60, -54); brow.lineTo(sd * 56, -43); brow.quadraticCurveTo(sd * 30, -58, sd * 8, -40); brow.closePath(); F(brow, GOLD, true, 3.5);
  }
  const nose = P(); nose.moveTo(0, -14); nose.bezierCurveTo(12, -10, 22, 6, 17, 14); nose.bezierCurveTo(11, 21, 4, 18, 0, 15); nose.bezierCurveTo(-4, 18, -11, 21, -17, 14); nose.bezierCurveTo(-22, 6, -12, -10, 0, -14); nose.closePath();
  F(nose, { rad: [0, 0, 3, 0, 4, 24], stops: [[0, '#e0563a'], [1, '#6a150d']] }, false, 4);
  // mulut menganga (tembus cahaya), gigi dan taring
  const mouth = P(); mouth.moveTo(-46, 22); mouth.quadraticCurveTo(0, 12, 46, 22); mouth.bezierCurveTo(42, 46, 24, 60, 0, 62); mouth.bezierCurveTo(-24, 60, -42, 46, -46, 22); mouth.closePath();
  g.lineWidth = 10; g.strokeStyle = s(INK, false); g.stroke(mouth); g.lineWidth = 5; g.strokeStyle = s(GOLD, true); g.stroke(mouth);
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  for (let i = -2; i <= 2; i++) { const x = i * 13, y = 17 + 0.0028 * x * x, t = P(); t.moveTo(x - 6, y); t.lineTo(x + 6, y); t.lineTo(x + 4.5, y + 11); t.lineTo(x, y + 15); t.lineTo(x - 4.5, y + 11); t.closePath(); F(t, IVORY, false, 2.5); }
  for (const sd of [-1, 1]) { const f = P(); f.moveTo(sd * 40, 20); f.bezierCurveTo(sd * 42, 36, sd * 36, 48, sd * 30, 56); f.bezierCurveTo(sd * 30, 42, sd * 28, 30, sd * 27, 19); f.closePath(); F(f, BONE(0, 20, 0, 56), false, 3); }
};

// mata kala pada rupa Murka (pupil baranya digambar shader): letaknya harus sama dengan KAYON.eyes
const KY = 1178, KALA_EYES = [[CX - 88, KY - 36], [CX + 88, KY - 36]];
// 1i. wajah kala / banaspati murka (rupa Murka): duduk di atas pintu gapura, lidahnya menjilat ambang
const drawKala = (g, s) => {
  g.clip(SIL); g.translate(CX, KY);
  // rambut api tiga lapis, lidahnya condong ke atas
  const mane = (scaleL, stops, lw, glow) => {
    for (let i = 0; i < 21; i++) {
      const u = i / 20, a = Math.PI * (0.84 + 1.32 * u), sw = Math.sin(u * Math.PI);
      const R0 = 160, L = scaleL * (58 + 80 * Math.pow(sw, 1.4)), bw = 0.11 + 0.03 * sw;
      const up = -Math.PI / 2, tipA = a + Math.atan2(Math.sin(up - a), Math.cos(up - a)) * 0.32;
      const pt = (ang, r) => [Math.cos(ang) * r, Math.sin(ang) * r];
      const [b1x, b1y] = pt(a - bw, R0), [b2x, b2y] = pt(a + bw, R0), [tx, ty] = pt(tipA, R0 + L);
      const [c1x, c1y] = pt(a - bw * 0.2, R0 + L * 0.62), [c2x, c2y] = pt(a + bw * 1.5, R0 + L * 0.42);
      const p = P(); p.moveTo(b1x, b1y); p.quadraticCurveTo(c1x, c1y, tx, ty); p.quadraticCurveTo(c2x, c2y, b2x, b2y); p.closePath();
      g.lineJoin = 'round'; if (lw) { g.lineWidth = lw; g.strokeStyle = s(INK, false); g.stroke(p); }
      g.fillStyle = s({ rad: [0, 0, R0 * 0.8, 0, 0, R0 + 150], stops }, false, false, glow); g.fill(p);
    }
  };
  mane(1.0, [[0, '#f0b04a'], [0.45, '#b8361a'], [1, '#2e0704']], 7);
  mane(0.7, [[0, '#ffd27a'], [0.6, '#e0642a'], [1, '#7a1a0c']], 0);
  mane(0.42, [[0, '#fff0b0'], [1, '#f0a540']], 0, '#3a1204');
  // tanduk melengkung
  for (const sd of [-1, 1]) {
    const o = [[sd * 66, -150], [sd * 108, -236], [sd * 176, -262], [sd * 232, -280]], n = [[sd * 126, -128], [sd * 150, -198], [sd * 192, -238], [sd * 232, -280]];
    const h = P(); h.moveTo(...o[0]); h.bezierCurveTo(...o[1], ...o[2], ...o[3]); h.bezierCurveTo(...n[2], ...n[1], ...n[0]); h.closePath();
    fs(g, s, h, { lin: [sd * 80, -140, sd * 232, -280], stops: [[0, '#3a2410'], [0.45, '#b49a6a'], [1, '#fff4d8']] }, false, 8);
    g.strokeStyle = s(INK, false); g.lineWidth = 3.5;
    for (let k = 2; k < 9; k++) { const t = k / 10, a = bez(...o, t), b = bez(...n, t); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    { const a = bez(...o, 0.2), b = bez(...n, 0.2); g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 16; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.strokeStyle = s(GOLD, true); g.lineWidth = 9; g.stroke(); }
  }
  // tangan bercakar muncul dari balik api
  const hand = (sd) => {
    g.save(); g.scale(sd, 1);
    const pc = [262, 50];
    const arm = P(); arm.moveTo(232, 140); arm.bezierCurveTo(250, 110, 258, 90, 246, 70); arm.lineTo(290, 64); arm.bezierCurveTo(300, 92, 292, 124, 276, 152); arm.closePath();
    fs(g, s, arm, SKIN(240, 60, 290, 150), false, 6);
    g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(244, 106); g.lineTo(290, 114); g.stroke();
    const finger = (deg, len, bend) => {
      const a = deg * Math.PI / 180, bx = pc[0] + Math.cos(a) * 24, by = pc[1] + Math.sin(a) * 24;
      const kx = bx + Math.cos(a) * len * 0.55, ky = by + Math.sin(a) * len * 0.55, a2 = a - bend, tx = kx + Math.cos(a2) * len * 0.5, ty = ky + Math.sin(a2) * len * 0.5;
      g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(tx, ty);
      g.strokeStyle = s(INK, false); g.lineWidth = 22; g.stroke(); g.strokeStyle = s('#a83220', false); g.lineWidth = 14; g.stroke();
      const a3 = a2 - 0.55, nx = tx + Math.cos(a3) * 34, ny = ty + Math.sin(a3) * 34, px = Math.cos(a2 + Math.PI / 2) * 7, py = Math.sin(a2 + Math.PI / 2) * 7;
      const nail = P(); nail.moveTo(tx + px, ty + py); nail.quadraticCurveTo(tx + Math.cos(a2) * 24, ty + Math.sin(a2) * 24, nx, ny); nail.lineTo(tx - px, ty - py); nail.closePath();
      fs(g, s, nail, BONE(tx, ty, nx, ny), false, 3.5);
    };
    [[-130, 56], [-102, 66], [-74, 62], [-46, 50]].forEach(([d, l]) => finger(d, l, 0.4));
    finger(168, 38, -0.5);
    const palm = P(); palm.ellipse(pc[0], pc[1], 34, 30, -0.3, 0, Math.PI * 2); fs(g, s, palm, SKIN(230, 20, 300, 90), false, 6);
    g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.arc(pc[0] + 4, pc[1] + 4, 16, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
    g.restore();
  };
  hand(-1); hand(1);
  // muka
  const face = P(); face.moveTo(-186, -12); face.bezierCurveTo(-200, -112, -122, -178, 0, -182); face.bezierCurveTo(122, -178, 200, -112, 186, -12);
  face.bezierCurveTo(184, 84, 120, 216, 0, 230); face.bezierCurveTo(-120, 216, -184, 84, -186, -12); face.closePath();
  g.lineWidth = 14; g.strokeStyle = s(INK, false); g.stroke(face);
  g.fillStyle = s({ rad: [0, -40, 20, 0, 0, 230], stops: [[0, '#c8432b'], [0.7, '#7a1d12'], [1, '#3e0b07']] }, false); g.fill(face);
  g.lineWidth = 8; g.strokeStyle = s(GOLD, true); g.stroke(face);
  // jamang (ikat kepala emas) berlubang + permata
  g.save(); g.clip(face);
  g.strokeStyle = s(INK, false); g.lineWidth = 32; g.beginPath(); g.arc(0, 40, 205, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.strokeStyle = s(GOLD, true); g.lineWidth = 24; g.stroke();
  g.fillStyle = s(INK, false, true); for (let k = 0; k < 13; k++) { const a = Math.PI * (1.18 + k * 0.053); g.beginPath(); g.arc(Math.cos(a) * 205, 40 + Math.sin(a) * 205, 4.5, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.fillStyle = s(GOLD, true); g.beginPath(); g.moveTo(0, -196); g.lineTo(20, -164); g.lineTo(0, -138); g.lineTo(-20, -164); g.closePath(); g.fill();
  g.fillStyle = s('#b0180c', false, false, '#5a0a02'); g.beginPath(); g.arc(0, -165, 9, 0, Math.PI * 2); g.fill();
  // alis murka menyala, bulunya lidah api
  for (const sd of [-1, 1]) {
    const c = [[sd * 14, -64], [sd * 62, -94], [sd * 124, -136], [sd * 182, -126]];
    const b = P(); b.moveTo(...c[0]); b.bezierCurveTo(...c[1], ...c[2], ...c[3]); b.lineTo(sd * 176, -100);
    b.bezierCurveTo(sd * 128, -108, sd * 70, -74, sd * 30, -42); b.closePath();
    fs(g, s, b, { lin: [0, -130, 0, -40], stops: [[0, '#f0d080'], [1, '#8a6224']] }, true, 6);
    for (let k = 0; k < 7; k++) {
      const [x, y] = bez(...c, 0.1 + k * 0.13), f = P();
      f.moveTo(x - sd * 10, y + 3); f.quadraticCurveTo(x + sd * 2, y - 22, x + sd * 18, y - 30 - k * 2); f.quadraticCurveTo(x + sd * 6, y - 10, x + sd * 10, y + 4); f.closePath();
      fs(g, s, f, GOLD, true, 3);
    }
  }
  g.strokeStyle = s(INK, false); g.lineCap = 'round'; g.lineWidth = 6;
  for (const x of [-14, 0, 14]) { g.beginPath(); g.moveTo(x, -116); g.quadraticCurveTo(x * 1.4, -92, x * 0.6, -70); g.stroke(); }
  // mata melotot berurat; iris menyala; lubang tembus cahaya (pupil 3D mengambang di depannya)
  for (const sd of [-1, 1]) {
    const ex = sd * 88, ey = -36;
    g.fillStyle = s({ rad: [ex, ey, 44, ex, ey, 94], stops: [[0, 'rgba(26,3,2,0.9)'], [1, 'rgba(26,3,2,0)']] }, false); g.beginPath(); g.arc(ex, ey, 94, 0, Math.PI * 2); g.fill();
    g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.beginPath(); g.arc(ex, ey + 8, 66, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = s(INK, false); g.beginPath(); g.arc(ex, ey, 61, 0, Math.PI * 2); g.fill();
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(ex, ey, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = s({ rad: [ex, ey, 20, ex, ey, 48], stops: [[0, '#f4ead0'], [1, '#c2a77c']] }, false); g.beginPath(); g.arc(ex, ey, 48, 0, Math.PI * 2); g.fill();
    g.strokeStyle = s('#a01e12', false); g.lineWidth = 2.4;
    for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2 + 0.3; g.beginPath(); g.moveTo(ex + Math.cos(a) * 47, ey + Math.sin(a) * 47); g.quadraticCurveTo(ex + Math.cos(a + 0.22) * 41, ey + Math.sin(a + 0.22) * 41, ex + Math.cos(a - 0.08) * 35, ey + Math.sin(a - 0.08) * 35); g.stroke(); }
    g.fillStyle = s({ rad: [ex, ey, 10, ex, ey, 35], stops: [[0, '#ff6a20'], [1, '#5a0a05']] }, false, false, EYE_GLOW); g.beginPath(); g.arc(ex, ey, 35, 0, Math.PI * 2); g.fill();
    g.strokeStyle = s(INK, false); g.lineWidth = 4; g.stroke();
    g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(ex, ey, 25, 0, Math.PI * 2); g.fill();
    // kelopak atas miring ke dalam: tatapan murka
    g.save(); g.beginPath(); g.arc(ex, ey, 57, 0, Math.PI * 2); g.clip();
    const lid = P(); lid.moveTo(ex + sd * 70, ey - 44); lid.lineTo(ex - sd * 70, ey - 22); lid.lineTo(ex - sd * 70, ey - 90); lid.lineTo(ex + sd * 70, ey - 90); lid.closePath();
    g.fillStyle = s({ lin: [0, ey - 70, 0, ey - 20], stops: [[0, '#5a120b'], [1, '#a8321f']] }, false); g.fill(lid);
    g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.beginPath(); g.moveTo(ex + sd * 70, ey - 44); g.lineTo(ex - sd * 70, ey - 22); g.stroke();
    g.restore();
  }
  // hidung bulat, cuping mengembang
  const nose = P(); nose.moveTo(0, -48); nose.bezierCurveTo(26, -38, 66, 6, 60, 36); nose.bezierCurveTo(54, 58, 22, 56, 0, 48); nose.bezierCurveTo(-22, 56, -54, 58, -60, 36); nose.bezierCurveTo(-66, 6, -26, -38, 0, -48); nose.closePath();
  fs(g, s, nose, { rad: [0, 0, 6, 0, 10, 64], stops: [[0, '#d0553a'], [1, '#5a120b']] }, false, 6); g.lineWidth = 4; g.strokeStyle = s(GOLD, true); g.stroke(nose);
  for (const sd of [-1, 1]) { g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(sd * 30, 38, 14, 8, sd * 0.35, 0, Math.PI * 2); g.fill(); }
  for (const sd of [-1, 1]) {
    g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 7;
    g.beginPath(); g.moveTo(sd * 56, 18); g.bezierCurveTo(sd * 92, 18, sd * 118, 34, sd * 134, 62); g.stroke();
    g.beginPath(); g.moveTo(sd * 62, -2); g.bezierCurveTo(sd * 96, -4, sd * 124, 8, sd * 146, 30); g.stroke();
    g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.moveTo(sd * 58, 24); g.bezierCurveTo(sd * 92, 24, sd * 114, 40, sd * 128, 64); g.stroke();
  }
  ukel(g, s, -172, 4, 16, -1, 5); ukel(g, s, 172, 4, 16, 1, 5);
  // mulut menganga: berlubang, jadi di bayangan tampak mulut menyala
  const lipY = (x) => 58 + 16 * (x / 140) ** 2;
  const mouth = P(); mouth.moveTo(-142, lipY(142)); for (let x = -134; x <= 142; x += 8) mouth.lineTo(x, lipY(x));
  mouth.bezierCurveTo(130, 110, 90, 196, 0, 204); mouth.bezierCurveTo(-90, 196, -130, 110, -142, lipY(142)); mouth.closePath();
  g.lineWidth = 18; g.strokeStyle = s(INK, false); g.stroke(mouth); g.lineWidth = 9; g.strokeStyle = s(GOLD, true); g.stroke(mouth);
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  for (let i = -3; i <= 3; i++) { const x = i * 24, y = lipY(x), t = P(); t.moveTo(x - 10, y - 2); t.lineTo(x + 10, y - 2); t.lineTo(x + 8, y + 18); t.lineTo(x, y + 25); t.lineTo(x - 8, y + 18); t.closePath(); fs(g, s, t, IVORY, false, 3); }
  for (let i = -2; i <= 2; i++) { const x = i * 26, y = 198 - Math.abs(i) * 7, t = P(); t.moveTo(x - 9, y + 4); t.lineTo(x, y - 17); t.lineTo(x + 9, y + 4); t.closePath(); fs(g, s, t, IVORY, false, 3); }
  for (const sd of [-1, 1]) {
    const f = P(); f.moveTo(sd * 120, lipY(120) - 2); f.bezierCurveTo(sd * 124, 110, sd * 110, 150, sd * 92, 186); f.bezierCurveTo(sd * 92, 140, sd * 90, 106, sd * 86, lipY(86) - 2); f.closePath();
    fs(g, s, f, BONE(0, 60, 0, 186), false, 4);
    const tk = P(); tk.moveTo(sd * 104, 170); tk.bezierCurveTo(sd * 138, 148, sd * 154, 104, sd * 150, 40); tk.bezierCurveTo(sd * 140, 86, sd * 128, 122, sd * 118, 178); tk.closePath();
    fs(g, s, tk, BONE(0, 178, 0, 40), false, 4);
  }
  // lidah menjulur keluar melewati dagu
  const tg = P(); tg.moveTo(-48, 150); tg.bezierCurveTo(-60, 222, -40, 268, 0, 276); tg.bezierCurveTo(40, 268, 60, 222, 48, 150); tg.closePath();
  fs(g, s, tg, { lin: [0, 150, 0, 276], stops: [[0, '#5a0f0a'], [0.4, '#c8402a'], [1, '#e8684a']] }, false, 6, '#2a0402');
  g.strokeStyle = s(GOLD, true); g.lineWidth = 4; g.stroke(tg);
  g.strokeStyle = s(INK, false); g.lineWidth = 4; g.beginPath(); g.moveTo(0, 176); g.quadraticCurveTo(-4, 220, 0, 256); g.stroke();
};

// 1g. dua raksasa penjaga gapura (Cingkarabala & Balaupata): gada berduri terangkat, rambut gimbal, siung
const drawGuard = (g, s) => {
  const F = (p, col, metal, lw = 6, glow) => fs(g, s, p, col, metal, lw, glow);
  const skin = { lin: [300, 1520, 410, 1700], stops: [[0, '#c4432c'], [1, '#5c140c']] };
  const kainC = { lin: [300, 1690, 300, 1770], stops: [[0, '#24525c'], [1, '#0c262c']] };
  // rambut gimbal terurai di punggung
  for (let k = 0; k < 6; k++) {
    const x0 = 328 - k * 3, y0 = 1544 + k * 9, lock = P(); lock.moveTo(x0, y0);
    for (let i = 1; i <= 14; i++) { const t = i / 14; lock.lineTo(x0 - 8 - t * (24 + k * 5) + Math.sin(t * 9 + k) * 5, y0 + t * (74 + k * 12)); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = s(INK, false); g.lineWidth = 12; g.stroke(lock); g.strokeStyle = s('#2e140c', false); g.lineWidth = 7; g.stroke(lock);
    g.strokeStyle = s(GOLD_D, true); g.lineWidth = 1.8; g.stroke(lock);
  }
  const kain = P(); kain.moveTo(326, 1688); kain.lineTo(388, 1688); kain.bezierCurveTo(404, 1712, 414, 1740, 412, 1762); kain.lineTo(300, 1764); kain.bezierCurveTo(298, 1738, 310, 1708, 326, 1688); kain.closePath();
  const dodot = P(); dodot.moveTo(318, 1700); dodot.bezierCurveTo(280, 1722, 262, 1760, 272, 1794); dodot.bezierCurveTo(288, 1784, 298, 1762, 306, 1742); dodot.closePath();
  const legs = P();
  legs.moveTo(318, 1760); legs.lineTo(302, 1798); legs.lineTo(334, 1801); legs.lineTo(344, 1762); legs.closePath();
  legs.moveTo(372, 1760); legs.lineTo(392, 1798); legs.lineTo(430, 1801); legs.lineTo(396, 1760); legs.closePath();
  const body = P(); body.moveTo(336, 1600); body.lineTo(352, 1600); body.bezierCurveTo(372, 1606, 392, 1612, 398, 1630); body.bezierCurveTo(404, 1652, 392, 1676, 380, 1692); body.lineTo(330, 1692); body.bezierCurveTo(318, 1670, 306, 1640, 312, 1622); body.bezierCurveTo(318, 1610, 326, 1604, 336, 1600); body.closePath();
  const armB = P(); armB.moveTo(314, 1622); armB.bezierCurveTo(302, 1650, 296, 1676, 294, 1702); armB.lineTo(305, 1705); armB.bezierCurveTo(309, 1680, 315, 1656, 323, 1632); armB.closePath();
  F(dodot, kainC); F(legs, skin); F(kain, kainC);
  g.save(); g.clip(kain); g.strokeStyle = s(GOLD, true); g.lineWidth = 4;
  for (let k = -120; k < 170; k += 18) { g.beginPath(); g.moveTo(290 + k, 1690); g.lineTo(290 + k + 90, 1770); g.stroke(); }
  g.restore();
  F(armB, skin);
  for (let k = 0; k < 3; k++) { const c = P(), x = 294 + k * 5, y = 1702 + k; c.moveTo(x, y); c.quadraticCurveTo(x - 4, y + 14, x - 12, y + 18); c.quadraticCurveTo(x - 2, y + 10, x + 4, y + 2); c.closePath(); F(c, IVORY, false, 2.5); }
  F(body, skin);
  // gada berduri terangkat tinggi
  const shaft = P(); shaft.moveTo(424, 1606); shaft.lineTo(432, 1606); shaft.lineTo(451, 1446); shaft.lineTo(443, 1445); shaft.closePath(); F(shaft, GOLD_D, true, 4);
  const mace = P(); mace.moveTo(437, 1452); mace.bezierCurveTo(420, 1430, 424, 1394, 447, 1366); mace.bezierCurveTo(470, 1394, 472, 1430, 455, 1452); mace.closePath();
  for (const y of [1440, 1424, 1408, 1392, 1378]) for (const sd of [-1, 1]) {
    const w = 22 * Math.pow(Math.sin((Math.PI * (1452 - y)) / 86), 0.8), bx = 446 + sd * (w - 2), sp = P();
    sp.moveTo(bx, y - 6); sp.lineTo(bx + sd * 16, y - 4); sp.lineTo(bx, y + 4); sp.closePath(); F(sp, IVORY, false, 2.5);
  }
  { const sp = P(); sp.moveTo(441, 1372); sp.lineTo(447, 1346); sp.lineTo(453, 1372); sp.closePath(); F(sp, IVORY, false, 2.5); }
  F(mace, { lin: [420, 1366, 470, 1452], stops: [[0, '#f0d080'], [1, '#7a5a24']] }, true, 5);
  g.strokeStyle = s(INK, false); g.lineWidth = 3; for (const y of [1390, 1412, 1434]) { g.beginPath(); g.moveTo(430, y); g.lineTo(462, y); g.stroke(); }
  const armF = P(); armF.moveTo(382, 1614); armF.bezierCurveTo(400, 1604, 416, 1588, 422, 1562); armF.lineTo(444, 1560); armF.bezierCurveTo(442, 1590, 420, 1618, 394, 1634); armF.closePath(); F(armF, skin);
  const fist = P(); fist.ellipse(434, 1552, 15, 13, 0, 0, Math.PI * 2); F(fist, skin, false, 5);
  g.strokeStyle = s(INK, false); g.lineWidth = 2.5; for (const y of [1546, 1554]) { g.beginPath(); g.moveTo(424, y); g.lineTo(444, y + 1); g.stroke(); }
  g.strokeStyle = s(GOLD, true); g.lineWidth = 7; g.beginPath(); g.moveTo(414, 1578); g.lineTo(438, 1586); g.stroke();
  // kepala
  const head = P();
  head.moveTo(320, 1532); head.lineTo(378, 1528); head.bezierCurveTo(390, 1534, 398, 1542, 404, 1548); head.bezierCurveTo(416, 1552, 414, 1566, 400, 1565);
  head.lineTo(405, 1572); head.lineTo(392, 1575); head.lineTo(398, 1585); head.bezierCurveTo(392, 1595, 380, 1599, 366, 1599); head.bezierCurveTo(352, 1601, 342, 1603, 338, 1605); head.bezierCurveTo(324, 1590, 314, 1566, 320, 1532); head.closePath();
  const crown = P(); crown.moveTo(316, 1536); crown.lineTo(320, 1508); crown.lineTo(330, 1500); crown.lineTo(332, 1478); crown.lineTo(342, 1470); crown.lineTo(344, 1448); crown.lineTo(354, 1418); crown.lineTo(364, 1448); crown.lineTo(366, 1470); crown.lineTo(376, 1478); crown.lineTo(378, 1500); crown.lineTo(386, 1508); crown.lineTo(384, 1532); crown.closePath();
  const mungkur = P(); { let f = true; for (let i = 0; i <= 40; i++) { const t = i / 40, a = Math.PI * 0.1 + t * Math.PI * 2.3, r = 26 * (1 - t * 0.82); const x = 306 - Math.cos(a) * r, y = 1500 + Math.sin(a) * r; f ? (mungkur.moveTo(x, y), f = false) : mungkur.lineTo(x, y); } }
  F(head, skin); F(crown, GOLD, true);
  g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 11; g.stroke(mungkur); g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.stroke(mungkur);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.beginPath(); g.moveTo(318, 1534); g.lineTo(384, 1530); g.stroke();
  const sumping = P(); sumping.moveTo(334, 1540); sumping.bezierCurveTo(318, 1548, 314, 1566, 324, 1578); sumping.bezierCurveTo(330, 1566, 336, 1556, 340, 1546); sumping.closePath(); F(sumping, GOLD, true);
  g.lineCap = 'round'; g.strokeStyle = s(GOLD, true);
  g.lineWidth = 7; g.beginPath(); g.moveTo(330, 1690); g.lineTo(386, 1690); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(338, 1608); g.bezierCurveTo(356, 1622, 376, 1622, 390, 1612); g.stroke();
  g.beginPath(); g.moveTo(296, 1694); g.lineTo(306, 1696); g.stroke();
  // mata melotot menyala + alis murka
  g.fillStyle = s(INK, false); g.beginPath(); g.arc(372, 1543, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(372, 1543, 15.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(IVORY, false); g.beginPath(); g.arc(372, 1543, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = s('#c01e0e', false, false, EYE_GLOW); g.beginPath(); g.arc(375, 1543, 7.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(376, 1543, 3, 0, Math.PI * 2); g.fill();
  const brow = P(); brow.moveTo(348, 1520); brow.bezierCurveTo(364, 1512, 386, 1520, 400, 1540); brow.lineTo(392, 1544); brow.bezierCurveTo(382, 1532, 366, 1528, 352, 1532); brow.closePath(); F(brow, GOLD, true, 4);
  // mulut terbuka: siung atas & taring bawah mencuat
  g.fillStyle = s(INK, false, true); g.beginPath(); g.moveTo(392, 1575); g.lineTo(405, 1572); g.lineTo(399, 1583); g.closePath(); g.fill();
  const fang = P(); fang.moveTo(395, 1574); fang.lineTo(402, 1574); fang.lineTo(400, 1599); fang.closePath(); F(fang, IVORY, false, 2.5);
  const tusk = P(); tusk.moveTo(386, 1594); tusk.bezierCurveTo(398, 1590, 410, 1580, 417, 1560); tusk.bezierCurveTo(408, 1576, 398, 1584, 384, 1587); tusk.closePath(); F(tusk, BONE(386, 1594, 417, 1560), false, 2.5);
  g.fillStyle = s(INK, false, true); [[354, 1442], [354, 1468], [344, 1488], [364, 1488], [336, 1514], [354, 1512], [372, 1514]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill(); });
  // tameng bundar di depan badan (acuan: penjaga bertameng)
  const sh = P(); sh.arc(398, 1668, 47, 0, Math.PI * 2); F(sh, { rad: [386, 1654, 6, 398, 1668, 47], stops: [[0, GOLD_L], [1, GOLD_D]] }, true, 7);
  const shIn = P(); shIn.arc(398, 1668, 35, 0, Math.PI * 2); F(shIn, { rad: [398, 1668, 4, 398, 1668, 35], stops: [[0, '#d23a22'], [1, '#6a120b']] }, false, 4);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, pt = P(); pt.ellipse(398 + Math.cos(a) * 19, 1668 + Math.sin(a) * 19, 11, 5.5, a, 0, Math.PI * 2); F(pt, GOLD, true, 2.5); }
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(398, 1668, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(398, 1668, 3.6, 0, Math.PI * 2); g.fill();
};

// Susunan gambar, dari belakang ke depan: lar → gapura → (Agung: makara, kala kecil, satwa | Murka: satwa, kala besar) → penjaga
layer((g, s) => { FIELD(g); wing(g, s); g.translate(2 * CX, 0); g.scale(-1, 1); wing(g, s); });
layer((g, s) => { g.clip(SIL); gate(g, s); });
if (AGUNG) {
  layer((g, s) => { FIELD(g); for (const sd of [-1, 1]) { g.save(); g.translate(CX + sd * MAKARA[0], MAKARA[1]); g.scale(-sd * MAKARA[2], MAKARA[2]); makara(g, s); g.restore(); } });
  layer((g, s) => { g.clip(SIL); g.translate(CX, 1040); kalaAlit(g, s); });
}
// banteng (kiri) dan macan (kanan) berhadapan mengapit batang: di atas mega kala (Agung) atau di atas surai api (Murka)
const ANIMAL_Y = AGUNG ? 905 : 822;
layer((g, s) => {
  FIELD(g);
  g.save(); g.translate(CX - 262, ANIMAL_Y); g.scale(0.92, 0.92); banteng(g, s); g.restore();
  g.save(); g.translate(CX + 262, ANIMAL_Y); g.scale(-0.92, 0.92); macan(g, s); g.restore();
});
if (!AGUNG) layer((g, s) => drawKala(g, s));
// penjaga berdiri di lantai, di kiri-kanan undakan
layer((g, s) => {
  g.clip(SIL);
  for (const sd of [-1, 1]) { g.save(); g.translate(CX + sd * 350, 1712); g.scale(-sd * 0.74, 0.74); g.translate(-362, -1801); drawGuard(g, s); g.restore(); }
});

// 1h. sisi belakang: kobaran api (geni) dengan wajah iblis yang muncul dari dalamnya
const cB = mk();
if (!AGUNG) {
  const g = cB.getContext('2d', { willReadFrequently: true }); g.save(); g.clip(SIL);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0e0201'); bg.addColorStop(0.6, '#2a0603'); bg.addColorStop(1, '#5a1206'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const core = g.createRadialGradient(CX, 1720, 40, CX, 1500, 950); core.addColorStop(0, 'rgba(255,170,60,0.6)'); core.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = core; g.fillRect(0, 0, W, H);
  // lidah api melengkung-S, gradasi dari pangkal gelap ke ujung terang
  const tongue = (x, base, w, h, sway, c0, c1) => {
    const gr = g.createLinearGradient(0, base, 0, base - h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, base);
    g.bezierCurveTo(x - w, base - h * 0.35, x - w * 0.2 + sway, base - h * 0.62, x + sway * 1.3, base - h);
    g.bezierCurveTo(x + w * 0.35 + sway, base - h * 0.55, x + w, base - h * 0.3, x + w, base); g.quadraticCurveTo(x, base + w * 1.3, x - w, base); g.closePath(); g.fill();
  };
  const PAL = [['#2a0503', '#7a160a'], ['#6a1208', '#c8381a'], ['#a8280e', '#f07a2a'], ['#e05a1c', '#ffc560'], ['#ffa63a', '#fff2c0']];
  const blaze = (count, keep) => PAL.forEach(([c0, c1], L) => {
    for (let i = 0; i < count - L * 14; i++) {
      const base = 1840 - rnd() * (1560 - L * 140) - L * 30, half = Math.max(70, halfAt(base) - 20), x = CX + (rnd() - 0.5) * 2 * half;
      const w = 16 + rnd() * 34 - L * 2.5, h = 190 + rnd() * 430 - L * 34, sway = (rnd() - 0.5) * w * 2.4;
      if (keep(x, base, h)) tongue(x, base, w, h, sway, c0, c1);
    }
  });
  blaze(110, () => true);
  // wajah iblis: siluet gelap bertepi bara, mata celah & mulut bergerigi menyala
  g.save(); g.translate(CX, KY);
  const face = P(); face.moveTo(-186, -12); face.bezierCurveTo(-200, -112, -122, -178, 0, -182); face.bezierCurveTo(122, -178, 200, -112, 186, -12);
  face.bezierCurveTo(184, 84, 120, 216, 0, 230); face.bezierCurveTo(-120, 216, -184, 84, -186, -12); face.closePath();
  const horns = P();
  for (const sd of [-1, 1]) { horns.moveTo(sd * 66, -150); horns.bezierCurveTo(sd * 108, -236, sd * 176, -262, sd * 232, -280); horns.bezierCurveTo(sd * 192, -238, sd * 150, -198, sd * 126, -128); horns.closePath(); }
  g.shadowColor = 'rgba(255,120,30,0.9)'; g.shadowBlur = 40;
  g.fillStyle = '#120302'; g.fill(horns); g.fill(face);
  g.shadowBlur = 0;
  g.lineWidth = 5; g.strokeStyle = 'rgba(255,150,50,0.85)'; g.stroke(face); g.stroke(horns);
  g.strokeStyle = 'rgba(120,30,10,0.9)'; g.lineWidth = 6; g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(sd * 16, -70); g.bezierCurveTo(sd * 60, -100, sd * 120, -136, sd * 178, -124); g.stroke();
    g.beginPath(); g.moveTo(sd * 56, 18); g.bezierCurveTo(sd * 92, 18, sd * 118, 34, sd * 134, 62); g.stroke();
  }
  g.beginPath(); g.moveTo(0, -48); g.bezierCurveTo(26, -38, 66, 6, 60, 36); g.bezierCurveTo(54, 58, 22, 56, 0, 48); g.bezierCurveTo(-22, 56, -54, 58, -60, 36); g.bezierCurveTo(-66, 6, -26, -38, 0, -48); g.stroke();
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 88, -36); g.rotate(sd * 0.32);
    const eg = g.createRadialGradient(0, 0, 2, 0, 0, 62); eg.addColorStop(0, '#fffbe6'); eg.addColorStop(0.45, '#ffc44e'); eg.addColorStop(1, '#d83a0c');
    g.shadowColor = 'rgba(255,170,60,1)'; g.shadowBlur = 30; g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, 66, 34, 0, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    g.restore();
  }
  const mg = g.createLinearGradient(0, 60, 0, 205); mg.addColorStop(0, '#fff4c0'); mg.addColorStop(0.5, '#ffb040'); mg.addColorStop(1, '#e8501a');
  const mouth = P(); mouth.moveTo(-150, 60); for (let k = 0; k <= 15; k++) mouth.lineTo(-150 + k * 20, k % 2 ? 92 : 58);
  mouth.bezierCurveTo(140, 120, 96, 214, 0, 220); mouth.bezierCurveTo(-96, 214, -140, 120, -150, 60); mouth.closePath();
  g.shadowColor = 'rgba(255,160,50,1)'; g.shadowBlur = 36; g.fillStyle = mg; g.fill(mouth); g.shadowBlur = 0;
  g.fillStyle = '#160201';
  for (let k = 0; k < 7; k++) { const x = -90 + k * 30, yb = 218 - Math.abs(k - 3) * 9; g.beginPath(); g.moveTo(x - 11, yb); g.lineTo(x, yb - 42 + Math.abs(k - 3) * 4); g.lineTo(x + 11, yb); g.closePath(); g.fill(); }
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 100, 74); g.lineTo(sd * 92, 150); g.lineTo(sd * 80, 76); g.closePath(); g.fill(); }
  g.restore();
  // api di depan hanya di tepi & bawah dagu: wajah tampak muncul dari kobaran
  blaze(90, (x, base, h) => base - h > 1420 || Math.abs(x - CX) > 330);
  g.strokeStyle = GOLD; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = 160 + rnd() * (W - 320), y = 260 + rnd() * 1400, r0 = 16 + rnd() * 24, dir = rnd() > 0.5 ? 1 : -1;
    if (Math.abs(x - CX) < 330 && Math.abs(y - KY) < 340) continue;
    g.lineWidth = 5; g.beginPath(); for (let k = 0; k <= 36; k++) { const t = k / 36, a = dir * t * Math.PI * 2.2, r = r0 * (1 - t * 0.8); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  }
  g.restore(); g.strokeStyle = GOLD; g.lineWidth = 9; g.stroke(outerEdge);
}
return { W, H, cA, cC, cM, cE, cB, SIL, KALA_EYES };
}
