// Prototipe Tugas 1 v2 — Gong ageng 3D interaktif (Lakon Tiga Hari)
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height). Semua geometri & tekstur dibuat prosedural.
// Adegan: kepingan emas berkumpul → gong muncul → pukulan pertama otomatis → KLIK GONG untuk memukul.
// Pukulan: tabuh berayun, riak cahaya, gelombang kejut layar, percikan emas, gong berayun & bergetar.

// ======================= RENDERER & SCENE =======================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const NILA = 0x0a0c18;
const scene = new THREE.Scene();
scene.background = new THREE.Color(NILA);
scene.fog = new THREE.Fog(NILA, 5.5, 15);

const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 60);
camera.position.set(2.55, 1.5, 3.35);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.12, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.32;
controls.minDistance = 1.3;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.53;

const rand = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const makeCanvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const tex = (c, srgb, rep) => {
  const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};

// ======================= ENVIRONMENT (pantulan logam) =======================
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x06070c, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 1, 0); env.add(m);
  };
  panel(7, 3.5, [-4, 5, 4.5], [1.0, 0.72, 0.42], 5.5);
  panel(0.7, 5, [5, 1.8, 2.5], [1.0, 0.9, 0.75], 7);
  panel(5, 2.2, [-2, 2.5, -6], [0.32, 0.42, 1.0], 1.6);
  panel(9, 1.2, [0, -0.4, 6], [0.55, 0.32, 0.16], 0.8);
  panel(6, 4, [1.5, 2.4, 6.5], [1.0, 0.66, 0.36], 2.2);
  panel(2.5, 2.5, [-1.2, 0.6, 5.5], [1.0, 0.5, 0.2], 1.6);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.025).texture;
  pmrem.dispose();
}

// ======================= TEKSTUR =======================
// Perunggu gong (UV planar dari depan; pusat = pencu)
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
  g.fillStyle = 'rgb(74,74,74)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1500; i++) {
    const x = rand() * TS, y = rand() * TS, r = 20 + rand() * 90, v = 55 + rand() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.35)`); gr.addColorStop(1, 'rgba(74,74,74,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createRadialGradient(C, C, 0, C, C, R_PENCU * 1.1);
  gr.addColorStop(0, 'rgba(30,30,30,1)'); gr.addColorStop(0.85, 'rgba(38,38,38,1)'); gr.addColorStop(1, 'rgba(74,74,74,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(C, C, R_PENCU * 1.1, 0, Math.PI * 2); g.fill();
});
const bronzeColor = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(214,214,214)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1100; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * C, x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const r = 25 + rand() * 120, al = 0.06 + 0.16 * (rr / C);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(70,52,30,${al})`); gr.addColorStop(1, 'rgba(214,214,214,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const pg = g.createRadialGradient(C, C, 0, C, C, R_PENCU);
  pg.addColorStop(0, 'rgb(255,250,236)'); pg.addColorStop(1, 'rgb(236,226,206)');
  g.fillStyle = pg; g.beginPath(); g.arc(C, C, R_PENCU, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(60,44,24,0.55)'; g.lineWidth = 16; g.beginPath(); g.arc(C, C, R_PENCU + 10, 0, Math.PI * 2); g.stroke();
});

