/**
 * Gunungan (kayon) di depan kamera: lembaran kulit bertatah bermuka dua dan tabir/kelir di belakangnya.
 * Untuk pembuka dan penutup film (keputusan host 13 Nov: "pembuka dan penutupan saja, sapuanya pakai yang lama");
 * sapuan antar bab tetap bayangan kayon DOM. Gerak `sweepPose` sekarang hanya dipakai pratinjau (`sweepAt`);
 * pembuka dan penutup memakai `gatePose` (engine/stage/gate.ts): gunungan tertancap di gedebog di depan kelir.
 *
 * Gambarnya dipanggang (`scripts/assets/bake-gunungan.cjs`), jadi di sini tidak ada kode melukis. Yang dibuat
 * 3D oleh shader, semuanya dalam satu draw call lembaran + satu draw call tabir, dan nol saat tidak dipakai:
 * - lubang tatahan sungguh tembus (tabir dan pendar blencong terlihat di baliknya) dan berdinding setebal kulit;
 * - relief: tepi lubang melandai, prada timbul, garis tinta beralur (dari peta tinggi di tekstur aux);
 * - prada mengilap mengikuti lampu dalang, yang bergeser mengikuti kursor;
 * - kulit tembus cahaya: pendar blencong dari balik lembaran;
 * - kulit melentur saat disapukan (pucuk tertinggal), tangkai tanduk di bawahnya;
 * - muka Murka: pupil bara di lubang mata barong, dan api geni (`rage`): kulit hangus berkobar di bawah garis bakar,
 *   lidah api hidup dan percikan bara di atasnya sampai keluar dari tepi lembaran; tokoh-tokohnya tidak terbakar.
 *
 * - kelir (pembuka/penutup, `KayonPose.kelir`): kain berlampu blencong dengan kolam cahaya yang mengikuti kursor,
 *   anyaman halus, palemahan dan plisir, gedebog tempat tangkai tertancap, dan **bayangan gunungan** yang jatuh di
 *   kain dari muka mana pun (tatahan tembus cahaya, tepi lembut), bergeser berlawanan arah lampu. Satu draw call
 *   yang sama dengan tabir.
 *
 * Lembaran dan tabir diletakkan langsung di ruang kamera (letak di layar dalam NDC), jadi tidak bergantung
 * pada shot kamera dan tetap sama saat kamera dipotong di tengah sapuan.
 */
import { CustomBlending, DoubleSide, type IUniform, LinearFilter, LinearMipmapLinearFilter, Mesh, NoColorSpace, OneFactor, OneMinusSrcAlphaFactor, type PerspectiveCamera, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Texture, Vector2, Vector3, Vector4, type WebGLRenderer } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GATE, type KayonPose } from "@/engine/stage/gate";
import { GENI, KAYON, type SweepPose, VEIL } from "@/engine/stage/gunungan";
import { kayonFiles, takeKayon } from "@/engine/stage/kayon-files";
import { ATAN2S, type Shared } from "./shared";

const f = (x: number) => x.toFixed(4);
/** Jarak lembaran dari kamera (m). Hanya menentukan kuat perspektif saat lembaran berpaling. */
const DIST = 2;

const SHEET_VERT = /* glsl */ `
uniform vec4 uPose;   // x, y (NDC), tinggi ÷ tinggi layar, lentur
uniform vec2 uTurn;   // putar (yaw), miring (roll)
uniform vec2 uLens;   // tan(fov/2), aspek
varying vec2 vUv;
varying vec3 vView;
varying vec3 vT;
varying vec3 vB;
varying vec3 vN;
vec3 turn(vec3 p) {
  float cy = cos(uTurn.x), sy = sin(uTurn.x);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float cr = cos(uTurn.y), sr = sin(uTurn.y);
  return vec3(p.x * cr - p.y * sr, p.x * sr + p.y * cr, p.z);
}
void main() {
  vUv = uv;
  float hh = ${f(DIST)} * uLens.x;
  float H = uPose.z * 2.0 * hh;
  vec3 p = vec3(position.xy, 0.0);
  // kulit melentur: di atas garis dasar, pucuk tertinggal dari arah gerak dan sedikit melengkung ke belakang
  float up = max(position.y - ${f(KAYON.base)}, 0.0);
  float flex = uPose.w * up * up;
  p.x -= flex * 0.15;
  p.z -= abs(flex) * 0.09;
  // poros dalang di garis dasar
  p.y -= ${f(KAYON.base)};
  p = turn(p);
  p.y += ${f(KAYON.base)} - 0.5;
  vView = vec3(uPose.x * hh * uLens.y, uPose.y * hh, -${f(DIST)}) + p * H;
  // lentur ikut memiringkan permukaan: kilap prada bergeser dari pangkal ke pucuk
  vT = turn(normalize(vec3(1.0, 0.0, 0.0)));
  vB = turn(normalize(vec3(-flex * 0.3 / max(up, 0.05), 1.0, 0.0)));
  vN = turn(normalize(vec3(flex * 0.3, 0.0, 1.0)));
  gl_Position = projectionMatrix * vec4(vView, 1.0);
}`;

