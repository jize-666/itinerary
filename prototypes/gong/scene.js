// Prototipe Tugas 1 — Gong ageng 3D (Lakon Tiga Hari)
// Jalan di Three.js Viewer (global: THREE, OrbitControls, EffectComposer, RenderPass,
// UnrealBloomPass, canvas, width, height). Semua geometri & tekstur dibuat prosedural.
// Urutan adegan: kepingan emas berkumpul → gong muncul → dipukul tiap ±7 dtk.

// ---------- Renderer, scene, kamera ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const NILA = 0x0a0c18;
const scene = new THREE.Scene();
scene.background = new THREE.Color(NILA);
scene.fog = new THREE.Fog(NILA, 5, 13);

const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 60);
camera.position.set(2.5, 1.45, 3.3);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.08, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.minDistance = 1.4;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.53;

// ---------- Environment (pantulan logam) dibuat dari "softbox" emisif ----------
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30),
    new THREE.MeshBasicMaterial({ color: 0x06070c, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 1, 0); env.add(m);
  };
  panel(7, 3.5, [-4, 5, 4.5], [1.0, 0.72, 0.42], 5.5);   // softbox hangat (blencong)
  panel(0.7, 5, [5, 1.8, 2.5], [1.0, 0.9, 0.75], 7);     // strip highlight
  panel(5, 2.2, [-2, 2.5, -6], [0.32, 0.42, 1.0], 1.6);  // rim dingin (nila)
  panel(9, 1.2, [0, -0.4, 6], [0.55, 0.32, 0.16], 0.8);  // pantulan lantai hangat
  panel(6, 4, [1.5, 2.4, 6.5], [1.0, 0.66, 0.36], 2.2);  // softbox besar di depan (muka gong)
  panel(2.5, 2.5, [-1.2, 0.6, 5.5], [1.0, 0.5, 0.2], 1.6); // pantulan bawah-kiri, jingga
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.025).texture;
  pmrem.dispose();
}

// ---------- Tekstur prosedural perunggu (tempa, bubut, patina) ----------
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h); return c;
}
// UV planar (dilihat dari depan): pusat kanvas = pencu. 0,52 unit = setengah lebar kanvas.
const TS = 2048, C = TS / 2, PX = C / 0.52;           // piksel per unit
const R_PENCU = 0.125 * PX, R_GONG = 0.5 * PX;
const bumpCanvas = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, TS, TS);
  for (let r = R_PENCU + 6; r < C; r += 2 + rand() * 5) {   // garis bubut melingkar
    const v = 116 + rand() * 24; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + rand() * 1.5;
    g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke();
  }
  for (let i = 0; i < 3200; i++) {                         // bekas tempa (dimple)
    const a = rand() * Math.PI * 2, rr = R_PENCU + 14 + Math.sqrt(rand()) * (C - R_PENCU - 14);
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr, r = 6 + rand() * 13;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(78,78,78,0.5)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
});
const roughCanvas = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(74,74,74)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1500; i++) {
    const x = rand() * TS, y = rand() * TS, r = 20 + rand() * 90, v = 55 + rand() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.35)`); gr.addColorStop(1, 'rgba(74,74,74,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const gr = g.createRadialGradient(C, C, 0, C, C, R_PENCU * 1.1);  // pencu licin (sering dipukul)
  gr.addColorStop(0, 'rgba(34,34,34,1)'); gr.addColorStop(0.85, 'rgba(40,40,40,1)'); gr.addColorStop(1, 'rgba(74,74,74,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(C, C, R_PENCU * 1.1, 0, Math.PI * 2); g.fill();
});
const colorCanvas = makeCanvas(TS, TS, (g) => {
  g.fillStyle = 'rgb(214,214,214)'; g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 1100; i++) {                         // patina, makin banyak ke arah tepi
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * C, x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const r = 25 + rand() * 120, al = 0.06 + 0.16 * (rr / C);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(70,52,30,${al})`); gr.addColorStop(1, 'rgba(214,214,214,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const pg = g.createRadialGradient(C, C, 0, C, C, R_PENCU);        // pencu lebih terang keemasan
  pg.addColorStop(0, 'rgb(255,250,236)'); pg.addColorStop(1, 'rgb(236,226,206)');
  g.fillStyle = pg; g.beginPath(); g.arc(C, C, R_PENCU, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(60,44,24,0.55)'; g.lineWidth = 16;           // garis gelap di leher pencu
  g.beginPath(); g.arc(C, C, R_PENCU + 10, 0, Math.PI * 2); g.stroke();
});
const tex = (c, srgb) => {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
};

