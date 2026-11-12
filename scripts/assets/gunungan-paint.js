// Pelukis gunungan untuk panggung 3D (kode browser; dijalankan oleh scripts/assets/bake-gunungan.cjs).
// Asalnya bagian "1. GAMBAR GUNUNGAN" di prototypes/gunungan/scene.js (rupa "Murka", disetujui host 8 Nov 2026),
// disalin ke sini supaya gambar produksi bisa berkembang tanpa mengubah prototipe acuan. Tambahan di sini:
// rupa "Agung" (arahan host 12 Nov: "redesign/remodel/upgrade ... jangan yang murka aja"): bingkai dan panel
// nila, tanpa gigi api, wajah kala besar diganti medali surya-padma berlubang dan sepasang merak.
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

const GOLD = '#c9a052', GOLD_D = '#7a5a24', INK = '#140804', RED = '#8f2418', RED_D = '#4a0f0a', IVORY = '#eadcbc', LEATHER = '#c4a273';
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

// Siluet: ujung lancip, melebar di sepertiga bawah, dasar datar + tangkai
const sil = new THREE.Shape();
sil.moveTo(700, 30);
sil.bezierCurveTo(760, 160, 1010, 520, 1180, 850);
sil.bezierCurveTo(1330, 1140, 1360, 1400, 1300, 1590);
sil.bezierCurveTo(1260, 1720, 1150, 1800, 1020, 1815);
sil.lineTo(770, 1815); sil.lineTo(748, 1990); sil.lineTo(652, 1990); sil.lineTo(630, 1815);
sil.lineTo(380, 1815);
sil.bezierCurveTo(250, 1800, 140, 1720, 100, 1590);
sil.bezierCurveTo(40, 1400, 70, 1140, 220, 850);
sil.bezierCurveTo(390, 520, 640, 160, 700, 30);
const silPts = sil.getSpacedPoints(900);
const toPath2D = (pts) => { const p = new Path2D(); pts.forEach((v, i) => i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)); p.closePath(); return p; };
const SIL = toPath2D(silPts);
const GATE_TOP = 1440;
const inset = (d) => silPts.map((p, i) => {
  const a = silPts[(i + silPts.length - 1) % silPts.length], b = silPts[(i + 1) % silPts.length];
  let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }
  return new THREE.Vector2(p.x + nx * d, p.y + ny * d);
});
const innerEdge = toPath2D(inset(58)), outerEdge = toPath2D(inset(6)), midEdge = toPath2D(inset(44));
const FIELD = (g) => { g.clip(SIL); g.clip(toPath2D(inset(56))); g.beginPath(); g.rect(0, 120, W, GATE_TOP - 120); g.clip(); };

// 1a. dasar kulit
layer((g, s) => { g.fillStyle = s(LEATHER, false); g.fill(SIL); });
// 1b. bidang dalam dibolongi (renda), bingkai merah darah dikembalikan
layer((g, s) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip();
  g.fillStyle = s(INK, false, true); g.fillRect(0, 0, W, GATE_TOP);
  g.lineJoin = 'round'; g.strokeStyle = s({ lin: [0, 0, 0, GATE_TOP], stops: AGUNG ? [[0, '#0d1640'], [0.55, '#1f3186'], [1, '#0a1030']] : [[0, '#4a0c08'], [0.55, '#8a2215'], [1, '#330805']] }, false); g.lineWidth = 118; g.stroke(SIL);
});
layer((g, s) => {
  g.clip(SIL);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 9; g.stroke(outerEdge);
  g.beginPath(); g.rect(0, 150, W, GATE_TOP + 8 - 150); g.clip();
  g.lineWidth = 10; g.stroke(innerEdge); g.lineWidth = 3; g.stroke(midEdge);
});
// lubang bubukan + mas-masan sepanjang bingkai
const ringPts = inset(26), dotPts = inset(48);
layer((g, s) => {
  for (let i = 0; i < ringPts.length; i += 7) { const p = ringPts[i]; if (p.y > GATE_TOP - 10 || p.y < 70) continue; g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(p.x, p.y, 9, 9, 0, 0, Math.PI * 2); g.fill(); }
  for (let i = 3; i < dotPts.length; i += 7) { const p = dotPts[i]; if (p.y > GATE_TOP - 16 || p.y < 110) continue; g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2); g.fill(); }
});
// gigi api di tepi dalam bingkai (seperti duri), condong ke atas: hanya rupa Murka
if (!AGUNG) layer((g, s) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip();
  const E = inset(62);
  for (let i = 0; i < E.length; i += 13) {
    const p = E[i], q = E[(i + 2) % E.length]; if (p.y > GATE_TOP - 40 || p.y < 150) continue;
    let tx = q.x - p.x, ty = q.y - p.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = -ty, ny = tx; if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }
    const L = 34, w = 10, ux = (nx + 0) * 0.7, uy = (ny - 0.7) * 0.7, ul = Math.hypot(ux, uy) || 1;
    const dx = ux / ul, dy = uy / ul;
    const f = P(); f.moveTo(p.x - tx * w, p.y - ty * w);
    f.quadraticCurveTo(p.x + nx * L * 0.5, p.y + ny * L * 0.5, p.x + dx * L, p.y + dy * L);
    f.quadraticCurveTo(p.x + nx * L * 0.3 + tx * w * 0.6, p.y + ny * L * 0.3 + ty * w * 0.6, p.x + tx * w, p.y + ty * w); f.closePath();
    fs(g, s, f, GOLD, true, 3);
  }
});
// 1c. renda belah ketupat + titik inten di persilangan
layer((g, s) => {
  FIELD(g); g.strokeStyle = s(GOLD_D, true); g.lineWidth = 4;
  for (let k = -H; k < W + H; k += 52) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke();
    g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke();
  }
  g.fillStyle = s(GOLD_D, true);
  for (let i = 0; i < 120; i++) for (let j = 0; j < 120; j++) { const k1 = -H + 52 * i, k2 = 52 * j, x = (k1 + k2) / 2, y = (k2 - k1) / 2; if (x < 0 || x > W || y < 0 || y > GATE_TOP) continue; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
});