const SHEET_FRAG = /* glsl */ `
uniform sampler2D tAgung;
uniform sampler2D tAgungAux;
uniform sampler2D tMurka;
uniform sampler2D tMurkaAux;
uniform sampler2D tGeni;
uniform float uTime;
uniform vec3 uLamp;    // lampu dalang di ruang kamera
uniform vec4 uLight;   // pendar dari balik, denyut jantung, kadar geni, kepekatan
uniform vec2 uLook;    // arah lirikan pupil kala
uniform vec2 uCut;     // garis atas gedebog (NDC y; −2 = tanpa gedebog), tinggi target gambar (px)
varying vec2 vUv;
varying vec3 vView;
varying vec3 vT;
varying vec3 vB;
varying vec3 vN;

float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
/* Tepi lubang tetap tajam di ukuran layar berapa pun. */
float crisp(float a) { return clamp((a - 0.5) / max(fwidth(a), 0.02) + 0.5, 0.0, 1.0); }

void main() {
  bool back = !gl_FrontFacing;
  float side = back ? -1.0 : 1.0;
  vec3 V = normalize(-vView);
  // muka belakang: gambar tidak boleh terbalik, jadi u dan tangennya dibalik
  vec3 T = normalize(vT) * side;
  vec3 B = normalize(vB);
  vec3 N = normalize(vN) * side;
  vec2 uv = vec2(back ? 1.0 - vUv.x : vUv.x, vUv.y);

  // tangkai tanduk di bawah lembaran: batang gelap berkilap dengan lilitan benang emas
  if (vUv.y < 0.0) {
    // tertancap di gedebog: bagian tangkai di bawah garis atasnya tidak terlihat
    if (gl_FragCoord.y / uCut.y * 2.0 - 1.0 < uCut.x) discard;
    float across = (vUv.x - 0.5) / 0.0143;
    float round = sqrt(max(1.0 - across * across, 0.0));
    float band = smoothstep(0.42, 0.5, abs(fract(vUv.y * 46.0) - 0.5)) * step(-0.09, vUv.y);
    vec3 horn = mix(vec3(0.05, 0.03, 0.02), vec3(0.75, 0.52, 0.2), band);
    vec3 rod = horn * (0.25 + 1.6 * round * round) + vec3(1.0, 0.8, 0.5) * pow(round, 12.0) * 0.5;
    rod += vec3(1.0, 0.5, 0.2) * uLight.x * 0.12 * (1.0 - round);
    float edge = (1.0 - smoothstep(0.8, 1.0, abs(across))) * uLight.w;
    gl_FragColor = vec4(rod * edge, edge);
    return;
  }

  // tekstur disimpan dengan baris atas lebih dulu
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  vec2 dx = dFdx(st), dy = dFdy(st);
  // kedalaman kulit: titik yang terlihat di sisi jauh lubang (dinding lubang)
  vec3 vt = vec3(dot(V, T), dot(V, B), max(dot(V, N), 0.2));
  vec2 deep = st + vec2(-vt.x / ${f(KAYON.aspect)}, vt.y) * (${f(KAYON.thick)} / vt.z);
  vec4 c;
  vec3 aux;
  float far;
  if (back) {
    c = textureGrad(tMurka, st, dx, dy);
    aux = textureGrad(tMurkaAux, st, dx, dy).rgb;
    far = textureGrad(tMurka, deep, dx, dy).a;
  } else {
    c = textureGrad(tAgung, st, dx, dy);
    aux = textureGrad(tAgungAux, st, dx, dy).rgb;
    far = textureGrad(tAgung, deep, dx, dy).a;
  }
  float skin = crisp(c.a);
  float wall = crisp(far) * (1.0 - skin);
  float cover = max(skin, wall);

  float glowBack = uLight.x;
  // tokoh-tokoh muka Murka (barong, kala, dua garuda) tidak terbakar api geni: 0 di dalam elipsnya, 1 di luar
  float spare = 1.0;
${KAYON.spare.map(([u, v, ru, rv]) => `  spare *= smoothstep(0.75, 1.05, length((uv - vec2(${f(u)}, ${f(v)})) / vec2(${f(ru)}, ${f(rv)})));`).join("\n")}
  float beat = uLight.y;
  float rage = back ? uLight.z : 0.0;
  vec3 warm = vec3(1.0, 0.52, 0.2);
  vec3 col = vec3(0.0);

  if (cover > 0.003) {
    float metal = aux.r;
    // relief dari peta tinggi: normal dimiringkan menurut kemiringan tinggi di layar
    vec3 dpx = dFdx(vView), dpy = dFdy(vView);
    float hx = dFdx(aux.b), hy = dFdy(aux.b);
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
    float det = dot(dpx, r1);
    // relief: vektor nol (turunan merosot) tidak boleh menjadi NaN, yang di iPhone disebar bloom jadi segi delapan hitam
    vec3 nr = abs(det) * N - 0.011 * sign(det) * (hx * r1 + hy * r2);
    vec3 n = dot(nr, nr) > 1e-30 ? normalize(nr) : N;

    vec3 L = normalize(uLamp - vView);
    float ndl = dot(n, L);
    vec3 lamp = vec3(1.0, 0.78, 0.54) * 1.55;
    vec3 base = c.rgb;
    // sungging: cahaya lampu membungkus sedikit, supaya sisi yang berpaling tidak hitam
    vec3 lit = base * (lamp * clamp(ndl * 0.72 + 0.28, 0.0, 1.0) * (1.0 - 0.7 * metal) + vec3(0.05, 0.045, 0.065));
    // prada: kilap sempit + kilap lebar + pantulan ruang yang hangat
    vec3 Hh = normalize(L + V + vec3(0.0, 0.0, 1e-6));
    float nh = max(dot(n, Hh), 0.0);
    float gate = smoothstep(-0.05, 0.15, ndl);
    vec3 gold = base * 1.7 + 0.06;
    lit += (pow(nh, 56.0) * 1.5 + pow(nh, 10.0) * 0.3) * lamp * mix(vec3(0.035), gold, metal) * gate;
    vec3 R = reflect(-V, n);
    float sky = 0.5 + 0.5 * R.y;
    lit += metal * gold * mix(vec3(0.05, 0.02, 0.01), vec3(0.85, 0.55, 0.26), sky * sky) * 0.3;
    // kulit tembus cahaya: pendar blencong dari balik, paling kuat di kulit tipis tanpa prada
    lit += base * warm * glowBack * 0.26 * (1.0 - 0.8 * metal);
    // bagian yang menyala (permata, mata satwa, lidah kala) ikut denyut
    lit += base * aux.g * (1.4 + 2.6 * beat);

    // dinding lubang: tepi kulit mentah, tersorot cahaya dari balik
    vec3 rim = vec3(0.2, 0.11, 0.05) * (0.25 + warm * glowBack * 1.3);
    col = mix(lit, rim, wall / max(cover, 1e-3));

    // api geni di kulit: di bawah garis bakar kulit hangus dengan retakan bara, dan kobaran geni bergoyang di atasnya
    if (rage > 0.001) {
      float n1 = vnoise(vec2(uv.x * 7.0, uv.y * 4.0 - uTime * 1.5));
      float n2 = vnoise(vec2(uv.x * 15.0 + 3.0, uv.y * 9.0 - uTime * 2.6));
      vec2 fu = st + vec2((n1 - 0.5) * 0.05 + (n2 - 0.5) * 0.02, (n2 - 0.5) * 0.024) * smoothstep(0.05, 0.5, uv.y);
      vec3 fire = texture2D(tGeni, fu).rgb;
      float front = rage * ${f(GENI.reach)} - uv.y + (n1 - 0.5) * 0.3;
      float burn = smoothstep(0.0, 0.16, front) * spare;
      float flick = 0.85 + 0.35 * n2 + 0.3 * beat;
      float crack = pow(clamp(1.0 - abs(vnoise(st * vec2(26.0, 38.0) + vec2(0.0, uTime * 0.25)) * 2.0 - 1.0), 0.0, 1.0), 10.0);
      vec3 ablaze = lit * 0.08 + vec3(1.0, 0.3, 0.04) * crack * (0.9 + 0.6 * beat);
      ablaze += fire * fire * (0.95 + 0.25 * fire.g) * flick;
      // tepi bakar: garis bara terang di batas api
      ablaze += vec3(1.0, 0.45, 0.1) * smoothstep(0.0, 0.05, front) * (1.0 - smoothstep(0.05, 0.16, front)) * 1.4;
      col = mix(col, ablaze, burn * skin);
      // wajah disorot kobaran dari bawah
      col += base * vec3(1.0, 0.42, 0.12) * rage * 1.1 * (1.0 - spare) * skin * clamp((0.66 - uv.y) / 0.5, 0.0, 1.0);
    }
  }

  // api geni di atas garis bakar: lidah api hidup yang menjilat ke atas (juga di lubang tatahan dan di luar tepi
  // lembaran) dan percikan bara yang naik. Hanya di kolom yang punya kulit terbakar di bawahnya, dan tidak di wajah.
  vec3 flame = vec3(0.0);
  float flameA = 0.0;
  if (back && uLight.z > 0.001) {
    float fy = uLight.z * ${f(GENI.reach)} + (vnoise(vec2(uv.x * 7.0, uTime * 0.6)) - 0.5) * 0.12;
    float above = uv.y - fy;
    float H = ${f(GENI.flame)} * (0.55 + 0.45 * uLight.z / ${f(GENI.peak)});
    float fuel = smoothstep(0.4, 0.85, texture2D(tMurka, vec2(st.x, 1.0 - clamp(fy, 0.0, 1.0)), 4.0).a);
    // lidah api per kolom: noise memanjang tegak menentukan tinggi tiap lidah (pendek sampai menjulang), panas
    // terbesar di kaki; memudar sebelum tepi bidang lembaran supaya tidak terpotong lurus
    // (warna di ruang linear: keluaran panggung dikodekan sRGB, jadi kuning linear yang terlalu tinggi memucat jadi krem)
    float cn = vnoise(vec2(uv.x * 26.0, uv.y * 2.6 - uTime * 2.2)) * 0.7 + vnoise(vec2(uv.x * 57.0 + 3.0, uv.y * 6.0 - uTime * 4.1)) * 0.3;
    float reach = max(cn * cn * 1.9, 0.04);
    float heat = clamp(1.0 - max(above, 0.0) / H / reach, 0.0, 1.0) * smoothstep(-0.1, 0.02, above) * fuel * mix(0.15, 1.0, spare);
    heat *= smoothstep(0.0, 0.1, uv.x) * (1.0 - smoothstep(0.9, 1.0, uv.x)) * (1.0 - smoothstep(0.84, 1.0, uv.y));
    vec3 fc = mix(vec3(0.25, 0.015, 0.0), vec3(1.0, 0.16, 0.01), smoothstep(0.0, 0.45, heat));
    fc = mix(fc, vec3(1.0, 0.5, 0.08), smoothstep(0.6, 1.0, heat));
    flameA = smoothstep(0.04, 0.32, heat) * 0.94;
    flame = fc * flameA * (1.0 + 0.2 * beat);
    vec2 q = vec2(uv.x * 34.0 + sin(uv.y * 9.0 + uTime) * 0.6, uv.y * 24.0 - uTime * 2.4);
    vec2 id = floor(q), fq = fract(q) - 0.5, off = vec2(hash21(id + 7.1), hash21(id + 3.3)) - 0.5;
    float spark = step(0.88, hash21(id)) * (1.0 - smoothstep(0.03, 0.11, length((fq - off * 0.6) * vec2(1.0, 0.6))));
    spark *= smoothstep(-0.1, 0.0, above) * (1.0 - smoothstep(0.0, H * 2.2, above)) * mix(0.3, 1.0, fuel) * spare;
    flame = mix(flame, vec3(1.0, 0.55, 0.14) * 1.3, spark);
    flameA = max(flameA, spark);
  }

  // pupil barong (muka Murka): bara dengan celah hitam, mengambang di lubang mata dan melirik mengikuti kursor
  if (back) {
    for (int i = 0; i < 2; i++) {
      vec2 e = (i == 0 ? vec2(${f(KAYON.eyes[0]![0])}, ${f(KAYON.eyes[0]![1])}) : vec2(${f(KAYON.eyes[1]![0])}, ${f(KAYON.eyes[1]![1])})) + uLook * vec2(0.007, 0.005);
      vec2 d = (uv - e) * vec2(${f(KAYON.aspect)}, 1.0);
      float disc = 1.0 - smoothstep(0.0062, 0.0078, length(d));
      float slit = 1.0 - smoothstep(0.8, 1.15, length(d / vec2(0.0019, 0.0074)));
      float pupil = disc * (1.0 - skin);
      vec3 ember = mix(vec3(1.0, 0.28, 0.05) * (3.5 + 3.5 * beat + 4.0 * rage), vec3(0.01, 0.003, 0.002), slit);
      col = mix(col, ember, pupil);
      cover = max(cover, pupil);
    }
  }

  // api menutupi kulit di belakangnya (bukan ditambahkan: tidak memutih); di lubang dan di luar tepi lembaran api
  // itu sendiri yang menutupi tabir
  col = col * cover * (1.0 - flameA) + flame;
  float alpha = (flameA + cover * (1.0 - flameA)) * uLight.w;
  gl_FragColor = vec4(col * uLight.w, alpha);
}`;

