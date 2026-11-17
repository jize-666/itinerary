/**
 * Larung lampion di Bengawan Solo (Tugas 8.1, pilihan host 17 Nov "b aja coba"). Letak lampion, jalur perahu, dan
 * kemajuannya dari `engine/stage/route.ts`; airnya di `river.ts`.
 *
 * - Lampion tempat singgah: lampion kertas segi enam beratap di atas rakit daun pisang, terapung dan bergoyang di
 *   air. Yang belum disinggahi: kertas krem yang padam. Begitu perahu tiba, lampion menyala (kilatan singkat, lalu
 *   nyala hangat yang berkedip pelan); lampion tempat sekarang paling terang.
 * - Pendar lembut di sekitar lampion yang menyala (titik cahaya; bloom menambah sisanya).
 * - Perahu tamu: jukung kayu dengan tiang dan lampion yang selalu menyala, hanyut mengikuti gulir dan bergoyang.
 * - Ukuran dijaga tetap terbaca dari jauh (lampion ±18 px, perahu ±64 px).
 * - Hemat: hanya lampion hari yang tampak yang digambar; tiga draw call (lampion, pendar, perahu).
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, Points, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import type { Route } from "@/engine/stage/route";
import { COMMON, type Shared } from "./shared";

/** Lampion paling banyak per hari. */
const MAX = 16;
/** Tinggi lampion beserta rakitnya (m) dan tinggi minimumnya di layar (px perangkat). */
const LAMP_H = 0.23;
const LAMP_PX = 18;
/** Tinggi titik pusat kertas lampion di atas air (m). */
const PAPER_Y = 0.115;
/** Panjang perahu (m) dan panjang minimumnya di layar (px perangkat). */
const BOAT_L = 0.9;
const BOAT_PX = 64;

/** Bagian benda: rakit/lambung, kertas lampion, kayu gelap (atap, tiang). */
const PART = { base: 0, paper: 1, wood: 2 } as const;

/** Gabungkan beberapa geometri (setelah digeser) menjadi satu, dengan atribut bagian. */
function parts(list: { geo: BufferGeometry; part: number; y?: number; x?: number; sx?: number; sy?: number; sz?: number }[]): { pos: number[]; nrm: number[]; part: number[] } {
  const out = { pos: [] as number[], nrm: [] as number[], part: [] as number[] };
  for (const { geo, part, y = 0, x = 0, sx = 1, sy = 1, sz = 1 } of list) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    for (let i = 0; i < p.count; i++) {
      out.pos.push(p.getX(i) * sx + x, p.getY(i) * sy + y, p.getZ(i) * sz);
      const [nx, ny, nz] = [n.getX(i) / sx, n.getY(i) / sy, n.getZ(i) / sz];
      const l = Math.hypot(nx, ny, nz) || 1;
      out.nrm.push(nx / l, ny / l, nz / l);
      out.part.push(part);
    }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  return out;
}

/** Satu lampion (dalam satuan meter, alas rakit di muka air). */
const LANTERN = parts([
  // rakit daun pisang: segi delapan pipih yang memanjang
  { geo: new CylinderGeometry(0.11, 0.085, 0.03, 8), part: PART.base, y: 0.012, sz: 0.62 },
  // kertas lampion: segi enam yang ramping, sedikit mengecil ke atas
  { geo: new CylinderGeometry(0.042, 0.05, 0.155, 6), part: PART.paper, y: PAPER_Y },
  // atap tipis dan alas kayu
  { geo: new ConeGeometry(0.056, 0.026, 6), part: PART.wood, y: 0.205 },
  { geo: new CylinderGeometry(0.054, 0.054, 0.01, 6), part: PART.wood, y: 0.034 },
]);

