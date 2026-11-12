/**
 * Gong ageng di tengah pendapa: badan perunggu yang digantung di gayor berlak merah dengan dua naga prada,
 * dan tabuhnya. Bentuknya mengikuti prototipe "Gong Murka" (`prototypes/gong/scene.js`); cara menggambarnya
 * ditulis ulang supaya hemat: tiga draw call (badan gong, gayor + naga + tali, tabuh), tanpa tekstur dan tanpa
 * bayangan dinamis. Semua bahan (perunggu, lak, prada, tulang, bara, tali, kain) dibedakan di shader lewat
 * atribut `aTag`, dan semua gerak (ayunan, dengung, gencetan bantalan) dihitung di vertex shader dari uniform.
 *
 * Geometri ditulis dalam satuan model (lihat engine/stage/gong.ts); grupnya yang diskalakan ke dunia.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  Object3D,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  Vector4,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GONG, GONG_SCALE, gongHum, gongSection, gongSwing, heartbeat, MALLET_REST, malletPose, strikeFlare, strikeHeat } from "@/engine/stage/gong";
import { COMMON, type Shared } from "./shared";

/** Bahan pada jala gayor dan tabuh (`aTag.x`). */
const MAT = { lakPost: 0, lakBar: 1, lakFoot: 2, prada: 3, scale: 4, bone: 5, maw: 6, eye: 7, rope: 8, wood: 9, cloth: 10 } as const;
/** Cara bergerak (`aTag.y`): diam, ikut ayunan gong, atau bantalan kepala tabuh yang tergencet. */
const MOVE = { still: 0, swing: 1, pad: 2 } as const;

const f = (x: number) => x.toFixed(4);

/** Tabuh: jarak kepala → puncak jerat tali di ujung gagang, dan jari-jari jeratnya. Jerat itu yang tersangkut di cantolan. */
const LOOP_R = 0.024;
const MALLET_LEN = 0.68 + LOOP_R * 2;
/** Cantolan berada setinggi puncak jerat saat tabuh menggantung (kepala 62 cm di bawah titik gantung). */
const HOOK_RISE = MALLET_LEN - 0.62 - 0.006;

/** Pantulan logam di panggung: tanpa peta lingkungan, dihitung dari langit, lantai, dan blencong. */
const METAL = /* glsl */ `
/* Lingkungan untuk pantulan: langit di atas; di bawah, lantai pendapa yang disinari blencong; di antaranya
   pendar hangat dari arah lampu. \`rough\` (0 licin … 1 kusam) melebarkan semua peralihan. */
vec3 stageEnv(vec3 r, vec3 wp, float rough) {
  vec3 up = skyColor(normalize(vec3(r.x, max(r.y, 0.03), r.z)));
  vec3 L;
  vec3 lamp = lampAt(wp, L);
  // lantai batu berkawung emas: memantulkan blencong dan cahaya kunci dengan warna hangat
  vec3 ground = uAmbGround * 0.7 + (lamp * 0.085 + uKeyColor * 0.06) * vec3(0.62, 0.42, 0.22);
  vec3 c = mix(ground, up, smoothstep(-0.25 - rough * 0.7, 0.12 + rough * 0.7, r.y));
  // blencong sebagai sumber cahaya luas: pendar lembut di sekitar arah nyala (kilap tajamnya dari specLight)
  float d = max(dot(r, L), 0.0);
  c += lamp * pow(d, mix(12.0, 3.0, rough)) * 0.26;
  return c;
}
/* Pangkat Blinn-Phong dari kekasaran. */
float shineOf(float rough) { return 2.0 / max(rough * rough, 0.004) - 2.0; }
/* Logam: warna pantul × (lingkungan + kilap), sedikit lebih terang di sudut landai. */
vec3 metal(vec3 f0, vec3 n, vec3 v, vec3 wp, float rough) {
  float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 tint = mix(f0, vec3(1.0), fres * (1.0 - rough) * 0.7);
  return tint * (stageEnv(reflect(-v, n), wp, rough) + specLight(n, v, wp, shineOf(rough)) * 0.3);
}
/* Sel Voronoi: xy = vektor ke pusat sel terdekat, z = jaraknya, w = jarak ke tepi sel (selisih dua terdekat). */
vec4 cells(vec2 p) {
  vec2 i = floor(p), fr = fract(p);
  vec3 best = vec3(0.0, 0.0, 8.0);
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 d = g + hash22(i + g) - fr;
      float l = dot(d, d);
      if (l < best.z) { second = best.z; best = vec3(d, l); } else if (l < second) { second = l; }
    }
  }
  return vec4(best.xy, sqrt(best.z), sqrt(second) - sqrt(best.z));
}
`;

const S = GONG_SCALE;
/**
 * Bayangan gong dan gayor di lantai, dari blencong: tanpa shadow map. Sinar dari titik lantai ke lampu dipotong
 * dengan bidang gayor (z = 0); di sana rakitan cukup diwakili bentuk 2D: cakram gong, dua tiang, palang, dan
 * kedua naga. Tepinya makin lembut makin jauh bayangan jatuh dari bendanya. Hasil: 1 = terang, 0 = terbayang.
 * Juga bayangan kontak di kaki tiang (`gongContact`), untuk semua cahaya.
 */