const VEIL_VERT = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const VEIL_FRAG = /* glsl */ `
uniform float uTime;
uniform vec4 uVeil;   // pusat tabir (NDC x), kepekatan, pendar, aspek
uniform vec3 uSpot;   // pusat pendar (NDC x, y), tinggi lembaran ÷ tinggi layar
uniform vec4 uKelir;  // kadar kelir (0 = tabir gelap), geser kain x, y (ikut tabir + parallax), garis atas gedebog
uniform vec4 uShade;  // pusat bayangan (NDC), setengah tinggi bayangan, lebar (cos putaran; < 0 = muka Murka)
uniform vec2 uShadeRoll; // miring bayangan (rad), kepekatan
uniform sampler2D tAgung;
uniform sampler2D tMurka;
varying vec2 vNdc;
${ATAN2S}
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

/* Bayangan gunungan di kain (0–1): siluet lembaran dari muka yang menghadap penonton, tatahannya tembus cahaya,
   tepinya lembut (mip kasar). Tangkainya ikut berbayang sampai gedebog. */
float shade(vec2 q) {
  vec2 s = (q - uShade.xy) * vec2(uVeil.w, 1.0);
  float cr = cos(uShadeRoll.x), sr = sin(uShadeRoll.x);
  s = vec2(s.x * cr + s.y * sr, -s.x * sr + s.y * cr);
  float w = max(abs(uShade.w), 0.03);
  float h = max(uShade.z, 0.05);
  vec2 uv = vec2(0.5 + s.x / (2.0 * h * ${f(KAYON.aspect)} * w), 0.5 + s.y / (2.0 * h));
  float rod = (1.0 - smoothstep(0.006, 0.014, abs(s.x))) * step(-0.92, uv.y) * step(uv.y, 0.0);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return rod;
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  float a = uShade.w < 0.0 ? texture2D(tMurka, st, 2.5).a : texture2D(tAgung, st, 2.5).a;
  return max(smoothstep(0.15, 0.85, a), rod);
}

/* Kelir: kain tipis yang disinari blencong dari depan. Kolam cahaya di sekitar lampu, anyaman halus, plisir di atas,
   palemahan gelap di bawah, gedebog di kaki, dan bayangan gunungan. */
vec3 kelir(vec2 q) {
  vec2 k = q - uKelir.yz;
  vec2 d = (q - uSpot.xy) * vec2(uVeil.w, 1.0);
  float r2 = dot(d, d);
  float flick = 0.93 + 0.045 * sin(uTime * 9.1) + 0.025 * sin(uTime * 23.7 + 1.3);
  // malam: terang hangat di sekitar blencong, meredup ke cokelat gelap di tepi layar
  float pool = (0.5 * exp(-r2 * 1.4) + 0.14 * exp(-r2 * 0.3) + 0.012) * flick;
  // anyaman kain: benang mendatar dan tegak yang sangat halus, dan belang tenun yang lebar
  vec2 wv = k * vec2(uVeil.w, 1.0) * 260.0;
  float weave = 0.93 + 0.035 * sin(wv.x) * sin(wv.y * 1.07) + 0.05 * (vnoise(k * vec2(uVeil.w, 1.0) * vec2(3.0, 40.0)) - 0.5);
  vec3 cloth = vec3(1.0, 0.66, 0.35) * pool * weave;
  // bayangan: makin gelap di tengah kolam cahaya (kontras), tatahan tembus tetap bercahaya
  float sh = shade(q) * uShadeRoll.y;
  cloth *= 1.0 - sh * (0.9 - 0.15 * (1.0 - smoothstep(0.2, 1.4, r2)));
  // pendar lampu menembus kain di sekitar bayangan tepi: sedikit merah jingga
  cloth += vec3(0.05, 0.018, 0.004) * pool * (1.0 - sh);
  float cut = uKelir.w;
  // plisir (tepi atas): pita merah tua dengan garis prada
  float top = 0.93 + uKelir.z;
  float band = smoothstep(top - 0.004, top + 0.004, q.y);
  vec3 plisir = vec3(0.16, 0.025, 0.02) * (0.4 + pool) + vec3(0.6, 0.42, 0.16) * pool * (1.0 - smoothstep(0.0, 0.006, abs(q.y - top - 0.012)));
  cloth = mix(cloth, plisir, band);
  // palemahan: pita gelap di kaki kelir, di atas gedebog
  float low = cut + ${f(GATE.ground)};
  float pal = 1.0 - smoothstep(low - 0.006, low + 0.006, q.y);
  vec3 palem = vec3(0.07, 0.014, 0.012) * (0.5 + pool) + vec3(0.55, 0.38, 0.14) * pool * (1.0 - smoothstep(0.0, 0.005, abs(q.y - low)));
  cloth = mix(cloth, palem * (1.0 - 0.6 * sh), pal);
  // gedebog: batang pisang rebah, tersinari dari atas, berserat memanjang dengan ruas-ruas
  float t = (cut - q.y) / ${f(GATE.log)};
  if (t > 0.0) {
    float n = clamp(t * 2.0 - 1.0, -1.0, 1.0);
    float round = sqrt(max(1.0 - n * n, 0.0));
    float fiber = 0.86 + 0.14 * sin(q.y * 1400.0 + vnoise(vec2(k.x * 40.0, q.y * 90.0)) * 3.0);
    float joint = 1.0 - 0.35 * smoothstep(0.9, 1.0, abs(sin(k.x * uVeil.w * 2.3 + 0.4)));
    vec3 trunk = vec3(0.36, 0.34, 0.2) * (0.18 + 0.95 * round * (1.0 - smoothstep(-0.6, 1.0, n))) * fiber * joint;
    trunk *= 0.35 + 0.9 * pool;
    vec3 ground = vec3(0.012, 0.009, 0.008);
    cloth = t < 1.0 ? trunk : ground;
  }
  return cloth;
}

void main() {
  float band = (1.0 - smoothstep(${f(VEIL.core)}, ${f(VEIL.core + VEIL.soft)}, abs(vNdc.x - uVeil.x))) * uVeil.y;
  // blencong di balik gunungan: inti terang, pendar lebar, dan berkas cahaya yang memancar pelan
  vec2 d = (vNdc - uSpot.xy) * vec2(uVeil.w, 1.0) / max(uSpot.z, 0.2);
  float r = length(d);
  float flick = 0.92 + 0.05 * sin(uTime * 9.1) + 0.03 * sin(uTime * 23.7 + 1.3);
  vec3 lamp = vec3(1.0, 0.55, 0.22);
  vec3 col;
  if (uKelir.x > 0.001) {
    col = kelir(vNdc);
  } else {
    vec3 glow = lamp * (1.15 * exp(-r * r * 7.0) + 0.34 * exp(-r * r * 1.1) + 0.05 * exp(-r * 0.9));
    // tepat di pusat lampu d = (0, 0): atan biasa tidak terdefinisi di sana (segi delapan hitam di blencong balik kelir)
    float ang = atan2s(d.y, d.x);
    float rays = pow(0.5 + 0.5 * sin(ang * 11.0 + sin(ang * 5.0 + uTime * 0.23) * 1.6 + uTime * 0.11), 3.0);
    rays *= 0.5 + 0.5 * sin(ang * 23.0 - uTime * 0.17);
    glow += lamp * rays * 0.18 * exp(-r * 0.75) * smoothstep(0.1, 0.5, r);
    col = vec3(0.010, 0.007, 0.006) + glow * flick * uVeil.z;
  }
  // dither halus: gradasi pendar di kegelapan tidak bergaris
  col += (hash11(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) - 0.5) * 0.0035;
  gl_FragColor = vec4(col * band, band);
}`;

