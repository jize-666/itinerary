/**
 * Gunungan (kayon) di depan kamera: lembaran kulit bertatah bermuka dua dan tabir gelap yang mengikutinya.
 * Dipakai untuk sapuan antar bab (pengganti bayangan kayon DOM saat panggung 3D hidup).
 *
 * Gambarnya dipanggang (`scripts/assets/bake-gunungan.cjs`), jadi di sini tidak ada kode melukis. Yang dibuat
 * 3D oleh shader, semuanya dalam satu draw call lembaran + satu draw call tabir, dan nol saat tidak dipakai:
 * - lubang tatahan sungguh tembus (tabir dan pendar blencong terlihat di baliknya) dan berdinding setebal kulit;
 * - relief: tepi lubang melandai, prada timbul, garis tinta beralur (dari peta tinggi di tekstur aux);
 * - prada mengilap mengikuti lampu dalang, yang bergeser mengikuti kursor;
 * - kulit tembus cahaya: pendar blencong dari balik lembaran;
 * - kulit melentur saat disapukan (pucuk tertinggal), tangkai tanduk di bawahnya;
 * - muka Murka: pupil bara di lubang mata barong, dan sisi geni yang menjalar dari bawah mengitari wajahnya (`rage`).
 *
 * Lembaran dan tabir diletakkan langsung di ruang kamera (letak di layar dalam NDC), jadi tidak bergantung
 * pada shot kamera dan tetap sama saat kamera dipotong di tengah sapuan.
 */
import { CustomBlending, DoubleSide, type IUniform, LinearFilter, LinearMipmapLinearFilter, Mesh, NoColorSpace, OneFactor, OneMinusSrcAlphaFactor, type PerspectiveCamera, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Texture, Vector2, Vector3, Vector4, type WebGLRenderer } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { KAYON, type SweepPose, VEIL } from "@/engine/stage/gunungan";
import type { Shared } from "./shared";