// Lak merah + ukiran lung-lungan emas (warna, metal/rough, bump) untuk gayor & tiang pendopo
const LW = 1024;
const lungLung = (g, mode) => { // mode: 'c' warna, 'm' metal/rough, 'b' bump
  const base = mode === 'c' ? '#5c1710' : mode === 'm' ? 'rgb(0,110,0)' : 'rgb(110,110,110)';
  const gold = mode === 'c' ? '#c9a45c' : mode === 'm' ? 'rgb(0,70,255)' : 'rgb(210,210,210)';
  g.fillStyle = base; g.fillRect(0, 0, LW, LW);
  if (mode === 'c') for (let i = 0; i < 260; i++) { const x = rand() * LW, y = rand() * LW, r = 30 + rand() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(30,6,4,0.18)'); gr.addColorStop(1, 'rgba(30,6,4,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = gold; g.fillStyle = gold; g.lineCap = 'round';
  // pita tepi atas & bawah
  g.lineWidth = 10; [26, LW - 26].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); });
  g.lineWidth = 3; [46, LW - 46].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); });
  // sulur berulang: batang gelombang + ukel + daun
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
      g.save(); g.translate(x + 30, y - dir * 18); g.rotate(-dir * 0.8);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(16, -14, 40, -10, 52, 0); g.bezierCurveTo(40, 10, 16, 14, 0, 0); g.fill(); g.restore();
      g.beginPath(); g.arc(x - 34, y + dir * 6, 7, 0, Math.PI * 2); g.fill();
    }
  }
};
const lacC = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'c')), true), lacM = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'm'))), lacB = tex(makeCanvas(LW, LW, (g) => lungLung(g, 'b')));
const lacquer = (rx, ry) => {
  const set = (t) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  return new THREE.MeshStandardMaterial({ map: set(lacC), metalnessMap: set(lacM), roughnessMap: set(lacM), bumpMap: set(lacB), bumpScale: 1.2, metalness: 1, roughness: 1, envMapIntensity: 1.1 });
};

// Tikar pandan (anyaman) dengan tepi merah
const tikarTex = tex(makeCanvas(1024, 640, (g, w, h) => {
  g.fillStyle = '#b89a62'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
    const odd = ((x + y) / 16) % 2;
    g.fillStyle = odd ? 'rgba(90,64,30,0.32)' : 'rgba(255,240,200,0.12)'; g.fillRect(x, y, 16, 16);
    g.strokeStyle = 'rgba(60,40,18,0.25)'; g.strokeRect(x + 0.5, y + 0.5, 15, 15);
  }
  g.fillStyle = '#7a1f16'; g.fillRect(0, 0, w, 44); g.fillRect(0, h - 44, w, 44); g.fillRect(0, 0, 44, h); g.fillRect(w - 44, 0, 44, h);
  g.fillStyle = '#d8b46a';
  for (let x = 60; x < w - 60; x += 36) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x + 10, 12); g.lineTo(x + 20, 22); g.lineTo(x + 10, 32); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x, h - 22); g.lineTo(x + 10, h - 32); g.lineTo(x + 20, h - 22); g.lineTo(x + 10, h - 12); g.closePath(); g.fill(); }
}), true);

// Lantai batu gelap berpetak
const floorTex = tex(makeCanvas(1024, 1024, (g, w) => {
  g.fillStyle = '#14161f'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 400; i++) { const x = rand() * w, y = rand() * w, r = 20 + rand() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,62,80,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3;
  for (let k = 0; k <= w; k += 256) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, w); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); }
}), true, [10, 10]);

