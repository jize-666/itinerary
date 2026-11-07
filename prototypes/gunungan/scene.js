// Prototipe Tugas 2 — Gunungan (kayon) bertatah + cahaya blencong (Lakon Tiga Hari)
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height).
// Gunungan digambar di kode: siluet, bingkai berlubang, gapura, pohon kehidupan dengan ukel,
// wajah kala, dan tatahan renda. Kanvas alpha = lubang tatahan, kanvas warna = sungging & prada.
// Cahaya blencong dari belakang menembus lubang; arahkan kursor untuk menggeser cahayanya.

// ======================= 1. GAMBAR GUNUNGAN (kanvas) =======================
const W = 1400, H = 2000, CX = 700;
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const cA = mk(), cC = mk(), cM = mk();                 // alpha, warna, metal/rough
const ctxs = [[cA.getContext('2d'), 'a'], [cC.getContext('2d'), 'c'], [cM.getContext('2d'), 'm']];
// gaya per kanvas: solid (warna, metal?) atau lubang
const sty = (mode, color, metal, hole) => {
  if (mode === 'a') return hole ? '#000' : '#fff';
  if (mode === 'c') return hole ? '#120804' : color;
  return metal ? 'rgb(0,80,255)' : 'rgb(0,170,0)';     // G = roughness, B = metalness
};
const layer = (fn) => ctxs.forEach(([g, mode]) => { g.save(); fn(g, (col, metal, hole) => sty(mode, col, metal, hole), mode); g.restore(); });

const GOLD = '#c8a25a', GOLD_D = '#8a6a2c', INK = '#24130a', RED = '#9c2f22', RED_D = '#5e1a13',
  GREEN = '#35634a', TEAL = '#1d4a55', LEATHER = '#d8bf93';

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

// 1b. bidang dalam di atas gapura dibolongi (jadi renda), lalu bingkai dikembalikan
layer((g, s, mode) => {
  g.clip(SIL); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip();
  g.fillStyle = s(INK, false, true); g.fillRect(0, 0, W, GATE_TOP);
  g.lineJoin = 'round';
  g.strokeStyle = s(RED, false); g.lineWidth = 118; g.stroke(SIL);            // bingkai merah
});
// list emas di tepi luar & dalam bingkai
const inset = (d) => silPts.map((p, i) => {
  const a = silPts[(i + silPts.length - 1) % silPts.length], b = silPts[(i + 1) % silPts.length];
  let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if ((CX - p.x) * nx + (1100 - p.y) * ny < 0) { nx = -nx; ny = -ny; }        // arahkan ke dalam
  return new THREE.Vector2(p.x + nx * d, p.y + ny * d);
});
const innerEdge = toPath2D(inset(58)), outerEdge = toPath2D(inset(6));
layer((g, s) => {
  g.clip(SIL);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 9; g.stroke(outerEdge);
  g.beginPath(); g.rect(0, 0, W, GATE_TOP + 8); g.clip();
  g.lineWidth = 10; g.stroke(innerEdge);
});
// lubang bubukan sepanjang bingkai
const ringPts = inset(31);
layer((g, s) => {
  g.fillStyle = s(INK, false, true);
  for (let i = 0; i < ringPts.length; i += 7) {
    const p = ringPts[i]; if (p.y > GATE_TOP - 10 || p.y < 70) continue;
    g.beginPath(); g.ellipse(p.x, p.y, 9, 9, 0, 0, Math.PI * 2); g.fill();
  }
});

// 1c. renda belah ketupat di bidang dalam (penghubung struktur)
const FIELD = (g) => { g.clip(toPath2D(inset(56))); g.beginPath(); g.rect(0, 0, W, GATE_TOP); g.clip(); };
layer((g, s) => {
  FIELD(g); g.strokeStyle = s(GOLD_D, true); g.lineWidth = 4.5;
  for (let k = -H; k < W + H; k += 52) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke();
    g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke();
  }
});