// 1d. pohon hayat: batang bertatah, cabang berukel, daun gelap bergradasi
const halfWidthAt = (y) => { let maxX = CX; for (const p of inset(70)) if (Math.abs(p.y - y) < 8) maxX = Math.max(maxX, p.x); return maxX - CX; };
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
layer((g, s) => {
  FIELD(g);
  const trunk = P(); trunk.moveTo(CX, GATE_TOP + 4);
  for (let y = GATE_TOP; y >= 300; y -= 20) trunk.lineTo(CX + Math.sin(y * 0.012) * 9, y);
  strokeBoth(g, s, trunk, 32, GOLD, true);
  g.fillStyle = s(INK, false, true);
  for (let y = GATE_TOP - 30; y > 330; y -= 26) { g.beginPath(); g.arc(CX + Math.sin(y * 0.012) * 9, y, 4.5, 0, Math.PI * 2); g.fill(); }
  let k = 0;
  for (let y0 = 1360; y0 > 330; y0 -= 92, k++) {
    const hw = Math.max(60, halfWidthAt(y0 - 110) - 30);
    for (const sd of [-1, 1]) {
      const ex = CX + sd * hw * 0.82, ey = y0 - 115;
      const br = P(); br.moveTo(CX, y0);
      br.bezierCurveTo(CX + sd * hw * 0.25, y0 - 40, CX + sd * hw * 0.55, y0 - 30, ex, ey);
      const R0 = Math.min(42, hw * 0.22); let px = ex, py = ey;
      for (let i = 1; i <= 30; i++) { const t = i / 30, ang = -Math.PI / 2 + sd * t * Math.PI * 1.8, r = R0 * (1 - t * 0.85); px = ex + Math.cos(ang) * r * sd; py = ey + R0 + Math.sin(ang) * r; br.lineTo(px, py); }
      strokeBoth(g, s, br, Math.max(9, 17 - k * 0.8), '#a8823e', true);
      for (const t of [0.35, 0.62]) {
        const lx = CX + sd * hw * 0.55 * t * 1.4, ly = y0 - 60 * t - 18;
        leaf(g, s, lx, ly, sd > 0 ? -0.9 : Math.PI + 0.9, 46 - k * 1.6, (k + (t > 0.5 ? 1 : 0)) % 2);
        leaf(g, s, lx, ly + 8, sd > 0 ? 0.55 : Math.PI - 0.55, 36 - k * 1.2, !(k % 2));
      }
      g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = s(RED, false); g.beginPath(); g.arc(px, py, 3, 0, Math.PI * 2); g.fill();
    }
  }
  const bud = P(); bud.moveTo(CX, 340); bud.bezierCurveTo(CX + 40, 300, CX + 26, 240, CX, 190); bud.bezierCurveTo(CX - 26, 240, CX - 40, 300, CX, 340);
  g.fillStyle = s({ lin: [CX, 340, CX, 190], stops: [[0, '#4a0c08'], [1, '#e0623f']] }, false, false, '#3a0802'); g.fill(bud); g.lineWidth = 6; g.strokeStyle = s(GOLD, true); g.stroke(bud);
});

