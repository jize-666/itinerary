// Prototipe: Keris 3D "Naga Sasra" (Lakon Tiga Hari) — satu bahasa visual dengan Gunungan & Gong "Murka"
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height). Semua geometri & tekstur dibuat prosedural, skala asli (meter).
// Adegan: keris tersarung melayang → warangka tergeser lepas (nyabut) → pamor menyala dari pangkal ke ujung
// → keris melayang & berputar pelan, jantungnya berdenyut. KLIK KERIS = membangkitkan pamor lagi.

// ======================= RENDERER & SCENE =======================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050306);
scene.fog = new THREE.Fog(0x070405, 1.2, 4);
const camera = new THREE.PerspectiveCamera(30, width / height, 0.01, 20);
camera.position.set(0.09, 0.16, 0.9);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.09, 0.15, 0); controls.enableDamping = true; controls.minDistance = 0.35; controls.maxDistance = 2.2;

// ==== KERIS BUILDER START ====
// Keris Surakarta dhapur Naga Sasra (luk 13): wilah berpamor + naga kinatah emas, ganja, mendhak bermata merah,
// ukiran Tunggak Semi dari timoho berpelet, warangka Ladrang + gandar berpendhok emas. Satuan meter, skala asli.
// Orientasi lokal: bilah menghadap +Y (pucuk di atas), gandhik (sisi depan) ke +X, ukiran di bawah.
// Atribut [V cek empu/kolektor]: jumlah luk, ricikan (gandhik, kembang kacang, greneng), bentuk ukiran & warangka gaya Surakarta.
const buildKeris = (maxAniso = 8) => {
  const mkC = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d', { willReadFrequently: true }), w, h); return c; };
  const T = (c, srgb, rep) => { const t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  let sd = 77; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

  // --- pamor: lapisan nikel bergelombang di baja hitam (u = panjang bilah, v = keliling penampang) ---
  const PW = 2048, PH = 512, strata = [];
  for (let i = 0; i < 52; i++) strata.push({ y0: r() * PH, a: [8 + r() * 26, r() * 12, r() * 5], f: [1 + r() * 2, 4 + r() * 5, 12 + r() * 10], p: [r() * 6, r() * 6, r() * 6], w: 0.8 + r() * 2.2, al: 0.22 + r() * 0.45 });
  const specks = Array.from({ length: 2600 }, () => [r() * PW, r() * PH, 0.6 + r() * 1.8, 0.2 + r() * 0.6]);
  const drawPamor = (g, mode) => { // 'c' warna, 'r' roughness(G)/metal(B), 'e' emisi
    g.fillStyle = mode === 'c' ? '#43464e' : mode === 'r' ? 'rgb(0,118,110)' : '#000'; g.fillRect(0, 0, PW, PH);
    for (const s of strata) {
      g.beginPath();
      for (let x = 0; x <= PW; x += 8) { const t = (x / PW) * Math.PI * 2; const y = s.y0 + s.a[0] * Math.sin(t * s.f[0] + s.p[0]) + s.a[1] * Math.sin(t * s.f[1] + s.p[1]) + s.a[2] * Math.sin(t * s.f[2] + s.p[2]); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.lineWidth = s.w * (mode === 'e' ? 1.5 : 1);
      g.strokeStyle = mode === 'c' ? `rgba(226,230,236,${s.al})` : mode === 'r' ? `rgba(0,35,255,${s.al})` : `rgba(255,255,255,${s.al})`;
      g.stroke();
    }
    for (const [x, y, rr, al] of specks) { g.fillStyle = mode === 'c' ? `rgba(215,220,226,${al})` : mode === 'r' ? 'rgba(0,50,230,0.5)' : `rgba(255,255,255,${al})`; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
  };
  const pamorRM = T(mkC(PW, PH, (g) => drawPamor(g, 'r')));
  const sweep = { value: 1.3 };
  const pamorMat = new THREE.MeshPhysicalMaterial({
    map: T(mkC(PW, PH, (g) => drawPamor(g, 'c')), true), roughnessMap: pamorRM, metalnessMap: pamorRM, metalness: 1, roughness: 1,
    envMapIntensity: 1.6, emissive: new THREE.Color(1, 0.36, 0.08), emissiveMap: T(mkC(PW, PH, (g) => drawPamor(g, 'e')), true), emissiveIntensity: 0,
    clearcoat: 0.35, clearcoatRoughness: 0.3,
  });
  // sapuan bara: pamor menyala dari pangkal (u=0) sampai uSweep, dengan pinggiran terang di depan sapuan
  pamorMat.onBeforeCompile = (sh) => {
    sh.uniforms.uSweep = sweep;
    sh.fragmentShader = 'uniform float uSweep;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
      vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
      float filled = 1.0 - smoothstep( uSweep, uSweep + 0.06, vEmissiveMapUv.x );
      float edge = exp( -pow( ( vEmissiveMapUv.x - uSweep ) / 0.03, 2.0 ) );
      totalEmissiveRadiance *= emissiveColor.rgb * ( filled + edge * 2.6 );
    #endif`);
  };
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe2b65c, metalness: 1, roughness: 0.2, envMapIntensity: 1.45, clearcoat: 0.25 });
  const rubyMat = new THREE.MeshPhysicalMaterial({ color: 0x8a0606, roughness: 0.04, metalness: 0, emissive: 0xff1a06, emissiveIntensity: 0.5, clearcoat: 1, clearcoatRoughness: 0.02 });
  const steelMat = new THREE.MeshPhysicalMaterial({ map: pamorMat.map, roughnessMap: pamorRM, metalnessMap: pamorRM, metalness: 1, roughness: 1, envMapIntensity: 1.2, color: 0x9a9aa0 });

  const root = new THREE.Group(), keris = new THREE.Group(); root.add(keris);

  // --- wilah (bilah) luk 13: penampang lensa bergigir (ada-ada), lebar menyempit ke pucuk ---
  const L = 0.36, NU = 280, NV = 32, LUK = 13;
  const hwAt = (u) => { const b = 0.0205 * (1 - 0.52 * u); return u < 0.86 ? b : b * Math.sqrt(Math.max(0, (1 - u) / 0.14)); };
  const thAt = (u) => 0.0062 * Math.pow(1 - u, 0.75) + 0.0006;
  const cxAt = (u) => { if (u < 0.13) return 0; const uu = (u - 0.13) / 0.87, env = Math.min(1, (u - 0.13) / 0.08) * (1 - 0.45 * uu); return 0.0064 * env * Math.sin(LUK * Math.PI * uu); };
  const gandhik = (u) => (u < 0.12 ? 0.0036 * Math.cos((u / 0.12) * Math.PI * 0.5) : 0);                 // depan pangkal menebal
  const greneng = (u) => (u < 0.09 ? 0.0019 * Math.abs(Math.sin((u / 0.09) * Math.PI * 5)) : 0);        // gerigi di belakang pangkal
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, y = u * L, cx = cxAt(u), hw = hwAt(u), th = thAt(u);
    for (let k = 0; k <= NV; k++) {
      const a = (k / NV) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const w = c >= 0 ? hw + gandhik(u) : hw - greneng(u);
      pos.push(cx + w * c, y, (th / 2) * Math.sign(s) * Math.pow(Math.abs(s), 0.6)); uv.push(u, k / NV);
    }
  }
  for (let i = 0; i < NU; i++) for (let k = 0; k < NV; k++) { const a = i * (NV + 1) + k, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const bc = pos.length / 3; pos.push(0, 0, 0); uv.push(0, 0.5); for (let k = 0; k < NV; k++) idx.push(bc, k + 1, k);
  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bladeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bladeGeo.setIndex(idx); bladeGeo.computeVertexNormals();
  const blade = new THREE.Mesh(bladeGeo, pamorMat); keris.add(blade);

  // --- naga kinatah emas di kedua muka bilah, kepala bermahkota di gandhik ---
  const taper = (curve, segs, r0, r1, radial = 10) => {
    const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), p = g.attributes.position;
    for (let i = 0; i <= segs; i++) { const u = i / segs, P = curve.getPointAt(u), rr = r0 + (r1 - r0) * Math.pow(u, 0.8); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; const v = new THREE.Vector3().fromBufferAttribute(p, k).sub(P).multiplyScalar(rr).add(P); p.setXYZ(k, v.x, v.y, v.z); } }
    g.computeVertexNormals(); return g;
  };
  for (const side of [1, -1]) {
    const pts = []; for (let i = 0; i <= 80; i++) { const u = 0.07 + (i / 80) * 0.63; pts.push(new THREE.Vector3(cxAt(u) + hwAt(u) * 0.12 + (u < 0.12 ? 0.004 * (1 - u / 0.12) : 0), u * L, side * (thAt(u) / 2) * 0.9)); }
    keris.add(new THREE.Mesh(taper(new THREE.CatmullRomCurve3(pts), 160, 0.0024, 0.0004), goldMat));
    for (let i = 1; i < 14; i++) { const u = 0.08 + i * 0.042, sc = new THREE.Mesh(new THREE.SphereGeometry(0.0011 * (1 - i / 16), 8, 6), goldMat); sc.position.set(cxAt(u) + hwAt(u) * 0.34, u * L, side * thAt(u) * 0.34); keris.add(sc); }
  }
  const head = new THREE.Group(); head.position.set(hwAt(0.05) + gandhik(0.05) + 0.0012, 0.026, 0); head.rotation.z = -0.25; head.scale.setScalar(1.45); keris.add(head);
  { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.0056, 18, 12), goldMat); sk.scale.set(0.8, 1.5, 0.95); head.add(sk);
    const sn = new THREE.Mesh(new THREE.SphereGeometry(0.004, 14, 10), goldMat); sn.scale.set(0.75, 1.4, 0.8); sn.position.set(0.0012, 0.0085, 0); head.add(sn);
    const jw = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 12, 8), goldMat); jw.scale.set(0.7, 1.3, 0.7); jw.position.set(0.0034, 0.0068, 0); jw.rotation.z = -0.5; head.add(jw);
    for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0013, 0.0065 + (k === 2 ? 0.0025 : 0), 8), goldMat); const a = (k - 2) * 0.4; c.position.set(-0.002 - Math.cos(a) * 0.002, -0.004 + Math.sin(a) * 0.0035, 0); c.rotation.z = Math.PI * 0.62 + a * 0.5; head.add(c); }
    for (const e of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 10, 8), rubyMat); ey.position.set(0.0018, 0.0035, e * 0.0045); head.add(ey); } }
  // kembang kacang: lengkung belalai di depan pangkal
  { const p = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = Math.PI * 0.5 + t * Math.PI * 1.7, rr = 0.0042 * (1 - t * 0.7); p.push(new THREE.Vector3(hwAt(0) + 0.0042 + Math.cos(a) * rr, 0.0075 + Math.sin(a) * rr, 0)); }
    keris.add(new THREE.Mesh(taper(new THREE.CatmullRomCurve3(p), 40, 0.0016, 0.0007), steelMat)); }

  // --- ganja: bilah pelintang terpisah, sirah cecak di depan, buntut cecak runcing di belakang ---
  { const s = new THREE.Shape(); s.moveTo(-0.034, 0.0022); s.quadraticCurveTo(-0.02, 0, 0, 0); s.lineTo(0.026, 0); s.quadraticCurveTo(0.035, 0.002, 0.035, 0.007); s.quadraticCurveTo(0.031, 0.0122, 0.024, 0.0122); s.lineTo(-0.012, 0.0122); s.quadraticCurveTo(-0.027, 0.011, -0.034, 0.0022);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0084, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 2, curveSegments: 18 }); g.translate(0, -0.0122, -0.0042);
    keris.add(new THREE.Mesh(g, steelMat)); }
  // --- mendhak: cincin emas bermata merah ---
  { const mb = new THREE.Mesh(new THREE.CylinderGeometry(0.0084, 0.0094, 0.011, 36), goldMat); mb.position.y = -0.0185; keris.add(mb);
    for (const [y, rr] of [[-0.0131, 0.0089], [-0.0239, 0.0096]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0011, 8, 44), goldMat); t.rotation.x = Math.PI / 2; t.position.y = y; keris.add(t); }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, gm = new THREE.Mesh(new THREE.SphereGeometry(0.0017, 12, 8), rubyMat); gm.position.set(Math.cos(a) * 0.0094, -0.0185, Math.sin(a) * 0.0094); keris.add(gm); } }

  // --- ukiran Tunggak Semi: timoho berpelet, melengkung, berukir tunas ---
  const timoho = (g, w, h, bump) => {
    g.fillStyle = bump ? 'rgb(128,128,128)' : '#26160b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { // pelet: noda kayu terang berkelok
      const x = r() * w, y = r() * h, rx = 20 + r() * 70, ry = 8 + r() * 26;
      g.fillStyle = bump ? 'rgba(140,140,140,0.3)' : `rgba(${150 + r() * 40},${108 + r() * 30},${58 + r() * 20},${0.4 + r() * 0.35})`;
      g.beginPath(); for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, rr = 1 + 0.35 * Math.sin(a * 3 + i); const px = x + Math.cos(a) * rx * rr, py = y + Math.sin(a) * ry * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.fill();
    }
    for (let x = 0; x < w; x += 3) { g.strokeStyle = bump ? `rgba(100,100,100,${0.2 + r() * 0.3})` : `rgba(10,5,2,${0.12 + r() * 0.2})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + x) * 3, y); g.stroke(); }
  };
  const hiltBump = mkC(512, 1024, (g, w, h) => {
    timoho(g, w, h, true);
    g.strokeStyle = 'rgb(220,220,220)'; g.fillStyle = 'rgb(210,210,210)'; g.lineWidth = 9; g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const x0 = (k + 0.5) * (w / 4); // tunas (semi) bersulur di bagian atas & bawah
      for (const [y0, dir] of [[150, 1], [820, -1]]) { g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 40, y0 + dir * 60, x0 - 30, y0 + dir * 120, x0 + 20, y0 + dir * 170); g.stroke();
        g.beginPath(); g.ellipse(x0 + 26, y0 + dir * 80, 26, 12, -0.6 * dir, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x0 - 22, y0 + dir * 120, 22, 10, 0.6 * dir, 0, Math.PI * 2); g.fill(); } }
    g.lineWidth = 14; for (const y of [60, 480, 960]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
  const woodMat = (rep) => new THREE.MeshPhysicalMaterial({ map: T(mkC(512, 1024, (g, w, h) => timoho(g, w, h, false)), true, rep), roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.45 });
  { const prof = [[0.0074, 0], [0.0094, -0.008], [0.0118, -0.019], [0.0134, -0.033], [0.0116, -0.049], [0.0104, -0.061], [0.0124, -0.075], [0.0146, -0.087], [0.0138, -0.094], [0.0001, -0.0955]].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(prof, 48), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = -y / 0.0955; p.setX(i, p.getX(i) - 0.013 * Math.pow(t, 1.6)); p.setZ(i, p.getZ(i) * 0.82); }
    g.computeVertexNormals(); g.translate(0, -0.0245, 0);
    const m = woodMat(); m.bumpMap = T(hiltBump); m.bumpScale = 2.2;
    keris.add(new THREE.Mesh(g, m)); }

  // --- warangka Ladrang + gandar berpendhok emas (sarung lurus walau bilah ber-luk) ---
  const sheath = new THREE.Group(); root.add(sheath);
  { const s = new THREE.Shape();   // bentuk perahu ladrang, dibalik karena bilah menghadap atas
    const P2 = [[-0.094, -0.034], [-0.07, -0.012, -0.04, -0.004], [-0.01, 0.001, 0.03, 0], [0.066, -0.002, 0.084, -0.016], [0.096, -0.026, 0.09, -0.036], [0.08, -0.03, 0.07, -0.024], [0.04, -0.016, 0.0, -0.018], [-0.05, -0.02, -0.075, -0.026], [-0.088, -0.03, -0.094, -0.034]];
    s.moveTo(P2[0][0], P2[0][1]); for (let i = 1; i < P2.length; i++) s.quadraticCurveTo(...P2[i]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.024, bevelEnabled: true, bevelSize: 0.0018, bevelThickness: 0.0018, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0.016, -0.012);
    sheath.add(new THREE.Mesh(g, woodMat([0.4, 0.15]))); }
  const stadium = (w, t) => { const s = new THREE.Shape(), rr = t / 2; s.moveTo(-w / 2 + rr, -rr); s.lineTo(w / 2 - rr, -rr); s.absarc(w / 2 - rr, 0, rr, -Math.PI / 2, Math.PI / 2); s.lineTo(-w / 2 + rr, rr); s.absarc(-w / 2 + rr, 0, rr, Math.PI / 2, Math.PI * 1.5); return s; };
  const sleeve = (w, t, len, y0, mat) => {
    const g = new THREE.ExtrudeGeometry(stadium(w, t), { depth: len, bevelEnabled: false, curveSegments: 14, steps: 24 }); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 - 0.28 * (p.getY(i) / len); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (0.85 + 0.15 * k)); }
    g.computeVertexNormals(); g.translate(0.003, y0, 0); const m = new THREE.Mesh(g, mat); sheath.add(m); return m;
  };
  sleeve(0.033, 0.016, 0.35, 0.012, woodMat([1, 0.6]));
  const pendhokBump = mkC(256, 1024, (g, w, h) => {
    g.fillStyle = 'rgb(110,110,110)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgb(220,220,220)'; g.fillStyle = 'rgb(210,210,210)'; g.lineCap = 'round';
    g.lineWidth = 10; [24, h - 24].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
    for (let k = 0; k < 9; k++) { const y0 = 90 + k * 104; g.lineWidth = 6; g.beginPath(); for (let x = 0; x <= w; x += 6) { const y = y0 + Math.sin((x / w) * Math.PI * 4) * 22; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (let j = 0; j < 4; j++) { const x = (j + 0.5) * (w / 4), y = y0 + Math.sin(((x / w) * Math.PI * 4)) * 22; g.beginPath(); g.ellipse(x + 10, y - 16, 14, 6, -0.6, 0, Math.PI * 2); g.fill(); } }
  });
  const pendhokMat = new THREE.MeshPhysicalMaterial({ color: 0x8e6c36, metalness: 1, roughness: 0.42, bumpMap: T(pendhokBump), bumpScale: 2, envMapIntensity: 0.55, clearcoat: 0.1 });
  sleeve(0.0352, 0.0178, 0.3, 0.052, pendhokMat);
  { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 12), pendhokMat); cap.scale.set(1, 0.7, 0.65); cap.position.set(0.003, 0.362, 0); sheath.add(cap); }

  return { root, keris, sheath, blade, pamorMat, rubyMat, goldMat, sweep, L, tip: new THREE.Vector3(cxAt(1), L, 0) };
};
// ==== KERIS BUILDER END ====

// ======================= ENVIRONMENT (pantulan baja & emas) =======================
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x040304, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0.2, 0); env.add(m); };
  panel(6, 1.2, [-3, 4, 3], [1, 0.82, 0.62], 3.2);     // jendela panjang: garis kilau tajam di baja
  panel(0.6, 6, [4, 1, 2], [1, 0.9, 0.78], 2.6);
  panel(5, 3, [2, -2, -4], [1, 0.18, 0.06], 2.4);    // pantulan merah darah
  panel(4, 2, [-3, 0, -4], [0.9, 0.3, 0.1], 1.2);
  panel(8, 1, [0, -3, 3], [0.8, 0.25, 0.08], 1.4);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
}

// ======================= KERIS =======================
const K = buildKeris(renderer.capabilities.getMaxAnisotropy());
const stage = new THREE.Group(); scene.add(stage);
stage.position.set(0, 0.02, 0); stage.rotation.z = -0.52;   // disajikan miring: pucuk ke kanan atas
stage.add(K.root);
K.root.position.set(-0.02, 0.02, 0);

// ======================= LATAR, CAHAYA, BARA =======================
const radialTex = (stops, size = 256) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const smokeMat = new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(70,12,6,1)'], [0.45, 'rgba(30,5,3,0.7)'], [1, 'rgba(5,3,6,0)']]), transparent: true, depthWrite: false, fog: false });
const smoke = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), smokeMat); smoke.position.set(0.05, 0.18, -0.9); scene.add(smoke);
const key = new THREE.SpotLight(0xffe0bc, 3.0, 0, 0.5, 0.8, 2); key.position.set(-0.55, 0.85, 0.75); key.target.position.set(0, 0.17, 0); scene.add(key, key.target);
const rim = new THREE.SpotLight(0xff3a18, 0.9, 0, 0.6, 0.7, 2); rim.position.set(0.6, 0.5, -0.6); rim.target.position.set(0, 0.17, 0); scene.add(rim, rim.target);
const fill = new THREE.PointLight(0x8a96c8, 0.08, 3, 2); fill.position.set(0.6, 0.3, 0.8); scene.add(fill);
const ember = new THREE.PointLight(0xff3010, 0.12, 1.6, 2); ember.position.set(0.0, -0.25, 0.3); scene.add(ember);
const glint = new THREE.PointLight(0xff7a30, 0, 0.8, 2); scene.add(glint);
const dotTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 64);
const EMB = 260, embGeo = new THREE.BufferGeometry(), epos = new Float32Array(EMB * 3), evel = new Float32Array(EMB * 3), eseed = new Float32Array(EMB);
const spawn = (i, any) => { epos[i * 3] = (Math.random() - 0.5) * 1.4; epos[i * 3 + 1] = any ? -0.4 + Math.random() * 1.2 : -0.45; epos[i * 3 + 2] = -0.6 + Math.random() * 0.8; evel[i * 3] = evel[i * 3 + 1] = evel[i * 3 + 2] = 0; };
for (let i = 0; i < EMB; i++) { spawn(i, true); eseed[i] = Math.random() * 100; }
embGeo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
const embMat = new THREE.PointsMaterial({ size: 0.006, map: dotTex, color: new THREE.Color(1, 0.4, 0.1).multiplyScalar(2.2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
scene.add(new THREE.Points(embGeo, embMat));

// ======================= POST =======================
let composer = null, bloomPass = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBeat: { value: 0 }, uShock: { value: -1 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: width / height } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uBeat, uShock, uAspect; uniform vec2 uCenter; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      vec2 uv = vUv, off = vec2(0.0);
      if (uShock >= 0.0 && uShock < 1.6) { vec2 d = uv - uCenter; d.x *= uAspect; float dist = length(d), rad = uShock * 0.8;
        float ring = smoothstep(rad - 0.07, rad, dist) * (1.0 - smoothstep(rad, rad + 0.07, dist)); vec2 dir = d / max(dist, 1e-4); dir.x /= uAspect; off = dir * ring * 0.018 * exp(-uShock * 1.8); }
      vec2 dc = vUv - 0.5; float ca = 0.0014 + 0.003 * uBeat;
      vec4 c = texture2D(tDiffuse, uv - off); c.r = texture2D(tDiffuse, uv - off * 1.5 + dc * ca).r; c.b = texture2D(tDiffuse, uv - off * 0.5 - dc * ca).b;
      gl_FragColor = c; gl_FragColor.rgb *= smoothstep(0.92, 0.22, distance(vUv, vec2(0.5)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 g = gl_FragColor.rgb; float l = dot(g, vec3(0.299, 0.587, 0.114));
      g = pow(max(mix(vec3(l), g, 1.1), 0.0), vec3(1.1));
      g += vec3(0.035, -0.004, -0.02) * smoothstep(0.3, 0.9, l) + vec3(-0.006, -0.004, 0.012) * (1.0 - smoothstep(0.0, 0.3, l));
      g += (hash(vUv * 1000.0) - 0.5) * 0.04; gl_FragColor.rgb = g; }`,
  depthTest: false, depthWrite: false,
});
const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat)); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
try {
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.65, 0.5, 0.82); composer.addPass(bloomPass);
  composer.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {}, render(r, w, read) { outMat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(null); r.render(qs, qc); } });
} catch (e) { composer = null; }

