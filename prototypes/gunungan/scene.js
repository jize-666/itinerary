// Prototipe Tugas 2 v2 — Gunungan (kayon) bertatah + blencong + kelir (Lakon Tiga Hari)
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height).
// Gunungan digambar di kode: siluet, bingkai berlubang, gapura + dua raksasa penjaga, pohon kehidupan
// berukel dengan burung, wajah kala, renda tatahan, sungging bergradasi, sisi belakang bergambar api.
// Interaksi: gerakkan kursor = geser cahaya blencong · klik gunungan = balik ke sisi api.

// ======================= 1. GAMBAR GUNUNGAN (kanvas) =======================
const W = 1400, H = 2000, CX = 700;
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const cA = mk(), cC = mk(), cM = mk();                 // alpha (lubang), warna (sungging), metal/rough
const ctxs = [[cA.getContext('2d'), 'a'], [cC.getContext('2d'), 'c'], [cM.getContext('2d'), 'm']];
// warna boleh berupa gradasi: { lin:[x0,y0,x1,y1] | rad:[x0,y0,r0,x1,y1,r1], stops:[[o,c],...] }
const sty = (g, mode, color, metal, hole) => {
  if (mode === 'a') return hole ? '#000' : '#fff';
  if (mode === 'c') {
    if (hole) return '#120804';
    if (color && typeof color === 'object') { const gr = color.lin ? g.createLinearGradient(...color.lin) : g.createRadialGradient(...color.rad); color.stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
    return color;
  }
  return metal ? 'rgb(0,80,255)' : 'rgb(0,170,0)';     // G = roughness, B = metalness
};
const layer = (fn) => ctxs.forEach(([g, mode]) => { g.save(); fn(g, (col, metal, hole) => sty(g, mode, col, metal, hole), mode); g.restore(); });
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const GOLD = '#c8a25a', GOLD_D = '#8a6a2c', INK = '#24130a', RED = '#9c2f22', RED_D = '#5e1a13',
  GREEN = '#35634a', GREEN_L = '#4f8a5e', TEAL = '#1d4a55', LEATHER = '#d8bf93';
const LEAF_G = { stops: [[0, '#1f3d29'], [1, '#7ab27f']] }, LEAF_R = { stops: [[0, '#5e1a13'], [1, '#d65a3c']] };

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

// 1a. dasar kulit
layer((g, s) => { g.fillStyle = s(LEATHER, false); g.fill(SIL); });
// 1b. bidang dalam dibolongi (renda), bingkai merah dikembalikan
layer((g, s) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip();
  g.fillStyle = s(INK, false, true); g.fillRect(0, 0, W, GATE_TOP);
  g.lineJoin = 'round'; g.strokeStyle = s({ lin: [0, 0, 0, GATE_TOP], stops: [[0, '#b5402c'], [1, '#6d1c14']] }, false); g.lineWidth = 118; g.stroke(SIL);
});
const inset = (d) => silPts.map((p, i) => {
  const a = silPts[(i + silPts.length - 1) % silPts.length], b = silPts[(i + 1) % silPts.length];
  let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }
  return new THREE.Vector2(p.x + nx * d, p.y + ny * d);
});
const innerEdge = toPath2D(inset(58)), outerEdge = toPath2D(inset(6)), midEdge = toPath2D(inset(44));
layer((g, s) => {
  g.clip(SIL);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 9; g.stroke(outerEdge);
  g.beginPath(); g.rect(0, 0, W, GATE_TOP + 8); g.clip();
  g.lineWidth = 10; g.stroke(innerEdge); g.lineWidth = 3; g.stroke(midEdge);
});
// lubang bubukan + mas-masan (titik emas) sepanjang bingkai
const ringPts = inset(26), dotPts = inset(48);
layer((g, s) => {
  for (let i = 0; i < ringPts.length; i += 7) { const p = ringPts[i]; if (p.y > GATE_TOP - 10 || p.y < 70) continue; g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(p.x, p.y, 9, 9, 0, 0, Math.PI * 2); g.fill(); }
  for (let i = 3; i < dotPts.length; i += 7) { const p = dotPts[i]; if (p.y > GATE_TOP - 16 || p.y < 110) continue; g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2); g.fill(); }
});
// 1c. renda belah ketupat + titik inten di persilangan
const FIELD = (g) => { g.clip(toPath2D(inset(56))); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip(); };
layer((g, s) => {
  FIELD(g); g.strokeStyle = s(GOLD_D, true); g.lineWidth = 4.5;
  for (let k = -H; k < W + H; k += 52) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke();
    g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke();
  }
  g.fillStyle = s(GOLD, true);
  for (let i = 0; i < 120; i++) for (let j = 0; j < 120; j++) { const k1 = -H + 52 * i, k2 = 52 * j, x = (k1 + k2) / 2, y = (k2 - k1) / 2; if (x < 0 || x > W || y < 0 || y > GATE_TOP) continue; g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill(); }
});

