/**
 * Benang emas di panggung 3D (Tugas 8.1). Lintasan, simpul, dan panjang tergambar dihitung di
 * `engine/stage/thread.ts`; di sini cara menggambarnya.
 *
 * - Benang: tabung tipis di sekitar lintasan. Jari-jarinya dibesarkan di vertex shader sampai paling sedikit
 *   `MIN_PX` piksel, supaya tetap terbaca sebagai garis dari jauh tanpa menjadi tali tebal dari dekat.
 * - Rupa: benang emas pilin dua helai (kilau berpilin), emas tempa yang diterangi cahaya kunci dan blencong, dan
 *   berpendar sendiri seperti prada di bawah lampu. Kilau pelan merambat dari pangkal ke ujung. Ujung yang sedang
 *   tergambar meruncing dan menyala panas (lebih terang dari putih, jadi ikut bloom).
 * - Simpul tempat singgah: titik cahaya. Yang sudah dilewati menyala tenang, simpul panel yang sedang tampil
 *   berdenyut, yang belum dilewati redup sebagai petunjuk jalan.
 * - Hemat: satu benang tampak pada satu saat (benang hari lain tidak digambar), dua draw call: benang + simpul.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Mesh, Points, ShaderMaterial } from "three";
import type { Vec3 } from "@/engine/stage/shots";
import type { Strand } from "@/engine/stage/thread";
import { COMMON, type Shared } from "./shared";

/** Jari-jari benang (m) dan lebar minimumnya di layar (px perangkat). */
const RADIUS = 0.011;
const MIN_PX = 1.7;
/** Titik sekeliling tabung. */
const RING = 6;
/** Panjang ujung yang meruncing dan menyala, sebagai bagian panjang benang. */
const TIP = 0.035;

const VERT = /* glsl */ `
${COMMON}
attribute vec3 aOff;
attribute float aAt;
attribute float aAng;
uniform float uDraw;
uniform float uShown;
uniform float uPixel;
uniform float uTip;
varying float vAt;
varying float vAng;
varying float vTip;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 c = (modelMatrix * vec4(position, 1.0)).xyz;
  float dist = length(cameraPosition - c);
  // satu piksel perangkat di jarak itu (m): benang tidak pernah lebih tipis dari ${MIN_PX} px
  float px = 2.0 * dist / max(uPixel, 1.0);
  float r = max(${RADIUS.toFixed(4)}, ${(MIN_PX / 2).toFixed(2)} * px);
  // ujung meruncing; di depan titik tergambar jari-jari nol (sisa segitiga dibuang di fragment)
  float behind = clamp((uDraw - aAt) / uTip, 0.0, 1.0);
  r *= mix(0.4, 1.0, behind * behind * (3.0 - 2.0 * behind)) * step(aAt, uDraw + 1e-5) * uShown;
  vW = c + aOff * r;
  vN = aOff;
  vAt = aAt;
  vAng = aAng;
  vTip = 1.0 - behind;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform float uDraw;
uniform float uShown;
uniform float uLength;
varying float vAt;
varying float vAng;
varying float vTip;
varying vec3 vN;
varying vec3 vW;
void main() {
  if (vAt > uDraw) discard;
  vec3 n = safeNormalize(vN);
  vec3 v = safeNormalize(cameraPosition - vW);
  float m = vAt * uLength;
  // dua helai berpilin: kilau bergaris miring yang berputar di sepanjang benang (±3 pilin per meter)
  float ply = 0.5 + 0.5 * cos(vAng * 2.0 - m * 19.0);
  vec3 gold = mix(vec3(0.52, 0.33, 0.11), vec3(0.93, 0.72, 0.36), ply);
  vec3 col = gold * diffuseLight(n, vW) * 0.9 + vec3(1.0, 0.83, 0.52) * specLight(n, v, vW, 40.0) * (0.35 + 0.65 * ply);
  // prada berpendar: tetap tampak di lanskap malam, kilau pelan merambat ke arah ujung
  float wave = exp(-sq((fract(m * 0.09 - uTime * 0.11) - 0.5) * 9.0));
  float rim = 1.0 - abs(dot(n, v));
  col += vec3(1.0, 0.68, 0.3) * (0.32 + 0.5 * uNight) * (0.55 + 0.45 * ply) * (0.7 + 0.3 * rim);
  col += vec3(1.0, 0.8, 0.45) * wave * (0.6 + 0.8 * uNight);
  // ujung yang sedang tergambar: menyala panas seperti bara blencong
  float hot = vTip * vTip;
  col += vec3(1.0, 0.62, 0.28) * hot * 7.0 + vec3(1.0, 0.95, 0.85) * hot * hot * 9.0;
  col = applyFog(col, vW);
  gl_FragColor = vec4(col * uShown, 1.0);
}`;

const KNOT_VERT = /* glsl */ `
${COMMON}
attribute float aAt;
uniform float uDraw;
uniform float uShown;
uniform float uPixel;
uniform float uCurrent;
varying float vLight;
varying float vNow;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.1);
  float passed = step(aAt, uDraw + 1e-4);
  // simpul panel yang sedang tampil: berdenyut; yang sudah dilewati: menyala tenang; yang belum: redup
  float now = 1.0 - smoothstep(0.0, 0.012, abs(aAt - uCurrent));
  float beat = 0.75 + 0.25 * sin(uTime * 3.1);
  vLight = mix(0.22, 1.0, passed) * (1.0 + now * (1.6 * beat)) * uShown;
  vNow = now;
  float size = uPixel * 0.06 / dist;
  gl_PointSize = clamp(size * (1.0 + 0.9 * now), 3.0, 64.0);
}`;