type Maps = { agung: Texture; agungAux: Texture; murka: Texture; murkaAux: Texture; geni: Texture };

/** Satu gambar dari `public/film/gunungan/` → tekstur. Didekode di luar thread utama bila browser mampu. */
async function loadTexture(name: string, srgb: boolean): Promise<Texture> {
  const blob = await takeKayon(name);
  let image: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === "function") {
    image = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" }).catch(() => createImageBitmap(blob));
  } else {
    const el = new Image();
    el.src = URL.createObjectURL(blob);
    await el.decode();
    URL.revokeObjectURL(el.src);
    image = el;
  }
  const tex = new Texture(image);
  // baris atas gambar lebih dulu di kedua jalur (ImageBitmap tidak bisa dibalik three): shader yang membalik v
  tex.flipY = false;
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export type GununganOptions = {
  gl: WebGLRenderer;
  shared: Shared;
  /** Tier tertinggi memakai gambar 2000 px; lainnya 1500 px. */
  large: boolean;
  /** Dipanggil saat semua tekstur sudah terpasang di GPU (atau gagal dimuat). */
  onReady(ok: boolean): void;
};

export function createGunungan({ gl, shared, large, onReady }: GununganOptions) {
  // lembaran: x −0,35…0,35, y 0…1; tangkai menjulur di bawahnya (v negatif = tangkai)
  const sheetGeo = new PlaneGeometry(KAYON.aspect, 1, 10, 28).translate(0, 0.5, 0);
  const rodGeo = new PlaneGeometry(0.02, 0.92, 1, 6).translate(0, -0.44, 0);
  {
    const uv = rodGeo.getAttribute("uv");
    const pos = rodGeo.getAttribute("position");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / KAYON.aspect, Math.min(pos.getY(i), -1e-4));
  }
  const geo = mergeGeometries([rodGeo, sheetGeo]);
  sheetGeo.dispose();
  rodGeo.dispose();

  const blank = new Texture();
  const uPose: IUniform<Vector4> = { value: new Vector4(0, 0, 0.9, 0) };
  const uTurn: IUniform<Vector2> = { value: new Vector2() };
  const uLens: IUniform<Vector2> = { value: new Vector2(0.3, 1.78) };
  const uLamp: IUniform<Vector3> = { value: new Vector3() };
  const uLight: IUniform<Vector4> = { value: new Vector4(0, 0, 0, 0) };
  const uLook: IUniform<Vector2> = { value: new Vector2() };
  const uCut: IUniform<Vector2> = { value: new Vector2(-2, 1) };
  const tex = { tAgung: { value: blank }, tAgungAux: { value: blank }, tMurka: { value: blank }, tMurkaAux: { value: blank }, tGeni: { value: blank } };
  const blend = { transparent: true, depthTest: false, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor, premultipliedAlpha: true } as const;
  const sheetMat = new ShaderMaterial({ uniforms: { uTime: shared.uTime, uPose, uTurn, uLens, uLamp, uLight, uLook, uCut, ...tex }, vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, side: DoubleSide, ...blend });
  const sheet = new Mesh(geo, sheetMat);

  const uVeil: IUniform<Vector4> = { value: new Vector4(0, 0, 0, 1.78) };
  const uSpot: IUniform<Vector3> = { value: new Vector3(0, 0, 0.9) };
  const uKelir: IUniform<Vector4> = { value: new Vector4() };
  const uShade: IUniform<Vector4> = { value: new Vector4(0, 0, 0.9, 1) };
  const uShadeRoll: IUniform<Vector2> = { value: new Vector2() };
  const veilGeo = new PlaneGeometry(2, 2);
  // kelir memakai gambar lembaran yang sama untuk bayangannya (uniform tekstur dipakai bersama)
  const veilMat = new ShaderMaterial({ uniforms: { uTime: shared.uTime, uVeil, uSpot, uKelir, uShade, uShadeRoll, tAgung: tex.tAgung, tMurka: tex.tMurka }, vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, ...blend });
  const veil = new Mesh(veilGeo, veilMat);

  // sesudah semua isi panggung (langit digambar di urutan 1000): tabir dulu, lalu lembaran di depannya
  veil.renderOrder = 2000;
  sheet.renderOrder = 2001;
  for (const m of [veil, sheet]) {
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    m.visible = false;
  }

  let maps: Maps | null = null;
  let dead = false;
  const [fAgung, fAgungAux, fMurka, fMurkaAux, fGeni] = kayonFiles(large) as [string, string, string, string, string];
  Promise.all([loadTexture(fAgung, true), loadTexture(fAgungAux, false), loadTexture(fMurka, true), loadTexture(fMurkaAux, false), loadTexture(fGeni, true)]).then(
    ([agung, agungAux, murka, murkaAux, geni]) => {
      const loaded = { agung, agungAux, murka, murkaAux, geni };
      if (dead) {
        Object.values(loaded).forEach((t) => t.dispose());
        return;
      }
      const cap = gl.capabilities.getMaxAnisotropy();
      for (const t of [agung, murka]) t.anisotropy = Math.min(4, cap);
      // unggah ke GPU sekarang, saat panggung tenang, bukan di frame pertama sapuan
      Object.values(loaded).forEach((t) => gl.initTexture(t));
      maps = loaded;
      tex.tAgung.value = agung;
      tex.tAgungAux.value = agungAux;
      tex.tMurka.value = murka;
      tex.tMurkaAux.value = murkaAux;
      tex.tGeni.value = geni;
      onReady(true);
    },
    () => {
      if (!dead) onReady(false);
    },
  );

  return {
    nodes: [veil, sheet] as const,
    ready: () => maps !== null,
    /**
     * Tiap frame. `pose` kosong = gunungan tidak di layar (tidak ada yang digambar). `look` = kursor (−1…1),
     * `beat` = denyut jantung panggung (0–1), `rage` = kadar geni di muka Murka (0–1), `fade` = kadar tampak (0–1,
     * gunungan pembuka memudar masuk saat teksturnya baru siap), `height` = tinggi target gambar (px).
     */
    update(pose: SweepPose | KayonPose | null, camera: PerspectiveCamera, look: { x: number; y: number }, beat: number, rage: number, fade = 1, height = 1) {
      const on = pose !== null && maps !== null && pose.veil * fade > 0.001;
      veil.visible = on;
      sheet.visible = on;
      if (!on || !pose) return;
      const lens = Math.tan((camera.fov * Math.PI) / 360);
      const hh = DIST * lens;
      uLens.value.set(lens, camera.aspect);
      const H = pose.size * 2 * hh;
      const gate = "turn" in pose ? pose : null;
      if (gate) {
        // putaran penuh (termasuk balik muka); lentur pucuk ikut berbalik arah di muka belakang
        uPose.value.set(pose.x, pose.y, pose.size, pose.bend * Math.cos(gate.turn));
        uTurn.value.set(gate.turn, pose.roll);
        // blencong di atas, di depan lembaran: menyinari tatahan, kolam cahayanya di kelir, bayangan di baliknya
        uLamp.value.set(gate.lampX * hh * camera.aspect, gate.lampY * hh, -DIST + 0.6 * H);
        uCut.value.set(gate.cut, Math.max(1, height));
        uKelir.value.set(gate.kelir, gate.kelirX, gate.kelirY, gate.cut);
        uSpot.value.set(gate.lampX, gate.lampY - 0.25, pose.size);
        // bayangan: lembaran diproyeksikan dari lampu ke kain di belakangnya, sedikit membesar dan menjauhi lampu
        const grow = 1.08;
        const away = 0.16;
        uShade.value.set(pose.x + (pose.x - gate.lampX) * away, pose.y + (pose.y - gate.lampY) * away * 0.6, pose.size * grow, Math.cos(gate.turn));
        uShadeRoll.value.set(pose.roll, 0.82);
      } else {
        // muka Murka = sisi belakang lembaran: lembaran diputar setengah lingkaran (lenturnya ikut dibalik)
        const murka = pose.face === "murka";
        uPose.value.set(pose.x, pose.y, pose.size, murka ? -pose.bend : pose.bend);
        uTurn.value.set(pose.yaw + (murka ? Math.PI : 0), pose.roll);
        // lampu dalang: di depan lembaran, kiri atas, bergeser mengikuti kursor (cahayanya menyisir relief)
        uLamp.value.set((pose.x + (-0.5 + 0.9 * look.x)) * hh * Math.min(camera.aspect, 1.4), (pose.y + 0.55 - 0.5 * look.y) * hh, -DIST + 0.5 * H);
        uCut.value.set(-2, Math.max(1, height));
        uKelir.value.set(0, 0, 0, -2);
        uSpot.value.set(pose.x, pose.y + 0.04, pose.size);
      }
      uLight.value.set(pose.glow, beat, rage, pose.veil * fade);
      uLook.value.set(look.x, -look.y);
      uVeil.value.set(pose.veilX, pose.veil * fade, pose.glow, camera.aspect);
    },
    dispose() {
      dead = true;
      geo.dispose();
      veilGeo.dispose();
      sheetMat.dispose();
      veilMat.dispose();
      blank.dispose();
      if (maps) Object.values(maps).forEach((t) => t.dispose());
      maps = null;
    },
  };
}