// 1d. pohon kehidupan: batang bertatah, cabang berukel, daun bergradasi
const halfWidthAt = (y) => { let maxX = CX; for (const p of inset(70)) if (Math.abs(p.y - y) < 8) maxX = Math.max(maxX, p.x); return maxX - CX; };
const strokeBoth = (g, s, path, w, col, metal) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = s(INK, false); g.lineWidth = w + 7; g.stroke(path);
  g.strokeStyle = s(col, metal); g.lineWidth = w; g.stroke(path);
};
const leaf = (g, s, x, y, ang, len, col) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(len * 0.35, -len * 0.42, len * 0.8, -len * 0.25, len, 0);
  p.bezierCurveTo(len * 0.8, len * 0.25, len * 0.35, len * 0.42, 0, 0);
  g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(p);
  g.fillStyle = s({ lin: [0, 0, len, 0], stops: (col === RED ? LEAF_R : LEAF_G).stops }, false); g.fill(p);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.moveTo(len * 0.12, 0); g.lineTo(len * 0.85, 0); g.stroke();
  g.restore();
};
layer((g, s) => {
  FIELD(g);
  const trunk = new Path2D(); trunk.moveTo(CX, GATE_TOP + 4);
  for (let y = GATE_TOP; y >= 300; y -= 20) trunk.lineTo(CX + Math.sin(y * 0.012) * 9, y);
  strokeBoth(g, s, trunk, 32, GOLD, true);
  // tatahan bubukan di tengah batang
  g.fillStyle = s(INK, false, true);
  for (let y = GATE_TOP - 30; y > 330; y -= 26) { g.beginPath(); g.arc(CX + Math.sin(y * 0.012) * 9, y, 4.5, 0, Math.PI * 2); g.fill(); }
  let k = 0;
  for (let y0 = 1360; y0 > 330; y0 -= 92, k++) {
    const hw = Math.max(60, halfWidthAt(y0 - 110) - 30);
    for (const sd of [-1, 1]) {
      const ex = CX + sd * hw * 0.82, ey = y0 - 115;
      const br = new Path2D(); br.moveTo(CX, y0);
      br.bezierCurveTo(CX + sd * hw * 0.25, y0 - 40, CX + sd * hw * 0.55, y0 - 30, ex, ey);
      const R0 = Math.min(42, hw * 0.22); let px = ex, py = ey;
      for (let i = 1; i <= 30; i++) { const t = i / 30, ang = -Math.PI / 2 + sd * t * Math.PI * 1.8, r = R0 * (1 - t * 0.85); px = ex + Math.cos(ang) * r * sd; py = ey + R0 + Math.sin(ang) * r; br.lineTo(px, py); }
      strokeBoth(g, s, br, Math.max(9, 17 - k * 0.8), GOLD, true);
      for (const t of [0.35, 0.62]) {
        const lx = CX + sd * hw * 0.55 * t * 1.4, ly = y0 - 60 * t - 18;
        leaf(g, s, lx, ly, sd > 0 ? -0.9 : Math.PI + 0.9, 46 - k * 1.6, (k + (t > 0.5 ? 1 : 0)) % 2 ? RED : GREEN);
        leaf(g, s, lx, ly + 8, sd > 0 ? 0.55 : Math.PI - 0.55, 36 - k * 1.2, (k % 2) ? GREEN : RED);
      }
      g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = s(RED, false); g.beginPath(); g.arc(px, py, 3, 0, Math.PI * 2); g.fill();
    }
  }
  const bud = new Path2D(); bud.moveTo(CX, 340); bud.bezierCurveTo(CX + 40, 300, CX + 26, 240, CX, 190); bud.bezierCurveTo(CX - 26, 240, CX - 40, 300, CX, 340);
  g.fillStyle = s({ lin: [CX, 340, CX, 190], stops: [[0, '#6d1c14'], [1, '#e0623f']] }, false); g.fill(bud); g.lineWidth = 6; g.strokeStyle = s(GOLD, true); g.stroke(bud);
});
// 1d'. burung-burung di dahan
const bird = (g, s, x, y, sc, dir) => {
  g.save(); g.translate(x, y); g.scale(dir * sc, sc);
  const b = new Path2D(); b.moveTo(-22, 2); b.bezierCurveTo(-10, -12, 14, -12, 22, -4); b.bezierCurveTo(16, 8, -6, 12, -22, 2); b.closePath();
  const tail = new Path2D(); tail.moveTo(-20, 0); tail.bezierCurveTo(-36, -8, -48, -4, -54, 8); tail.bezierCurveTo(-44, 5, -34, 8, -22, 6); tail.closePath();
  const wing = new Path2D(); wing.moveTo(-6, -4); wing.bezierCurveTo(0, -26, 16, -28, 20, -18); wing.bezierCurveTo(10, -14, 4, -8, -6, -4); wing.closePath();
  g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = s(INK, false); [tail, b, wing].forEach((p) => g.stroke(p));
  g.fillStyle = s(GOLD, true); g.fill(tail);
  g.fillStyle = s({ lin: [-22, 0, 22, 0], stops: [[0, '#2c5a3c'], [1, '#86c08a']] }, false); g.fill(b);
  g.fillStyle = s({ lin: [-6, 0, 20, -24], stops: [[0, '#6d1c14'], [1, '#e0623f']] }, false); g.fill(wing);
  g.beginPath(); g.arc(22, -8, 7, 0, Math.PI * 2); g.fillStyle = s(GREEN_L, false); g.fill(); g.stroke();
  g.fillStyle = s(GOLD, true); g.beginPath(); g.moveTo(28, -10); g.lineTo(39, -6); g.lineTo(28, -3); g.closePath(); g.fill();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(23, -9, 2.2, 0, Math.PI * 2); g.fill();
  g.restore();
};
layer((g, s) => { FIELD(g); [[CX - 250, 965, 1.9, -1], [CX + 250, 965, 1.9, 1], [CX - 150, 700, 1.6, 1], [CX + 150, 700, 1.6, -1], [CX - 92, 470, 1.25, -1], [CX + 92, 470, 1.25, 1]].forEach(([x, y, sc, d]) => bird(g, s, x, y, sc, d)); });

