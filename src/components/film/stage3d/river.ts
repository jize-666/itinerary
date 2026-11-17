/**
 * Air Bengawan Solo di panggung 3D (Tugas 8.1, pilihan host 17 Nov "b aja coba"). Letak, lebar, dan muka air dari
 * `engine/stage/river.ts`; alurnya sudah diukir di tanah (`terrainHeight`).
 *
 * - Riak mengalir ke hilir (dua lapis derau), meredup di kejauhan supaya tidak berkedip.
 * - Memantulkan langit menurut jam (Fresnel): biru keemasan saat subuh, terang siang, jingga senja, gelap malam.
 *   Badan air cokelat kehijauan seperti Bengawan Solo, buih tipis di kedua tepi.
 * - Kilau matahari/bulan di puncak riak.
 * - Pantulan lampion yang menyala (dan lampion perahu): garis cahaya yang memanjang ke arah kamera dan bergoyang
 *   oleh riak. Riak buritan berbentuk V di belakang perahu, lebih jelas selama perahu hanyut (geseran).
 * - Satu draw call, digambar sebelum benda lain yang tembus pandang.
 */
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector2, Vector4 } from "three";
import { type RiverLine, riverLine } from "@/engine/stage/river";
import { COMMON, type Shared } from "./shared";

/** Lampion paling banyak yang pantulannya digambar (satu hari ≤ 15 tempat singgah + perahu). */
export const MAX_LAMPS = 16;
/** Titik melintang sungai (tepi kiri → tepi kanan). */
const ACROSS = 7;

