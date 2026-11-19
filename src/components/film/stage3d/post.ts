/**
 * Rantai post-FX panggung: adegan digambar ke target HDR (half float, MSAA menurut tier), lalu
 *   bloom  : bagian yang lebih terang dari putih (nyala, matahari, lampu) dikecilkan bertingkat lalu
 *            dibesarkan kembali ("dual filter"); karena ambangnya di atas 1, hanya sumber cahaya yang berpijar
 *   dof    : (tier High, gallery) depth of field: gambar adegan dikaburkan di setengah/seperempat resolusi, lalu
 *            dicampur per piksel menurut jarak dari bidang fokus. Jaraknya dari pass kedalaman kecil (seperempat
 *            lebar dan tinggi) yang hanya menggambar tanah lanskap, jadi depth MSAA tetap tidak di-resolve.
 *   gabung : + bloom, eksposur, vinyet, tone mapping ACES, sRGB, dither (langit malam tidak bergaris); selama
 *            menembus gerbang dimensi di gallery (PORTAL di view.ts): cincin riak, warna terpecah di tepi, garis
 *            cahaya memanjang ke luar (zoom blur pada adegan dan bloom), kilau. Nol di luar geseran: tanpa biaya.
 * Tanpa pustaka post: beberapa shader pendek, satu segitiga selayar.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoBlending,
  type Object3D,
  OrthographicCamera,
  RGBAFormat,
  RGBFormat,
  type Scene,
  ShaderMaterial,
  UnsignedByteType,
  UnsignedInt101111Type,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { PORTAL } from "@/engine/motion/view";
import { type Grade, NEUTRAL } from "@/engine/stage/grade";
import type { TierSpec } from "@/engine/stage/tier";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/*
 * Jaring pengaman (audit host 14 Nov: segi delapan hitam di iPhone): satu piksel NaN di target HDR disebar bloom
 * menjadi segi delapan hitam. Piksel tak sah dijadikan 0 dan nilai tak hingga dibatasi sebelum dipakai; sumber
 * NaN di shader adegan sudah diperbaiki, ini hanya supaya satu piksel salah tidak pernah melebar lagi.
 */
const FINITE = /* glsl */ `
vec3 finite(vec3 c) { return any(isnan(c)) ? vec3(0.0) : min(c, vec3(256.0)); }
`;