// 1e. wajah kala (banaspati) di tengah, simetris
layer((g, s) => {
  g.translate(CX, 1205);
  const face = new Path2D();
  face.moveTo(-150, -20); face.bezierCurveTo(-160, -120, -90, -170, 0, -175); face.bezierCurveTo(90, -170, 160, -120, 150, -20);
  face.bezierCurveTo(150, 70, 90, 120, 0, 130); face.bezierCurveTo(-90, 120, -150, 70, -150, -20);
  g.lineWidth = 12; g.strokeStyle = s(INK, false); g.stroke(face);
  g.fillStyle = s({ rad: [0, -30, 10, 0, 0, 175], stops: [[0, '#d04a33'], [1, '#6a1d14']] }, false); g.fill(face);
  g.lineWidth = 8; g.strokeStyle = s(GOLD, true); g.stroke(face);
  const crown = new Path2D(); crown.moveTo(-120, -140);
  for (let i = 0; i <= 6; i++) { const x = -120 + i * 40; crown.lineTo(x - 20, -150 - (i % 2 ? 70 : 40)); crown.lineTo(x, -150); }
  crown.lineTo(120, -140); crown.closePath();
  g.fillStyle = s(GOLD, true); g.fill(crown); g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(crown);
  g.fillStyle = s(INK, false, true); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-100 + i * 40, -165, 5, 0, Math.PI * 2); g.fill(); }
  for (const sd of [-1, 1]) { const brow = new Path2D(); brow.moveTo(sd * 18, -70); brow.bezierCurveTo(sd * 50, -110, sd * 110, -105, sd * 128, -60); g.lineCap = 'round'; g.lineWidth = 14; g.strokeStyle = s(GOLD, true); g.stroke(brow); }
  for (const sd of [-1, 1]) {
    g.fillStyle = s(GOLD, true); g.beginPath(); g.ellipse(sd * 62, -30, 40, 34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(sd * 62, -30, 30, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(sd * 62 + sd * 4, -30, 10, 0, Math.PI * 2); g.fill();
  }
  for (const sd of [-1, 1]) {
    const sw = new Path2D(); let first = true;
    for (let i = 0; i <= 40; i++) { const t = i / 40, ang = sd * (Math.PI * 0.2 + t * Math.PI * 2.2), r = 34 * (1 - t * 0.8); const x = sd * 112 + Math.cos(ang) * r, y = 40 + Math.sin(ang) * r; first ? (sw.moveTo(x, y), first = false) : sw.lineTo(x, y); }
    g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = s(GOLD, true); g.stroke(sw);
  }
  const nose = new Path2D(); nose.moveTo(0, -20); nose.bezierCurveTo(30, 10, 34, 34, 0, 40); nose.bezierCurveTo(-34, 34, -30, 10, 0, -20);
  g.fillStyle = s(RED_D, false); g.fill(nose); g.lineWidth = 5; g.strokeStyle = s(GOLD, true); g.stroke(nose);
  const mouth = new Path2D(); mouth.moveTo(-95, 62); mouth.bezierCurveTo(-50, 105, 50, 105, 95, 62); mouth.bezierCurveTo(50, 80, -50, 80, -95, 62);
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  g.fillStyle = s('#efe6d0', false);
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.rect(i * 15 - 6, 70, 12, 11); g.fill(); }
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 60, 72); g.lineTo(sd * 46, 122); g.lineTo(sd * 36, 76); g.closePath(); g.fill(); }
});