// ======================= INTERAKSI =======================
const clock = new THREE.Clock();
const now = () => (window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime());
const T_DRAW0 = 0.9, T_DRAW1 = 2.3, T_AWAKE = 2.45;
let awakeAt = T_AWAKE, hovered = false, downAt = null, lastT = 0;
const awaken = () => { const t = now(); if (t > T_DRAW1 && t - awakeAt > 1.2) { awakeAt = t; hint.style.opacity = '0'; } };
window.__awakenKeris = awaken;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pick = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); ray.setFromCamera(ndc, camera); return ray.intersectObject(K.keris, true).length > 0; };
renderer.domElement.addEventListener('pointermove', (e) => { hovered = pick(e); renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab'; });
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => { if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && pick(e)) awaken(); downAt = null; });
const hint = document.createElement('div');
hint.textContent = 'Klik keris · bangkitkan pamornya';
Object.assign(hint.style, { position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', font: '600 11px/1.2 system-ui, sans-serif', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,225,210,0.7)', pointerEvents: 'none', transition: 'opacity .8s', opacity: '0' });
if (canvas.parentElement) { if (getComputedStyle(canvas.parentElement).position === 'static') canvas.parentElement.style.position = 'relative'; canvas.parentElement.appendChild(hint); }

// ======================= ANIMASI =======================
const ease = (x) => { x = Math.min(Math.max(x, 0), 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const beat = (t) => { const ph = ((t % 2.1) + 2.1) % 2.1; return Math.exp(-(ph * ph) / 0.004) + 0.65 * Math.exp(-((ph - 0.3) ** 2) / 0.005); };
const tipW = new THREE.Vector3(), mouthW = new THREE.Vector3(), shake = new THREE.Vector3(), scr = new THREE.Vector3();
let raf = 0;
function animate() {
  raf = requestAnimationFrame(animate);
  const t = now(), dt = Math.min(Math.max(t - lastT, 0), 0.05) || 1 / 60; lastT = t;
  const hb = beat(t);
  // 1) nyabut keris: warangka tergeser sepanjang bilah, lalu melayang ke samping
  const d = ease((t - T_DRAW0) / (T_DRAW1 - T_DRAW0)), side = ease((t - T_DRAW1 + 0.25) / 1.2);
  K.sheath.position.set(0.14 * side, 0.44 * d - 0.36 * side, -0.05 * side); K.sheath.rotation.z = 0.06 * side; K.sheath.rotation.y = -0.35 * side;
  // 2) keris melayang & berputar pelan memperlihatkan kedua muka
  K.keris.rotation.y = Math.sin(t * 0.45) * 0.5 + 0.12; K.root.position.y = 0.02 + Math.sin(t * 0.9) * 0.006;
  // 3) pamor bangkit: sapuan dari pangkal ke pucuk, lalu meredup ke denyut
  const a = t - awakeAt, sw = a >= 0 ? ease(a / 0.9) * 1.15 : -0.1;
  K.sweep.value = a >= 0 ? sw : 1.15;
  const flare = a >= 0 ? Math.exp(-Math.max(0, a - 0.9) * 1.1) : 0;
  K.pamorMat.emissiveIntensity = (a >= 0 ? 2.4 * flare : 0) + 0.04 + 0.22 * hb + (hovered ? 0.25 : 0);
  K.rubyMat.emissiveIntensity = 0.4 + 1.6 * hb + 3 * flare;
  ember.intensity = (0.08 + 0.14 * hb + 0.3 * flare) * (0.9 + 0.1 * Math.sin(t * 9));
  smokeMat.opacity = 0.55 + 0.15 * hb + 0.2 * flare;
  K.keris.localToWorld(tipW.copy(K.tip)); glint.position.copy(tipW); glint.intensity = a >= 0 && a < 1.4 ? 0.12 * Math.sin(Math.min(1, a / 0.9) * Math.PI) + 0.06 * flare : 0;
  // 4) bara: naik pelan; saat sapuan sampai pucuk, semburan bara dari ujung keris
  if (a > 0.82 && a < 1.0) for (let k = 0; k < 8; k++) { const i = Math.floor(Math.random() * EMB); epos.set([tipW.x, tipW.y, tipW.z], i * 3); evel.set([(Math.random() - 0.3) * 0.5, (Math.random() - 0.2) * 0.5, (Math.random() - 0.5) * 0.4], i * 3); }
  for (let i = 0; i < EMB; i++) { const j = i * 3; epos[j] += evel[j] * dt + Math.sin(t * 1.2 + eseed[i]) * 0.0003; epos[j + 1] += evel[j + 1] * dt + 0.0007 + (eseed[i] % 1) * 0.0006; epos[j + 2] += evel[j + 2] * dt; evel[j] *= 0.95; evel[j + 1] *= 0.95; evel[j + 2] *= 0.95; if (epos[j + 1] > 0.85) spawn(i, false); }
  embGeo.attributes.position.needsUpdate = true;
  // 5) gelombang kejut & getar kecil saat pamor sampai pucuk
  const st = a - 0.9; shake.set(0, 0, 0); outMat.uniforms.uShock.value = -1;
  if (st >= 0 && st < 1.6) { scr.copy(tipW).project(camera); outMat.uniforms.uCenter.value.set(scr.x * 0.5 + 0.5, scr.y * 0.5 + 0.5); outMat.uniforms.uShock.value = st; const s = 0.004 * Math.exp(-st * 6); shake.set(Math.sin(st * 70) * s, Math.cos(st * 57) * s, 0); }
  if (bloomPass) bloomPass.strength = 0.65 + 0.4 * flare;
  if (t > T_AWAKE + 3 && t - awakeAt > 3) hint.style.opacity = '1';
  controls.update(); camera.position.add(shake);
  outMat.uniforms.uTime.value = t; outMat.uniforms.uBeat.value = Math.min(1, hb + flare);
  if (composer) composer.render(); else renderer.render(scene, camera);
  camera.position.sub(shake);
}
animate();
if (typeof __host !== 'undefined') __host.dispose = () => { cancelAnimationFrame(raf); hint.remove(); renderer.dispose(); };