// ---------- Geometri gong: profil diputar (lathe) dengan ketebalan ----------
// Profil depan (r, z): pencu → leher → rai (muka) → pundak → bau (bibir) yang melengkung ke belakang
const front = new THREE.SplineCurve([
  [0.0, 0.112], [0.045, 0.106], [0.08, 0.086], [0.104, 0.052], [0.12, 0.024], [0.135, 0.011],
  [0.17, 0.006], [0.3, 0.0], [0.4, -0.011], [0.452, -0.027], [0.488, -0.06], [0.503, -0.11],
  [0.506, -0.175], [0.499, -0.218], [0.486, -0.238],
].map(([r, z]) => new THREE.Vector2(r, z)));
const N = 140, THICK = 0.013;
const fpts = front.getSpacedPoints(N);
const bpts = fpts.map((p, i) => {
  const a = fpts[Math.max(0, i - 1)], b = fpts[Math.min(N, i + 1)];
  const t = new THREE.Vector2().subVectors(b, a).normalize();
  const q = new THREE.Vector2(p.x + t.y * THICK, p.y - t.x * THICK);
  q.x = Math.max(0, q.x); return q;
});
fpts[0].x = 0; bpts[0].x = 0;
const outline = [...fpts, ...bpts.reverse()];
const gongGeo = new THREE.LatheGeometry(outline, 160);
gongGeo.rotateX(Math.PI / 2); // sumbu lathe (Y) → menghadap kamera (+Z)
{ // UV planar dari depan supaya bekas tempa bulat, tidak meregang radial
  const pos = gongGeo.attributes.position, uv = gongGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.04 + 0.5, pos.getY(i) / 1.04 + 0.5);
  uv.needsUpdate = true;
}

const bronze = new THREE.MeshPhysicalMaterial({
  color: 0xd6aa66, metalness: 1, roughness: 0.3,
  map: tex(colorCanvas, true), roughnessMap: tex(roughCanvas), bumpMap: tex(bumpCanvas), bumpScale: 1.4,
  envMapIntensity: 1.25, emissive: 0x6a4214, emissiveIntensity: 0,
  transparent: true, opacity: 0,
});
const GONG_Y = 1.08;
const gong = new THREE.Mesh(gongGeo, bronze);
gong.castShadow = true; gong.receiveShadow = true;
const gongPivot = new THREE.Group(); // titik gantung di atas, untuk ayunan saat dipukul
gongPivot.position.set(0, 1.62, 0);
gong.position.set(0, GONG_Y - 1.62, 0);
gongPivot.add(gong); scene.add(gongPivot);