// 1d. pohon kehidupan: batang, cabang berukel, daun
const halfWidthAt = (y) => { // setengah lebar bidang dalam pada ketinggian y
  let maxX = CX; for (const p of inset(70)) if (Math.abs(p.y - y) < 8) maxX = Math.max(maxX, p.x); return maxX - CX;
};
const strokeBoth = (g, s, path, w, col, metal) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = s(INK, false); g.lineWidth = w + 7; g.stroke(path);
  g.strokeStyle = s(col, metal); g.lineWidth = w; g.stroke(path);
};
const leaf = (g, s, x, y, ang, len, col) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(len * 0.35, -len * 0.42, len * 0.8, -len * 0.25, len, 0);
  p.bezierCurveTo(len * 0.8, len * 0.25, len * 0.35, len * 0.42, 0, 0);
  g.fillStyle = s(INK, false); g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(p);
  g.fillStyle = s(col, false); g.fill(p);
  g.strokeStyle = s(GOLD, true); g.lineWidth = 3; g.beginPath(); g.moveTo(len * 0.12, 0); g.lineTo(len * 0.85, 0); g.stroke();
  g.restore();
};
layer((g, s) => {
  FIELD(g);
  const trunk = new Path2D(); trunk.moveTo(CX, GATE_TOP + 4);
  for (let y = GATE_TOP; y >= 300; y -= 20) trunk.lineTo(CX + Math.sin(y * 0.012) * 9, y);
  strokeBoth(g, s, trunk, 30, GOLD, true);
  let k = 0;
  for (let y0 = 1360; y0 > 330; y0 -= 92, k++) {
    const hw = Math.max(60, halfWidthAt(y0 - 110) - 30);
    for (const sd of [-1, 1]) {
      const ex = CX + sd * hw * 0.82, ey = y0 - 115;
      const br = new Path2D(); br.moveTo(CX, y0);
      br.bezierCurveTo(CX + sd * hw * 0.25, y0 - 40, CX + sd * hw * 0.55, y0 - 30, ex, ey);
      // ukel di ujung: spiral masuk
      const R0 = Math.min(42, hw * 0.22);
      let px = ex, py = ey;
      for (let i = 1; i <= 30; i++) {
        const t = i / 30, ang = -Math.PI / 2 + sd * t * Math.PI * 1.8, r = R0 * (1 - t * 0.85);
        px = ex + sd * R0 * 0.0 + Math.cos(ang) * r * sd; py = ey + R0 + Math.sin(ang) * r;
        br.lineTo(px, py);
      }
      strokeBoth(g, s, br, Math.max(9, 17 - k * 0.8), GOLD, true);
      for (const t of [0.35, 0.62]) {               // daun di sepanjang cabang
        const lx = CX + sd * hw * 0.55 * t * 1.4, ly = y0 - 60 * t - 18;
        leaf(g, s, lx, ly, sd > 0 ? -0.9 : Math.PI + 0.9, 46 - k * 1.6, (k + (t > 0.5 ? 1 : 0)) % 2 ? RED : GREEN);
        leaf(g, s, lx, ly + 8, sd > 0 ? 0.55 : Math.PI - 0.55, 36 - k * 1.2, (k % 2) ? GREEN : RED);
      }
      g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill();
    }
  }
  // kuncup di puncak
  const bud = new Path2D(); bud.moveTo(CX, 340); bud.bezierCurveTo(CX + 40, 300, CX + 26, 240, CX, 190); bud.bezierCurveTo(CX - 26, 240, CX - 40, 300, CX, 340);
  g.fillStyle = s(RED, false); g.fill(bud); g.lineWidth = 6; g.strokeStyle = s(GOLD, true); g.stroke(bud);
});