const DOWN = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
${FINITE}
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = finite(texture2D(tSrc, vUv).rgb) * 4.0;
  c += finite(texture2D(tSrc, vUv - h).rgb) + finite(texture2D(tSrc, vUv + h).rgb);
  c += finite(texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb) + finite(texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb);
  c *= 0.125;
  if (uThreshold > 0.0) {
    // ambang lunak: hanya yang lebih terang dari putih; nilai ekstrem diredam supaya tidak berkedip
    float l = max(c.r, max(c.g, c.b));
    float knee = 0.5;
    float soft = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee);
    c *= max(soft, l - uThreshold) / max(l, 1e-4);
    c /= 1.0 + 0.05 * max(c.r, max(c.g, c.b));
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const UP = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = texture2D(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture2D(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb;
  c += texture2D(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb;
  c += (texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb) * 2.0;
  gl_FragColor = vec4(c / 12.0, 1.0);
}`;

/** Pass kedalaman: jarak dari kamera (m) ke permukaan, di kanal merah. */
const DEPTH_VERT = /* glsl */ `
varying float vDist;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const DEPTH_FRAG = /* glsl */ `
varying float vDist;
void main() { gl_FragColor = vec4(vDist, 0.0, 0.0, 1.0); }`;

/* Benda yang selalu tajam: jaraknya ditulis sama dengan jarak fokus. */
const SHARP_VERT = /* glsl */ `
void main() {
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const SHARP_FRAG = /* glsl */ `
uniform float uFocus;
void main() { gl_FragColor = vec4(uFocus, 0.0, 0.0, 1.0); }`;

/** Jarak yang dipakai untuk piksel tanpa tanah (langit): sejauh tepi lanskap. */
const FAR = 2000;

const FINAL = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tDof;
uniform sampler2D tDepth;
uniform float uDof;
uniform float uFocus;
uniform float uAperture;
uniform float uBloom;
uniform float uExposure;
uniform float uDim;
uniform float uMist;
uniform float uTime;
uniform float uWarp;
uniform float uRing;
uniform float uAspect;
uniform vec3 uSlope;
uniform vec3 uOffset;
uniform vec3 uPower;
uniform float uSat;
uniform vec3 uShadow;
uniform vec3 uHigh;
varying vec2 vUv;
${FINITE}
float sq(float x) { return x * x; }
vec3 aces(vec3 x) {
  // ACES (Narkowicz) dengan sedikit pra-eksposur, seperti ACESFilmic di three
  x *= 0.6;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

void main() {
  vec2 uv = vUv;
  float w = uWarp;
  vec2 dc = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(dc);
  if (w > 0.001) {
    // gerbang dimensi: cincin riak yang menyebar (maju) atau menyusut (mundur) dari tengah layar
    float diag = 0.5 * sqrt(dot(vec2(uAspect, 1.0), vec2(uAspect, 1.0)));
    float ring = exp(-sq((r - uRing * diag) * 14.0)) * w;
    uv += (dc / max(r, 1e-4)) / vec2(uAspect, 1.0) * ring * ${PORTAL.ripple.toFixed(4)};
  }
  vec3 c = finite(texture2D(tScene, uv).rgb);
  if (uDof > 0.0) {
    // depth of field: kabur = aperture × |1 − fokus / jarak| (sama dengan dofBlur di view.ts), dikali kadar shot
    float d = max(texture2D(tDepth, uv).r, 0.01);
    float coc = clamp(uAperture * abs(1.0 - uFocus / d), 0.0, 1.0) * uDof;
    c = mix(c, finite(texture2D(tDof, uv).rgb), coc);
  }
  vec3 b = finite(texture2D(tBloom, uv).rgb);
  if (w > 0.001) {
    // warna terpecah, makin kuat ke tepi
    vec2 off = (uv - 0.5) * ${PORTAL.chroma.toFixed(4)} * w * (1.0 + 6.0 * r);
    c.r = finite(texture2D(tScene, uv + off).rgb).r;
    c.b = finite(texture2D(tScene, uv - off).rgb).b;
    // garis cahaya: adegan dan bloom dikaburkan ke arah tengah (cahaya memanjang ke luar, seperti melesat)
    // titik cuplikan digeser acak per piksel: tingkatan salinan lebur menjadi garis halus
    vec3 acc = vec3(0.0);
    vec3 bacc = vec3(0.0);
    float jit = hash(gl_FragCoord.xy + fract(uTime * 7.0) * 113.0);
    for (int i = 1; i <= 7; i++) {
      vec2 su = 0.5 + (uv - 0.5) * (1.0 - (float(i) - jit) / 7.0 * ${PORTAL.streak.toFixed(3)} * w);
      acc += finite(texture2D(tScene, su).rgb);
      bacc += finite(texture2D(tBloom, su).rgb);
    }
    c = mix(c, acc / 7.0, 0.5 * w);
    b = mix(b, bacc / 7.0, 0.75 * w) * (1.0 + 0.9 * w);
    c *= 1.0 + ${PORTAL.flash.toFixed(3)} * w;
  }
  c += b * uBloom;
  // vinyet: tepi layar turun; teks di atas gambar menurunkan seluruh bingkai (uDim); menebal di dalam gerbang
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.86);
  float vig = 1.0 - (0.42 + 0.16 * w) * smoothstep(0.28 - 0.06 * w, 0.82, length(q));
  // tepi bawah turun: di sana ada penanda bab dan petunjuk, dan film 2,5D pun gelap di kaki layar
  vig *= 1.0 - 0.38 * (1.0 - smoothstep(0.0, 0.3, vUv.y));
  c *= uExposure * vig * (1.0 - uDim);
  c = mix(c, vec3(.28,.35,.38), uMist);
  c = aces(c);
  c = mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  // grading per fase (Tugas 8.2 + 8.3, grade.ts): CDL per kanal, saturasi di sekitar luma, lalu split toning, pada
  // nilai yang tampak di layar (sesudah encode sRGB; sebelum encode, geseran kecil di nada gelap ikut dibesarkan
  // kurva gamma). Satu sumber dengan langit, jadi ikut bergeser mengikuti gulir.
  c = pow(max(c * uSlope + uOffset, vec3(0.0)), uPower);
  float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = vec3(y) + (c - vec3(y)) * uSat;
  c += uShadow * (1.0 - smoothstep(0.0, 0.5, y)) + uHigh * smoothstep(0.5, 1.0, y);
  c = clamp(c, 0.0, 1.0);
  c += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

/** `dof`: kadar depth of field (0 = mati), jarak fokus (m), dan aperture (lihat `DOF` di view.ts). */
export type PostParams = {
  exposure: number;
  dim: number;
  mist?: number;
  time: number;
  dof?: { amount: number; focus: number; aperture: number };
  /** Gerbang dimensi di gallery: kadar 0–1 (`portalWarp`) dan jari-jari cincin riak 0–1 (`portalRing`). */
  portal?: { amount: number; ring: number };
  /** Grading warna per fase (`gradeOf` di grade.ts); tanpa ini netral. */
  grade?: Grade;
};

/**
 * Hemat bandwidth tanpa mengubah gambar (audit host 14 Nov: fps 37–48 di tier High iPhone). GPU HP (berpetak, TBDR)
 * menyimpan isi petak ke memori di akhir tiap pass kecuali diberi tahu isinya tidak dibutuhkan lagi. three hanya
 * memberi tahu itu di Oculus Browser, jadi di iPhone tiap frame:
 * - depth MSAA 4× ikut di-resolve ke tekstur yang tidak pernah dibaca → `resolveDepthBuffer: false`;
 * - depth MSAA 4× disimpan ke memori di akhir pass adegan → dibuang (`invalidateFramebuffer`) oleh benda penjaga
 *   yang digambar paling akhir di pass itu, sebelum three me-resolve warnanya.
 * Rantai bloom (cahaya yang sudah dikaburkan) memakai R11F_G11F_B10F bila bisa digambar dan disaring: separuh byte
 * dari RGBA half float, tanpa beda yang terlihat. Gambar adegan sendiri tetap RGBA half float (gradasi langit).
 */
function passEnd(gl: WebGLRenderer): Mesh {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
  geo.setDrawRange(0, 0); // tidak menggambar apa pun; hanya kaitnya yang dipakai
  const m = new Mesh(geo, new MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, colorWrite: false }));
  m.name = "pass-end";
  m.renderOrder = Number.MAX_SAFE_INTEGER;
  m.frustumCulled = false;
  m.onAfterRender = () => {
    const ctx = gl.getContext();
    if (gl.getRenderTarget() && "invalidateFramebuffer" in ctx) ctx.invalidateFramebuffer(ctx.DRAW_FRAMEBUFFER, [ctx.DEPTH_ATTACHMENT]);
  };
  return m;
}

/** R11F_G11F_B10F bisa jadi target gambar (WebGL2 + EXT_color_buffer_float), dicoba sekali pada target kecil. */
function packedBloom(gl: WebGLRenderer): boolean {
  if (!gl.extensions.has("EXT_color_buffer_float")) return false;
  const probe = new WebGLRenderTarget(4, 4, { type: UnsignedInt101111Type, format: RGBFormat, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false });
  const before = gl.getRenderTarget();
  gl.setRenderTarget(probe);
  const ctx = gl.getContext();
  const ok = ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) === ctx.FRAMEBUFFER_COMPLETE && ctx.getError() === ctx.NO_ERROR;
  gl.setRenderTarget(before);
  probe.dispose();
  return ok;
}

export class StagePost {
  private readonly tri: Mesh;
  private readonly cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly down: ShaderMaterial;
  private readonly up: ShaderMaterial;
  private readonly final: ShaderMaterial;
  private scene: WebGLRenderTarget;
  private mips: WebGLRenderTarget[] = [];
  private readonly size = new Vector2(1, 1);
  private readonly hdr: boolean;
  private readonly packed: boolean;
  private readonly end: Mesh;
  /** Depth of field (tier High): target kedalaman kecil, rantai kabur, dan benda yang digambar ke pass kedalaman. */
  private readonly copy: ShaderMaterial;
  private readonly depthMat: ShaderMaterial;
  private depth: WebGLRenderTarget | null = null;
  private dofChain: WebGLRenderTarget[] = [];
  private depthOf: Object3D | null = null;
  private sharpOf: Object3D | null = null;
  private readonly sharpMat: ShaderMaterial;
  private readonly far = new Color(FAR, 0, 0);
  private readonly keep = new Color();

  constructor(
    private readonly gl: WebGLRenderer,
    private readonly spec: TierSpec,
  ) {
    // target half float perlu ekstensi; tanpa itu jatuh ke 8-bit (bloom tetap jalan, rentangnya lebih sempit)
    this.hdr = gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
    this.packed = this.hdr && packedBloom(gl);
    this.end = passEnd(gl);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mat = (fragmentShader: string, uniforms: ShaderMaterial["uniforms"], additive = false) =>
      new ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: additive ? AdditiveBlending : NoBlending, transparent: additive });
    this.down = mat(DOWN, { tSrc: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: 0 } });
    this.up = mat(UP, { tSrc: { value: null }, uTexel: { value: new Vector2() } }, true);
    this.copy = mat(UP, { tSrc: { value: null }, uTexel: { value: new Vector2() } });
    this.depthMat = new ShaderMaterial({ vertexShader: DEPTH_VERT, fragmentShader: DEPTH_FRAG });
    this.sharpMat = new ShaderMaterial({ vertexShader: SHARP_VERT, fragmentShader: SHARP_FRAG, uniforms: { uFocus: { value: 1 } } });
    this.final = mat(FINAL, {
      tScene: { value: null },
      tBloom: { value: null },
      tDof: { value: null },
      tDepth: { value: null },
      uDof: { value: 0 },
      uFocus: { value: 1 },
      uAperture: { value: 0 },
      uBloom: { value: 0 },
      uExposure: { value: 1 },
      uDim: { value: 0 },
      uMist: { value: 0 },
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uRing: { value: 0 },
      uAspect: { value: 1 },
      uSlope: { value: new Vector3(1, 1, 1) },
      uOffset: { value: new Vector3() },
      uPower: { value: new Vector3(1, 1, 1) },
      uSat: { value: 1 },
      uShadow: { value: new Vector3() },
      uHigh: { value: new Vector3() },
    });
    this.tri = new Mesh(geo, this.down);
    this.tri.frustumCulled = false;
    this.scene = this.target(1, 1, true);
  }

  private target(w: number, h: number, main = false): WebGLRenderTarget {
    const packed = !main && this.packed;
    return new WebGLRenderTarget(w, h, {
      type: packed ? UnsignedInt101111Type : this.hdr ? HalfFloatType : UnsignedByteType,
      format: packed ? RGBFormat : RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: main,
      stencilBuffer: false,
      samples: main ? this.spec.msaa : 0,
      resolveDepthBuffer: false,
      resolveStencilBuffer: false,
      generateMipmaps: false,
    });
  }

  /** Benda yang menentukan kedalaman depth of field (tanah lanskap). Tanpa ini depth of field tidak digambar. */
  setDepthSource(obj: Object3D | null) {
    this.depthOf = obj;
  }

  /**
   * Benda yang selalu tajam di depth of field (Clawd): di pass kedalaman digambar dengan jarak = jarak fokus, jadi
   * lingkar kaburnya nol, berapa pun jaraknya dari kamera.
   */
  setSharp(obj: Object3D | null) {
    this.sharpOf = obj;
  }

  /** Depth of field digambar pada frame terakhir (dibaca statistik panggung dan e2e). */
  dofDrawn = false;

  /** Format rantai bloom (dibaca statistik panggung dan e2e). */
  get format(): string {
    return this.packed ? "r11g11b10" : this.hdr ? "rgba16f" : "rgba8";
  }

  /** Ukuran kanvas dalam piksel perangkat. */
  setSize(w: number, h: number) {
    if (this.size.x === w && this.size.y === h) return;
    this.size.set(w, h);
    this.scene.setSize(w, h);
    for (const m of this.mips) m.dispose();
    this.mips = [];
    let [mw, mh] = [w, h];
    for (let i = 0; i < this.spec.bloom; i++) {
      mw = Math.max(2, Math.round(mw / 2));
      mh = Math.max(2, Math.round(mh / 2));
      this.mips.push(this.target(mw, mh));
    }
    this.depth?.dispose();
    for (const m of this.dofChain) m.dispose();
    this.depth = null;
    this.dofChain = [];
    if (this.spec.dof) {
      // kedalaman di seperempat lebar dan tinggi (1/16 piksel), half float tanpa MSAA; kabur di 1/2 → 1/4 → 1/2
      const [qw, qh] = [Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(h / 4))];
      this.depth = new WebGLRenderTarget(qw, qh, { type: this.hdr ? HalfFloatType : UnsignedByteType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true, stencilBuffer: false, generateMipmaps: false });
      const [hw, hh] = [Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2))];
      this.dofChain = [this.target(hw, hh), this.target(qw, qh), this.target(hw, hh)];
    }
  }

  /** Pass kedalaman: hanya `depthOf`, dengan bahan jarak; piksel tanpa tanah = FAR. */
  private renderDepth(camera: Camera, focus: number) {
    const gl = this.gl;
    const obj = this.depthOf as Mesh;
    const before = obj.material;
    gl.getClearColor(this.keep);
    const alpha = gl.getClearAlpha();
    gl.setClearColor(this.far, 1);
    obj.material = this.depthMat;
    gl.setRenderTarget(this.depth);
    gl.clear(true, true, false);
    gl.render(obj, camera);
    obj.material = before;
    const sharp = this.sharpOf;
    if (sharp?.visible) {
      this.sharpMat.uniforms.uFocus!.value = focus;
      const swapped: [Mesh, Mesh["material"]][] = [];
      sharp.traverseVisible((o) => {
        if ((o as Mesh).isMesh) {
          const m = o as Mesh;
          swapped.push([m, m.material]);
          m.material = this.sharpMat;
        }
      });
      gl.render(sharp, camera);
      for (const [m, mat] of swapped) m.material = mat;
    }
    gl.setClearColor(this.keep, alpha);
  }

  /** Gambar adegan dikaburkan: turun ke 1/2 dan 1/4 (dual filter), lalu naik lagi ke 1/2. */
  private blurScene() {
    const [half, quarter, back] = this.dofChain as [WebGLRenderTarget, WebGLRenderTarget, WebGLRenderTarget];
    this.down.uniforms.uThreshold!.value = 0;
    this.down.uniforms.tSrc!.value = this.scene.texture;
    (this.down.uniforms.uTexel!.value as Vector2).set(1 / this.scene.width, 1 / this.scene.height);
    this.pass(this.down, half);
    this.down.uniforms.tSrc!.value = half.texture;
    (this.down.uniforms.uTexel!.value as Vector2).set(1 / half.width, 1 / half.height);
    this.pass(this.down, quarter);
    this.copy.uniforms.tSrc!.value = quarter.texture;
    (this.copy.uniforms.uTexel!.value as Vector2).set(1 / quarter.width, 1 / quarter.height);
    this.pass(this.copy, back);
  }

  private pass(material: ShaderMaterial, to: WebGLRenderTarget | null) {
    this.tri.material = material;
    this.gl.setRenderTarget(to);
    this.gl.render(this.tri, this.cam);
  }

  render(scene: Scene, camera: Camera, p: PostParams) {
    const gl = this.gl;
    const auto = gl.autoClear;
    const dof = p.dof && p.dof.amount > 0.002 && this.depth && this.depthOf ? p.dof : null;
    gl.autoClear = true;
    gl.setRenderTarget(this.scene);
    if (this.end.parent !== scene) scene.add(this.end);
    gl.render(scene, camera);

    gl.autoClear = false;
    if (dof) {
      this.renderDepth(camera, dof.focus);
      this.blurScene();
    }
    this.dofDrawn = dof !== null;
    const mips = this.mips;
    if (mips.length) {
      let src = this.scene;
      for (let i = 0; i < mips.length; i++) {
        this.down.uniforms.tSrc!.value = src.texture;
        (this.down.uniforms.uTexel!.value as Vector2).set(1 / src.width, 1 / src.height);
        this.down.uniforms.uThreshold!.value = i === 0 ? (this.hdr ? 1.05 : 0.86) : 0;
        this.pass(this.down, mips[i]!);
        src = mips[i]!;
      }
      // naik kembali: tiap tingkat ditambahkan ke tingkat di atasnya
      for (let i = mips.length - 1; i > 0; i--) {
        this.up.uniforms.tSrc!.value = mips[i]!.texture;
        (this.up.uniforms.uTexel!.value as Vector2).set(1 / mips[i]!.width, 1 / mips[i]!.height);
        this.pass(this.up, mips[i - 1]!);
      }
    }
    const f = this.final.uniforms;
    f.tScene!.value = this.scene.texture;
    f.tBloom!.value = mips[0]?.texture ?? null;
    f.uBloom!.value = mips.length ? 0.9 : 0;
    f.tDof!.value = dof ? this.dofChain[2]!.texture : null;
    f.tDepth!.value = dof ? this.depth!.texture : null;
    f.uDof!.value = dof ? Math.min(1, dof.amount) : 0;
    f.uFocus!.value = dof?.focus ?? 1;
    f.uAperture!.value = dof?.aperture ?? 0;
    f.uExposure!.value = p.exposure;
    f.uDim!.value = p.dim;
    f.uMist!.value = p.mist ?? 0;
    f.uTime!.value = p.time;
    f.uWarp!.value = p.portal ? Math.max(0, Math.min(1, p.portal.amount)) : 0;
    f.uRing!.value = p.portal?.ring ?? 0;
    f.uAspect!.value = this.scene.width / Math.max(1, this.scene.height);
    const g = p.grade ?? NEUTRAL;
    (f.uSlope!.value as Vector3).set(g.slope[0], g.slope[1], g.slope[2]);
    (f.uOffset!.value as Vector3).set(g.offset[0], g.offset[1], g.offset[2]);
    (f.uPower!.value as Vector3).set(g.power[0], g.power[1], g.power[2]);
    f.uSat!.value = g.sat;
    (f.uShadow!.value as Vector3).set(g.shadow[0], g.shadow[1], g.shadow[2]);
    (f.uHigh!.value as Vector3).set(g.high[0], g.high[1], g.high[2]);
    this.pass(this.final, null);
    gl.autoClear = auto;
  }

  dispose() {
    this.scene.dispose();
    for (const m of this.mips) m.dispose();
    this.depth?.dispose();
    for (const m of this.dofChain) m.dispose();
    this.copy.dispose();
    this.depthMat.dispose();
    this.sharpMat.dispose();
    this.tri.geometry.dispose();
    this.end.removeFromParent();
    this.end.geometry.dispose();
    (this.end.material as MeshBasicMaterial).dispose();
    this.down.dispose();
    this.up.dispose();
    this.final.dispose();
  }
}