// ---------- Gayor (rangka) kayu sogan + aksen prada ----------
const wood = new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.5, metalness: 0.05 });
const prada = new THREE.MeshStandardMaterial({ color: 0xc8a25a, roughness: 0.28, metalness: 1, envMapIntensity: 1.2 });
const gayor = new THREE.Group(); scene.add(gayor);
const box = (w, h, d, mat, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; gayor.add(m); return m;
};
const POST_X = 0.86, BAR_Y = 1.86;
for (const s of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.95, 20), wood); // tiang
  post.position.set(s * POST_X, 0.975, 0); post.castShadow = post.receiveShadow = true; gayor.add(post);
  box(0.5, 0.09, 0.18, wood, s * POST_X, 0.045, 0);          // kaki
  box(0.13, 0.03, 0.13, prada, s * POST_X, 0.1, 0);          // gelang prada
  box(0.13, 0.03, 0.13, prada, s * POST_X, 1.72, 0);
  // ukel (ukiran spiral) di ujung palang
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, ang = t * Math.PI * 3.2, rr = 0.2 * (1 - t * 0.82);
    pts.push(new THREE.Vector3(s * (0.99 + 0.14 * t + rr * Math.sin(ang) * 0.55), BAR_Y + 0.02 + rr * Math.cos(ang) * 0.55, 0));
  }
  const curl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.017, 10), prada);
  curl.castShadow = true; gayor.add(curl);
}
{ // palang lurus berbevel (bukan ujung melengkung: itu siluet torii, bukan gayor Jawa)
  const sh = new THREE.Shape();
  sh.moveTo(-0.985, -0.055); sh.lineTo(0.985, -0.055); sh.lineTo(0.985, 0.055); sh.lineTo(-0.985, 0.055); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
  g.translate(0, 0, -0.05);
  const bar = new THREE.Mesh(g, wood); bar.position.y = BAR_Y; bar.castShadow = bar.receiveShadow = true; gayor.add(bar);
}
box(1.7, 0.025, 0.125, prada, 0, BAR_Y - 0.065, 0);          // list prada
// mahkota ukir (kuncup + dua ukel) di tengah palang, dan kuncup emas di ujung tiang
{
  const bud = new THREE.Shape();
  bud.moveTo(0, 0); bud.bezierCurveTo(0.13, 0.03, 0.11, 0.17, 0, 0.3); bud.bezierCurveTo(-0.11, 0.17, -0.13, 0.03, 0, 0);
  const g = new THREE.ExtrudeGeometry(bud, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 24 });
  g.translate(0, 0, -0.015);
  const crest = new THREE.Mesh(g, prada); crest.position.set(0, BAR_Y + 0.06, 0); crest.castShadow = true; gayor.add(crest);
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, ang = t * Math.PI * 2.4, rr = 0.11 * (1 - t * 0.8);
      pts.push(new THREE.Vector3(sx * (0.05 + 0.12 * t + rr * Math.sin(ang) * 0.6), BAR_Y + 0.12 + rr * Math.cos(ang) * 0.6, 0));
    }
    const sw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.012, 8), prada);
    sw.castShadow = true; gayor.add(sw);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), prada);
    knob.position.set(sx * POST_X, BAR_Y + 0.115, 0); knob.castShadow = true; gayor.add(knob);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.09, 16), prada);
    tip.position.set(sx * POST_X, BAR_Y + 0.2, 0); gayor.add(tip);
  }
}
// tali merah dari palang ke bibir gong
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7a1f16, roughness: 0.8 });
for (const s of [-1, 1]) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(s * 0.2, BAR_Y - 0.05, 0), new THREE.Vector3(s * 0.19, 1.7, -0.02),
    new THREE.Vector3(s * 0.17, GONG_Y + 0.47, -0.12),
  ]);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.011, 8), ropeMat);
  rope.castShadow = true; gayor.add(rope);
}

// ---------- Lantai & cahaya ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0d0f1a, roughness: 0.82, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
{ // latar: kelir samar berpendar hangat di belakang gong (memisahkan siluet)
  const bg = makeCanvas(1024, 1024, (g) => {
    const gr = g.createRadialGradient(512, 470, 0, 512, 512, 520);
    gr.addColorStop(0, 'rgb(64,38,22)'); gr.addColorStop(0.45, 'rgb(26,20,30)'); gr.addColorStop(1, 'rgb(10,12,24)');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  });
  const t = new THREE.CanvasTexture(bg); t.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: t, fog: false }));
  wall.position.set(0, 1.6, -3.2); scene.add(wall);
}

const key = new THREE.SpotLight(0xffb257, 70, 0, 0.52, 0.85, 2); // cahaya blencong
key.position.set(1.7, 3.4, 2.8); key.target.position.set(0, GONG_Y, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0x7088ff, 0.55); rim.position.set(-3, 2.2, -3.2); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x2b3160, 0x140b06, 0.3));
const flicker = new THREE.PointLight(0xff9a3c, 2.2, 0, 2); flicker.position.set(-1.1, 1.0, 1.4); scene.add(flicker);
const strikeLight = new THREE.PointLight(0xffc878, 0, 0, 2); strikeLight.position.set(0, GONG_Y, 0.45); scene.add(strikeLight);