// 1e. wajah kala (banaspati) di tengah, simetris
layer((g, s) => {
  g.translate(CX, 1205);
  const face = new Path2D();
  face.moveTo(-150, -20); face.bezierCurveTo(-160, -120, -90, -170, 0, -175); face.bezierCurveTo(90, -170, 160, -120, 150, -20);
  face.bezierCurveTo(150, 70, 90, 120, 0, 130); face.bezierCurveTo(-90, 120, -150, 70, -150, -20);
  g.lineWidth = 12; g.strokeStyle = s(INK, false); g.stroke(face);
  g.fillStyle = s(RED, false); g.fill(face);
  g.lineWidth = 8; g.strokeStyle = s(GOLD, true); g.stroke(face);
  // mahkota
  const crown = new Path2D(); crown.moveTo(-120, -140);
  for (let i = 0; i <= 6; i++) { const x = -120 + i * 40; crown.lineTo(x - 20, -150 - (i % 2 ? 70 : 40)); crown.lineTo(x, -150); }
  crown.lineTo(120, -140); crown.closePath();
  g.fillStyle = s(GOLD, true); g.fill(crown); g.lineWidth = 5; g.strokeStyle = s(INK, false); g.stroke(crown);
  // alis emas melengkung
  for (const sd of [-1, 1]) {
    const brow = new Path2D(); brow.moveTo(sd * 18, -70); brow.bezierCurveTo(sd * 50, -110, sd * 110, -105, sd * 128, -60);
    g.lineCap = 'round'; g.lineWidth = 14; g.strokeStyle = s(GOLD, true); g.stroke(brow);
  }
  // mata (lubang) + bola mata emas
  for (const sd of [-1, 1]) {
    g.fillStyle = s(GOLD, true); g.beginPath(); g.ellipse(sd * 62, -30, 40, 34, 0, 0, Math.PI * 2); g.fill();   // lingkar mata
    g.fillStyle = s(INK, false, true); g.beginPath(); g.ellipse(sd * 62, -30, 30, 26, 0, 0, Math.PI * 2); g.fill(); // mata plelengan
    g.fillStyle = s(GOLD, true); g.beginPath(); g.arc(sd * 62 + sd * 4, -30, 10, 0, Math.PI * 2); g.fill();
  }
  // ukel emas di pipi (ornamen, mengurangi kesan kartun)
  for (const sd of [-1, 1]) {
    const sw = new Path2D(); let first = true;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, ang = sd * (Math.PI * 0.2 + t * Math.PI * 2.2), r = 34 * (1 - t * 0.8);
      const x = sd * 112 + Math.cos(ang) * r, y = 40 + Math.sin(ang) * r;
      first ? (sw.moveTo(x, y), first = false) : sw.lineTo(x, y);
    }
    g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = s(GOLD, true); g.stroke(sw);
  }
  // hidung
  const nose = new Path2D(); nose.moveTo(0, -20); nose.bezierCurveTo(30, 10, 34, 34, 0, 40); nose.bezierCurveTo(-34, 34, -30, 10, 0, -20);
  g.fillStyle = s(RED_D, false); g.fill(nose); g.lineWidth = 5; g.strokeStyle = s(GOLD, true); g.stroke(nose);
  // mulut (lubang) dengan taring
  const mouth = new Path2D(); mouth.moveTo(-95, 62); mouth.bezierCurveTo(-50, 105, 50, 105, 95, 62); mouth.bezierCurveTo(50, 80, -50, 80, -95, 62);
  g.fillStyle = s(INK, false, true); g.fill(mouth);
  g.fillStyle = s('#efe6d0', false);
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.rect(i * 15 - 6, 70, 12, 11); g.fill(); }                     // gigi atas
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 60, 72); g.lineTo(sd * 46, 122); g.lineTo(sd * 36, 76); g.closePath(); g.fill(); } // taring
});