export const GONG_SHADOW = /* glsl */ `
float gongShade(vec3 wp) {
  vec3 d = uLampPos - wp;
  if (d.z * wp.z >= 0.0 || abs(d.z) < 1e-4) return 1.0; // lampu dan titik ini di sisi yang sama dari gayor
  float t = -wp.z / d.z;
  vec2 h = wp.xy + d.xy * t;
  float gong = length(h - vec2(0.0, ${f(GONG.y * S)})) - ${f(GONG.radius * S)};
  float posts = max(abs(abs(h.x) - ${f(GONG.postX * S)}) - 0.078, h.y - ${f((GONG.barY + 0.2) * S)});
  float bar = max(abs(h.y - ${f(GONG.barY * S)}) - 0.085, abs(h.x) - ${f((GONG.barHalf + 0.02) * S)});
  float naga = length(vec2(abs(h.x) - ${f(1.17 * S)}, (h.y - ${f((GONG.barY + 0.22) * S)}) * 0.6)) - 0.2;
  float sd = min(min(gong, posts), min(bar, naga));
  float soft = 0.015 + 0.11 * t / max(1.0 - t, 0.05);
  return smoothstep(-soft, soft, sd);
}
float gongContact(vec3 wp) {
  vec2 c = vec2(abs(wp.x) - ${f(GONG.postX * S)}, wp.z);
  return 1.0 - 0.55 * (1.0 - smoothstep(0.1, 0.62, length(c * vec2(1.5, 1.0))));
}
`;

/** Ayunan mengitari poros gantung (sumbu x) + dengung maju-mundur: dipakai badan gong, tali, dan cincin. */
const SWING_GLSL = /* glsl */ `
uniform vec3 uSwing; // x sudut ayun (rad), y dengung (m), z tinggi poros
void swing(inout vec3 p, inout vec3 n) {
  float c = cos(uSwing.x), s = sin(uSwing.x);
  p.z += uSwing.y;
  p.y -= uSwing.z;
  p.yz = vec2(c * p.y - s * p.z, s * p.y + c * p.z);
  p.y += uSwing.z;
  n.yz = vec2(c * n.y - s * n.z, s * n.y + c * n.z);
}
`;

const BODY_VERT = /* glsl */ `
${SWING_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFront;
void main() {
  vLocal = vec3(position.x, position.y - ${f(GONG.y)}, position.z);
  vFront = normal.z;
  vec3 p = position;
  vec3 n = normal;
  swing(p, n);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BODY_FRAG = /* glsl */ `
${COMMON}
${METAL}
uniform vec4 uEmber; // x denyut jantung, y panas pukulan, z detik sejak hantaman, w cadangan
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFront;