// 1f. gapura di dasar + panel samping bertatah
layer((g, s) => {
  g.clip(SIL);
  const side = new Path2D(); side.rect(0, GATE_TOP, W, 1815 - GATE_TOP);
  g.fillStyle = s({ lin: [0, GATE_TOP, 0, 1815], stops: [[0, '#7a2016'], [1, '#3e110b']] }, false); g.fill(side);
  g.fillStyle = s(INK, false, true);
  for (let y = GATE_TOP + 40; y < 1790; y += 34) for (let x = 120 + ((y / 34) % 2) * 17; x < 1290; x += 34) { if (x > 505 && x < 895) continue; g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.beginPath(); g.moveTo(0, GATE_TOP + 4); g.lineTo(W, GATE_TOP + 4); g.stroke();
  const tier = (x0, x1, y0, x2, x3, y1, col) => {
    const p = new Path2D(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x3, y1); p.lineTo(x2, y1); p.closePath();
    g.fillStyle = s(col, false); g.fill(p); g.lineWidth = 7; g.strokeStyle = s(GOLD, true); g.stroke(p);
  };
  const teal = { lin: [0, 1500, 0, 1815], stops: [[0, '#2f6b78'], [1, '#143740']] }, red = { lin: [0, 1450, 0, 1580], stops: [[0, '#c4452f'], [1, '#6d1c14']] };
  tier(510, 890, 1815, 520, 880, 1770, teal); tier(560, 840, 1770, 560, 840, 1580, teal);
  tier(535, 865, 1580, 585, 815, 1515, red); tier(585, 815, 1515, 625, 775, 1462, red);
  const top = new Path2D(); top.moveTo(650, 1462); top.lineTo(750, 1462); top.lineTo(CX, 1398); top.closePath(); g.fillStyle = s(GOLD, true); g.fill(top);
  // relief bata pada badan gapura
  g.strokeStyle = s(GOLD_D, true); g.lineWidth = 2;
  for (let y = 1600; y < 1770; y += 20) { g.beginPath(); g.moveTo(566, y); g.lineTo(624, y); g.moveTo(776, y); g.lineTo(834, y); g.stroke(); }
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 630 : 706, x1 = x0 + 64;
    const d = new Path2D(); d.moveTo(x0, 1770); d.lineTo(x0, 1660); d.quadraticCurveTo((x0 + x1) / 2, 1610, x1, 1660); d.lineTo(x1, 1770); d.closePath();
    g.fillStyle = s(INK, false, true); g.fill(d);
    g.beginPath(); const wx = CX + sd * 112; g.moveTo(wx, 1620); g.lineTo(wx + 18, 1650); g.lineTo(wx, 1680); g.lineTo(wx - 18, 1650); g.closePath(); g.fill();
  }
});

