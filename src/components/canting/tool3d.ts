/**
 * Alat membatik 3D untuk /canting/ dan film Hari 3: canting tembaga bergagang bambu, dan wajan kecil di atas anglo
 * (tungku tanah liat) yang menjaga malam tetap cair. Semua prosedural (geometri dan tekstur kecil dibuat di kode),
 * tanpa aset luar, tanpa WASM.
 *
 * Satuan dunia: kain lebar 1,6; alat sedikit dibesarkan supaya terbaca. Bahan memakai MeshStandard/Physical dan
 * dirancang untuk `DirectionalLight` + `HemisphereLight` (tanpa peta lingkungan, jadi logam dibuat setengah logam).
 * Cahaya tiga.js modern butuh intensitas × π supaya albedo tampil penuh.
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Euler,
  Quaternion,
  RepeatWrapping,
  RGBAFormat,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from "three";

type Quality = "ultra" | "high" | "lite";

/** Jumlah segmen per kualitas (anggaran segitiga: canting < 6k, wajan < 8k; ultra sama dengan high). */
const HIGH_Q = { seg: 28, tubeSeg: 26, tubeRad: 6, bamboo: 12, pan: 48, anglo: 40, arc: 8, lumps: 12 } as const;
// mode uji (e2e, renderer perangkat lunak): segmen sedikit; tidak pernah dipilih untuk tamu
const LITE_Q = { seg: 12, tubeSeg: 10, tubeRad: 4, bamboo: 7, pan: 20, anglo: 18, arc: 4, lumps: 5 } as const;
const Q = { ultra: HIGH_Q, high: HIGH_Q, lite: LITE_Q } as const;

// ---------- pembantu: derau, warna, tekstur ----------

function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (a: number, b: number, x: number) => smooth(clamp01((x - a) / (b - a)));

/** Derau nilai 3D 0–1; `px`/`py` (bilangan bulat) membuat tekstur menyambung di sumbu x/y. */
function vnoise(x: number, y: number, z: number, px = 0, py = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);
  const c = (dx: number, dy: number, dz: number) =>
    hash3(px ? mod(ix + dx, px) : ix + dx, py ? mod(iy + dy, py) : iy + dy, iz + dz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tekstur sRGB kecil dari fungsi (u, v) → [r, g, b] 0–1. */
function makeTexture(w: number, h: number, fn: (u: number, v: number) => [number, number, number]): DataTexture {
  const data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const [r, g, b] = fn(i / w, j / h);
      const o = (j * w + i) * 4;
      data[o] = Math.round(clamp01(r) * 255);
      data[o + 1] = Math.round(clamp01(g) * 255);
      data[o + 2] = Math.round(clamp01(b) * 255);
      data[o + 3] = 255;
    }
  }
  const t = new DataTexture(data, w, h, RGBAFormat);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Warnai simpul geometri lewat fungsi posisi (warna linear, dikalikan warna bahan putih). */
function paint(geo: BufferGeometry, fn: (x: number, y: number, z: number) => Color): void {
  const p = geo.getAttribute("position");
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(col, 3));
}

/** Interpolasi linear tabel [y, r] naik. */
function interp(tab: readonly (readonly [number, number])[], y: number): number {
  for (let i = 1; i < tab.length; i++) {
    const a = tab[i - 1]!;
    const b = tab[i]!;
    if (y <= b[0]) return a[1] + ((b[1] - a[1]) * (y - a[0])) / (b[0] - a[0]);
  }
  return tab[tab.length - 1]![1];
}

/** Busur elips untuk profil lathe: r = a·sin θ, y = y0 + b·(1 − cos θ) (θ dari t0 ke t1). */
function arc(a: number, b: number, y0: number, t0: number, t1: number, n: number): Vector2[] {
  const out: Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const th = (t0 + ((t1 - t0) * i) / n) * (Math.PI / 2);
    out.push(new Vector2(a * Math.sin(th), y0 + b * (1 - Math.cos(th))));
  }
  return out;
}