// 1d'. sepasang naga melilit batang, kepala bermahkota, rahang menganga ke luar
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
const naga = (g, s) => {
  const pts = [[690, 905], [760, 862], [705, 800], [625, 742], [700, 682], [780, 624], [800, 572], [830, 538]];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const N = 140, Q = curve.getPoints(N), wAt = (i) => 7 + 19 * Math.pow(i / N, 0.8);
  const pass = (extra, col, metal, wf = 1) => { g.lineCap = 'round'; g.strokeStyle = s(col, metal); for (let i = 1; i <= N; i++) { g.lineWidth = wAt(i) * wf + extra; g.beginPath(); g.moveTo(Q[i - 1].x, Q[i - 1].y); g.lineTo(Q[i].x, Q[i].y); g.stroke(); } };
  pass(8, INK, false); pass(0, '#163626', false); pass(0, '#3f7a54', false, 0.42);
  for (let i = 4; i < N - 2; i += 5) {
    const p = Q[i], q = Q[i + 1], w = wAt(i);
    let tx = q.x - p.x, ty = q.y - p.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const nx = -ty, ny = tx;
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(p.x, p.y, Math.max(2, w * 0.14), 0, Math.PI * 2); g.fill();
    if (i % 10 === 4) { // sirip punggung, menyapu ke arah ekor
      const bx = p.x + nx * w * 0.45, by = p.y + ny * w * 0.45, f = P();
      f.moveTo(bx + tx * w * 0.35, by + ty * w * 0.35); f.lineTo(bx + nx * w * 0.75 - tx * w * 0.5, by + ny * w * 0.75 - ty * w * 0.5); f.lineTo(bx - tx * w * 0.35, by - ty * w * 0.35); f.closePath();
      fs(g, s, f, GOLD, true, 3);
    }
  }
  const e = Q[N], b = Q[N - 6];
  g.save(); g.translate(e.x, e.y); g.rotate(Math.atan2(e.y - b.y, e.x - b.x)); g.scale(1.1, 1.1); g.translate(-6, 0); nagaHead(g, s); g.restore();
};
layer((g, s) => { FIELD(g); naga(g, s); g.translate(2 * CX, 0); g.scale(-1, 1); naga(g, s); });

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
layer((g, s) => {
  FIELD(g);
  g.save(); g.translate(CX - 240, 822); g.scale(0.92, 0.92); banteng(g, s); g.restore();
  g.save(); g.translate(CX + 240, 822); g.scale(-0.92, 0.92); macan(g, s); g.restore();
});

// 1f. gapura di dasar + panel samping bertatah
layer((g, s) => {
  g.clip(SIL);
  const side = P(); side.rect(0, GATE_TOP, W, 1815 - GATE_TOP);
  g.fillStyle = s({ lin: [0, GATE_TOP, 0, 1815], stops: AGUNG ? [[0, '#1b2a72'], [1, '#080d28']] : [[0, '#5e140c'], [1, '#2a0805']] }, false); g.fill(side);
  g.fillStyle = s(INK, false, true);
  for (let y = GATE_TOP + 40; y < 1790; y += 34) for (let x = 120 + ((y / 34) % 2) * 17; x < 1290; x += 34) { if (x > 505 && x < 895) continue; g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.beginPath(); g.moveTo(0, GATE_TOP + 4); g.lineTo(W, GATE_TOP + 4); g.stroke();
  const tier = (x0, x1, y0, x2, x3, y1, col) => {
    const p = P(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x3, y1); p.lineTo(x2, y1); p.closePath();
    g.fillStyle = s(col, false); g.fill(p); g.lineWidth = 7; g.strokeStyle = s(GOLD, true); g.stroke(p);
  };
  const slate = { lin: [0, 1500, 0, 1815], stops: [[0, '#21474f'], [1, '#0a1c21']] }, red = { lin: [0, 1450, 0, 1580], stops: [[0, '#a8321f'], [1, '#4a0f0a']] };
  tier(510, 890, 1815, 520, 880, 1770, slate); tier(560, 840, 1770, 560, 840, 1580, slate);
  tier(535, 865, 1580, 585, 815, 1515, red); tier(585, 815, 1515, 625, 775, 1462, red);
  const top = P(); top.moveTo(650, 1462); top.lineTo(750, 1462); top.lineTo(CX, 1398); top.closePath(); g.fillStyle = s(GOLD, true); g.fill(top);
  g.strokeStyle = s(GOLD_D, true); g.lineWidth = 2;
  for (let y = 1600; y < 1770; y += 20) { g.beginPath(); g.moveTo(566, y); g.lineTo(624, y); g.moveTo(776, y); g.lineTo(834, y); g.stroke(); }
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 630 : 706, x1 = x0 + 64;
    const d = P(); d.moveTo(x0, 1770); d.lineTo(x0, 1660); d.quadraticCurveTo((x0 + x1) / 2, 1610, x1, 1660); d.lineTo(x1, 1770); d.closePath();
    g.fillStyle = s(INK, false, true); g.fill(d);
    g.beginPath(); const wx = CX + sd * 112; g.moveTo(wx, 1620); g.lineTo(wx + 18, 1650); g.lineTo(wx, 1680); g.lineTo(wx - 18, 1650); g.closePath(); g.fill();
  }
});