// 1g. dua raksasa penjaga gapura (Cingkarabala & Balaupata), gaya wayang profil menghadap gapura
const drawGuard = (g, s) => {
  const kain = new Path2D(); kain.moveTo(326, 1688); kain.lineTo(388, 1688); kain.bezierCurveTo(404, 1712, 414, 1740, 412, 1762); kain.lineTo(300, 1764); kain.bezierCurveTo(298, 1738, 310, 1708, 326, 1688); kain.closePath();
  const dodot = new Path2D(); dodot.moveTo(318, 1700); dodot.bezierCurveTo(280, 1722, 262, 1760, 272, 1794); dodot.bezierCurveTo(288, 1784, 298, 1762, 306, 1742); dodot.closePath();
  const legs = new Path2D();
  legs.moveTo(318, 1760); legs.lineTo(302, 1798); legs.lineTo(334, 1801); legs.lineTo(344, 1762); legs.closePath();
  legs.moveTo(372, 1760); legs.lineTo(392, 1798); legs.lineTo(430, 1801); legs.lineTo(396, 1760); legs.closePath();
  const body = new Path2D(); body.moveTo(336, 1600); body.lineTo(352, 1600); body.bezierCurveTo(372, 1606, 392, 1612, 398, 1630); body.bezierCurveTo(404, 1652, 392, 1676, 380, 1692); body.lineTo(330, 1692); body.bezierCurveTo(318, 1670, 306, 1640, 312, 1622); body.bezierCurveTo(318, 1610, 326, 1604, 336, 1600); body.closePath();
  const armF = new Path2D(); armF.moveTo(386, 1616); armF.bezierCurveTo(410, 1628, 424, 1648, 428, 1662); armF.bezierCurveTo(432, 1650, 434, 1634, 438, 1620); armF.lineTo(430, 1614); armF.bezierCurveTo(424, 1630, 420, 1640, 416, 1644); armF.bezierCurveTo(406, 1630, 398, 1620, 390, 1612); armF.closePath();
  const armB = new Path2D(); armB.moveTo(314, 1622); armB.bezierCurveTo(302, 1650, 296, 1676, 294, 1702); armB.lineTo(305, 1705); armB.bezierCurveTo(309, 1680, 315, 1656, 323, 1632); armB.closePath();
  const gada = new Path2D(); gada.moveTo(428, 1702); gada.lineTo(437, 1702); gada.lineTo(442, 1586); gada.bezierCurveTo(458, 1570, 456, 1528, 440, 1510); gada.bezierCurveTo(424, 1528, 422, 1570, 434, 1586); gada.closePath();
  const head = new Path2D();
  head.moveTo(320, 1532); head.lineTo(378, 1528); head.bezierCurveTo(390, 1534, 398, 1542, 404, 1548); head.bezierCurveTo(416, 1552, 414, 1566, 400, 1565);
  head.lineTo(405, 1572); head.lineTo(392, 1575); head.lineTo(398, 1585); head.bezierCurveTo(392, 1595, 380, 1599, 366, 1599); head.bezierCurveTo(352, 1601, 342, 1603, 338, 1605); head.bezierCurveTo(324, 1590, 314, 1566, 320, 1532); head.closePath();
  const crown = new Path2D(); crown.moveTo(316, 1536); crown.lineTo(320, 1508); crown.lineTo(330, 1500); crown.lineTo(332, 1478); crown.lineTo(342, 1470); crown.lineTo(344, 1448); crown.lineTo(354, 1424); crown.lineTo(364, 1448); crown.lineTo(366, 1470); crown.lineTo(376, 1478); crown.lineTo(378, 1500); crown.lineTo(386, 1508); crown.lineTo(384, 1532); crown.closePath();
  const mungkur = new Path2D(); { let f = true; for (let i = 0; i <= 40; i++) { const t = i / 40, a = Math.PI * 0.1 + t * Math.PI * 2.3, r = 26 * (1 - t * 0.82); const x = 306 - Math.cos(a) * r, y = 1500 + Math.sin(a) * r; f ? (mungkur.moveTo(x, y), f = false) : mungkur.lineTo(x, y); } }
  const fs = (p, col, metal) => { g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = s(INK, false); g.stroke(p); g.fillStyle = s(col, metal); g.fill(p); };
  const skin = { lin: [300, 1520, 410, 1700], stops: [[0, '#d24c34'], [1, '#7c2116']] };
  const kainC = { lin: [300, 1690, 300, 1770], stops: [[0, '#2f6b78'], [1, '#143740']] };
  fs(dodot, kainC); fs(legs, skin); fs(kain, kainC);
  g.save(); g.clip(kain); g.strokeStyle = s(GOLD, true); g.lineWidth = 4;
  for (let k = -120; k < 170; k += 18) { g.beginPath(); g.moveTo(290 + k, 1690); g.lineTo(290 + k + 90, 1770); g.stroke(); }
  g.restore();
  fs(armB, skin); fs(body, skin); fs(gada, GOLD, true); fs(armF, skin); fs(head, skin); fs(crown, GOLD, true);
  g.lineCap = 'round'; g.strokeStyle = s(INK, false); g.lineWidth = 11; g.stroke(mungkur); g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.stroke(mungkur);
  // jamang (ikat dahi) + sumping (hiasan telinga)
  g.strokeStyle = s(GOLD, true); g.lineWidth = 6; g.beginPath(); g.moveTo(318, 1534); g.lineTo(384, 1530); g.stroke();
  const sumping = new Path2D(); sumping.moveTo(334, 1540); sumping.bezierCurveTo(318, 1548, 314, 1566, 324, 1578); sumping.bezierCurveTo(330, 1566, 336, 1556, 340, 1546); sumping.closePath(); fs(sumping, GOLD, true);
  g.lineCap = 'round'; g.strokeStyle = s(GOLD, true);
  g.lineWidth = 7; g.beginPath(); g.moveTo(330, 1690); g.lineTo(386, 1690); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(338, 1608); g.bezierCurveTo(356, 1622, 376, 1622, 390, 1612); g.stroke();
  g.beginPath(); g.moveTo(420, 1652); g.lineTo(431, 1641); g.stroke();
  g.beginPath(); g.moveTo(296, 1694); g.lineTo(306, 1696); g.stroke();
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(372, 1543, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.arc(372, 1543, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(375, 1543, 3.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s(INK, false); g.lineWidth = 6; g.beginPath(); g.moveTo(356, 1530); g.bezierCurveTo(368, 1521, 384, 1523, 393, 1534); g.stroke();
  g.fillStyle = s(INK, false, true); g.beginPath(); g.moveTo(392, 1575); g.lineTo(405, 1572); g.lineTo(399, 1583); g.closePath(); g.fill();
  g.fillStyle = s('#efe6d0', false); g.beginPath(); g.moveTo(394, 1577); g.lineTo(398, 1590); g.lineTo(401, 1577); g.closePath(); g.fill();
  g.fillStyle = s(INK, false, true); [[354, 1446], [354, 1468], [344, 1488], [364, 1488], [336, 1514], [354, 1512], [372, 1514]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill(); });
};
layer((g, s) => { g.clip(SIL); drawGuard(g, s); g.translate(2 * CX, 0); g.scale(-1, 1); drawGuard(g, s); });

// 1h. sisi belakang: lidah api (geni) berlapis + ukel emas
const cB = mk();
{
  const g = cB.getContext('2d'); g.save(); g.clip(SIL);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1e0804'); bg.addColorStop(1, '#5a1208'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  ['#6e170a', '#a92e16', '#dc6526', '#f2ad48', '#ffe39a'].forEach((col, L) => {
    for (let i = 0; i < 70 - L * 8; i++) {
      const base = 1820 - rnd() * (1500 - L * 120) - L * 40, half = Math.max(80, (base - 40) * 0.42), x = CX + (rnd() - 0.5) * 2 * half, h = 160 + rnd() * 380 - L * 30, w = 40 + rnd() * 58 - L * 6, sway = (rnd() - 0.5) * w * 1.6;
      g.fillStyle = col; g.beginPath(); g.moveTo(x - w, base);
      g.quadraticCurveTo(x - w * 0.7, base - h * 0.55, x + sway, base - h); g.quadraticCurveTo(x + w * 0.7, base - h * 0.5, x + w, base); g.closePath(); g.fill();
    }
  });
  g.strokeStyle = GOLD; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = 160 + rnd() * (W - 320), y = 260 + rnd() * 1400, r0 = 18 + rnd() * 26, dir = rnd() > 0.5 ? 1 : -1;
    g.lineWidth = 5; g.beginPath(); for (let k = 0; k <= 36; k++) { const t = k / 36, a = dir * t * Math.PI * 2.2, r = r0 * (1 - t * 0.8); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  }
  g.restore(); g.strokeStyle = GOLD; g.lineWidth = 9; g.stroke(outerEdge);
}