/** Perahu tamu: lambung jukung, tiang di buritan, lampion tergantung di ujungnya. */
const BOAT = parts([
  { geo: new SphereGeometry(1, 20, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), part: PART.base, y: 0.07, sx: 0.45, sy: 0.11, sz: 0.12 },
  // bibir lambung: pinggiran kayu terbuka (bukan piringan), jadi bagian dalam perahu tampak dari atas
  { geo: new CylinderGeometry(1, 1, 0.022, 20, 1, true), part: PART.wood, y: 0.075, sx: 0.452, sz: 0.122 },
  { geo: new CylinderGeometry(0.008, 0.011, 0.5, 5), part: PART.wood, x: -0.3, y: 0.3 },
  { geo: new CylinderGeometry(0.04, 0.046, 0.085, 6), part: PART.paper, x: -0.24, y: 0.47 },
  { geo: new ConeGeometry(0.058, 0.035, 6), part: PART.wood, x: -0.24, y: 0.53 },
]);
/** Tinggi lampion perahu di atas air (m). */
export const BOAT_LAMP: readonly [number, number] = [-0.24, 0.47];

const SHADE = /* glsl */ `
vec3 shade(float part, vec3 n, vec3 wp, vec3 local, float lit, float flare) {
  vec3 v = safeNormalize(cameraPosition - wp);
  if (part < 0.5) {
    // rakit daun pisang; lambung jukung dicat hijau tua dengan garis gading di dekat bibir, bagian dalam kayu gelap
    vec3 leaf = vec3(0.16, 0.27, 0.09);
    vec3 hull = mix(vec3(0.05, 0.16, 0.14), vec3(0.85, 0.78, 0.6), smoothstep(0.035, 0.045, local.y) * (1.0 - smoothstep(0.055, 0.062, local.y)));
    vec3 base = mix(leaf, hull, uIsBoat);
    if (uIsBoat > 0.5 && !gl_FrontFacing) return vec3(0.09, 0.05, 0.03) * diffuseLight(vec3(0.0, 1.0, 0.0), wp);
    return base * diffuseLight(n, wp) + vec3(0.6, 0.5, 0.35) * specLight(n, v, wp, 24.0) * 0.25;
  }
  if (part > 1.5) {
    // kayu gelap: atap lampion, tiang
    return vec3(0.22, 0.08, 0.05) * diffuseLight(n, wp) + vec3(1.0, 0.8, 0.6) * specLight(n, v, wp, 30.0) * 0.2;
  }
  // kertas: rangka bambu di keenam rusuk dan dua rusuk mendatar
  float ang = atan2s(local.z, local.x);
  float rib = smoothstep(0.86, 0.98, cos(ang * 6.0));
  float band = 1.0 - smoothstep(0.0, 0.004, abs(fract((local.y - 0.038) * 19.5) - 0.5) - 0.46);
  float frame = max(rib, band * 0.8);
  vec3 off = vec3(0.86, 0.79, 0.64) * diffuseLight(n, wp) * 0.85;
  // nyala: hangat di tengah, berkedip pelan, kilatan saat baru dinyalakan
  float flick = 0.88 + 0.08 * sin(uTime * 9.3 + local.x * 40.0) + 0.04 * sin(uTime * 23.0);
  vec3 on = vec3(1.0, 0.56, 0.22) * (2.6 + 3.5 * flare) * flick * (0.75 + 0.25 * (1.0 - abs(local.y - ${PAPER_Y.toFixed(3)}) * 12.0));
  vec3 paper = mix(off, on, lit);
  return mix(paper, vec3(0.12, 0.06, 0.03) * (0.4 + lit), frame * 0.85);
}`;