const copperA = new Color("#c27a45");
const copperB = new Color("#8a4f2e");
const patinaBrown = new Color("#5f5230");
const patinaGreen = new Color("#4f7860");
const clayA = new Color("#b8603a");
const clayB = new Color("#8d4528");
const claySoot = new Color("#3a2a24");

/** Warna tembaga: bercak tempa halus, noda patina cokelat-hijau yang jarang. */
function copperColor(x: number, y: number, z: number): Color {
  const hammer = vnoise(x * 170, y * 170, z * 170);
  const patch = vnoise(x * 38 + 7, y * 38, z * 38);
  const c = copperA.clone().lerp(copperB, hammer * 0.55);
  c.lerp(patinaBrown, smoothstep(0.45, 0.72, patch) * 0.75);
  c.lerp(patinaGreen, smoothstep(0.62, 0.85, vnoise(x * 60, y * 60 + 3, z * 60)) * 0.6);
  return c;
}

function clayColor(x: number, y: number, z: number): Color {
  const c = clayA.clone().lerp(clayB, vnoise(x * 90, y * 90, z * 90) * 0.7);
  // jelaga di dekat bibir dan pintu
  c.lerp(claySoot, smoothstep(-0.07, -0.012, y) * 0.35 * vnoise(x * 50, y * 50, z * 50 + 5));
  return c;
}

const lathePts = (pts: Vector2[]) => pts.map((p) => new Vector2(Math.max(p.x, 0), p.y));

// ---------- canting ----------

export type CantingTool = {
  /**
   * Titik asal = ujung cucuk. Orientasi saat rotasi identitas: cucuk menunjuk −Y (ujungnya di bawah), nyamplung
   * di atasnya (±0,06–0,1 di atas dan 0,056 ke −X), mulut nyamplung menghadap +Y; gagang bambu naik ke arah
   * +Y dengan condong ke −X dan sedikit ke +Z (seperti dipegang tangan kanan). Panjang total ≈ 0,3. Halaman
   * memutar seluruh group.
   */
  group: Group;
  /** 0–1 tinggi malam cair di nyamplung (0 = kosong, hanya selaput tipis kuning kecokelatan). */
  setFill(level: number): void;
  /** 0–1: 1 = baru dicelup, malam kuning kemerahan mengilap dan berpendar tipis; 0 = lebih suram dan gelap. */
  setHeat(heat: number): void;
  /** 1 = satu cucuk (klowong/tembok); 2 = cucuk ganda berdampingan (kedua di z = −0,006; asal tetap di cucuk pertama). */
  setSpouts(n: 1 | 2): void;
  dispose(): void;
};