// ======================= 2. SCENE 3D =======================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const NILA = 0x07080f;
const scene = new THREE.Scene();
scene.background = new THREE.Color(NILA);
scene.fog = new THREE.FogExp2(NILA, 0.11);
const camera = new THREE.PerspectiveCamera(34, width / height, 0.05, 50);
camera.position.set(-1.95, 1.1, 3.95);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.12, 0.86, 0.5); controls.enableDamping = true;
controls.minDistance = 1.3; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.55;

const texOf = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const alphaTex = texOf(cA), colorTex = texOf(cC, true), mrTex = texOf(cM), backTex = texOf(cB, true);

// Geometri: tutup depan & belakang (ShapeGeometry, UV = koordinat siluet ternormalisasi) + dinding tepi tipis
const GW = 1.05, GH = 1.5, THICK = 0.008;
const nShape = new THREE.Shape(silPts.map((p) => new THREE.Vector2(p.x / W, 1 - p.y / H)));
const capGeo = new THREE.ShapeGeometry(nShape); capGeo.translate(-0.5, 0, 0);
const sideGeo = new THREE.ExtrudeGeometry(nShape, { depth: THICK, bevelEnabled: false, curveSegments: 1 }); sideGeo.translate(-0.5, 0, -THICK / 2);
const frontMat = new THREE.MeshStandardMaterial({ map: colorTex, alphaMap: alphaTex, alphaTest: 0.5, metalnessMap: mrTex, roughnessMap: mrTex, metalness: 1, roughness: 1, envMapIntensity: 1.0 });
const backMat = new THREE.MeshStandardMaterial({ map: backTex, alphaMap: alphaTex, alphaTest: 0.5, roughness: 0.65, metalness: 0.0, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: 0.55 });
frontMat.shadowSide = THREE.DoubleSide; // tetap bercahaya-tembus walau gunungan dibalik
const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
const gunungan = new THREE.Group();
const fCap = new THREE.Mesh(capGeo, frontMat); fCap.position.z = THICK / 2;
const bCap = new THREE.Mesh(capGeo, backMat); bCap.position.z = -THICK / 2;
const edges = new THREE.Mesh(sideGeo, [new THREE.MeshBasicMaterial({ visible: false }), edgeMat]);
fCap.castShadow = true;
fCap.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alphaTex, alphaTest: 0.5, side: THREE.DoubleSide });
gunungan.add(fCap, bCap, edges);
gunungan.scale.set(GW, GH, 1);
gunungan.position.set(0, 0.1, 0);
const pivot = new THREE.Group(); pivot.add(gunungan); scene.add(pivot);
// tuding (cempurit, gagang tanduk) di bawah tangkai
const cempurit = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.35, metalness: 0.2 }));
cempurit.position.set(0, -0.06, 0); pivot.add(cempurit);

// gedebog (batang pisang tempat wayang ditancapkan)
const gedebogTex = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#5d5a36'; g.fillRect(0, 0, 512, 64);
  for (let y = 0; y < 64; y += 3) { g.fillStyle = `rgba(${150 + rnd() * 40},${140 + rnd() * 30},90,0.25)`; g.fillRect(0, y, 512, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const gedebog = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.7, 32, 1), new THREE.MeshStandardMaterial({ map: gedebogTex, roughness: 0.85, color: 0x9a9070 }));
gedebog.rotation.z = Math.PI / 2; gedebog.position.set(0, 0.1, 0); gedebog.castShadow = gedebog.receiveShadow = true; scene.add(gedebog);

