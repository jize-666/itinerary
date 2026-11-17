/**
 * Benang emas di panggung 3D (Tugas 8.1). Lintasan, manik, dan panjang tergambar dihitung di
 * `engine/stage/thread.ts`; di sini cara menggambarnya. Versi kedua atas masukan host 17 Nov ("upgrade lah,
 * keliatan basic banget"):
 *
 * - Tali: sutra emas pilin tiga helai. Logam yang memantulkan langit (berkilau siang hari, keemasan saat senja),
 *   diterangi cahaya kunci dan blencong, dan berpendar sendiri seperti prada di bawah lampu (lebih kuat malam hari).
 *   Gelombang cahaya pelan merambat dari pangkal ke ujung. Ujung yang sedang tergambar meruncing dan menyala panas.
 *   Jalur yang belum ditempuh tampak samar sebagai benang putus-putus yang redup.
 * - Pendar: pita yang selalu menghadap kamera di sepanjang bagian yang sudah tergambar, cahaya lembut di sekeliling
 *   tali (lebih terang dari putih di bagian terang, jadi ikut bloom).
 * - Cahaya di tanah: pita tipis di permukaan tanah di bawah benang, cahaya hangat yang jatuh dari tali; di manik
 *   tempat sekarang ada genangan cahaya dan cincin yang merambat keluar.
 * - Manik: emas bersegi yang berputar pelan di tiap tempat singgah. Yang sudah dilewati menyala, manik tempat
 *   sekarang lebih besar dan berdenyut, yang belum dilewati perunggu gelap.
 * - Tiang cahaya tipis naik dari manik tempat sekarang, dan bunga api rontok dari ujung yang sedang tergambar
 *   (lebih banyak selama geseran).
 * - Benang bergoyang pelan seperti tertiup angin (diam di manik, paling jauh di tengah bentang).
 * - Hemat: hanya benang hari yang tampak yang digambar, enam draw call, semua gerak di shader.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, Points, ShaderMaterial, Vector3 } from "three";
import type { Vec3 } from "@/engine/stage/shots";
import { terrainHeight, TERRAIN_DEFAULT, type TerrainShape } from "@/engine/stage/terrain";
import { pointAt, type Strand } from "@/engine/stage/thread";
import { COMMON, type Shared } from "./shared";

/** Jari-jari tali (m) dan lebar minimumnya di layar (px perangkat). */
const RADIUS = 0.016;
const MIN_PX = 2.4;
/** Titik sekeliling tabung. */
const RING = 8;
/** Panjang ujung yang meruncing dan menyala, sebagai bagian panjang benang. */
const TIP = 0.03;
/** Lebar pendar di sekeliling tali: paling sedikit sekian px, atau sekian m. */
const HALO_PX = 9;
const HALO_M = 0.07;
/** Setengah lebar pita cahaya di tanah (m). */
const GROUND = 0.6;
/** Jari-jari manik (m). */
const BEAD = 0.05;
/** Bunga api dari ujung benang. */
const SPARKS = 48;

/** Sumbu goyang tali (dihitung sama di tali dan pendar). */
const SWAY = /* glsl */ `
vec3 swayed(vec3 c, float m, float sway) {
  float w = sin(uTime * 1.3 + m * 2.1) + 0.5 * sin(uTime * 2.3 - m * 3.7);
  return c + vec3(0.25 * w, w, 0.0) * 0.012 * sway;
}`;