// ---------- Kepingan emas yang berkumpul menjadi gong ----------
const SHARDS = 750;
const shardMat = new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.22, emissive: 0x2a1806 });
const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.02), shardMat, SHARDS);
scene.add(shards);
const zAt = (r) => { // kedalaman permukaan depan gong pada radius r
  for (let i = 1; i < fpts.length; i++) if (fpts[i].x >= r) {
    const a = fpts[i - 1], b = fpts[i], k = (r - a.x) / Math.max(1e-6, b.x - a.x); return a.y + (b.y - a.y) * k;
  }
  return fpts[fpts.length - 1].y;
};
const shardData = Array.from({ length: SHARDS }, () => {
  const r = Math.sqrt(rand()) * 0.49, a = rand() * Math.PI * 2;
  const to = new THREE.Vector3(Math.cos(a) * r, GONG_Y + Math.sin(a) * r, zAt(r) + 0.004);
  const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize();
  const from = to.clone().add(dir.multiplyScalar(1.4 + rand() * 2.2));
  return { from, to, delay: rand() * 0.9, spin: new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(9) };
});

// ---------- Riak cahaya saat gong dipukul ----------
const ripples = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 160),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.38).multiplyScalar(2.2), transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(0, GONG_Y, 0.125); scene.add(m); return m;
});

// ---------- Post-processing: bloom + output (tone mapping, vignette, grain) ----------
let composer = null;
const outMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      gl_FragColor = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5)); gl_FragColor.rgb *= smoothstep(0.95, 0.32, d);   // vignette
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb += (hash(vUv * 1000.0) - 0.5) * 0.035;                          // grain
    }`,
  depthTest: false, depthWrite: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.55, 0.9));
  composer.addPass({
    enabled: true, needsSwap: false, clear: false, renderToScreen: true, setSize() {}, dispose() {},
    render(r, writeBuffer, readBuffer) { outMat.uniforms.tDiffuse.value = readBuffer.texture; r.setRenderTarget(null); r.render(quadScene, quadCam); },
  });
} catch (e) { composer = null; }

// ---------- Animasi ----------
const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
const dummy = new THREE.Object3D();
const T_ASSEMBLE = 2.6, T_FIRST_STRIKE = 4.2, STRIKE_EVERY = 7;
const clock = new THREE.Clock();
let frames = 0, fpsT = 0;
function animate() {
  requestAnimationFrame(animate);
  const t = window.__fixedT !== undefined ? window.__fixedT : clock.getElapsedTime(); // __fixedT: hanya untuk uji

  // 1) kepingan berkumpul, lalu gong muncul
  if (shards.visible) {
    for (let i = 0; i < SHARDS; i++) {
      const d = shardData[i], k = ease((t - d.delay) / 1.7);
      dummy.position.lerpVectors(d.from, d.to, k);
      dummy.rotation.set(d.spin.x * (1 - k), d.spin.y * (1 - k), d.spin.z * (1 - k));
      const fade = 1 - ease((t - T_ASSEMBLE) / 0.7);
      dummy.scale.setScalar(Math.max(0.0001, fade));
      dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
    if (t > T_ASSEMBLE + 0.8) shards.visible = false;
  }
  const appear = ease((t - (T_ASSEMBLE - 0.3)) / 0.9);
  bronze.opacity = appear;
  if (appear >= 1 && bronze.transparent) { bronze.transparent = false; bronze.needsUpdate = true; }

  // 2) pukulan gong
  const since = t - T_FIRST_STRIKE;
  const st = since >= 0 ? since % STRIKE_EVERY : -1;
  if (st >= 0) {
    const env = Math.exp(-st * 2.4);
    gongPivot.rotation.x = -0.035 * Math.exp(-st * 1.3) * Math.sin(st * 4.2);   // ayunan
    gong.rotation.z = 0.004 * env * Math.sin(st * 41);                            // getar
    bronze.emissiveIntensity = 0.32 * Math.exp(-st * 3.2);
    strikeLight.intensity = 3.5 * Math.exp(-st * 3.5);
    ripples.forEach((m, i) => {
      const rt = st - i * 0.22, k = Math.min(Math.max(rt / 1.6, 0), 1);
      const s = 0.1 + ease(k) * 0.5 + i * 0.03;
      m.scale.setScalar(s); m.material.opacity = rt > 0 ? (1 - k) * 0.7 : 0;
    });
  }

  // 3) nyala blencong berkedip halus
  flicker.intensity = 2.0 + Math.sin(t * 7.1) * 0.25 + Math.sin(t * 13.3) * 0.15;

  controls.update();
  outMat.uniforms.uTime.value = t;
  if (composer) composer.render(); else renderer.render(scene, camera);

  frames++; if (t - fpsT > 1) { window.__fps = frames / (t - fpsT); frames = 0; fpsT = t; }
}
animate();