// Kain pembungkus kepala tabuh (merah + ikatan gelap)
const clothTex = tex(makeCanvas(512, 256, (g, w, h) => {
  g.fillStyle = '#8e2418'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`; g.fillRect(0, y, w, 1); }
  g.fillStyle = '#2a0d08'; [40, 120, 200].forEach((y) => g.fillRect(0, y, w, 10));
  g.fillStyle = '#d0a85a'; [56, 136, 216].forEach((y) => g.fillRect(0, y, w, 3));
}), true);

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
  color: 0xd6aa66, metalness: 1, roughness: 0.3,
  map: tex(bronzeColor, true), roughnessMap: tex(bronzeRough), bumpMap: tex(bronzeBump), bumpScale: 1.4,
  envMapIntensity: 1.25, emissive: 0x6a4214, emissiveIntensity: 0, transparent: true, opacity: 0,
});
const GONG_Y = 1.1, HANG_Y = 1.64;
const gong = new THREE.Mesh(gongGeo, bronze);
gong.castShadow = gong.receiveShadow = true;
const gongPivot = new THREE.Group(); gongPivot.position.set(0, HANG_Y, 0);
gong.position.set(0, GONG_Y - HANG_Y, 0); gongPivot.add(gong); scene.add(gongPivot);
// cincin kuningan tempat tali di bibir gong
const ringMat = new THREE.MeshStandardMaterial({ color: 0xd8b46a, metalness: 1, roughness: 0.25 });
for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 10, 24), ringMat); r.position.set(s * 0.15, GONG_Y + 0.47 - HANG_Y, -0.13); r.rotation.y = Math.PI / 2; gongPivot.add(r); }

// ======================= GAYOR (lak merah + prada + naga) =======================
const prada = new THREE.MeshStandardMaterial({ color: 0xcfa75c, roughness: 0.26, metalness: 1, envMapIntensity: 1.25 });
const gayor = new THREE.Group(); scene.add(gayor);
const add = (m) => { m.castShadow = m.receiveShadow = true; gayor.add(m); return m; };
const POST_X = 0.86, BAR_Y = 1.88;
const postMat = lacquer(2, 3);
for (const s of [-1, 1]) {
  const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.064, 1.92, 28), postMat)); post.position.set(s * POST_X, 0.96 + 0.06, 0);
  // kaki berbevel
  const fs = new THREE.Shape(); fs.moveTo(-0.26, 0); fs.lineTo(0.26, 0); fs.quadraticCurveTo(0.28, 0.07, 0.16, 0.09); fs.lineTo(-0.16, 0.09); fs.quadraticCurveTo(-0.28, 0.07, -0.26, 0);
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.2, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }); fg.translate(0, 0, -0.1); fg.rotateY(Math.PI / 2);
  const foot = add(new THREE.Mesh(fg, lacquer(1, 1))); foot.position.set(s * POST_X, 0, 0);
  [0.13, 1.72].forEach((y) => { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 28), prada)); b.position.set(s * POST_X, y, 0); });
  const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 28, 18), prada)); knob.position.set(s * POST_X, BAR_Y + 0.12, 0);
  const tip = add(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 20), prada)); tip.position.set(s * POST_X, BAR_Y + 0.21, 0);
}
{ // palang lurus berbevel
  const sh = new THREE.Shape(); sh.moveTo(-0.97, -0.058); sh.lineTo(0.97, -0.058); sh.lineTo(0.97, 0.058); sh.lineTo(-0.97, 0.058); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 }); g.translate(0, 0, -0.055);
  const m = lacquer(0.55, 2.2); const bar = add(new THREE.Mesh(g, m)); bar.position.y = BAR_Y;
  const list = add(new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.022, 0.136), prada)); list.position.y = BAR_Y - 0.068;
}
// Naga di kedua ujung palang: badan meruncing berlapis emas, kepala bermahkota, rahang terbuka
const taperTube = (curve, segs, r0, r1, radial = 14) => {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, P = curve.getPointAt(u), r = r0 + (r1 - r0) * Math.pow(u, 0.9);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; const v = new THREE.Vector3().fromBufferAttribute(pos, k).sub(P).multiplyScalar(r).add(P); pos.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals(); return g;
};
const redLac = new THREE.MeshStandardMaterial({ color: 0x6e1a12, roughness: 0.4, metalness: 0.1 });
const makeNaga = (s) => {
  const grp = new THREE.Group();
  const pts = [[0.9, 0.0], [1.02, -0.03], [1.14, 0.0], [1.21, 0.1], [1.2, 0.22], [1.13, 0.3], [1.16, 0.4], [1.27, 0.45]].map(([x, y]) => new THREE.Vector3(s * x, BAR_Y + y, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const body = new THREE.Mesh(taperTube(curve, 90, 0.058, 0.03), prada); body.castShadow = true; grp.add(body);
  for (let i = 1; i < 9; i++) { // sisik: cincin lak merah di sepanjang badan
    const u = i / 10, P = curve.getPointAt(u), T = curve.getTangentAt(u), r = 0.058 + (0.03 - 0.058) * u;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.006, 8, 24), redLac); ring.position.copy(P);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), T); grp.add(ring);
  }
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1);
  const head = new THREE.Group(); head.position.copy(end); head.lookAt(end.clone().add(dir)); grp.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), prada); skull.scale.set(0.85, 0.75, 1.5); skull.position.z = 0.04; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 12), prada); jaw.scale.set(0.8, 0.45, 1.5); jaw.position.set(0, -0.035, 0.07); jaw.rotation.x = 0.35; head.add(jaw);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), redLac); mouth.scale.set(0.7, 0.35, 1.2); mouth.position.set(0, -0.018, 0.085); head.add(mouth);
  for (const e of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffefc0, emissive: 0x6a3a10, emissiveIntensity: 0.6, roughness: 0.2 })); eye.position.set(e * 0.03, 0.018, 0.055); head.add(eye); }
  // mahkota (makutha): lidah-lidah api emas
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.075 + (i === 2 ? 0.03 : 0), 10), prada); const a = (i - 2) * 0.32; f.position.set(Math.sin(a) * 0.03, 0.05 + Math.cos(a) * 0.012, -0.005 - Math.abs(i - 2) * 0.008); f.rotation.z = -a; f.rotation.x = -0.35; head.add(f); }
  // jenggot ukel di bawah rahang
  const bp2 = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 2, r = 0.035 * (1 - t * 0.8); bp2.push(new THREE.Vector3(Math.cos(a) * r * 0.4, -0.07 - t * 0.02 + Math.sin(a) * r, 0.03 + Math.sin(a) * r * 0.5)); }
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp2), 50, 0.007, 8), prada));
  return grp;
};
gayor.add(makeNaga(-1), makeNaga(1));
{ // mahkota ukir di tengah palang
  const bud = new THREE.Shape(); bud.moveTo(0, 0); bud.bezierCurveTo(0.15, 0.04, 0.13, 0.2, 0, 0.36); bud.bezierCurveTo(-0.13, 0.2, -0.15, 0.04, 0, 0);
  const g = new THREE.ExtrudeGeometry(bud, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 28 }); g.translate(0, 0, -0.015);
  const crest = add(new THREE.Mesh(g, prada)); crest.position.set(0, BAR_Y + 0.06, 0);
  const inner = new THREE.Shape(); inner.moveTo(0, 0.05); inner.bezierCurveTo(0.08, 0.07, 0.07, 0.17, 0, 0.27); inner.bezierCurveTo(-0.07, 0.17, -0.08, 0.07, 0, 0.05);
  const ig = new THREE.ExtrudeGeometry(inner, { depth: 0.02, bevelEnabled: false, curveSegments: 20 }); const im = add(new THREE.Mesh(ig, redLac)); im.position.set(0, BAR_Y + 0.06, 0.012);
  for (const sx of [-1, 1]) {
    const p = []; for (let i = 0; i <= 44; i++) { const t = i / 44, a = t * Math.PI * 2.4, r = 0.12 * (1 - t * 0.8); p.push(new THREE.Vector3(sx * (0.06 + 0.13 * t + r * Math.sin(a) * 0.6), BAR_Y + 0.13 + r * Math.cos(a) * 0.6, 0)); }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 90, 0.013, 8), prada));
  }
}
// tali merah dari palang ke cincin di bibir gong
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a2318, roughness: 0.85 });
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
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.56, 16), new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.55 }));
  handle.rotation.x = Math.PI / 2; handle.position.z = 0.38; handle.castShadow = true; mallet.add(handle);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10), prada); cap.position.z = 0.66; mallet.add(cap);
}
const M_REST = new THREE.Vector3(0.66, 0.92, 0.5), M_WIND = new THREE.Vector3(0.7, 1.32, 0.92), M_HIT = new THREE.Vector3(0.05, 1.095, 0.195);
const M_GRIP = new THREE.Vector3(0.46, 0.3, 0.4);

// ======================= RUANG: lantai, tikar, tiang pendopo, berkas cahaya =======================
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const tikar = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.7), new THREE.MeshStandardMaterial({ map: tikarTex, roughness: 0.92 }));
tikar.rotation.x = -Math.PI / 2; tikar.position.y = 0.003; tikar.receiveShadow = true; scene.add(tikar);
const pillarMat = lacquer(1.5, 6), stone = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.85 });
for (const [x, z] of [[-2.6, -2.1], [2.6, -2.1], [-3.7, 1.1], [3.7, 1.1]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.6, 24), pillarMat); p.position.set(x, 2.3 + 0.28, z); p.castShadow = p.receiveShadow = true; scene.add(p);
  const u = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.28, 4), stone); u.rotation.y = Math.PI / 4; u.position.set(x, 0.14, z); u.receiveShadow = true; scene.add(u);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.12, 24), prada); cap.position.set(x, 4.2, z); scene.add(cap);
}
// berkas cahaya (palsu-volumetrik) dari kiri atas ke gong
const shaftMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1.0, 0.72, 0.42) }, uI: { value: 0.065 } },
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
const DUST = 700, dustGeo = new THREE.BufferGeometry(), dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  const u = rand(), P = SHAFT_TO.clone().lerp(SHAFT_FROM, u), r = (0.14 + (1.05 - 0.14) * (1 - u)) * Math.sqrt(rand()) * 0.8, a = rand() * Math.PI * 2;
  dpos[i * 3] = P.x + Math.cos(a) * r; dpos[i * 3 + 1] = P.y + (rand() - 0.5) * 0.3; dpos[i * 3 + 2] = P.z + Math.sin(a) * r; dseed[i] = rand() * 100;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.008, color: new THREE.Color(1, 0.78, 0.5), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));

// ======================= CAHAYA =======================
const key = new THREE.SpotLight(0xffb257, 75, 0, 0.5, 0.85, 2);
key.position.set(1.7, 3.4, 2.8); key.target.position.set(0, GONG_Y, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key, key.target);
const beam = new THREE.SpotLight(0xffc48a, 18, 0, 0.28, 0.9, 2); beam.position.copy(SHAFT_FROM); beam.target.position.copy(SHAFT_TO); scene.add(beam, beam.target);
const rim = new THREE.DirectionalLight(0x7088ff, 0.6); rim.position.set(-3, 2.2, -3.2); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x2b3160, 0x140b06, 0.3));
const flicker = new THREE.PointLight(0xff9a3c, 2.2, 0, 2); flicker.position.set(-1.1, 1.0, 1.4); scene.add(flicker);
const strikeLight = new THREE.PointLight(0xffc878, 0, 0, 2); strikeLight.position.set(0, GONG_Y, 0.45); scene.add(strikeLight);

// ======================= KEPINGAN EMAS (pembukaan) =======================
const SHARDS = 750;
const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.02), new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.22, emissive: 0x2a1806 }), SHARDS);
scene.add(shards);
const zAt = (r) => { for (let i = 1; i < fpts.length; i++) if (fpts[i].x >= r) { const a = fpts[i - 1], b = fpts[i], k = (r - a.x) / Math.max(1e-6, b.x - a.x); return a.y + (b.y - a.y) * k; } return fpts[fpts.length - 1].y; };
const shardData = Array.from({ length: SHARDS }, () => {
  const r = Math.sqrt(rand()) * 0.49, a = rand() * Math.PI * 2;
  const to = new THREE.Vector3(Math.cos(a) * r, GONG_Y + Math.sin(a) * r, zAt(r) + 0.004);
  const from = to.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize().multiplyScalar(1.4 + rand() * 2.2));
  return { from, to, delay: rand() * 0.9, spin: new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(9) };
});

// ======================= EFEK PUKULAN: riak, percikan =======================
const ripples = [0, 1, 2, 3].map((i) => {
  const thin = i % 2 === 0;
  const m = new THREE.Mesh(new THREE.RingGeometry(thin ? 0.97 : 0.86, 1.0, 180),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.76, 0.4).multiplyScalar(thin ? 2.2 : 0.9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, GONG_Y, 0.13); scene.add(m); return m;
});
const SPARKS = 140, sparkGeo = new THREE.BufferGeometry(), spos = new Float32Array(SPARKS * 3), svel = [];
for (let i = 0; i < SPARKS; i++) { const a = rand() * Math.PI * 2, el = rand() * 1.1; svel.push(new THREE.Vector3(Math.cos(a) * Math.sin(el), Math.sin(a) * Math.sin(el), Math.cos(el)).multiplyScalar(0.6 + rand() * 1.6)); }
sparkGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
const sparkMat = new THREE.PointsMaterial({ size: 0.02, color: new THREE.Color(1, 0.8, 0.45).multiplyScalar(3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(sparkGeo, sparkMat));

// ======================= POST: bloom + gelombang kejut + aberasi + vignette + grain =======================
let composer = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uShock: { value: -1 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: width / height } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uShock, uAspect; uniform vec2 uCenter; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 off = vec2(0.0);
      if (uShock >= 0.0 && uShock < 1.8) {
        vec2 d = uv - uCenter; d.x *= uAspect; float dist = length(d);
        float radius = uShock * 0.75, w = 0.07;
        float ring = smoothstep(radius - w, radius, dist) * (1.0 - smoothstep(radius, radius + w, dist));
        vec2 dir = d / max(dist, 1e-4); dir.x /= uAspect;
        off = dir * ring * 0.016 * exp(-uShock * 1.8);
      }
      vec4 c = texture2D(tDiffuse, uv - off);
      c.r = texture2D(tDiffuse, uv - off * 1.6).r; c.b = texture2D(tDiffuse, uv - off * 0.4).b;
      gl_FragColor = c;
      gl_FragColor.rgb *= smoothstep(0.95, 0.32, distance(vUv, vec2(0.5)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(vUv * 1000.0) - 0.5) * 0.035;
    }`,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let bloomPass = null;
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.55, 0.95); composer.addPass(bloomPass);
  composer.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {},
    render(r, w, read) { outMat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(null); r.render(quadScene, quadCam); } });
} catch (e) { composer = null; }