const VERT = /* glsl */ `
attribute float aAlong;
attribute float aAcross;
attribute float aHalf;
attribute vec2 aTan;
varying vec3 vW;
varying float vAlong;
varying float vAcross;
varying float vHalf;
varying vec2 vTan;
void main() {
  vW = position;
  vAlong = aAlong;
  vAcross = aAcross;
  vHalf = aHalf;
  vTan = aTan;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform vec4 uLamps[${MAX_LAMPS}];
uniform float uLampN;
uniform vec4 uBoat;
uniform vec2 uBoatDir;
uniform float uActivity;
varying vec3 vW;
varying float vAlong;
varying float vAcross;
varying float vHalf;
varying vec2 vTan;

float ripple(vec2 p) { return vnoise(p) * 0.62 + vnoise(p * 2.3 + 7.1) * 0.28 + vnoise(p * 5.3 - 3.3) * 0.1; }

void main() {
  vec3 toCam = cameraPosition - vW;
  float dist = length(toCam);
  vec3 v = toCam / max(dist, 1e-4);
  // koordinat aliran: ke hilir (m) dan melintang (m); riak mengalir ke hilir
  vec2 q = vec2(vAlong, vAcross * vHalf);
  float t = uTime;
  vec2 p1 = vec2(q.x * 1.5 - t * 0.5, q.y * 2.1);
  vec2 p2 = vec2(q.x * 3.6 - t * 0.85, q.y * 4.2 + 3.0);
  float e = 0.05;
  float h = ripple(p1) + 0.5 * ripple(p2);
  float hu = ripple(p1 + vec2(e, 0.0)) + 0.5 * ripple(p2 + vec2(e * 2.4, 0.0));
  float hw = ripple(p1 + vec2(0.0, e)) + 0.5 * ripple(p2 + vec2(0.0, e * 2.0));
  float amp = 0.13 / (1.0 + dist * 0.045);
  vec2 g = vec2(hu - h, hw - h) / e * amp;
  vec3 T = vec3(vTan.x, 0.0, vTan.y);
  vec3 B = vec3(-vTan.y, 0.0, vTan.x);
  vec3 n = safeNormalize(vec3(0.0, 1.0, 0.0) - T * g.x - B * g.y);

  // pantulan langit (Fresnel) di atas badan air cokelat kehijauan
  vec3 r = reflect(-v, n);
  vec3 sky = skyColor(safeNormalize(vec3(r.x, abs(r.y), r.z)));
  float c = 1.0 - max(dot(n, v), 0.0);
  float fres = 0.03 + 0.97 * sq(sq(c)) * c;
  vec3 amb = uAmbSky + uKeyColor * max(uKeyDir.y, 0.0) * 0.35;
  vec3 body = vec3(0.09, 0.1, 0.06) * amb;
  // pantulan dibatasi: di sudut landai air tidak menjadi cermin putih, warna badan air dan pantulan lampion tetap terbaca
  vec3 col = mix(body, min(sky, vec3(1.1)) * (0.78 - 0.38 * uNight), min(fres, 0.56));
  // kilau matahari/bulan di puncak riak: butir-butir kecil, bukan bercak
  float sp = pow(max(dot(n, safeNormalize(uKeyDir + v)), 0.0), 600.0);
  col += uKeyColor * sp * 1.6;
  // buih tipis yang putus-putus di kedua tepi (bukan garis menerus)
  float edge = smoothstep(0.84, 1.0, abs(vAcross));
  float foam = edge * smoothstep(0.55, 0.8, vnoise(vec2(q.x * 2.2 - t * 0.5, q.y * 4.0)));
  col = mix(col, vec3(0.72, 0.68, 0.58) * (amb + 0.05), foam * 0.22);

  // pantulan lampion: garis cahaya dari lampion ke arah kamera, bergoyang oleh riak
  vec2 vd = vW.xz - cameraPosition.xz;
  vd *= inversesqrt(max(dot(vd, vd), 1e-8));
  vec2 vp = vec2(-vd.y, vd.x);
  vec3 glow = vec3(0.0);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    if (float(i) >= uLampN) break;
    vec4 L = uLamps[i];
    vec2 d = L.xz - vW.xz;
    float a = dot(d, vd);
    float s = dot(d, vp) + (g.x * 1.6 + g.y * 1.1) * (0.4 + max(a, 0.0));
    float streak = exp(-sq(s / (0.035 + 0.05 * max(a, 0.0)))) * exp(-max(a, 0.0) * 0.9) * smoothstep(-0.12, 0.06, a);
    float pool = exp(-dot(d, d) * 12.0) * 0.35;
    glow += vec3(1.0, 0.6, 0.25) * (streak + pool) * L.w;
  }
  // cahaya lampion kalah oleh siang, berkuasa di malam hari
  col += glow * (0.35 + 2.6 * uNight);

  // riak buritan berbentuk V di belakang perahu
  vec2 bq = vW.xz - uBoat.xz;
  float back = -dot(bq, uBoatDir);
  float side = abs(dot(bq, vec2(-uBoatDir.y, uBoatDir.x)));
  float vee = exp(-sq((side - back * 0.3 - 0.07) * 16.0)) * smoothstep(0.0, 0.2, back) * exp(-back * 1.1);
  float hull = exp(-sq(side * 7.0)) * exp(-sq((back + 0.1) * 2.2)) * 0.35;
  col += vec3(0.85, 0.82, 0.74) * (vee * (0.3 + 0.7 * uActivity) + hull * uActivity) * (dot(amb, vec3(0.33)) + 0.08) * uBoat.w * 1.6;

  gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

/** Pita air di sepanjang sungai: `ACROSS` titik melintang tiap titik garis tengah, di muka air setempat. */
function waterGeometry(line: RiverLine): BufferGeometry {
  const { points, s, half, level } = line;
  const n = points.length;
  const pos = new Float32Array(n * ACROSS * 3);
  const along = new Float32Array(n * ACROSS);
  const across = new Float32Array(n * ACROSS);
  const hw = new Float32Array(n * ACROSS);
  const tan = new Float32Array(n * ACROSS * 2);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [tx, tz] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    for (let k = 0; k < ACROSS; k++) {
      const w = (k / (ACROSS - 1)) * 2 - 1;
      const j = i * ACROSS + k;
      // sedikit melewati tepi air, menyelip di bawah bibir tebing
      const off = w * half[i]! * 1.02;
      pos.set([points[i]![0] - tz * off, level[i]! + 0.004, points[i]![1] + tx * off], j * 3);
      along[j] = s[i]!;
      across[j] = w;
      hw[j] = half[i]!;
      tan.set([tx, tz], j * 2);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < ACROSS - 1; k++) {
      const a = i * ACROSS + k;
      const b = a + ACROSS;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aAlong", new BufferAttribute(along, 1));
  geo.setAttribute("aAcross", new BufferAttribute(across, 1));
  geo.setAttribute("aHalf", new BufferAttribute(hw, 1));
  geo.setAttribute("aTan", new BufferAttribute(tan, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

export function createRiver(shared: Shared) {
  const uLamps = { value: Array.from({ length: MAX_LAMPS }, () => new Vector4()) };
  const uLampN = { value: 0 };
  const uBoat = { value: new Vector4() };
  const uBoatDir = { value: new Vector2(1, 0) };
  const uActivity = { value: 0 };
  let geo = waterGeometry(riverLine());
  const mat = new ShaderMaterial({ uniforms: { ...shared, uLamps, uLampN, uBoat, uBoatDir, uActivity }, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new Mesh(geo, mat);
  mesh.matrixAutoUpdate = false;
  return {
    mesh,
    /** Sungai berganti letak (bentuk layar berubah). */
    setLine(line: RiverLine) {
      geo.dispose();
      geo = waterGeometry(line);
      mesh.geometry = geo;
    },
    /**
     * Satu frame: lampion yang memantul (`[x, y, z, nyala 0–1]`, paling banyak `MAX_LAMPS`), perahu
     * (`[x, y, z, tampak]` dan arah hanyutnya), dan kadar hanyut 0–1 (riak buritan).
     */
    update(lamps: readonly (readonly [number, number, number, number])[], boat: readonly [number, number, number, number], dir: readonly [number, number], activity: number) {
      const n = Math.min(MAX_LAMPS, lamps.length);
      for (let i = 0; i < n; i++) uLamps.value[i]!.set(...lamps[i]!);
      uLampN.value = n;
      uBoat.value.set(...boat);
      uBoatDir.value.set(dir[0], dir[1]);
      uActivity.value = activity;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