// kelir: kain anyam tembus cahaya dalam gawangan kayu
const clothTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#efe4cf'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 512; i += 2) { g.fillStyle = `rgba(120,100,70,${0.03 + rnd() * 0.05})`; g.fillRect(i, 0, 1, 512); g.fillRect(0, i, 512, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
})();
const kelir = new THREE.Group();
{
  const clothMat = new THREE.MeshLambertMaterial({ map: clothTex, side: THREE.DoubleSide });
  clothMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_lambert_pars_fragment>', THREE.ShaderChunk.lights_lambert_pars_fragment.replace('saturate( dot( geometryNormal, directLight.direction ) )', '0.3 * abs( dot( geometryNormal, directLight.direction ) )')); };
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), clothMat); cloth.receiveShadow = true; kelir.add(cloth);
  const band = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.7 }), redB = new THREE.MeshStandardMaterial({ color: 0x5e1a13, roughness: 0.7 }), wood = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.6 });
  const box = (w, h, d, mat, x, y, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = true; kelir.add(b); };
  box(1.78, 0.09, 0.03, band, 0, 0.67); box(1.78, 0.02, 0.032, new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.3 }), 0, 0.62);
  box(1.78, 0.06, 0.03, redB, 0, -0.655); box(0.05, 1.36, 0.03, redB, 0.88, 0); box(0.05, 1.36, 0.03, redB, -0.88, 0);
  box(0.06, 1.9, 0.06, wood, 0.93, -0.27, 0.0); box(0.06, 1.9, 0.06, wood, -0.93, -0.27, 0.0);
  kelir.position.set(0.72, 0.92, 1.55); kelir.rotation.y = -0.42; scene.add(kelir);
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// Environment ringan untuk kilau prada
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide })));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.7, 0.4).multiplyScalar(3), side: THREE.DoubleSide }));
  p.position.set(-2, 3, 4); p.lookAt(0, 1, 0); env.add(p);
  const q = p.clone(); q.material = p.material.clone(); q.material.color = new THREE.Color(1, 0.55, 0.25).multiplyScalar(2); q.position.set(2.5, 1.5, 3); q.lookAt(0, 1, 0); env.add(q);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
}

// Blencong: lampu minyak perunggu berbentuk garuda (wadah, cucuk, sayap, ekor, kepala) + nyala api
const bronzeM = new THREE.MeshStandardMaterial({ color: 0xb88a48, metalness: 1, roughness: 0.32 });
const blencong = new THREE.Group(); scene.add(blencong);
{
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.03], [0.03, -0.028], [0.052, -0.008], [0.058, 0.014], [0.05, 0.036], [0.026, 0.046], [0, 0.048]].map(([x, y]) => new THREE.Vector2(x, y)), 32), bronzeM);
  bowl.castShadow = false; blencong.add(bowl);
  const spoutCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.0, 0.045), new THREE.Vector3(0, 0.012, 0.09), new THREE.Vector3(0, 0.03, 0.125)]);
  blencong.add(new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 20, 0.008, 10), bronzeM));
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0);
  for (let i = 0; i <= 6; i++) { const a = -0.2 + i * 0.26; wingShape.lineTo(Math.cos(a) * (0.14 - i * 0.008), Math.sin(a) * (0.1 - i * 0.004) + 0.04); wingShape.lineTo(Math.cos(a + 0.13) * (0.1 - i * 0.006), Math.sin(a + 0.13) * 0.07 + 0.04); }
  wingShape.lineTo(0, 0.02);
  const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.006, bevelEnabled: false });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(wg, bronzeM); w.scale.set(s, 1, 1); w.rotation.y = -s * 0.5; w.position.set(s * 0.04, 0.02, -0.01); blencong.add(w); }
  const tailShape = new THREE.Shape(); tailShape.moveTo(-0.05, 0); tailShape.quadraticCurveTo(0, 0.13, 0.05, 0); tailShape.lineTo(0, 0.03); tailShape.closePath();
  const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, { depth: 0.006, bevelEnabled: false }), bronzeM); tail.position.set(0, 0.03, -0.06); tail.rotation.x = -0.4; blencong.add(tail);
  const headG = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), bronzeM); headG.position.set(0, 0.07, 0.035); blencong.add(headG);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 10), bronzeM); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.068, 0.062); blencong.add(beak);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.5 })); rod.position.set(0, 0.5, 0); blencong.add(rod);
}
const FLAME_OFF = new THREE.Vector3(0, 0.045, 0.128);
const LAMP_REST = new THREE.Vector3(-0.1, 1.2, -0.72);
const lamp = new THREE.SpotLight(0xffa046, 60, 0, 0.85, 0.55, 2);
lamp.target.position.set(0.55, 0.85, 1.6);
lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0003; lamp.shadow.radius = 2;
scene.add(lamp, lamp.target);
const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.62, 0.25).multiplyScalar(14) }));
flame.scale.set(0.7, 1.6, 0.7); scene.add(flame);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,200,130,1)'); gr.addColorStop(0.12, 'rgba(255,150,70,0.5)'); gr.addColorStop(0.45, 'rgba(255,120,50,0.09)'); gr.addColorStop(1, 'rgba(255,110,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.72, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
scene.add(glow);
const fill = new THREE.SpotLight(0xffc89a, 15, 0, 0.3, 0.9, 2); fill.position.set(-1.6, 2.4, 2.8); fill.target.position.set(-0.05, 0.9, 0); scene.add(fill, fill.target);
const backFill = new THREE.PointLight(0xff7a30, 0.0, 3, 2); scene.add(backFill);
scene.add(new THREE.HemisphereLight(0x2a2f55, 0x140b06, 0.18));

// debu yang melayang di berkas cahaya
const DUST = 700, dustGeo = new THREE.BufferGeometry(), dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) { const z = 0.05 + rnd() * 1.6; dpos[i * 3] = (rnd() - 0.5) * (0.6 + z * 0.7); dpos[i * 3 + 1] = rnd() * 1.6 * (1 - z * 0.35); dpos[i * 3 + 2] = z; dseed[i] = rnd() * 100; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.007, color: new THREE.Color(1, 0.75, 0.45), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));