const f = (x: number) => x.toFixed(4);
/** Jarak lembaran dari kamera (m). Hanya menentukan kuat perspektif saat lembaran berpaling. */
const DIST = 2;
const ASSETS = "/film/gunungan/";

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
    float across = (vUv.x - 0.5) / 0.0143;
    float round = sqrt(max(1.0 - across * across, 0.0));
    float band = smoothstep(0.42, 0.5, abs(fract(vUv.y * 46.0) - 0.5)) * step(-0.09, vUv.y);
    vec3 horn = mix(vec3(0.05, 0.03, 0.02), vec3(0.75, 0.52, 0.2), band);
    vec3 rod = horn * (0.25 + 1.6 * round * round) + vec3(1.0, 0.8, 0.5) * pow(round, 12.0) * 0.5;
    rod += vec3(1.0, 0.5, 0.2) * uLight.x * 0.12 * (1.0 - round);
    float edge = smoothstep(1.0, 0.8, abs(across)) * uLight.w;
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
    vec3 n = normalize(abs(det) * N - 0.011 * sign(det) * (hx * r1 + hy * r2));

    vec3 L = normalize(uLamp - vView);
    float ndl = dot(n, L);
    vec3 lamp = vec3(1.0, 0.78, 0.54) * 1.55;
    vec3 base = c.rgb;
    // sungging: cahaya lampu membungkus sedikit, supaya sisi yang berpaling tidak hitam
    vec3 lit = base * (lamp * clamp(ndl * 0.72 + 0.28, 0.0, 1.0) * (1.0 - 0.7 * metal) + vec3(0.05, 0.045, 0.065));
    // prada: kilap sempit + kilap lebar + pantulan ruang yang hangat
    vec3 Hh = normalize(L + V);
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

    // sisi geni: api menjalar dari bawah menutupi muka Murka, lidahnya bergoyang
    if (rage > 0.001) {
      float n1 = vnoise(vec2(uv.x * 7.0, uv.y * 4.0 - uTime * 1.5));
      float n2 = vnoise(vec2(uv.x * 15.0 + 3.0, uv.y * 9.0 - uTime * 2.6));
      vec2 fu = st + vec2((n1 - 0.5) * 0.045 + (n2 - 0.5) * 0.018, (n2 - 0.5) * 0.02) * smoothstep(0.05, 0.5, uv.y);
      vec3 fire = texture2D(tGeni, fu).rgb;
      float front = rage * 1.35 - uv.y + (n1 - 0.5) * 0.3;
      float burn = smoothstep(0.0, 0.16, front);
      // wajah barong tidak ikut terbakar: ia tampak muncul dari tengah kobaran
      float face = length((uv - vec2(${f(KAYON.face[0])}, ${f(KAYON.face[1])})) / vec2(${f(KAYON.face[2])}, ${f(KAYON.face[3])}));
      burn *= smoothstep(0.75, 1.05, face);
      float flick = 0.8 + 0.35 * n2 + 0.25 * beat;
      vec3 ablaze = fire * (0.72 + 0.95 * fire.r * fire.r) * flick;
      // tepi bakar: garis bara terang di batas api
      ablaze += vec3(1.0, 0.45, 0.1) * smoothstep(0.0, 0.05, front) * (1.0 - smoothstep(0.05, 0.16, front)) * 1.6;
      col = mix(col, ablaze, burn * skin);
    }
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

  float alpha = cover * uLight.w;
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
varying vec2 vNdc;
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main() {
  float band = (1.0 - smoothstep(${f(VEIL.core)}, ${f(VEIL.core + VEIL.soft)}, abs(vNdc.x - uVeil.x))) * uVeil.y;
  // blencong di balik gunungan: inti terang, pendar lebar, dan berkas cahaya yang memancar pelan
  vec2 d = (vNdc - uSpot.xy) * vec2(uVeil.w, 1.0) / max(uSpot.z, 0.2);
  float r = length(d);
  float flick = 0.92 + 0.05 * sin(uTime * 9.1) + 0.03 * sin(uTime * 23.7 + 1.3);
  vec3 lamp = vec3(1.0, 0.55, 0.22);
  vec3 glow = lamp * (1.15 * exp(-r * r * 7.0) + 0.34 * exp(-r * r * 1.1) + 0.05 * exp(-r * 0.9));
  float ang = atan(d.y, d.x);
  float rays = pow(0.5 + 0.5 * sin(ang * 11.0 + sin(ang * 5.0 + uTime * 0.23) * 1.6 + uTime * 0.11), 3.0);
  rays *= 0.5 + 0.5 * sin(ang * 23.0 - uTime * 0.17);
  glow += lamp * rays * 0.18 * exp(-r * 0.75) * smoothstep(0.1, 0.5, r);
  vec3 col = vec3(0.010, 0.007, 0.006) + glow * flick * uVeil.z;
  // dither halus: gradasi pendar di kegelapan tidak bergaris
  col += (hash11(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) - 0.5) * 0.0035;
  gl_FragColor = vec4(col * band, band);
}`;

type Maps = { agung: Texture; agungAux: Texture; murka: Texture; murkaAux: Texture; geni: Texture };

/** Satu gambar dari `public/film/gunungan/` → tekstur. Didekode di luar thread utama bila browser mampu. */
async function loadTexture(name: string, srgb: boolean): Promise<Texture> {
  const res = await fetch(ASSETS + name);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  const blob = await res.blob();
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
  const tex = { tAgung: { value: blank }, tAgungAux: { value: blank }, tMurka: { value: blank }, tMurkaAux: { value: blank }, tGeni: { value: blank } };
  const blend = { transparent: true, depthTest: false, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor, premultipliedAlpha: true } as const;
  const sheetMat = new ShaderMaterial({ uniforms: { uTime: shared.uTime, uPose, uTurn, uLens, uLamp, uLight, uLook, ...tex }, vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, side: DoubleSide, ...blend });
  const sheet = new Mesh(geo, sheetMat);

  const uVeil: IUniform<Vector4> = { value: new Vector4(0, 0, 0, 1.78) };
  const uSpot: IUniform<Vector3> = { value: new Vector3(0, 0, 0.9) };
  const veilGeo = new PlaneGeometry(2, 2);
  const veilMat = new ShaderMaterial({ uniforms: { uTime: shared.uTime, uVeil, uSpot }, vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, ...blend });
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
  const size = large ? 2000 : 1500;
  Promise.all([loadTexture(`agung-${size}.webp`, true), loadTexture(`agung-aux-${size / 2}.webp`, false), loadTexture(`murka-${size}.webp`, true), loadTexture(`murka-aux-${size / 2}.webp`, false), loadTexture("geni-1000.webp", true)]).then(
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
     * `beat` = denyut jantung panggung (0–1), `rage` = kadar geni di muka Murka (0–1).
     */
    update(pose: SweepPose | null, camera: PerspectiveCamera, look: { x: number; y: number }, beat: number, rage: number) {
      const on = pose !== null && maps !== null && pose.veil > 0.001;
      veil.visible = on;
      sheet.visible = on;
      if (!on || !pose) return;
      const lens = Math.tan((camera.fov * Math.PI) / 360);
      const hh = DIST * lens;
      uLens.value.set(lens, camera.aspect);
      // muka Murka = sisi belakang lembaran: lembaran diputar setengah lingkaran (lenturnya ikut dibalik)
      const murka = pose.face === "murka";
      uPose.value.set(pose.x, pose.y, pose.size, murka ? -pose.bend : pose.bend);
      uTurn.value.set(pose.yaw + (murka ? Math.PI : 0), pose.roll);
      // lampu dalang: di depan lembaran, kiri atas, bergeser mengikuti kursor (cahayanya menyisir relief)
      const H = pose.size * 2 * hh;
      uLamp.value.set((pose.x + (-0.5 + 0.9 * look.x)) * hh * Math.min(camera.aspect, 1.4), (pose.y + 0.55 - 0.5 * look.y) * hh, -DIST + 0.5 * H);
      uLight.value.set(pose.glow, beat, rage, pose.veil);
      uLook.value.set(look.x, -look.y);
      uVeil.value.set(pose.veilX, pose.veil, pose.glow, camera.aspect);
      uSpot.value.set(pose.x, pose.y + 0.04, pose.size);
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