const float R = ${f(GONG.radius)};

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 q = vLocal.xy;
  float rr = length(q);
  float r = rr / R;
  vec2 radial = q / max(rr, 1e-4);
  float front = smoothstep(0.2, 0.7, vFront);
  float px = fwidth(rr) + 1e-6; // lebar satu piksel di muka gong (m)

  // ---- bagian muka: pencu yang digosok tabuh, leher, dua punggung recep, pundak ----
  float pencu = 1.0 - smoothstep(0.2, 0.275, r);
  float neck = smoothstep(0.2, 0.26, r) * (1.0 - smoothstep(0.27, 0.34, r));
  float recep = max(exp(-pow((r - 0.375) / 0.03, 2.0)), exp(-pow((r - 0.652) / 0.034, 2.0)));
  float rai = smoothstep(0.3, 0.36, r) * (1.0 - smoothstep(0.84, 0.93, r));

  // ---- relief halus: kemiringan permukaan (bukan tinggi), dijumlahkan lalu dipakai membelokkan normal ----
  vec2 tilt = vec2(0.0);
  // bekas tempa: lekuk dangkal ±2 cm di seluruh rai
  const float K = 46.0;
  float lodH = 1.0 - smoothstep(0.12, 0.5, px * K);
  vec4 c = cells(q * K + 11.0);
  float s = clamp(c.z / 0.66, 0.0, 1.0);
  float dent = 4.0 * s * (1.0 - s * s);
  tilt += (c.xy / max(c.z, 1e-3)) * dent * 0.04 * rai * lodH;
  // garis bubut melingkar di pencu, leher, dan punggung recep
  const float KR = 1250.0;
  float lodR = 1.0 - smoothstep(0.5, 2.0, px * KR);
  tilt += radial * cos(rr * KR) * 0.11 * lodR * max(max(pencu * smoothstep(0.02, 0.1, r), neck), recep * 0.8);
  // gelombang lebar: perunggu tempa tidak pernah benar-benar rata
  float warp = fbm(q * 9.0 + 5.3);
  tilt += (vec2(fbm(q * 9.0 + vec2(5.42, 5.3)), fbm(q * 9.0 + vec2(5.3, 5.42))) - warp) * 0.7 * rai;

  vec3 ex = vec3(1.0, 0.0, 0.0), ey = vec3(0.0, 1.0, 0.0);
  vec3 bent = tilt.x * ex + tilt.y * ey;
  vec3 nb = normalize(n - (bent - n * dot(n, bent)) * front);

  // ---- bahan: perunggu gelap berpatina; pencu, punggung recep, dan tepi mengilap keemasan ----
  float blotch = fbm(q * 6.0 + 2.7);
  float speck = fbm(q * 38.0 + 9.1);
  float rim = smoothstep(0.9, 0.97, r) * front;
  float polish = clamp(pencu * 0.95 + recep * 0.55 + rim * 0.45 + neck * 0.2 + (blotch - 0.5) * 0.5 * rai, 0.0, 1.0);
  polish = mix(0.16 + 0.2 * blotch, polish, front); // punggung dan bau: kusam merata
  float rough = clamp(mix(0.46, 0.17, polish) + (speck - 0.5) * 0.08 + (1.0 - lodH) * 0.04 * rai, 0.1, 0.8);
  vec3 f0 = mix(vec3(0.6, 0.38, 0.16), vec3(1.0, 0.72, 0.34), polish);
  // patina: cokelat tua, kehijauan di lekuk dan di tempat yang jarang tersentuh
  vec3 patina = mix(vec3(0.05, 0.032, 0.018), vec3(0.026, 0.044, 0.034), smoothstep(0.5, 0.78, blotch) * (1.0 - polish)) * (0.75 + 0.5 * speck);
  float lekuk = 1.0 - 0.45 * neck * front - 0.25 * dent * rai * lodH;

  vec3 col = patina * diffuseLight(nb, vWorld) * (1.0 - 0.75 * polish) * lekuk;
  col += metal(f0, nb, v, vWorld, rough) * mix(0.6, 1.0, polish) * lekuk;
  // kilau satin perunggu tempa: sorot lebar dari blencong, paling terang di sisi yang menghadap lampu
  vec3 L;
  vec3 lamp = lampAt(vWorld, L);
  float sheen = pow(max(dot(nb, normalize(L + v)), 0.0), 9.0) * step(0.0, dot(n, L));
  float form = 0.5 + 0.5 * max(max(recep, pencu), rim) - 0.22 * smoothstep(0.7, 0.9, r) * (1.0 - rim);
  col += f0 * lamp * sheen * 0.36 * form * (1.0 - 0.5 * polish) * lekuk;

  // ---- jantung gong: bara di dalam pencu, berdenyut; merembes paling terang di leher ----
  vec3 ember = vec3(1.0, 0.2, 0.035);
  float heart = (0.55 * pencu + 1.2 * neck) * front;
  float pulse = 0.05 + 0.5 * uEmber.x + 0.3 * uEmber.y;
  col += ember * heart * pulse * (0.75 + 0.5 * speck);

  // ---- pukulan: retakan bara menjalar dari pencu, cincin recep ikut membara ----
  if (uEmber.y > 0.002) {
    float reach = smoothstep(0.0, 0.32, uEmber.z) * 1.05; // retakan sampai ke tepi dalam ±0,3 dtk
    vec2 wq = q + (vec2(fbm(q * 13.0), fbm(q * 13.0 + 7.7)) - 0.5) * 0.05;
    vec4 k = cells(wq * 15.0 + 3.0);
    float crack = (1.0 - smoothstep(0.0, 0.05 + px * 22.0, k.w)) * (0.4 + 0.6 * hash21(floor(wq * 15.0 + 3.0 + k.xy)));
    float seen = smoothstep(reach, reach - 0.18, r) * smoothstep(0.16, 0.3, r) * (1.0 - smoothstep(0.86, 0.98, r));
    float rings = exp(-pow((r - 0.375) / 0.012, 2.0)) + exp(-pow((r - 0.652) / 0.012, 2.0));
    float glow = (crack * seen + rings * 0.5 * step(r, reach + 0.05)) * front;
    col += mix(ember, vec3(1.0, 0.62, 0.22), smoothstep(1.2, 2.2, uEmber.y)) * glow * uEmber.y * 1.6;
    col += ember * 0.12 * uEmber.y * front * (1.0 - r); // seluruh muka ikut memerah sesaat
  }

  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

const FRAME_VERT = /* glsl */ `
${SWING_GLSL}
attribute vec2 aTag;
uniform vec4 uPulse; // x denyut, y kilatan pukulan, z napas api, w gencetan bantalan tabuh
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec2 vUv;
varying float vMat;
void main() {
  vec3 p = position;
  vec3 n = normal;
  vLocal = p;
  vUv = uv;
  vMat = aTag.x;
  if (aTag.y > 1.5) {
    // bantalan kepala tabuh: gepeng searah gagang, melebar ke samping
    float k = uPulse.w;
    p *= vec3(1.0 + (1.0 - k) * 0.5, 1.0 + (1.0 - k) * 0.5, k);
  } else if (aTag.y > 0.5) {
    swing(p, n);
  }
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAME_FRAG = /* glsl */ `
${COMMON}
${METAL}
uniform vec4 uPulse;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec2 vUv;
varying float vMat;

const vec3 GOLD = vec3(1.0, 0.76, 0.33);
const vec3 EMBER = vec3(1.0, 0.24, 0.04);

/* Garis tipis teranti-alias: 1 di dalam setengah lebar \`w\`, pudar selebar \`aa\`. */
float lineAt(float d, float w, float aa) { return 1.0 - smoothstep(w, w + aa, abs(d)); }

/* Lung-lungan: sulur bergelombang sepanjang \`along\` dengan ukel (gelung) bergantian di kiri-kanannya.
   \`side\` = jarak menyamping dari sumbu sulur. Semua dalam meter model. */