// 1f. gapura di dasar + panel samping bertatah
layer((g, s) => {
  g.clip(SIL);
  const side = new Path2D(); side.rect(0, GATE_TOP, W, 1815 - GATE_TOP);
  g.fillStyle = s(RED_D, false); g.fill(side);
  // tatahan bubuk di panel samping
  g.fillStyle = s(INK, false, true);
  for (let y = GATE_TOP + 40; y < 1790; y += 34) for (let x = 120 + ((y / 34) % 2) * 17; x < 1290; x += 34) {
    if (x > 505 && x < 895) continue;
    g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = s(GOLD, true); g.lineWidth = 10; g.beginPath(); g.moveTo(0, GATE_TOP + 4); g.lineTo(W, GATE_TOP + 4); g.stroke();
  // badan gapura
  const tier = (x0, x1, y0, x2, x3, y1, col) => {
    const p = new Path2D(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x3, y1); p.lineTo(x2, y1); p.closePath();
    g.fillStyle = s(col, false); g.fill(p); g.lineWidth = 7; g.strokeStyle = s(GOLD, true); g.stroke(p);
  };
  tier(510, 890, 1815, 520, 880, 1770, TEAL);       // umpak
  tier(560, 840, 1770, 560, 840, 1580, TEAL);       // badan
  tier(535, 865, 1580, 585, 815, 1515, RED);        // atap 1
  tier(585, 815, 1515, 625, 775, 1462, RED);        // atap 2
  const top = new Path2D(); top.moveTo(650, 1462); top.lineTo(750, 1462); top.lineTo(CX, 1398); top.closePath();
  g.fillStyle = s(GOLD, true); g.fill(top);
  // pintu dua daun (lubang) berpuncak lengkung
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 630 : 706, x1 = x0 + 64;
    const d = new Path2D(); d.moveTo(x0, 1770); d.lineTo(x0, 1660); d.quadraticCurveTo((x0 + x1) / 2, 1610, x1, 1660); d.lineTo(x1, 1770); d.closePath();
    g.fillStyle = s(INK, false, true); g.fill(d);
    // jendela belah ketupat kecil
    g.beginPath(); const wx = CX + sd * 112; g.moveTo(wx, 1620); g.lineTo(wx + 18, 1650); g.lineTo(wx, 1680); g.lineTo(wx - 18, 1650); g.closePath(); g.fill();
  }
});

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
camera.position.set(-1.55, 1.05, 3.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.3, 0.86, 0.6); controls.enableDamping = true;
controls.minDistance = 1.5; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.55;

const texOf = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
const alphaTex = texOf(cA), colorTex = texOf(cC, true), mrTex = texOf(cM);

// Geometri: siluet diekstrusi tipis (ketebalan kulit). Koordinat dinormalisasi ke [0,1]
// supaya UV tutup = posisi (default ExtrudeGeometry), lalu diskalakan ke ukuran nyata.
const GW = 1.05, GH = 1.5, THICK = 0.008;
const nShape = new THREE.Shape(silPts.map((p) => new THREE.Vector2(p.x / W, 1 - p.y / H)));
const gGeo = new THREE.ExtrudeGeometry(nShape, { depth: THICK, bevelEnabled: false, curveSegments: 1 });
gGeo.translate(-0.5, 0, 0);
const gMat = new THREE.MeshStandardMaterial({
  map: colorTex, alphaMap: alphaTex, alphaTest: 0.5, metalnessMap: mrTex, roughnessMap: mrTex,
  metalness: 1, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 1.0,
});
const gunungan = new THREE.Mesh(gGeo, gMat);
gunungan.scale.set(GW, GH, 1);
gunungan.position.set(0, 0.1, -THICK / 2); // dasar kulit di atas gedebog, tangkai tertancap
gunungan.castShadow = true;
gunungan.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alphaTex, alphaTest: 0.5 });
const pivot = new THREE.Group(); pivot.add(gunungan); scene.add(pivot);

// gedebog (batang tempat wayang ditancapkan)
const gedebogTex = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#5d5a36'; g.fillRect(0, 0, 512, 64);
  for (let y = 0; y < 64; y += 3) { g.fillStyle = `rgba(${150 + Math.random() * 40},${140 + Math.random() * 30},90,0.25)`; g.fillRect(0, y, 512, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const gedebog = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.7, 32, 1),
  new THREE.MeshStandardMaterial({ map: gedebogTex, roughness: 0.85, color: 0x9a9070 }));
gedebog.rotation.z = Math.PI / 2; gedebog.position.set(0, 0.1, 0); gedebog.castShadow = gedebog.receiveShadow = true; scene.add(gedebog);

// kelir: layar kain putih berbingkai, menangkap bayangan berpola dari tatahan
const kelir = new THREE.Group();
{
  // kain tembus cahaya: pencahayaan dua sisi, jadi bayangan dari blencong terlihat dari depan
  const clothMat = new THREE.MeshLambertMaterial({ color: 0xefe4cf, side: THREE.DoubleSide });
  clothMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_lambert_pars_fragment>',
      THREE.ShaderChunk.lights_lambert_pars_fragment.replace('saturate( dot( geometryNormal, directLight.direction ) )', '0.3 * abs( dot( geometryNormal, directLight.direction ) )'));
  };
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), clothMat);
  cloth.receiveShadow = true; kelir.add(cloth);
  const edge = new THREE.MeshStandardMaterial({ color: 0x5e1a13, roughness: 0.7 });
  for (const [w, h, x, y] of [[1.78, 0.06, 0, 0.655], [1.78, 0.06, 0, -0.655], [0.06, 1.36, 0.88, 0], [0.06, 1.36, -0.88, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), edge); b.position.set(x, y, 0); b.castShadow = true; kelir.add(b);
  }
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