// ======================= 3. POST & INTERAKSI & ANIMASI =======================
let composer = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){ gl_FragColor = texture2D(tDiffuse, vUv);
      gl_FragColor.rgb *= smoothstep(0.98, 0.3, distance(vUv, vec2(0.5)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(vUv * 1000.0) - 0.5) * 0.035; }`,
  depthTest: false, depthWrite: false,
});
const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat));
const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.75, 0.6, 0.82));
  composer.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {},
    render(r, w, read) { outMat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(null); r.render(qs, qc); } });
} catch (e) { composer = null; }

const clock = new THREE.Clock();
const now = () => (window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime());
const pointer = { x: 0, y: 0, last: -10 };
let flipTarget = 0, flipAngle = 0, hovering = false, downAt = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickG = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); ray.setFromCamera(ndc, camera); return ray.intersectObjects([fCap, bCap], false).length > 0; };
const flip = () => { flipTarget += Math.PI; hint.style.opacity = '0'; };
window.__flipGunungan = flip;
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1; pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1); pointer.last = performance.now() / 1000;
  hovering = pickG(e); renderer.domElement.style.cursor = hovering ? 'pointer' : 'grab';
});
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => { if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && pickG(e)) flip(); downAt = null; });
const hint = document.createElement('div');
hint.textContent = 'Gerakkan kursor = geser cahaya · Klik gunungan = balik ke sisi api';
Object.assign(hint.style, { position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', font: '600 11px/1.2 system-ui, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(242,235,221,0.72)', pointerEvents: 'none', transition: 'opacity .8s', whiteSpace: 'nowrap' });
if (canvas.parentElement) { if (getComputedStyle(canvas.parentElement).position === 'static') canvas.parentElement.style.position = 'relative'; canvas.parentElement.appendChild(hint); }

const lampPos = LAMP_REST.clone(), flamePos = new THREE.Vector3();
let raf = 0;
function animate() {
  raf = requestAnimationFrame(animate);
  const t = now();
  const idle = performance.now() / 1000 - pointer.last > 3;
  const tx = idle ? -0.15 + Math.sin(t * 0.45) * 0.35 : -0.15 + pointer.x * 0.6;
  const ty = idle ? 1.2 + Math.sin(t * 0.31) * 0.12 : 1.2 + pointer.y * 0.45;
  lampPos.x += (tx - lampPos.x) * 0.06; lampPos.y += (ty - lampPos.y) * 0.06;
  blencong.position.copy(lampPos); blencong.rotation.z = (tx - lampPos.x) * -1.2;
  const flick = 1 + Math.sin(t * 9.3) * 0.04 + Math.sin(t * 17.1) * 0.03;
  flamePos.copy(FLAME_OFF).applyEuler(blencong.rotation).add(lampPos);
  lamp.position.copy(flamePos); lamp.intensity = 60 * flick;
  flame.position.copy(flamePos); flame.scale.set(0.7 * flick, 1.6 * (2 - flick), 0.7 * flick);
  glow.position.set(flamePos.x, flamePos.y, flamePos.z - 0.05); glow.lookAt(camera.position);
  // dalang menggoyang gunungan; klik membalik ke sisi api (geni)
  flipAngle += (flipTarget - flipAngle) * 0.06;
  pivot.rotation.z = Math.sin(t * 0.6) * 0.03 + (flipTarget - flipAngle) * 0.05;
  pivot.rotation.y = Math.sin(t * 0.35) * 0.14 + flipAngle;
  const showingBack = Math.cos(flipAngle) < 0;
  backFill.intensity = showingBack ? 1.2 : 0; backFill.position.set(-0.6, 1.2, 1.4);
  frontMat.emissive.setRGB(hovering ? 0.05 : 0, hovering ? 0.03 : 0, 0);
  const pa = dustGeo.attributes.position;
  for (let i = 0; i < DUST; i++) { pa.array[i * 3 + 1] += 0.0006 + Math.sin(t + dseed[i]) * 0.0004; if (pa.array[i * 3 + 1] > 1.6) pa.array[i * 3 + 1] = 0; }
  pa.needsUpdate = true;
  controls.update(); outMat.uniforms.uTime.value = t;
  if (composer) composer.render(); else renderer.render(scene, camera);
}
animate();
if (typeof __host !== 'undefined') __host.dispose = () => { cancelAnimationFrame(raf); hint.remove(); renderer.dispose(); };