float lung(float along, float side, float aa) {
  const float KW = 36.0;
  float stem = lineAt(side - 0.011 * sin(along * KW), 0.0026, aa);
  float cell = along * KW / 3.14159265;
  float sgn = mod(floor(cell), 2.0) < 1.0 ? 1.0 : -1.0;
  vec2 c = vec2(side - sgn * 0.021, (fract(cell) - 0.5) * 3.14159265 / KW);
  float ukel = lineAt(length(c) - 0.0085, 0.0022, aa);
  float bud = 1.0 - smoothstep(0.0028, 0.0028 + aa, length(c));
  // daun kecil di sisi seberang ukel
  vec2 l = vec2(side + sgn * 0.02, c.y);
  float leaf = 1.0 - smoothstep(0.0, aa, length(l * vec2(1.0, 0.42)) - 0.0058);
  return clamp(stem + ukel + bud + leaf, 0.0, 1.0);
}

/* Lak merah darah dengan ukiran prada (\`gold\` 0–1). */
vec3 lacquer(float gold, vec3 n, vec3 v) {
  float grain = fbm(vec2(vLocal.y * 5.0 + vLocal.x * 2.0, vLocal.x * 9.0 + vLocal.z * 7.0));
  vec3 lak = mix(vec3(0.115, 0.011, 0.01), vec3(0.2, 0.024, 0.017), grain);
  vec3 col = lak * diffuseLight(n, vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  // lapisan lak bening: pantulan lembut + kilap tajam
  col += stageEnv(reflect(-v, n), vWorld, 0.18) * (0.05 + 0.5 * fres) * vec3(1.0, 0.72, 0.66);
  col += min(specLight(n, v, vWorld, 520.0) * 0.03, vec3(0.8));
  vec3 gilt = GOLD * 0.1 * diffuseLight(n, vWorld) + metal(GOLD, n, v, vWorld, 0.3);
  return mix(col, gilt, gold);
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  int m = int(vMat + 0.5);
  // lebar satu piksel pada permukaan (m): dihitung di luar percabangan
  float aa = max(length(fwidth(vLocal)) * 0.9, 0.0006);
  vec2 uvw = fwidth(vUv);
  vec3 col;

  if (m == ${MAT.lakPost}) {
    // tiang: tiga sulur mengelilingi badan, gelang garis emas di pangkal dan puncak
    float turn = vUv.x * 3.0;
    float side = (fract(turn) - 0.5) * (0.364 / 3.0);
    float y = vLocal.y;
    float body = step(0.2, y) * step(y, 1.66);
    float gold = lung(y + floor(turn) * 0.031, side, aa) * body;
    gold += lineAt(y - 0.185, 0.004, aa) + lineAt(y - 1.675, 0.004, aa);
    col = lacquer(clamp(gold, 0.0, 1.0), n, v);
  } else if (m == ${MAT.lakBar}) {
    // palang: sulur memanjang di muka depan dan belakang, garis emas di kedua tepi, medali di tengah
    float y = vLocal.y - ${f(GONG.barY)};
    float face = step(0.5, abs(n.z));
    float x = vLocal.x;
    float gold = lung(abs(x) + 0.02, y, aa) * step(0.09, abs(x)) * step(abs(x), 0.8);
    gold += lineAt(abs(y) - 0.044, 0.0028, aa);
    float med = length(vec2(x, y) * vec2(0.62, 1.0));
    gold += lineAt(med - 0.034, 0.0026, aa) + (1.0 - smoothstep(0.014, 0.014 + aa, med));
    col = lacquer(clamp(gold * face, 0.0, 1.0), n, v);
  } else if (m == ${MAT.lakFoot}) {
    float gold = lineAt(vLocal.y - 0.074, 0.004, aa) * step(abs(n.y), 0.6);
    col = lacquer(gold, n, v);
  } else if (m == ${MAT.prada}) {
    float wear = fbm(vLocal.xy * 60.0 + vLocal.z * 37.0);
    col = GOLD * 0.1 * diffuseLight(n, vWorld) + metal(mix(GOLD, vec3(0.8, 0.5, 0.2), wear * 0.5), n, v, vWorld, 0.24 + 0.2 * wear);
  } else if (m == ${MAT.scale}) {
    // badan naga: sisik prada berbaris selang-seling, gelang lak merah, perut lebih pucat
    vec2 g = vec2(vUv.x * 46.0, vUv.y * 10.0);
    float row = floor(g.x);
    vec2 sc = vec2(fract(g.x), fract(g.y + 0.5 * mod(row, 2.0))) - vec2(0.0, 0.5);
    float edge = length(vec2(sc.x - 0.1, sc.y * 1.15));
    float lodS = 1.0 - smoothstep(0.25, 0.7, uvw.x * 46.0);
    float groove = smoothstep(0.5, 0.62, edge) * lodS;
    float ridge = (1.0 - smoothstep(0.0, 0.5, edge)) * lodS;
    float band = 1.0 - smoothstep(0.016, 0.016 + uvw.x * 1.5, abs(fract(vUv.x * 9.0 + 0.5) - 0.5) / 9.0);
    band *= step(0.06, vUv.x) * step(vUv.x, 0.9);
    vec3 gold = GOLD * 0.1 * diffuseLight(n, vWorld) + metal(mix(GOLD, vec3(1.0, 0.86, 0.5), ridge * 0.6), n, v, vWorld, 0.34 - 0.14 * ridge);
    gold *= 0.8 + 0.5 * ridge;
    gold *= 1.0 - 0.72 * groove;
    vec3 lak = lacquer(lineAt(abs(fract(vUv.x * 9.0 + 0.5) - 0.5) / 9.0 - 0.011, 0.0016, uvw.x * 1.5), n, v);
    col = mix(gold, lak, band);
  } else if (m == ${MAT.bone}) {
    vec3 bone = vec3(0.5, 0.43, 0.29);
    col = bone * diffuseLight(n, vWorld) + specLight(n, v, vWorld, 40.0) * 0.08;
    col += EMBER * 0.25 * (uPulse.x * 0.3 + uPulse.y); // terpapar bara mulut
  } else if (m == ${MAT.maw}) {
    float flick = 0.8 + 0.4 * vnoise(vec2(uTime * 9.0, vLocal.y * 40.0));
    col = EMBER * (1.6 + 1.6 * uPulse.x + 7.0 * uPulse.y + 6.0 * uPulse.z) * flick;
  } else if (m == ${MAT.eye}) {
    col = vec3(1.0, 0.13, 0.025) * (2.2 + 3.2 * uPulse.x + 8.0 * uPulse.y);
  } else if (m == ${MAT.rope}) {
    // tali pilin: tiga untai yang melingkar
    float strand = 0.5 + 0.5 * sin((vUv.x * 60.0 + vUv.y * 3.0) * 6.2831853);
    vec3 rope = mix(vec3(0.05, 0.008, 0.006), vec3(0.2, 0.03, 0.02), strand);
    col = rope * diffuseLight(n, vWorld) + specLight(n, v, vWorld, 12.0) * 0.03 * strand;
  } else if (m == ${MAT.wood}) {
    float grain = fbm(vec2(vLocal.z * 30.0, vLocal.x * 200.0 + vLocal.y * 160.0));
    vec3 wood = mix(vec3(0.02, 0.01, 0.005), vec3(0.06, 0.028, 0.012), grain);
    col = wood * diffuseLight(n, vWorld) + specLight(n, v, vWorld, 60.0) * 0.025;
    col += stageEnv(reflect(-v, n), vWorld, 0.3) * 0.05 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
  } else {
    // kain pembungkus kepala tabuh: merah tua bertenun, diikat tali gelap di pangkal
    float weave = 0.5 + 0.25 * sin(vLocal.x * 900.0) * sin(vLocal.y * 900.0) + 0.25 * fbm(vLocal.xy * 120.0);
    float tie = smoothstep(0.036, 0.046, vLocal.z) * (0.6 + 0.4 * sin(atan(vLocal.y, vLocal.x) * 24.0));
    vec3 cloth = mix(vec3(0.2, 0.022, 0.018), vec3(0.34, 0.05, 0.032), weave);
    cloth = mix(cloth, vec3(0.03, 0.012, 0.01), tie);
    // kain: tepi siluet sedikit terang (bulu halus), tanpa kilap
    float fuzz = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col = cloth * diffuseLight(n, vWorld) * (1.0 + 0.6 * fuzz);
  }

  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

// ---------------------------------------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------------------------------------

const dummy = new Object3D();

type Place = { at?: readonly [number, number, number]; rot?: readonly [number, number, number]; scale?: readonly [number, number, number] };

/** Geser, putar, dan skalakan satu bagian. */
function put<G extends BufferGeometry>(g: G, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] }: Place): G {
  dummy.position.set(...at);
  dummy.rotation.set(...rot);
  dummy.scale.set(...scale);
  dummy.updateMatrix();
  g.applyMatrix4(dummy.matrix);
  return g;
}