// 1e. wajah kala / banaspati murka di atas gapura (digambar setelah gapura: lidahnya menjilat puncak gapura)
const KY = 1178, KALA_EYES = [[CX - 88, KY - 36], [CX + 88, KY - 36]];
// 1e'. rupa Agung: medali surya-padma berlubang di batang pohon hayat, diapit sepasang merak
const TEAL = '#2f8a7a', NILA = '#12205c';
const merak = (g, s) => {
  const bx = CX - 372, by = 1346;      // pangkal ekor
  // ekor terangkat: lima helai mengipas ke atas-luar, tiap ujungnya bermata (lubang kecil tembus cahaya)
  const tips = [[-44, -300], [-104, -262], [-150, -196], [-166, -116], [-148, -40]];
  tips.forEach(([dx, dy], i) => {
    const tx = bx + dx, ty = by + dy;
    const pl = P(); pl.moveTo(bx + 6, by); pl.bezierCurveTo(bx - 20, by - 60, tx + 50 - i * 8, ty + 110, tx, ty);
    strokeBoth(g, s, pl, 9, i % 2 ? TEAL : GOLD, i % 2 === 0);
    const eye = P(); eye.arc(tx, ty, 24, 0, Math.PI * 2);
    fs(g, s, eye, GOLD, true, 5);
    g.fillStyle = s({ rad: [tx, ty, 2, tx, ty, 15], stops: [[0, '#49c2b2'], [1, NILA]] }, false); g.beginPath(); g.arc(tx, ty, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(tx, ty, 5.5, 0, Math.PI * 2); g.fill();
  });
  // badan dan sayap
  const body = P(); body.moveTo(bx - 16, by + 6); body.bezierCurveTo(bx + 4, by - 52, bx + 96, by - 48, bx + 122, by + 2);
  body.bezierCurveTo(bx + 112, by + 56, bx + 24, by + 66, bx - 16, by + 6); body.closePath();
  fs(g, s, body, { lin: [bx, by - 46, bx + 70, by + 58], stops: [[0, '#3aa392'], [1, NILA]] }, false, 6);
  const wing = P(); wing.moveTo(bx + 2, by + 6); wing.bezierCurveTo(bx + 32, by - 26, bx + 80, by - 14, bx + 92, by + 16);
  wing.bezierCurveTo(bx + 58, by + 36, bx + 24, by + 30, bx + 2, by + 6); wing.closePath();
  fs(g, s, wing, GOLD, true, 4);
  g.strokeStyle = s(GOLD_D, true); g.lineWidth = 3; g.lineCap = 'round';
  for (const k of [0.3, 0.55, 0.8]) { g.beginPath(); g.moveTo(bx + 10 + 70 * k, by + 4 - 8 * k); g.lineTo(bx + 4 + 62 * k, by + 24); g.stroke(); }
  // leher S, kepala, paruh, jambul
  const neck = P(); neck.moveTo(bx + 106, by - 8); neck.bezierCurveTo(bx + 152, by - 46, bx + 96, by - 96, bx + 134, by - 138);
  strokeBoth(g, s, neck, 22, TEAL, false);
  const hx = bx + 142, hy = by - 150;
  const head = P(); head.arc(hx, hy, 20, 0, Math.PI * 2); fs(g, s, head, TEAL, false, 5);
  const beak = P(); beak.moveTo(hx + 16, hy - 8); beak.lineTo(hx + 46, hy + 3); beak.lineTo(hx + 15, hy + 11); beak.closePath(); fs(g, s, beak, GOLD, true, 4);
  g.fillStyle = s(IVORY, false); g.beginPath(); g.arc(hx + 5, hy - 5, 5.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(INK, false); g.beginPath(); g.arc(hx + 6.5, hy - 5, 2.4, 0, Math.PI * 2); g.fill();
  for (const [ax, ay] of [[-14, -46], [0, -54], [15, -47]]) {
    g.strokeStyle = s(GOLD, true); g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy - 18); g.lineTo(hx + ax, hy + ay); g.stroke();
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(hx + ax, hy + ay, 5.5, 0, Math.PI * 2); g.fill();
  }
  // kaki: berdiri di garis emas di atas panel dasar
  g.strokeStyle = s(GOLD, true); g.lineWidth = 5; g.lineCap = 'round';
  for (const lx of [bx + 40, bx + 72]) { g.beginPath(); g.moveTo(lx, by + 48); g.lineTo(lx + 5, GATE_TOP - 4); g.lineTo(lx + 19, GATE_TOP - 4); g.stroke(); }
};
if (AGUNG) layer((g, s) => { FIELD(g); merak(g, s); g.translate(2 * CX, 0); g.scale(-1, 1); merak(g, s); });
if (AGUNG) layer((g, s) => {
  g.clip(SIL); g.translate(CX, KY - 28);
  // praba: 16 sinar emas, panjang dan pendek berselang
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2, long = i % 2 === 0, r0 = 148, r1 = long ? 236 : 200, hw = long ? 0.11 : 0.09, rm = r0 + (r1 - r0) * 0.5;
    const ray = P(); ray.moveTo(Math.cos(a - hw) * r0, Math.sin(a - hw) * r0);
    ray.quadraticCurveTo(Math.cos(a - hw * 0.25) * rm, Math.sin(a - hw * 0.25) * rm, Math.cos(a) * r1, Math.sin(a) * r1);
    ray.quadraticCurveTo(Math.cos(a + hw * 0.25) * rm, Math.sin(a + hw * 0.25) * rm, Math.cos(a + hw) * r0, Math.sin(a + hw) * r0); ray.closePath();
    fs(g, s, ray, long ? { lin: [0, 0, Math.cos(a) * r1, Math.sin(a) * r1], stops: [[0.6, GOLD], [1, '#f1dc9a']] } : '#a8823e', true, 5);
  }
  // cakram berlubang: dua belas kelopak padma; sela-selanya tembus cahaya blencong
  g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) {
    g.save(); g.rotate((i / 12) * Math.PI * 2);
    const pt = P(); pt.moveTo(0, -56); pt.bezierCurveTo(31, -84, 31, -122, 0, -147); pt.bezierCurveTo(-31, -122, -31, -84, 0, -56); pt.closePath();
    fs(g, s, pt, { lin: [0, -56, 0, -147], stops: [[0, GOLD], [1, '#f6e7b8']] }, true, 5);
    g.strokeStyle = s(GOLD_D, true); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -72); g.lineTo(0, -128); g.stroke();
    g.restore();
  }
  g.lineWidth = 18; g.strokeStyle = s(INK, false); g.beginPath(); g.arc(0, 0, 151, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 11; g.strokeStyle = s(GOLD, true); g.beginPath(); g.arc(0, 0, 151, 0, Math.PI * 2); g.stroke();
  // pusat: cakram nila, padma kecil, dan permata yang berpendar pelan
  const hub = P(); hub.arc(0, 0, 62, 0, Math.PI * 2);
  fs(g, s, hub, { rad: [0, 0, 6, 0, 0, 62], stops: [[0, '#2a3f9a'], [1, '#0a1030']] }, false, 7);
  g.lineWidth = 6; g.strokeStyle = s(GOLD, true); g.stroke(hub);
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * Math.PI * 2 + Math.PI / 8);
    const pt = P(); pt.moveTo(0, -21); pt.bezierCurveTo(13, -30, 13, -45, 0, -55); pt.bezierCurveTo(-13, -45, -13, -30, 0, -21); pt.closePath();
    fs(g, s, pt, GOLD, true, 3);
    g.restore();
  }
  const gem = P(); gem.arc(0, 0, 19, 0, Math.PI * 2);
  fs(g, s, gem, { rad: [-5, -6, 2, 0, 0, 19], stops: [[0, '#fff2c0'], [0.5, '#ffb040'], [1, '#c8501a']] }, false, 4, '#ffb040');
});

if (!AGUNG) layer((g, s) => {
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
});

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
};
layer((g, s) => { g.clip(SIL); drawGuard(g, s); g.translate(2 * CX, 0); g.scale(-1, 1); drawGuard(g, s); });

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
      const base = 1840 - rnd() * (1560 - L * 140) - L * 30, half = Math.max(70, (base - 40) * 0.42), x = CX + (rnd() - 0.5) * 2 * half;
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