export function createCanting(opts: { quality?: Quality } = {}): CantingTool {
  const q = Q[opts.quality ?? "high"];
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const texs: Texture[] = [];
  const group = new Group();

  const copper = new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.4, roughness: 0.38 });
  mats.push(copper);

  // --- nyamplung (mangkuk tembaga), alas di y = BOWL_Y, pusat di x = BOWL_X ---
  const BOWL_X = -0.056;
  const BOWL_Y = 0.07;
  const R_OUT = 0.028;
  const R_IN = 0.0252;
  const outer = [
    ...arc(R_OUT, 0.016, 0, 0, 1, q.arc),
    new Vector2(0.0284, 0.03),
  ];
  const profile = lathePts([
    ...outer,
    new Vector2(0.0262, 0.03),
    new Vector2(R_IN + 0.0006, 0.016),
    ...arc(R_IN, 0.0145, 0.0015, 1, 0, q.arc),
  ]);
  const bowlGeo = new LatheGeometry(profile, q.seg);
  paint(bowlGeo, copperColor);
  geos.push(bowlGeo);
  const bowl = new Mesh(bowlGeo, copper);
  bowl.position.set(BOWL_X, BOWL_Y, 0);
  group.add(bowl);

  // malam di dalam nyamplung
  const innerR = (y: number): number => {
    if (y > 0.016) return R_IN + ((y - 0.016) / 0.014) * 0.001;
    const c = 1 - (y - 0.0015) / 0.0145;
    return R_IN * Math.sqrt(Math.max(0, 1 - c * c));
  };
  const waxGeo = new CircleGeometry(1, q.seg);
  waxGeo.rotateX(-Math.PI / 2);
  geos.push(waxGeo);
  const waxMat = new MeshPhysicalMaterial({
    color: 0xc8801f,
    roughness: 0.15,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: 0xff7a10,
    emissiveIntensity: 0.25,
  });
  mats.push(waxMat);
  const wax = new Mesh(waxGeo, waxMat);
  bowl.add(wax);

  const hot = new Color("#cf8420");
  const cold = new Color("#6f4a1c");
  let fill = 0.7;
  const applyFill = () => {
    const y = 0.003 + clamp01(fill) * 0.0225;
    const r = innerR(y) * 0.985;
    wax.position.y = y;
    wax.scale.set(r, 1, r);
  };
  const setHeat = (heat: number) => {
    const h = clamp01(heat);
    waxMat.color.lerpColors(cold, hot, h);
    waxMat.emissiveIntensity = h * 0.12;
    waxMat.roughness = 0.12 + (1 - h) * 0.45;
    waxMat.clearcoat = 0.25 + h * 0.75;
  };
  applyFill();
  setHeat(1);

  // --- cucuk: pipa tembaga meruncing, asal di ujungnya ---
  const spoutCurve = new CatmullRomCurve3(
    [
      new Vector3(0, 0, 0),
      new Vector3(0, 0.01, 0),
      new Vector3(0, 0.025, 0),
      new Vector3(-0.001, 0.045, 0),
      new Vector3(-0.007, 0.064, 0),
      new Vector3(-0.018, 0.076, 0),
      new Vector3(-0.031, 0.08, 0),
    ],
    false,
    "centripetal",
  );
  const TUBE_R = 0.0025;
  const spoutGeo = new TubeGeometry(spoutCurve, q.tubeSeg, TUBE_R, q.tubeRad, false);
  {
    // meruncing: 0,0012 di ujung → 0,0025 mulai ±70% panjang
    const p = spoutGeo.getAttribute("position");
    const ring = q.tubeRad + 1;
    const c = new Vector3();
    const v = new Vector3();
    for (let i = 0; i <= q.tubeSeg; i++) {
      const t = i / q.tubeSeg;
      spoutCurve.getPointAt(t, c);
      const k = (0.0012 + (TUBE_R - 0.0012) * smoothstep(0, 0.7, t)) / TUBE_R;
      for (let j = 0; j < ring; j++) {
        const idx = i * ring + j;
        v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
        p.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    paint(spoutGeo, copperColor);
  }
  geos.push(spoutGeo);
  const spout1 = new Mesh(spoutGeo, copper);
  const spout2 = new Mesh(spoutGeo, copper);
  spout2.position.z = -0.006;
  spout2.visible = false;
  group.add(spout1, spout2);

  // --- gagang: batang tembaga pendek + bambu beruas + ikatan rotan ---
  const dir = new Vector3(-0.25, 0.95, 0.18).normalize();
  const stemStart = new Vector3(BOWL_X - 0.0265, BOWL_Y + 0.016, 0);
  const handle = new Group();
  handle.position.copy(stemStart);
  handle.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
  group.add(handle);

  const stemGeo = new CylinderGeometry(0.0042, 0.0036, 0.03, 8, 1, false);
  stemGeo.translate(0, 0.015, 0);
  paint(stemGeo, copperColor);
  geos.push(stemGeo);
  const stem = new Mesh(stemGeo, copper);
  stem.position.y = -0.002;
  handle.add(stem);

  // profil bambu: ruas di y = 0,05 / 0,105 / 0,155 (tinggi tonjolan 0,0007)
  const BAM_L = 0.18;
  const BAM_Y0 = 0.028;
  const nodes = [0.05, 0.105, 0.155];
  const ys = new Set<number>([0, 0.025, 0.08, 0.13, BAM_L]);
  for (const n of nodes) for (const o of [-0.007, -0.0035, 0, 0.0035, 0.007]) ys.add(+(n + o).toFixed(5));
  const yList = [...ys].sort((a, b) => a - b);
  const bamR = (y: number) => {
    let r = 0.0072 - 0.0016 * (y / BAM_L);
    for (const n of nodes) r += 0.0007 * Math.exp(-(((y - n) / 0.0035) ** 2));
    return r;
  };
  const bamPts = [
    new Vector2(0, 0),
    ...yList.map((y) => new Vector2(bamR(y), y)),
    new Vector2(0, BAM_L),
  ];
  const bambooGeo = new LatheGeometry(bamPts, q.bamboo);
  geos.push(bambooGeo);
  // v pada UV lathe = indeks titik, bukan y: cari v tiap ruas untuk garis gelap di tekstur
  const nodeV = nodes.map((n) => (yList.findIndex((y) => Math.abs(y - n) < 1e-4) + 1) / (bamPts.length - 1));
  const bambooTex = makeTexture(64, 256, (u, v) => {
    const streak = vnoise(u * 26, v * 2.2, 1, 26, 0);
    const fine = vnoise(u * 96, v * 9, 2, 96, 0);
    const n = clamp01(streak * 0.75 + fine * 0.3);
    let r = 0.74 + 0.19 * n;
    let g = 0.6 + 0.23 * n;
    let b = 0.34 + 0.24 * n;
    let ring = 0;
    for (const nv of nodeV) ring = Math.max(ring, Math.exp(-(((v - nv) / 0.014) ** 2)));
    r += (0.5 - r) * ring * 0.7;
    g += (0.38 - g) * ring * 0.7;
    b += (0.2 - b) * ring * 0.7;
    return [r, g, b];
  });
  texs.push(bambooTex);
  const bambooMat = new MeshStandardMaterial({ map: bambooTex, roughness: 0.55, metalness: 0 });
  mats.push(bambooMat);
  const bamboo = new Mesh(bambooGeo, bambooMat);
  bamboo.position.y = BAM_Y0;
  handle.add(bamboo);

  // ikatan rotan di pertemuan batang dan bambu
  const twineMat = new MeshStandardMaterial({ color: 0x6d4a28, roughness: 0.85 });
  mats.push(twineMat);
  const sleeveGeo = new CylinderGeometry(0.0079, 0.0079, 0.011, q.bamboo, 1, true);
  geos.push(sleeveGeo);
  const sleeve = new Mesh(sleeveGeo, twineMat);
  sleeve.position.y = BAM_Y0 + 0.006;
  handle.add(sleeve);
  const ringGeo = new TorusGeometry(0.0079, 0.0012, 4, q.bamboo + 4);
  ringGeo.rotateX(Math.PI / 2);
  geos.push(ringGeo);
  for (let i = 0; i < 3; i++) {
    const r = new Mesh(ringGeo, twineMat);
    r.position.y = BAM_Y0 + 0.0015 + i * 0.0047;
    handle.add(r);
  }

  return {
    group,
    setFill(level) {
      fill = clamp01(level);
      applyFill();
    },
    setHeat,
    setSpouts(n) {
      spout2.visible = n === 2;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}

// ---------- wajan di atas anglo ----------

export type WaxPan = {
  /** Asal = pusat permukaan malam di wajan. Pintu anglo menghadap +Z; tinggi total ≈ 0,12 (alas di y = −0,108). */
  group: Group;
  /** Titik lokal tempat nyamplung dicelup (sedikit di bawah permukaan malam). */
  dipPoint: Vector3;
  /** Detik: kedip bara dan kilau pelan di malam cair. */
  update(time: number): void;
  dispose(): void;
};

export function createWaxPan(opts: { quality?: Quality } = {}): WaxPan {
  const q = Q[opts.quality ?? "high"];
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const texs: Texture[] = [];
  const group = new Group();

  // --- wajan besi cor: elips, bibir y = 0,012, dasar y = −0,032 ---
  const iron = new MeshStandardMaterial({ color: 0x232325, metalness: 0.35, roughness: 0.5 });
  mats.push(iron);
  const panPts = lathePts([
    ...arc(0.09, 0.044, 0.012 - 0.044, 0, 1, q.arc + 3),
    new Vector2(0.086, 0.012),
    ...arc(0.086, 0.04, 0.012 - 0.04, 1, 0, q.arc + 3),
  ]);
  const panGeo = new LatheGeometry(panPts, q.pan);
  geos.push(panGeo);
  group.add(new Mesh(panGeo, iron));

  // dua gagang kuping kecil
  const handleGeo = new TorusGeometry(0.012, 0.0026, 6, 14, Math.PI);
  geos.push(handleGeo);
  for (const s of [1, -1]) {
    const h = new Mesh(handleGeo, iron);
    h.position.set(0.0885 * s, 0.004, 0);
    h.rotation.z = (-Math.PI / 2) * s;
    group.add(h);
  }

  // malam cair: cakram di y = 0, jari-jari di sini 0,082
  const sheenTex = makeTexture(64, 64, (u, v) => {
    const n = vnoise(u * 5, v * 5, 3, 5, 5) * 0.65 + vnoise(u * 11, v * 11, 4, 11, 11) * 0.35;
    const k = 0.62 + 0.38 * n;
    return [k, k * 0.98, k * 0.94];
  });
  texs.push(sheenTex);
  const waxGeo = new CircleGeometry(0.0815, q.pan);
  waxGeo.rotateX(-Math.PI / 2);
  geos.push(waxGeo);
  const waxMat = new MeshPhysicalMaterial({
    color: 0xe0902a,
    map: sheenTex,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    emissive: 0xff7810,
    emissiveMap: sheenTex,
    emissiveIntensity: 0.28,
  });
  mats.push(waxMat);
  group.add(new Mesh(waxGeo, waxMat));

  // --- anglo: tanah liat, dinding bawah penuh, dinding atas berpintu di depan (+Z) ---
  const OUT: readonly (readonly [number, number])[] = [
    [-0.108, 0.05],
    [-0.095, 0.056],
    [-0.06, 0.064],
    [-0.035, 0.07],
    [-0.012, 0.074],
  ];
  const INN: readonly (readonly [number, number])[] = [
    [-0.1, 0.046],
    [-0.075, 0.05],
    [-0.04, 0.056],
    [-0.012, 0.06],
  ];
  const YD = -0.066; // batas dinding bawah dan atas
  const clay = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    side: DoubleSide,
  });
  mats.push(clay);

  const outerAt = (y: number) => new Vector2(interp(OUT, y), y);
  const innerAt = (y: number) => new Vector2(interp(INN, y), y);
  const lower = lathePts([
    new Vector2(0, -0.108),
    new Vector2(0.048, -0.108),
    outerAt(-0.1),
    outerAt(-0.085),
    outerAt(-0.075),
    outerAt(YD),
    innerAt(YD),
    innerAt(-0.075),
    innerAt(-0.1),
    new Vector2(0, -0.1),
  ]);
  const lowerGeo = new LatheGeometry(lower, q.anglo);
  paint(lowerGeo, clayColor);
  geos.push(lowerGeo);
  group.add(new Mesh(lowerGeo, clay));

  const GAP = (38 * Math.PI) / 180;
  const upper = lathePts([
    outerAt(YD),
    outerAt(-0.05),
    outerAt(-0.035),
    outerAt(-0.022),
    outerAt(-0.012),
    innerAt(-0.012),
    innerAt(-0.03),
    innerAt(-0.05),
    innerAt(YD),
  ]);
  const upperGeo = new LatheGeometry(upper, q.anglo, GAP, Math.PI * 2 - GAP * 2);
  paint(upperGeo, clayColor);
  geos.push(upperGeo);
  group.add(new Mesh(upperGeo, clay));
  // tutup tebal dinding di tepi pintu
  for (const phi of [GAP, Math.PI * 2 - GAP]) {
    const cap = new ShapeGeometry(new Shape(upper));
    const p = cap.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const r = p.getX(i);
      p.setXYZ(i, r * Math.sin(phi), p.getY(i), r * Math.cos(phi));
    }
    cap.computeVertexNormals();
    paint(cap, clayColor);
    geos.push(cap);
    group.add(new Mesh(cap, clay));
  }

  // --- bara: alas bertekstur retak menyala + bongkah arang ---
  const COAL_Y = -0.064;
  const coalTex = makeTexture(64, 64, (u, v) => {
    const n = vnoise(u * 7, v * 7, 5, 7, 7) * 0.6 + vnoise(u * 16, v * 16, 6, 16, 16) * 0.4;
    const g = smoothstep(0.42, 0.78, n);
    return [0.1 + 0.9 * g, 0.045 + 0.5 * g * g, 0.03 + 0.12 * g * g * g];
  });
  texs.push(coalTex);
  const coalMat = new MeshBasicMaterial({ map: coalTex, color: 0xffffff });
  mats.push(coalMat);
  const coalGeo = new CircleGeometry(0.051, q.anglo);
  coalGeo.rotateX(-Math.PI / 2);
  geos.push(coalGeo);
  const coalBed = new Mesh(coalGeo, coalMat);
  coalBed.position.y = COAL_Y;
  group.add(coalBed);

  const lumpGeo = new IcosahedronGeometry(1, 0);
  geos.push(lumpGeo);
  const lumpMat = new MeshStandardMaterial({
    color: 0x2b1b15,
    roughness: 0.9,
    emissive: 0xff5a14,
    emissiveIntensity: 0.6,
    flatShading: true,
  });
  mats.push(lumpMat);
  const lumps = new InstancedMesh(lumpGeo, lumpMat, q.lumps);
  const rnd = mulberry32(11);
  const m4 = new Matrix4();
  const quat = new Quaternion();
  for (let i = 0; i < q.lumps; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd()) * 0.04;
    const s = 0.007 + rnd() * 0.006;
    quat.setFromEuler(new Euler(rnd() * 6, rnd() * 6, rnd() * 6));
    m4.compose(
      new Vector3(Math.sin(a) * rr, COAL_Y + s * 0.5, Math.cos(a) * rr),
      quat,
      new Vector3(s, s * (0.6 + rnd() * 0.3), s * (0.8 + rnd() * 0.4)),
    );
    lumps.setMatrixAt(i, m4);
  }
  lumps.instanceMatrix.needsUpdate = true;
  group.add(lumps);

  return {
    group,
    dipPoint: new Vector3(0, -0.006, 0),
    update(time) {
      const f = 0.84 + 0.1 * Math.sin(time * 7.3) + 0.06 * Math.sin(time * 13.1 + 1.7);
      coalMat.color.setScalar(f);
      coalTex.offset.set(Math.sin(time * 0.7) * 0.012, Math.cos(time * 0.9) * 0.012);
      lumpMat.emissiveIntensity = 0.35 + f * 0.4;
      waxMat.emissiveIntensity = 0.24 + (f - 0.84) * 0.5;
      sheenTex.offset.set(time * 0.012, time * 0.007);
    },
    dispose() {
      lumps.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