/** Tandai bahan dan cara gerak tiap titik, dan samakan atribut supaya bisa digabung. */
function tag(g: BufferGeometry, mat: number, move: number = MOVE.still): BufferGeometry {
  const out = g.index ? g : mergeVertices(g);
  const n = out.getAttribute("position").count;
  const t = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    t[i * 2] = mat;
    t[i * 2 + 1] = move;
  }
  out.setAttribute("aTag", new BufferAttribute(t, 2));
  for (const name of Object.keys(out.attributes)) if (!["position", "normal", "uv", "aTag"].includes(name)) out.deleteAttribute(name);
  return out;
}

/** Tabung meruncing sepanjang kurva (jari-jari `r0` → `r1`), normal dihitung dari sumbunya supaya tanpa sambungan. */
function taperTube(curve: CatmullRomCurve3, segs: number, r0: number, r1: number, radial: number): TubeGeometry {
  const g = new TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const [c, v] = [new Vector3(), new Vector3()];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, c);
    const r = r0 + (r1 - r0) * Math.pow(u, 0.9);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).normalize();
      nor.setXYZ(k, v.x, v.y, v.z);
      pos.setXYZ(k, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
    }
  }
  return g;
}

/** Badan gong: penampang (r, z) diputar mengelilingi sumbu z. Normal dari penampang, jadi mulus tanpa sambungan. */
function latheZ(points: readonly (readonly [number, number])[], normals: readonly (readonly [number, number])[], segs: number): BufferGeometry {
  const rows = points.length;
  const pos = new Float32Array(rows * (segs + 1) * 3);
  const nor = new Float32Array(rows * (segs + 1) * 3);
  for (let i = 0; i < rows; i++) {
    const [r, z] = points[i]!;
    const [nr, nz] = normals[i]!;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const k = (i * (segs + 1) + j) * 3;
      pos.set([r * c, r * s, z], k);
      nor.set([nr * c, nr * s, nz], k);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const [a, b] = [i * (segs + 1) + j, (i + 1) * (segs + 1) + j];
      // di sumbu putar satu sisi segi empatnya berimpit: cukup satu segitiga
      if (points[i + 1]![0] > 0) index.push(a, b, b + 1);
      if (points[i]![0] > 0) index.push(a, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("normal", new BufferAttribute(nor, 3));
  g.setIndex(index);
  return g;
}

/** Satu naga di ujung palang (`s` = −1 kiri, 1 kanan): badan bersisik yang melengkung naik, kepala bertanduk dengan rahang menganga. */
function naga(s: number): { parts: BufferGeometry[]; mouth: Vector3; dir: Vector3 } {
  const parts: BufferGeometry[] = [];
  const pts = (
    [
      [0.9, 0.0],
      [1.02, -0.03],
      [1.14, 0.0],
      [1.21, 0.1],
      [1.2, 0.22],
      [1.13, 0.3],
      [1.16, 0.4],
      [1.27, 0.45],
    ] as const
  ).map(([x, y]) => new Vector3(s * x, GONG.barY + y, 0));
  const curve = new CatmullRomCurve3(pts);
  const [r0, r1] = [0.058, 0.03];
  parts.push(tag(taperTube(curve, 56, r0, r1, 12), MAT.scale));

  // sirip punggung: duri emas di sisi luar lengkungan
  const [p, t, out, nrm, aim] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const up = new Vector3(0, 1, 0);
  for (let i = 1; i < 18; i++) {
    const u = i / 19;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    const r = r0 + (r1 - r0) * u;
    out.set(s, 0.35, 0).normalize();
    nrm.copy(out).addScaledVector(t, -out.dot(t)).normalize();
    aim.copy(nrm).addScaledVector(t, -0.5).normalize();
    const spike = new ConeGeometry(r * 0.32, r * 1.1, 6, 1);
    dummy.position.copy(p).addScaledVector(nrm, r * 1.15);
    dummy.quaternion.setFromUnitVectors(up, aim);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    parts.push(tag(spike.applyMatrix4(dummy.matrix), MAT.prada));
  }

  // kepala: menghadap searah ujung badan
  const end = curve.getPointAt(1);
  const dir = curve.getTangentAt(1);
  const head = new Matrix4().lookAt(end.clone().add(dir), end, up).setPosition(end);
  const H: BufferGeometry[] = [];
  const add = (g: BufferGeometry, mat: number, place: Place) => H.push(tag(put(g, place), mat));
  add(new SphereGeometry(0.052, 18, 12), MAT.prada, { at: [0, 0, 0.04], scale: [0.9, 0.78, 1.5] });
  add(new SphereGeometry(0.04, 14, 10), MAT.prada, { at: [0, 0.006, 0.11], scale: [0.82, 0.42, 1.9] });
  add(new SphereGeometry(0.036, 14, 8), MAT.prada, { at: [0, -0.056, 0.095], rot: [0.6, 0, 0], scale: [0.78, 0.36, 1.75] }); // rahang bawah, menganga
  add(new SphereGeometry(0.03, 12, 8), MAT.maw, { at: [0, -0.03, 0.1], scale: [0.62, 0.55, 1.4] });
  // gigi atas menggantung dari moncong; gigi bawah berdiri di tepi rahang (disusun di ruang rahang, lalu ikut menganga)
  const jaw: Place = { at: [0, -0.056, 0.095], rot: [0.6, 0, 0] };
  for (let k = 0; k < 5; k++) {
    const z = 0.07 + k * 0.024;
    const zj = -0.012 + k * 0.0145;
    const span = Math.sqrt(1 - (zj / 0.063) ** 2);
    for (const e of [-1, 1]) {
      add(new ConeGeometry(0.0055, 0.018, 5, 1), MAT.bone, { at: [e * 0.021, -0.012, z], rot: [Math.PI, 0, 0] });
      H.push(tag(put(put(new ConeGeometry(0.005, 0.016, 5, 1), { at: [e * 0.0196 * span, 0.0093 * span + 0.007, zj] }), jaw), MAT.bone));
    }
  }
  // ujung moncong yang mencuat
  add(new SphereGeometry(0.015, 10, 8), MAT.prada, { at: [0, 0.014, 0.176], scale: [1, 0.85, 1.15] });
  for (const e of [-1, 1]) {
    add(new ConeGeometry(0.008, 0.05, 7, 1), MAT.bone, { at: [e * 0.017, -0.03, 0.172], rot: [Math.PI + 0.25, 0, 0] });
    add(new SphereGeometry(0.012, 10, 8), MAT.eye, { at: [e * 0.033, 0.024, 0.06] });
    add(new ConeGeometry(0.01, 0.06, 6, 1), MAT.prada, { at: [e * 0.03, 0.045, 0.05], rot: [-1.35, 0, -e * 0.5] });
    const horn = new CatmullRomCurve3([new Vector3(e * 0.024, 0.045, 0.01), new Vector3(e * 0.05, 0.085, -0.04), new Vector3(e * 0.06, 0.1, -0.11), new Vector3(e * 0.05, 0.13, -0.16)]);
    H.push(tag(taperTube(horn, 12, 0.012, 0.002, 7), MAT.bone));
    const wk: Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      wk.push(new Vector3(e * (0.02 + u * 0.07), -u * 0.03 + Math.sin(u * 6) * 0.01, 0.17 - u * 0.06));
    }
    H.push(tag(new TubeGeometry(new CatmullRomCurve3(wk), 16, 0.003, 4, false), MAT.prada));
  }
  // jamang: lima lidah emas di ubun-ubun
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.32;
    add(new ConeGeometry(0.014, 0.075 + (i === 2 ? 0.03 : 0), 7, 1), MAT.prada, { at: [Math.sin(a) * 0.03, 0.055 + Math.cos(a) * 0.012, -0.02 - Math.abs(i - 2) * 0.008], rot: [-0.45, 0, -a] });
  }
  // janggut: sulur yang menggulung di bawah rahang
  const beard: Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const a = u * Math.PI * 2;
    const r = 0.035 * (1 - u * 0.8);
    beard.push(new Vector3(Math.cos(a) * r * 0.4, -0.08 - u * 0.02 + Math.sin(a) * r, 0.03 + Math.sin(a) * r * 0.5));
  }
  H.push(tag(new TubeGeometry(new CatmullRomCurve3(beard), 26, 0.007, 5, false), MAT.prada));
  for (const g of H) parts.push(g.applyMatrix4(head));

  const mouth = new Vector3(0, -0.03, 0.14).applyMatrix4(head);
  const aimOut = new Vector3(0, -0.12, 1).transformDirection(head);
  return { parts, mouth, dir: aimOut };
}