const CORD_VERT = /* glsl */ `
${COMMON}
${SWAY}
attribute vec3 aOff;
attribute float aAt;
attribute float aAng;
attribute float aSway;
uniform float uDraw;
uniform float uShown;
uniform float uPixel;
uniform float uLength;
varying float vAt;
varying float vAng;
varying float vTip;
varying vec3 vN;
varying vec3 vW;
void main() {
  float m = aAt * uLength;
  vec3 c = swayed((modelMatrix * vec4(position, 1.0)).xyz, m, aSway);
  float dist = length(cameraPosition - c);
  // satu piksel perangkat di jarak itu (m): tali tidak pernah lebih tipis dari ${MIN_PX} px
  float px = 2.0 * dist / max(uPixel, 1.0);
  float r = max(${RADIUS.toFixed(4)}, ${(MIN_PX / 2).toFixed(2)} * px);
  // ujung meruncing; jalur di depannya benang tipis yang redup
  float behind = clamp((uDraw - aAt) / ${TIP.toFixed(3)}, 0.0, 1.0);
  float drawn = step(aAt, uDraw + 1e-5);
  r *= mix(0.42, mix(0.4, 1.0, behind * behind * (3.0 - 2.0 * behind)), drawn) * uShown;
  vW = c + aOff * r;
  vN = aOff;
  vAt = aAt;
  vAng = aAng;
  vTip = (1.0 - behind) * drawn;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const CORD_FRAG = /* glsl */ `
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
  float m = vAt * uLength;
  vec3 v = safeNormalize(cameraPosition - vW);
  vec3 n = safeNormalize(vN);
  if (vAt > uDraw) {
    // jalur yang belum ditempuh: benang sutra redup, putus-putus
    if (fract(m * 7.0) > 0.55) discard;
    vec3 silk = vec3(0.3, 0.2, 0.09) * diffuseLight(n, vW) + vec3(0.5, 0.32, 0.12) * (0.05 + 0.12 * uNight);
    gl_FragColor = vec4(applyFog(silk, vW) * uShown, 1.0);
    return;
  }
  // tiga helai berpilin: kilau bergaris miring yang berputar di sepanjang tali; normal ikut melengkung di tiap helai
  float tw = vAng * 3.0 - m * 23.0;
  float ply = 0.5 + 0.5 * cos(tw);
  vec3 t = safeNormalize(cross(n, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 1e-3, 0.0));
  n = safeNormalize(n + t * sin(tw) * 0.45);
  // logam emas: pantulan langit + cahaya kunci dan blencong + kilap
  vec3 r = reflect(-v, n);
  vec3 env = skyColor(safeNormalize(vec3(r.x, abs(r.y) + 0.05, r.z)));
  float fres = 0.55 + 0.45 * sq(sq(1.0 - max(dot(n, v), 0.0)));
  vec3 gold = mix(vec3(0.62, 0.38, 0.12), vec3(1.0, 0.78, 0.4), ply);
  // pantulan langit menerangi tanpa mengubah rona: langit biru siang tidak membuat emas tampak perak
  vec3 envL = mix(vec3(dot(env, vec3(0.3, 0.55, 0.15))), env, 0.2);
  vec3 col = gold * envL * 1.9 * fres + gold * diffuseLight(n, vW) * 0.4 + vec3(1.0, 0.86, 0.58) * specLight(n, v, vW, 60.0) * (0.4 + 0.6 * ply);
  // kilap kecil yang berkelip di sepanjang tali (matahari di helai), lebih banyak siang hari
  float glint = step(0.985, hash11(floor(m * 26.0) + floor(uTime * 3.0) * 7.0)) * ply;
  col += vec3(1.0, 0.95, 0.8) * glint * (3.0 - 2.0 * uNight);
  // prada berpendar dan gelombang cahaya yang merambat ke arah ujung
  float wave = exp(-sq((fract(m * 0.11 - uTime * 0.14) - 0.5) * 10.0));
  col += vec3(1.0, 0.66, 0.28) * (0.22 + 0.55 * uNight) * (0.6 + 0.4 * ply);
  col += vec3(1.0, 0.8, 0.45) * wave * (0.8 + 1.2 * uNight);
  // ujung yang sedang tergambar: menyala panas seperti bara blencong
  float hot = vTip * vTip;
  col += vec3(1.0, 0.6, 0.26) * hot * 8.0 + vec3(1.0, 0.95, 0.86) * hot * hot * 12.0;
  gl_FragColor = vec4(applyFog(col, vW) * uShown, 1.0);
}`;

const HALO_VERT = /* glsl */ `
${COMMON}
${SWAY}
attribute vec3 aTan;
attribute float aSide;
attribute float aAt;
attribute float aSway;
uniform float uDraw;
uniform float uShown;
uniform float uPixel;
uniform float uLength;
varying float vSide;
varying float vAt;
varying float vTip;
varying vec3 vW;
void main() {
  float m = aAt * uLength;
  vec3 c = swayed(position, m, aSway);
  vec3 toCam = cameraPosition - c;
  float dist = length(toCam);
  float px = 2.0 * dist / max(uPixel, 1.0);
  float behind = clamp((uDraw - aAt) / ${TIP.toFixed(3)}, 0.0, 1.0);
  float drawn = step(aAt, uDraw + 1e-5);
  // pita selalu menghadap kamera: tegak lurus arah tali dan arah pandang; di ujung melebar sedikit (nyala)
  vec3 side = safeNormalize(cross(aTan, toCam));
  float w = max(${HALO_M.toFixed(3)}, ${HALO_PX.toFixed(1)} * px) * (1.0 + 1.2 * (1.0 - behind)) * drawn * uShown;
  vW = c + side * aSide * w;
  vSide = aSide;
  vAt = aAt;
  vTip = (1.0 - behind) * drawn;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const HALO_FRAG = /* glsl */ `
${COMMON}
uniform float uDraw;
uniform float uShown;
uniform float uLength;
varying float vSide;
varying float vAt;
varying float vTip;
varying vec3 vW;
void main() {
  if (vAt > uDraw) discard;
  float m = vAt * uLength;
  float across = exp(-sq(vSide * 2.4));
  float wave = exp(-sq((fract(m * 0.11 - uTime * 0.14) - 0.5) * 10.0));
  float k = (0.16 + 0.4 * uNight) * (0.75 + 0.6 * wave) + vTip * vTip * 2.2;
  vec3 c = vec3(1.0, 0.64, 0.27) * across * k;
  float fog = 1.0 - exp(-uFogDensity * length(vW - cameraPosition));
  gl_FragColor = vec4(c * (1.0 - fog) * uShown, 1.0);
}`;

const GROUND_VERT = /* glsl */ `
attribute float aSide;
attribute float aAt;
varying float vSide;
varying float vAt;
varying vec3 vW;
void main() {
  vW = position;
  vSide = aSide;
  vAt = aAt;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const GROUND_FRAG = /* glsl */ `
${COMMON}
uniform float uDraw;
uniform float uShown;
uniform float uLength;
uniform vec3 uCurPos;
uniform float uCurOn;
varying float vSide;
varying float vAt;
varying vec3 vW;
void main() {
  float m = vAt * uLength;
  // cahaya yang jatuh dari tali: hanya di bawah bagian yang sudah tergambar, makin terang malam hari
  float drawn = 1.0 - smoothstep(uDraw - 0.004, uDraw + 0.004, vAt);
  float across = exp(-sq(vSide * 3.2));
  float wave = exp(-sq((fract(m * 0.11 - uTime * 0.14) - 0.5) * 10.0));
  float k = (0.05 + 0.32 * uNight) * (0.8 + 0.5 * wave) * across * drawn;
  // genangan cahaya dan cincin yang merambat keluar dari manik tempat sekarang
  vec2 d = vW.xz - uCurPos.xz;
  float r = length(d);
  float ph = fract(uTime * 0.42);
  float ring = exp(-sq((r - (0.08 + 0.46 * ph)) * 26.0)) * (1.0 - ph) * 0.9;
  float pool = exp(-r * r * 22.0) * 0.9;
  k += (ring + pool) * uCurOn * (0.35 + 0.65 * uNight);
  float fog = 1.0 - exp(-uFogDensity * length(vW - cameraPosition));
  gl_FragColor = vec4(vec3(1.0, 0.6, 0.24) * k * (1.0 - fog) * uShown, 1.0);
}`;

const BEAD_VERT = /* glsl */ `
${COMMON}
attribute vec3 aCenter;
attribute float aAt;
attribute float aSeed;
uniform float uDraw;
uniform float uShown;
uniform float uCurrent;
uniform float uPixel;
varying vec3 vW;
varying float vLit;
varying float vNow;
void main() {
  float now = 1.0 - smoothstep(0.0, 0.012, abs(aAt - uCurrent));
  float beat = 0.5 + 0.5 * sin(uTime * 3.1);
  float dist = length(cameraPosition - aCenter);
  // manik tidak pernah lebih kecil dari ±7 px; manik tempat sekarang lebih besar dan berdenyut
  float px = 2.0 * dist / max(uPixel, 1.0);
  float s = max(1.0, 3.5 * px / ${BEAD.toFixed(3)}) * (1.0 + now * (0.45 + 0.08 * beat)) * uShown;
  // berputar pelan pada sumbu tegak (dan sedikit miring), tiap manik dari sudut sendiri
  float a = uTime * 0.7 + aSeed * 6.283;
  float cs = cos(a), sn = sin(a);
  vec3 p = position;
  p = vec3(cs * p.x + sn * p.z, p.y, -sn * p.x + cs * p.z);
  p = vec3(p.x, 0.94 * p.y - 0.34 * p.z, 0.34 * p.y + 0.94 * p.z);
  vW = aCenter + p * s;
  vLit = step(aAt, uDraw + 1e-4);
  vNow = now;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const BEAD_FRAG = /* glsl */ `
${COMMON}
uniform float uShown;
varying vec3 vW;
varying float vLit;
varying float vNow;
void main() {
  // bersegi: normal dari bidang segitiga (tiap segi memantulkan langit sendiri)
  vec3 n = safeNormalize(cross(dFdx(vW), dFdy(vW)));
  vec3 v = safeNormalize(cameraPosition - vW);
  if (dot(n, v) < 0.0) n = -n;
  vec3 r = reflect(-v, n);
  vec3 env = skyColor(safeNormalize(vec3(r.x, abs(r.y) + 0.05, r.z)));
  vec3 gold = mix(vec3(0.34, 0.2, 0.08), vec3(1.0, 0.78, 0.4), vLit);
  vec3 envL = mix(vec3(dot(env, vec3(0.3, 0.55, 0.15))), env, 0.2);
  vec3 col = gold * envL * 2.0 + gold * diffuseLight(n, vW) * 0.4 + vec3(1.0, 0.88, 0.62) * specLight(n, v, vW, 80.0) * (0.3 + 0.7 * vLit);
  col += vec3(1.0, 0.66, 0.3) * vLit * (0.5 + 0.9 * uNight) + vec3(1.0, 0.8, 0.5) * vNow * (2.2 + 1.2 * sin(uTime * 3.1));
  gl_FragColor = vec4(applyFog(col, vW) * uShown, 1.0);
}`;

const PILLAR_VERT = /* glsl */ `
attribute vec2 aCorner;
uniform vec3 uCurPos;
uniform float uCurOn;
uniform float uShown;
uniform float uPixel;
varying vec2 vC;
void main() {
  vec3 toCam = cameraPosition - uCurPos;
  vec3 side = cross(vec3(0.0, 1.0, 0.0), toCam);
  vec3 right = side * inversesqrt(max(dot(side, side), 1e-12));
  float px = 2.0 * length(toCam) / max(uPixel, 1.0);
  float w = max(0.05, 7.0 * px) * uCurOn * uShown;
  vec3 p = uCurPos + right * aCorner.x * w + vec3(0.0, aCorner.y * 1.1, 0.0);
  vC = aCorner;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const PILLAR_FRAG = /* glsl */ `
${COMMON}
uniform float uShown;
uniform float uCurOn;
varying vec2 vC;
void main() {
  float x = exp(-sq(vC.x * 2.6));
  float y = sq(1.0 - vC.y);
  float flick = 0.85 + 0.15 * sin(uTime * 7.3 + vC.y * 9.0);
  gl_FragColor = vec4(vec3(1.0, 0.7, 0.34) * x * y * flick * (0.5 + 0.9 * uNight) * uCurOn * uShown, 1.0);
}`;

const SPARK_VERT = /* glsl */ `
${COMMON}
attribute vec4 aSeed;
uniform vec3 uTipPos;
uniform float uTipOn;
uniform float uActivity;
uniform float uShown;
uniform float uPixel;
varying float vLight;
void main() {
  // tiap bunga api lahir di ujung benang, melayang naik dan menjauh, lalu padam; lalu lahir lagi
  float life = 1.1 + aSeed.w * 0.9;
  float ph = fract(uTime / life + aSeed.x);
  vec3 drift = vec3((aSeed.y - 0.5) * 0.5, 0.25 + 0.45 * aSeed.z, (aSeed.z - 0.5) * 0.3);
  vec3 p = uTipPos + drift * ph + vec3(0.0, -0.18 * ph * ph, 0.0) + vec3(sin(uTime * 4.0 + aSeed.x * 40.0), 0.0, 0.0) * 0.02 * ph;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.1);
  // selama geseran semua menyala; saat diam hanya sebagian
  float on = step(aSeed.y, 0.3 + 0.7 * uActivity);
  vLight = (1.0 - ph) * smoothstep(0.0, 0.06, ph) * on * uTipOn * uShown;
  gl_PointSize = clamp(uPixel * 0.012 / dist, 1.5, 5.0);
}`;

const SPARK_FRAG = /* glsl */ `
varying float vLight;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float a = 1.0 - smoothstep(0.0, 0.5, length(q));
  gl_FragColor = vec4(vec3(1.0, 0.62, 0.26) * a * vLight * 5.0, 1.0);
}`;

type Uniforms = {
  uDraw: { value: number };
  uShown: { value: number };
  uCurrent: { value: number };
  uCurOn: { value: number };
  uCurPos: { value: Vector3 };
  uTipPos: { value: Vector3 };
  uTipOn: { value: number };
  uActivity: { value: number };
  uLength: { value: number };
};
type Built = { strand: Strand; nodes: (Mesh | Points)[]; u: Uniforms; dispose(): void };

/** Goyang tiap titik: 0 di manik, 1 di tengah bentang (dan di ekor). */
function swayOf(s: Strand): Float32Array {
  const out = new Float32Array(s.at.length);
  const marks = s.knots.map((k) => k.at);
  s.at.forEach((a, i) => {
    let j = 0;
    while (j < marks.length && marks[j]! <= a) j++;
    const lo = j === 0 ? 0 : marks[j - 1]!;
    const hi = j === marks.length ? 1 : marks[j]!;
    out[i] = Math.sin((Math.PI * (a - lo)) / (hi - lo || 1)) * (j === 0 || j === marks.length ? 0.5 : 1);
  });
  return out;
}

/** Arah tali di tiap titik. */
function tangents(points: readonly Vec3[]): Vec3[] {
  return points.map((_, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  });
}

/** Tabung di sekitar lintasan: tiap titik satu cincin `RING` titik dengan arah keluar dan sudutnya. */
function cordGeometry(s: Strand, tan: readonly Vec3[], sway: Float32Array): BufferGeometry {
  const n = s.points.length;
  const pos = new Float32Array(n * RING * 3);
  const off = new Float32Array(n * RING * 3);
  const atA = new Float32Array(n * RING);
  const ang = new Float32Array(n * RING);
  const sw = new Float32Array(n * RING);
  for (let i = 0; i < n; i++) {
    const [tx, ty, tz] = tan[i]!;
    // normal mendatar (tali hampir datar), binormal = t × n
    let [nx, nz] = [-tz, tx];
    const nl = Math.hypot(nx, nz) || 1;
    [nx, nz] = [nx / nl, nz / nl];
    const b = [ty * nz, tz * nx - tx * nz, -ty * nx];
    const bl = Math.hypot(b[0]!, b[1]!, b[2]!) || 1;
    for (let k = 0; k < RING; k++) {
      const th = (k / RING) * Math.PI * 2;
      const [c, sn] = [Math.cos(th), Math.sin(th)];
      const j = i * RING + k;
      pos.set(s.points[i]!, j * 3);
      off.set([nx * c + (b[0]! / bl) * sn, (b[1]! / bl) * sn, nz * c + (b[2]! / bl) * sn], j * 3);
      atA[j] = s.at[i]!;
      ang[j] = th;
      sw[j] = sway[i]!;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < RING; k++) {
      const [a, b] = [i * RING + k, i * RING + ((k + 1) % RING)];
      index.push(a, a + RING, b, b, a + RING, b + RING);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aOff", new BufferAttribute(off, 3));
  geo.setAttribute("aAt", new BufferAttribute(atA, 1));
  geo.setAttribute("aAng", new BufferAttribute(ang, 1));
  geo.setAttribute("aSway", new BufferAttribute(sw, 1));
  geo.setIndex(index);
  return geo;
}

/** Pita dua sisi di sepanjang lintasan (pendar: arah diatur shader; tanah: titik di permukaan, dihitung di sini). */
function ribbonGeometry(s: Strand, tan: readonly Vec3[], sway: Float32Array, ground: TerrainShape | null): BufferGeometry {
  const n = s.points.length;
  const pos = new Float32Array(n * 2 * 3);
  const tanA = new Float32Array(n * 2 * 3);
  const side = new Float32Array(n * 2);
  const atA = new Float32Array(n * 2);
  const sw = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = s.points[i]!;
    const t = tan[i]!;
    const hl = Math.hypot(t[0], t[2]) || 1;
    for (let k = 0; k < 2; k++) {
      const sd = k ? 1 : -1;
      const j = i * 2 + k;
      if (ground) {
        const [x, z] = [p[0] + (-t[2] / hl) * sd * GROUND, p[2] + (t[0] / hl) * sd * GROUND];
        pos.set([x, terrainHeight(x, z, ground) + 0.012, z], j * 3);
      } else pos.set(p, j * 3);
      tanA.set(t, j * 3);
      side[j] = sd;
      atA[j] = s.at[i]!;
      sw[j] = sway[i]!;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aTan", new BufferAttribute(tanA, 3));
  geo.setAttribute("aSide", new BufferAttribute(side, 1));
  geo.setAttribute("aAt", new BufferAttribute(atA, 1));
  geo.setAttribute("aSway", new BufferAttribute(sw, 1));
  geo.setIndex(index);
  return geo;
}

/** Semua manik dalam satu geometri: segitiga ikosahedron bersegi, pusat dan panjang busur tiap manik sebagai atribut. */
function beadGeometry(s: Strand): BufferGeometry {
  const ico = new IcosahedronGeometry(BEAD, 1);
  const src = ico.getAttribute("position").array as Float32Array;
  const per = src.length / 3;
  const pos = new Float32Array(s.knots.length * src.length);
  const center = new Float32Array(s.knots.length * src.length);
  const atA = new Float32Array(s.knots.length * per);
  const seed = new Float32Array(s.knots.length * per);
  s.knots.forEach((k, j) => {
    pos.set(src, j * src.length);
    for (let v = 0; v < per; v++) {
      center.set(k.pos, (j * per + v) * 3);
      atA[j * per + v] = k.at;
      seed[j * per + v] = (j * 0.618) % 1;
    }
  });
  ico.dispose();
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aCenter", new BufferAttribute(center, 3));
  geo.setAttribute("aAt", new BufferAttribute(atA, 1));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
  return geo;
}

export function createThread(shared: Shared) {
  const group = new Group();
  const uPixel = { value: 800 };
  let built: Built[] = [];
  let shape: TerrainShape = TERRAIN_DEFAULT;

  // tiang cahaya dan bunga api: geometri sama untuk semua benang
  const pillarGeo = new BufferGeometry();
  pillarGeo.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
  pillarGeo.setAttribute("aCorner", new BufferAttribute(new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]), 2));
  pillarGeo.setIndex([0, 1, 2, 2, 1, 3]);
  const sparkGeo = new BufferGeometry();
  const seeds = new Float32Array(SPARKS * 4);
  let rs = 11;
  for (let i = 0; i < seeds.length; i++) seeds[i] = (rs = (rs * 16807) % 2147483647) / 2147483647;
  sparkGeo.setAttribute("position", new BufferAttribute(new Float32Array(SPARKS * 3), 3));
  sparkGeo.setAttribute("aSeed", new BufferAttribute(seeds, 4));

  const glow = { blending: AdditiveBlending, depthWrite: false, transparent: true } as const;

  const build = (s: Strand): Built => {
    let total = 0;
    for (let i = 1; i < s.points.length; i++) {
      const [a, b] = [s.points[i - 1]!, s.points[i]!];
      total += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    }
    const u: Uniforms = {
      uDraw: { value: 0 },
      uShown: { value: 0 },
      uCurrent: { value: -1 },
      uCurOn: { value: 0 },
      uCurPos: { value: new Vector3() },
      uTipPos: { value: new Vector3() },
      uTipOn: { value: 0 },
      uActivity: { value: 0 },
      uLength: { value: total },
    };
    const all = { ...shared, ...u, uPixel };
    const tan = tangents(s.points);
    const sway = swayOf(s);
    const geos = [cordGeometry(s, tan, sway), ribbonGeometry(s, tan, sway, null), ribbonGeometry(s, tan, sway, shape), beadGeometry(s)];
    const mats = [
      new ShaderMaterial({ uniforms: all, vertexShader: CORD_VERT, fragmentShader: CORD_FRAG }),
      new ShaderMaterial({ uniforms: all, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, side: DoubleSide, ...glow }),
      new ShaderMaterial({ uniforms: all, vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, side: DoubleSide, ...glow, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      new ShaderMaterial({ uniforms: all, vertexShader: BEAD_VERT, fragmentShader: BEAD_FRAG }),
      new ShaderMaterial({ uniforms: all, vertexShader: PILLAR_VERT, fragmentShader: PILLAR_FRAG, side: DoubleSide, ...glow }),
      new ShaderMaterial({ uniforms: all, vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, ...glow }),
    ];
    const nodes: (Mesh | Points)[] = [
      new Mesh(geos[0], mats[0]),
      new Mesh(geos[1], mats[1]),
      new Mesh(geos[2], mats[2]),
      new Mesh(geos[3], mats[3]),
      new Mesh(pillarGeo, mats[4]),
      new Points(sparkGeo, mats[5]),
    ];
    // urutan: tali, cahaya di tanah, manik, lalu pendar, tiang cahaya, dan bunga api di atasnya
    [2, 31, 1, 3, 32, 33].forEach((o, i) => (nodes[i]!.renderOrder = o));
    for (const o of nodes) {
      o.frustumCulled = false;
      o.matrixAutoUpdate = false;
      o.visible = false;
    }
    group.add(...nodes);
    return {
      strand: s,
      nodes,
      u,
      dispose() {
        group.remove(...nodes);
        for (const g of geos) g.dispose();
        for (const m of mats) m.dispose();
      },
    };
  };

  return {
    group,
    /** Ganti semua benang (bentuk layar atau lanskap berubah). */
    setStrands(strands: readonly Strand[], ground: TerrainShape) {
      shape = ground;
      for (const b of built) b.dispose();
      built = strands.map(build);
    },
    /**
     * Satu frame: tiap benang `i` tergambar sepanjang `draw[i]`, tampak `shown[i]`, manik tempat sekarang di panjang
     * `current[i]` (−1 = tidak ada). `activity` 0–1: sedang digeser (bunga api lebih banyak). Benang yang tidak tampak
     * tidak digambar.
     */
    update(draw: readonly number[], shown: readonly number[], current: readonly number[], activity: number) {
      built.forEach((b, i) => {
        const s = shown[i] ?? 0;
        const d = draw[i] ?? 0;
        const c = current[i] ?? -1;
        const { u } = b;
        u.uDraw.value = d;
        u.uShown.value = s;
        u.uCurrent.value = c;
        u.uActivity.value = activity;
        // manik tempat sekarang menyala begitu ujung benang sudah sampai padanya
        const reached = c >= 0 && d >= c - 1e-4;
        u.uCurOn.value += ((reached ? 1 : 0) - u.uCurOn.value) * 0.12;
        if (c >= 0) {
          const k = b.strand.knots.find((n) => n.at === c);
          if (k) u.uCurPos.value.set(k.pos[0], k.pos[1], k.pos[2]);
        }
        const tip = pointAt(b.strand, d);
        u.uTipPos.value.set(tip[0], tip[1], tip[2]);
        u.uTipOn.value = d > 0.002 && d < 0.998 ? 1 : 0;
        const on = s > 0.002;
        for (const o of b.nodes) o.visible = on;
      });
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2). */
    setPixel(v: number) {
      uPixel.value = v;
    },
    dispose() {
      for (const b of built) b.dispose();
      built = [];
      pillarGeo.dispose();
      sparkGeo.dispose();
    },
  };
}