const KNOT_FRAG = /* glsl */ `
varying float vLight;
varying float vNow;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  // inti terang + pendar lembut; simpul yang sedang tampil bercincin
  float core = 1.0 - smoothstep(0.0, 0.32, r);
  float halo = (1.0 - smoothstep(0.1, 1.0, r)) * 0.35;
  float ring = vNow * (1.0 - smoothstep(0.0, 0.08, abs(r - 0.72))) * 0.9;
  vec3 c = vec3(1.0, 0.78, 0.42) * (core * 3.2 + halo + ring) + vec3(1.0, 0.95, 0.85) * core * core * 2.0;
  gl_FragColor = vec4(c * vLight, 1.0);
}`;

type Built = { mesh: Mesh; knots: Points; uDraw: { value: number }; uShown: { value: number }; uCurrent: { value: number }; dispose(): void };

/** Tabung di sekitar lintasan: tiap titik satu cincin `RING` titik dengan arah keluar dan sudutnya. */
function tube(points: readonly Vec3[], at: readonly number[]): BufferGeometry {
  const n = points.length;
  const pos = new Float32Array(n * RING * 3);
  const off = new Float32Array(n * RING * 3);
  const atA = new Float32Array(n * RING);
  const ang = new Float32Array(n * RING);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    let [tx, ty, tz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(tx, ty, tz) || 1;
    [tx, ty, tz] = [tx / tl, ty / tl, tz / tl];
    // normal mendatar (benang hampir datar), binormal = t × n
    let [nx, nz] = [-tz, tx];
    const nl = Math.hypot(nx, nz) || 1;
    [nx, nz] = [nx / nl, nz / nl];
    const [bx, by, bz] = [ty * nz, tz * nx - tx * nz, -ty * nx];
    const bl = Math.hypot(bx, by, bz) || 1;
    for (let k = 0; k < RING; k++) {
      const th = (k / RING) * Math.PI * 2;
      const [c, s] = [Math.cos(th), Math.sin(th)];
      const j = i * RING + k;
      pos.set(points[i]!, j * 3);
      off.set([nx * c + (bx / bl) * s, (by / bl) * s, nz * c + (bz / bl) * s], j * 3);
      atA[j] = at[i]!;
      ang[j] = th;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < RING; k++) {
      const [a, b] = [i * RING + k, i * RING + ((k + 1) % RING)];
      const [c, d] = [a + RING, b + RING];
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aOff", new BufferAttribute(off, 3));
  geo.setAttribute("aAt", new BufferAttribute(atA, 1));
  geo.setAttribute("aAng", new BufferAttribute(ang, 1));
  geo.setIndex(index);
  return geo;
}

export function createThread(shared: Shared) {
  const group = new Group();
  const uPixel = { value: 800 };
  let built: Built[] = [];

  const build = (s: Strand): Built => {
    let total = 0;
    for (let i = 1; i < s.points.length; i++) {
      const [a, b] = [s.points[i - 1]!, s.points[i]!];
      total += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    }
    const uDraw = { value: 0 };
    const uShown = { value: 0 };
    const uCurrent = { value: -1 };
    const geo = tube(s.points, s.at);
    const mat = new ShaderMaterial({ uniforms: { ...shared, uDraw, uShown, uPixel, uTip: { value: TIP }, uLength: { value: total } }, vertexShader: VERT, fragmentShader: FRAG });
    const mesh = new Mesh(geo, mat);
    const kGeo = new BufferGeometry();
    kGeo.setAttribute("position", new BufferAttribute(new Float32Array(s.knots.flatMap((k) => [k.pos[0], k.pos[1] + 0.02, k.pos[2]])), 3));
    kGeo.setAttribute("aAt", new BufferAttribute(new Float32Array(s.knots.map((k) => k.at)), 1));
    const kMat = new ShaderMaterial({ uniforms: { ...shared, uDraw, uShown, uPixel, uCurrent }, vertexShader: KNOT_VERT, fragmentShader: KNOT_FRAG, blending: AdditiveBlending, depthWrite: false, transparent: true });
    const knots = new Points(kGeo, kMat);
    for (const o of [mesh, knots]) {
      o.frustumCulled = false;
      o.matrixAutoUpdate = false;
      o.visible = false;
    }
    knots.renderOrder = 31;
    group.add(mesh, knots);
    return {
      mesh,
      knots,
      uDraw,
      uShown,
      uCurrent,
      dispose() {
        group.remove(mesh, knots);
        geo.dispose();
        mat.dispose();
        kGeo.dispose();
        kMat.dispose();
      },
    };
  };

  return {
    group,
    /** Ganti semua benang (bentuk layar berubah). */
    setStrands(strands: readonly Strand[]) {
      for (const b of built) b.dispose();
      built = strands.map(build);
    },
    /**
     * Satu frame: tiap benang `i` tergambar sepanjang `draw[i]`, tampak `shown[i]`, simpul yang sedang tampil di
     * panjang `current[i]` (−1 = tidak ada). Benang yang tidak tampak tidak digambar.
     */
    update(draw: readonly number[], shown: readonly number[], current: readonly number[]) {
      built.forEach((b, i) => {
        const s = shown[i] ?? 0;
        b.uDraw.value = draw[i] ?? 0;
        b.uShown.value = s;
        b.uCurrent.value = current[i] ?? -1;
        b.mesh.visible = b.knots.visible = s > 0.002;
      });
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2). */
    setPixel(v: number) {
      uPixel.value = v;
    },
    dispose() {
      for (const b of built) b.dispose();
      built = [];
    },
  };
}