/** Gayor: dua tiang berlak merah di atas kaki, palang, hiasan prada, dua naga, tali, dan cincin gantungan. */
function frameGeometry(): { geometry: BufferGeometry; mouths: { pos: Vector3; dir: Vector3 }[] } {
  const parts: BufferGeometry[] = [];
  const { postX: X, barY: BY, y: GY } = GONG;
  const mouths: { pos: Vector3; dir: Vector3 }[] = [];
  for (const s of [-1, 1]) {
    parts.push(tag(put(new CylinderGeometry(0.052, 0.064, 1.92, 24, 1), { at: [s * X, 1.02, 0] }), MAT.lakPost));
    // kaki: balok melintang dengan pundak melengkung
    const sh = new Shape();
    sh.moveTo(-0.26, 0);
    sh.lineTo(0.26, 0);
    sh.quadraticCurveTo(0.28, 0.07, 0.16, 0.09);
    sh.lineTo(-0.16, 0.09);
    sh.quadraticCurveTo(-0.28, 0.07, -0.26, 0);
    const foot = new ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 6 });
    parts.push(tag(put(foot.translate(0, 0, -0.1), { at: [s * X, 0, 0], rot: [0, Math.PI / 2, 0] }), MAT.lakFoot));
    for (const y of [0.13, 1.72]) parts.push(tag(put(new CylinderGeometry(0.075, 0.075, 0.035, 24, 1), { at: [s * X, y, 0] }), MAT.prada));
    parts.push(tag(put(new SphereGeometry(0.05, 16, 10), { at: [s * X, BY + 0.12, 0] }), MAT.prada));
    // ujung tiang: tiga lidah api emas
    for (let k = -1; k <= 1; k++) {
      const a = Math.abs(k);
      parts.push(tag(put(new ConeGeometry(0.02 - a * 0.005, 0.13 - a * 0.04, 8, 1), { at: [s * X + k * 0.022, BY + 0.21 - a * 0.03, 0], rot: [0, 0, -k * 0.35] }), MAT.prada));
    }
    const n = naga(s);
    parts.push(...n.parts);
    mouths.push({ pos: n.mouth, dir: n.dir });
    // tali merah dari palang ke cincin di bibir gong: ikut berayun
    const rope = new CatmullRomCurve3([new Vector3(s * 0.2, GONG.pivot, 0), new Vector3(s * 0.185, 1.72, -0.05), new Vector3(s * 0.15, GY + 0.47, -0.13)]);
    parts.push(tag(new TubeGeometry(rope, 14, 0.011, 7, false), MAT.rope, MOVE.swing));
    parts.push(tag(put(new TorusGeometry(0.018, 0.005, 6, 14), { at: [s * 0.15, GY + 0.47, -0.13], rot: [0, Math.PI / 2, 0] }), MAT.prada, MOVE.swing));
  }
  // cantolan tabuh: lengan prada dari tiang kanan, ujungnya melengkung ke atas
  const [hx, hy, hz] = [MALLET_REST[0], MALLET_REST[1] + HOOK_RISE, MALLET_REST[2]];
  const hook = new CatmullRomCurve3([new Vector3(X - 0.045, hy + 0.1, 0), new Vector3(X - 0.11, hy + 0.115, hz * 0.4), new Vector3(hx + 0.035, hy + 0.03, hz * 0.9), new Vector3(hx, hy - 0.004, hz), new Vector3(hx - 0.026, hy + 0.012, hz), new Vector3(hx - 0.03, hy + 0.045, hz)]);
  parts.push(tag(taperTube(hook, 22, 0.011, 0.004, 7), MAT.prada));
  parts.push(tag(put(new SphereGeometry(0.018, 10, 8), { at: [X - 0.05, hy + 0.1, 0], scale: [0.7, 1, 1] }), MAT.prada));
  // palang lurus berbevel + lis emas di bawahnya
  const bar = new Shape();
  bar.moveTo(-GONG.barHalf, -0.058);
  bar.lineTo(GONG.barHalf, -0.058);
  bar.lineTo(GONG.barHalf, 0.058);
  bar.lineTo(-GONG.barHalf, 0.058);
  bar.closePath();
  const barGeo = new ExtrudeGeometry(bar, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  parts.push(tag(put(barGeo.translate(0, 0, -0.055), { at: [0, BY, 0] }), MAT.lakBar));
  parts.push(tag(put(new BoxGeometry(1.72, 0.022, 0.136), { at: [0, BY - 0.068, 0] }), MAT.prada));

  const geometry = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return { geometry, mouths };
}