const LAMP_VERT = /* glsl */ `
${COMMON}
attribute vec3 aCenter;
attribute float aPart;
attribute float aIndex;
uniform float uLit[${MAX}];
uniform float uFlare[${MAX}];
uniform float uShown;
uniform float uPixel;
varying vec3 vW;
varying vec3 vN;
varying vec3 vLocal;
varying float vPart;
varying float vLit;
varying float vFlare;
void main() {
  int i = int(aIndex + 0.5);
  float seed = aIndex * 1.618;
  float dist = length(cameraPosition - aCenter);
  float px = 2.0 * dist / max(uPixel, 1.0);
  float s = max(1.0, ${LAMP_PX.toFixed(1)} * px / ${LAMP_H.toFixed(2)}) * uShown;
  // terapung: naik turun dan miring pelan, tiap lampion dengan iramanya sendiri
  float bob = sin(uTime * 1.3 + seed * 5.0) * 0.012;
  float rx = sin(uTime * 1.1 + seed * 3.0) * 0.07;
  float rz = sin(uTime * 0.9 + seed * 7.0) * 0.07;
  vec3 p = position;
  p = vec3(p.x, p.y * cos(rx) - p.z * sin(rx), p.y * sin(rx) + p.z * cos(rx));
  p = vec3(p.x * cos(rz) - p.y * sin(rz), p.x * sin(rz) + p.y * cos(rz), p.z);
  vW = aCenter + p * s + vec3(0.0, bob * s, 0.0);
  vN = normal;
  vLocal = position;
  vPart = aPart;
  vLit = uLit[i];
  vFlare = uFlare[i];
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const LAMP_FRAG = /* glsl */ `
${COMMON}
uniform float uShown;
uniform float uIsBoat;
varying vec3 vW;
varying vec3 vN;
varying vec3 vLocal;
varying float vPart;
varying float vLit;
varying float vFlare;
${SHADE}
void main() {
  vec3 col = shade(vPart, safeNormalize(vN), vW, vLocal, vLit, vFlare);
  gl_FragColor = vec4(applyFog(col, vW) * uShown, 1.0);
}`;

const HALO_VERT = /* glsl */ `
${COMMON}
attribute float aIndex;
uniform float uLit[${MAX}];
uniform float uFlare[${MAX}];
uniform float uShown;
uniform float uPixel;
varying float vLight;
void main() {
  int i = int(aIndex + 0.5);
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.1);
  float flick = 0.9 + 0.1 * sin(uTime * 7.7 + aIndex * 3.0);
  vLight = uLit[i] * (1.0 + 2.5 * uFlare[i]) * flick * uShown;
  gl_PointSize = clamp(uPixel * 0.16 / dist * (1.0 + 0.6 * uFlare[i]), 8.0, 90.0);
}`;

const HALO_FRAG = /* glsl */ `
${COMMON}
varying float vLight;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.7, 1.0, r));
  gl_FragColor = vec4(vec3(1.0, 0.58, 0.24) * a * vLight * (0.55 + 0.6 * uNight), 1.0);
}`;

const BOAT_VERT = /* glsl */ `
${COMMON}
attribute float aPart;
uniform vec3 uBoatPos;
uniform vec2 uBoatDir;
uniform float uShown;
uniform float uPixel;
uniform float uActivity;
varying vec3 vW;
varying vec3 vN;
varying vec3 vLocal;
varying float vPart;
void main() {
  float dist = length(cameraPosition - uBoatPos);
  float px = 2.0 * dist / max(uPixel, 1.0);
  float s = max(1.0, ${BOAT_PX.toFixed(1)} * px / ${BOAT_L.toFixed(2)}) * uShown;
  // bergoyang di air, sedikit menunduk saat hanyut
  float roll = sin(uTime * 1.2) * 0.06;
  float pitch = sin(uTime * 0.9 + 1.0) * 0.03 - 0.04 * uActivity;
  vec3 p = position;
  p = vec3(p.x, p.y * cos(roll) - p.z * sin(roll), p.y * sin(roll) + p.z * cos(roll));
  p = vec3(p.x * cos(pitch) - p.y * sin(pitch), p.x * sin(pitch) + p.y * cos(pitch), p.z);
  vec3 nn = normal;
  nn = vec3(nn.x, nn.y * cos(roll) - nn.z * sin(roll), nn.y * sin(roll) + nn.z * cos(roll));
  // hadap: sumbu x perahu searah hanyut
  vec2 d = uBoatDir;
  vec3 wp = vec3(p.x * d.x - p.z * d.y, p.y, p.x * d.y + p.z * d.x);
  vN = vec3(nn.x * d.x - nn.z * d.y, nn.y, nn.x * d.y + nn.z * d.x);
  vW = uBoatPos + wp * s + vec3(0.0, sin(uTime * 1.5) * 0.01 * s, 0.0);
  vLocal = position;
  vPart = aPart;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const BOAT_FRAG = /* glsl */ `
${COMMON}
uniform float uShown;
uniform float uIsBoat;
varying vec3 vW;
varying vec3 vN;
varying vec3 vLocal;
varying float vPart;
${SHADE}
void main() {
  // lampion perahu selalu menyala
  vec3 col = shade(vPart, safeNormalize(vN), vW, vLocal - vec3(${BOAT_LAMP[0].toFixed(2)}, ${(BOAT_LAMP[1] - PAPER_Y).toFixed(3)}, 0.0), 1.0, 0.15);
  gl_FragColor = vec4(applyFog(col, vW) * uShown, 1.0);
}`;

type Built = { route: Route; nodes: (Mesh | Points)[]; uLit: { value: number[] }; uFlare: { value: number[] }; uShown: { value: number }; lit: boolean[]; ignite: number[]; dispose(): void };

export function createLarung(shared: Shared) {
  const group = new Group();
  const uPixel = { value: 800 };
  const uBoatPos = { value: new Vector3() };
  const uBoatDir = { value: new Vector2(1, 0) };
  const uBoatShown = { value: 0 };
  const uActivity = { value: 0 };
  let built: Built[] = [];

  const boatGeo = new BufferGeometry();
  boatGeo.setAttribute("position", new BufferAttribute(new Float32Array(BOAT.pos), 3));
  boatGeo.setAttribute("normal", new BufferAttribute(new Float32Array(BOAT.nrm), 3));
  boatGeo.setAttribute("aPart", new BufferAttribute(new Float32Array(BOAT.part), 1));
  const boatMat = new ShaderMaterial({
    uniforms: { ...shared, uBoatPos, uBoatDir, uShown: uBoatShown, uPixel, uActivity, uIsBoat: { value: 1 } },
    vertexShader: BOAT_VERT,
    fragmentShader: BOAT_FRAG,
    // lambung terbuka: sisi dalamnya ikut digambar
    side: DoubleSide,
  });
  const boat = new Mesh(boatGeo, boatMat);
  boat.frustumCulled = false;
  boat.matrixAutoUpdate = false;
  boat.visible = false;
  group.add(boat);

  const build = (route: Route): Built => {
    const n = Math.min(MAX, route.knots.length);
    const per = LANTERN.pos.length / 3;
    const pos = new Float32Array(n * per * 3);
    const nrm = new Float32Array(n * per * 3);
    const center = new Float32Array(n * per * 3);
    const part = new Float32Array(n * per);
    const index = new Float32Array(n * per);
    for (let j = 0; j < n; j++) {
      pos.set(LANTERN.pos, j * per * 3);
      nrm.set(LANTERN.nrm, j * per * 3);
      part.set(LANTERN.part, j * per);
      const k = route.knots[j]!.pos;
      for (let v = 0; v < per; v++) {
        center.set(k, (j * per + v) * 3);
        index[j * per + v] = j;
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("normal", new BufferAttribute(nrm, 3));
    geo.setAttribute("aCenter", new BufferAttribute(center, 3));
    geo.setAttribute("aPart", new BufferAttribute(part, 1));
    geo.setAttribute("aIndex", new BufferAttribute(index, 1));
    const hGeo = new BufferGeometry();
    hGeo.setAttribute("position", new BufferAttribute(new Float32Array(route.knots.slice(0, n).flatMap((k) => [k.pos[0], k.pos[1] + PAPER_Y * 1.6, k.pos[2]])), 3));
    hGeo.setAttribute("aIndex", new BufferAttribute(new Float32Array(Array.from({ length: n }, (_, j) => j)), 1));
    const uLit = { value: new Array<number>(MAX).fill(0) };
    const uFlare = { value: new Array<number>(MAX).fill(0) };
    const uShown = { value: 0 };
    const common = { ...shared, uLit, uFlare, uShown, uPixel, uIsBoat: { value: 0 } };
    const mat = new ShaderMaterial({ uniforms: common, vertexShader: LAMP_VERT, fragmentShader: LAMP_FRAG });
    const hMat = new ShaderMaterial({ uniforms: common, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, blending: AdditiveBlending, depthWrite: false, transparent: true });
    const nodes: (Mesh | Points)[] = [new Mesh(geo, mat), new Points(hGeo, hMat)];
    nodes[1]!.renderOrder = 31;
    for (const o of nodes) {
      o.frustumCulled = false;
      o.matrixAutoUpdate = false;
      o.visible = false;
    }
    group.add(...nodes);
    return {
      route,
      nodes,
      uLit,
      uFlare,
      uShown,
      lit: new Array<boolean>(n).fill(false),
      ignite: new Array<number>(n).fill(-99),
      dispose() {
        group.remove(...nodes);
        geo.dispose();
        hGeo.dispose();
        mat.dispose();
        hMat.dispose();
      },
    };
  };

  return {
    group,
    /** Ganti semua perjalanan (bentuk layar berubah). */
    setRoutes(routes: readonly Route[]) {
      for (const b of built) b.dispose();
      built = routes.map(build);
    },
    /**
     * Satu frame (jam `t`, detik): tiap perjalanan `i` sudah ditempuh sepanjang `draw[i]` dan tampak `shown[i]`.
     * Perahu digambar di perjalanan yang paling tampak, di `boatAt` menghadap `dir`. Mengembalikan lampion yang memantul
     * di air (`[x, y, z, nyala]`) untuk `river.ts`.
     */
    update(t: number, draw: readonly number[], shown: readonly number[], boatAt: readonly [number, number, number] | null, dir: readonly [number, number], activity: number) {
      const glow: [number, number, number, number][] = [];
      let best = 0;
      built.forEach((b, i) => {
        const s = shown[i] ?? 0;
        const d = draw[i] ?? 0;
        b.uShown.value = s;
        for (const o of b.nodes) o.visible = s > 0.002;
        b.route.knots.slice(0, MAX).forEach((k, j) => {
          const on = d >= k.at - 1e-4;
          if (on && !b.lit[j]) b.ignite[j] = t;
          b.lit[j] = on;
          // nyala menyusul pelan (0,25 dtk); kilatan meluruh ±0,6 dtk sesudah dinyalakan
          b.uLit.value[j] = Math.min(1, Math.max(0, on ? (t - b.ignite[j]!) / 0.25 : 0));
          b.uFlare.value[j] = on ? Math.exp(-(t - b.ignite[j]!) * 3.5) : 0;
          if (s > 0.002 && b.uLit.value[j]! > 0) glow.push([k.pos[0], k.pos[1], k.pos[2], b.uLit.value[j]! * s]);
        });
        best = Math.max(best, s);
      });
      uBoatShown.value = boatAt ? best : 0;
      boat.visible = !!boatAt && best > 0.002;
      if (boatAt) {
        uBoatPos.value.set(boatAt[0], boatAt[1], boatAt[2]);
        uBoatDir.value.set(dir[0], dir[1]);
      }
      uActivity.value = activity;
      return glow;
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2). */
    setPixel(v: number) {
      uPixel.value = v;
    },
    dispose() {
      for (const b of built) b.dispose();
      built = [];
      boatGeo.dispose();
      boatMat.dispose();
    },
  };

}