// Blencong: cahaya kuat dari belakang gunungan, menembus tatahan ke lantai depan
const LAMP_REST = new THREE.Vector3(0, 1.2, -0.75);
const lamp = new THREE.SpotLight(0xffa046, 60, 0, 0.85, 0.55, 2);
lamp.position.copy(LAMP_REST); lamp.target.position.set(0.55, 0.85, 1.6);
lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0003; lamp.shadow.radius = 2;
scene.add(lamp, lamp.target);
// nyala api (HDR, ikut bloom) + pendar lebar di belakang
const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.62, 0.25).multiplyScalar(14) }));
scene.add(flame);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,200,130,1)'); gr.addColorStop(0.12, 'rgba(255,150,70,0.5)'); gr.addColorStop(0.45, 'rgba(255,120,50,0.09)'); gr.addColorStop(1, 'rgba(255,110,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.72, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
scene.add(glow);
// cahaya isi lembut dari depan supaya sungging terlihat
const fill = new THREE.SpotLight(0xffc89a, 15, 0, 0.3, 0.9, 2); fill.position.set(-1.6, 2.4, 2.8); fill.target.position.set(-0.05, 0.9, 0); scene.add(fill, fill.target);
scene.add(new THREE.HemisphereLight(0x2a2f55, 0x140b06, 0.18));

// debu yang melayang di berkas cahaya
const DUST = 700;
const dustGeo = new THREE.BufferGeometry();
const dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) { const z = 0.05 + Math.random() * 1.6; dpos[i * 3] = (Math.random() - 0.5) * (0.6 + z * 0.7); dpos[i * 3 + 1] = Math.random() * 1.6 * (1 - z * 0.35); dpos[i * 3 + 2] = z; dseed[i] = Math.random() * 100; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.007, color: new THREE.Color(1, 0.75, 0.45), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// ======================= 3. POST & ANIMASI =======================
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

// kursor menggeser cahaya; diam 3 dtk → kembali bergoyang sendiri
const pointer = { x: 0, y: 0, last: -10 };
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1; pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  pointer.last = performance.now() / 1000;
});
const clock = new THREE.Clock();
const lampPos = LAMP_REST.clone();
function animate() {
  requestAnimationFrame(animate);
  const t = window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime(); // __fixedT: hanya untuk uji
  const idle = performance.now() / 1000 - pointer.last > 3;
  const tx = idle ? -0.15 + Math.sin(t * 0.45) * 0.35 : -0.15 + pointer.x * 0.6;
  const ty = idle ? 1.2 + Math.sin(t * 0.31) * 0.12 : 1.2 + pointer.y * 0.45;
  lampPos.x += (tx - lampPos.x) * 0.06; lampPos.y += (ty - lampPos.y) * 0.06;
  const flick = 1 + Math.sin(t * 9.3) * 0.04 + Math.sin(t * 17.1) * 0.03;
  lamp.position.copy(lampPos); lamp.intensity = 60 * flick;
  flame.position.copy(lampPos); flame.scale.setScalar(flick);
  glow.position.set(lampPos.x, lampPos.y, lampPos.z - 0.05); glow.lookAt(camera.position);
  // dalang menggoyang gunungan perlahan
  pivot.rotation.z = Math.sin(t * 0.6) * 0.03; pivot.rotation.y = Math.sin(t * 0.35) * 0.14;
  // debu melayang
  const pa = dustGeo.attributes.position;
  for (let i = 0; i < DUST; i++) { pa.array[i * 3 + 1] += 0.0006 + Math.sin(t + dseed[i]) * 0.0004; if (pa.array[i * 3 + 1] > 1.6) pa.array[i * 3 + 1] = 0; }
  pa.needsUpdate = true;
  controls.update(); outMat.uniforms.uTime.value = t;
  if (composer) composer.render(); else renderer.render(scene, camera);
}
animate();