/** Tabuh: kepala berbantal kain, gelang prada, gagang kayu. Lokal: kepala di titik asal, gagang ke arah +z. */
function malletGeometry(): BufferGeometry {
  const parts = [
    tag(put(new SphereGeometry(0.075, 22, 14), { scale: [1, 1, 0.82] }), MAT.cloth, MOVE.pad),
    tag(put(new CylinderGeometry(0.02, 0.024, 0.04, 14, 1), { at: [0, 0, 0.085], rot: [Math.PI / 2, 0, 0] }), MAT.prada),
    tag(put(new CylinderGeometry(0.013, 0.016, 0.56, 12, 1), { at: [0, 0, 0.38], rot: [Math.PI / 2, 0, 0] }), MAT.wood),
    tag(put(new SphereGeometry(0.02, 10, 8), { at: [0, 0, 0.66] }), MAT.prada),
    // jerat tali di ujung gagang: yang dikaitkan ke cantolan
    tag(put(new TorusGeometry(LOOP_R, 0.0035, 5, 14), { at: [0, 0, MALLET_LEN - LOOP_R], rot: [0, Math.PI / 2, 0], scale: [1, 0.62, 1] }), MAT.rope),
  ];
  const geometry = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return geometry;
}

export function createGong(shared: Shared) {
  const group = new Group();
  group.scale.setScalar(GONG_SCALE);
  group.updateMatrix();
  group.matrixAutoUpdate = false;

  const uSwing = { value: new Vector3(0, 0, GONG.pivot) };
  const uEmber = { value: new Vector4(0, 0, 0, 0) };
  const uPulse = { value: new Vector4(0, 0, 0, 1) };

  // 52 titik muka × 88 juring: tepi lingkaran menyimpang < 0,6 mm dari bulat sempurna, di bawah satu piksel pada shot terdekat
  const section = gongSection(52);
  const bodyGeo = latheZ(section.points, section.normals, 88).translate(0, GONG.y, 0);
  const bodyMat = new ShaderMaterial({ uniforms: { ...shared, uSwing, uEmber }, vertexShader: BODY_VERT, fragmentShader: BODY_FRAG });
  const body = new Mesh(bodyGeo, bodyMat);

  const frame = frameGeometry();
  const frameMat = new ShaderMaterial({ uniforms: { ...shared, uSwing, uPulse }, vertexShader: FRAME_VERT, fragmentShader: FRAME_FRAG });
  const gayor = new Mesh(frame.geometry, frameMat);

  const malletGeo = malletGeometry();
  const mallet = new Mesh(malletGeo, frameMat);

  for (const m of [body, gayor, mallet]) {
    m.matrixAutoUpdate = false;
    group.add(m);
  }

  const [head, hand, up] = [new Vector3(), new Vector3(), new Vector3(0, 1, 0)];
  /** Jam (detik panggung) saat tabuh mulai diayun; hantamannya `STRIKE.impact` detik kemudian. */
  const struckAt = -1e9;

  return {
    group,
    /** Mulut kedua naga (satuan model): sumber napas api. */
    mouths: frame.mouths,
    /** Tiap frame: denyut jantung, ayunan, dan sikap tabuh pada jam `t` (detik). */
    update(t: number) {
      const p = t - struckAt;
      const st = -1; // belum ada pukulan: disambungkan di langkah berikutnya
      const beat = heartbeat(t);
      uSwing.value.set(gongSwing(st), gongHum(st), GONG.pivot);
      uEmber.value.set(beat, strikeHeat(st), Math.max(0, st), 0);
      const pose = malletPose(p, t);
      uPulse.value.set(beat, strikeFlare(st), 0, pose.squash);
      head.set(...pose.head);
      hand.set(...pose.hand);
      // sumbu +z tabuh mengarah ke tangan
      mallet.matrix.lookAt(hand, head, up).setPosition(head);
      mallet.matrixWorldNeedsUpdate = true;
    },
    dispose() {
      bodyGeo.dispose();
      bodyMat.dispose();
      frame.geometry.dispose();
      frameMat.dispose();
      malletGeo.dispose();
    },
  };
}