// ======================= INTERAKSI: klik gong untuk memukul =======================
const clock = new THREE.Clock();
const now = () => (window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime());
const T_ASSEMBLE = 2.6, T_AUTO = 4.2;
let strikeAt = T_AUTO, userStruck = false, hovered = false, lastPointer = -10;
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
Object.assign(hint.style, { position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', font: '600 11px/1.2 system-ui, sans-serif', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,235,221,0.72)', pointerEvents: 'none', transition: 'opacity .8s', opacity: '0' });
if (canvas.parentElement) { if (getComputedStyle(canvas.parentElement).position === 'static') canvas.parentElement.style.position = 'relative'; canvas.parentElement.appendChild(hint); }

// ======================= ANIMASI =======================
const ease4 = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
const easeIn3 = (t) => { t = Math.min(Math.max(t, 0), 1); return t * t * t; };
const easeOutBack = (t) => { t = Math.min(Math.max(t, 0), 1); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const dummy = new THREE.Object3D(), headPos = new THREE.Vector3(), pencuScreen = new THREE.Vector3(), shakeOff = new THREE.Vector3();
let raf = 0;
function animate() {
  raf = requestAnimationFrame(animate);
  const t = now();

  // 1) kepingan berkumpul → gong muncul
  if (shards.visible) {
    for (let i = 0; i < SHARDS; i++) {
      const d = shardData[i], k = ease4((t - d.delay) / 1.7);
      dummy.position.lerpVectors(d.from, d.to, k); dummy.rotation.set(d.spin.x * (1 - k), d.spin.y * (1 - k), d.spin.z * (1 - k));
      dummy.scale.setScalar(Math.max(0.0001, 1 - ease4((t - T_ASSEMBLE) / 0.7))); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true; if (t > T_ASSEMBLE + 0.8) shards.visible = false;
  }
  const appear = ease4((t - (T_ASSEMBLE - 0.3)) / 0.9);
  bronze.opacity = appear; if (appear >= 1 && bronze.transparent) { bronze.transparent = false; bronze.needsUpdate = true; }
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

  // 3) efek setelah hantaman
  const st = p - IMPACT;
  gongPivot.rotation.x = 0; gong.rotation.z = 0; bronze.emissiveIntensity = hovered ? 0.05 : 0; strikeLight.intensity = 0; outMat.uniforms.uShock.value = -1; shakeOff.set(0, 0, 0);
  ripples.forEach((m) => { m.material.opacity = 0; }); sparkMat.opacity = 0;
  if (st >= 0 && st < 6) {
    gongPivot.rotation.x = -0.04 * Math.exp(-st * 1.2) * Math.sin(st * 4.2);
    gong.rotation.z = 0.005 * Math.exp(-st * 2.2) * Math.sin(st * 43);
    bronze.emissiveIntensity = Math.max(bronze.emissiveIntensity, 0.14 * Math.exp(-st * 3.5));
    strikeLight.intensity = 1.8 * Math.exp(-st * 3.5);
    if (bloomPass) bloomPass.strength = 0.5 + 0.22 * Math.exp(-st * 2.5);
    ripples.forEach((m, i) => { const rt = st - i * 0.16, k = Math.min(Math.max(rt / 1.7, 0), 1); m.scale.setScalar(0.12 + ease4(k) * (0.62 + i * 0.05)); m.material.opacity = rt > 0 ? (1 - k) * (i % 2 ? 0.45 : 0.8) : 0; });
    const pa = sparkGeo.attributes.position, life = Math.min(st / 1.3, 1);
    for (let i = 0; i < SPARKS; i++) { const v = svel[i]; pa.setXYZ(i, v.x * st, GONG_Y + v.y * st - 0.9 * st * st, 0.13 + v.z * st); }
    pa.needsUpdate = true; sparkMat.opacity = 1 - life;
    pencuScreen.set(0, GONG_Y, 0.11).project(camera); outMat.uniforms.uCenter.value.set(pencuScreen.x * 0.5 + 0.5, pencuScreen.y * 0.5 + 0.5); outMat.uniforms.uShock.value = st;
    const sh = 0.014 * Math.exp(-st * 7);
    shakeOff.set(Math.sin(st * 73) * sh, Math.cos(st * 61) * sh, 0);
  } else if (bloomPass) bloomPass.strength = 0.5;

  // 4) blencong berkedip, debu melayang, kamera kembali berputar setelah diam
  flicker.intensity = 2.0 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 13.3) * 0.15;
  const dp = dustGeo.attributes.position;
  for (let i = 0; i < DUST; i++) dp.array[i * 3 + 1] += Math.sin(t * 0.7 + dseed[i]) * 0.0004;
  dp.needsUpdate = true;
  if (!controls.autoRotate && t - lastPointer > 8) controls.autoRotate = true;

  controls.update();
  camera.position.add(shakeOff);
  outMat.uniforms.uTime.value = t;
  if (composer) composer.render(); else renderer.render(scene, camera);
  camera.position.sub(shakeOff);
}
animate();
if (typeof __host !== 'undefined') __host.dispose = () => { cancelAnimationFrame(raf); hint.remove(); renderer.dispose(); };
