/**
 * Rantai post-FX panggung: adegan digambar ke target HDR (half float, MSAA menurut tier), lalu
 *   bloom  : bagian yang lebih terang dari putih (nyala, matahari, lampu) dikecilkan bertingkat lalu
 *            dibesarkan kembali ("dual filter"); karena ambangnya di atas 1, hanya sumber cahaya yang berpijar
 *   gabung : + bloom, eksposur, vinyet, tone mapping ACES, sRGB, dither (langit malam tidak bergaris)
 * Tanpa pustaka post: beberapa shader pendek, satu segitiga selayar.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  RGBAFormat,
  type Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { TierSpec } from "@/engine/stage/tier";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const DOWN = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv - h).rgb + texture2D(tSrc, vUv + h).rgb;
  c += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb;
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

const FINAL = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uExposure;
uniform float uDim;
uniform float uTime;
varying vec2 vUv;

vec3 aces(vec3 x) {
  // ACES (Narkowicz) dengan sedikit pra-eksposur, seperti ACESFilmic di three
  x *= 0.6;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * uBloom;
  // vinyet: tepi layar turun; teks di atas gambar menurunkan seluruh bingkai (uDim)
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.86);
  float vig = 1.0 - 0.42 * smoothstep(0.28, 0.82, length(q));
  c *= uExposure * vig * (1.0 - 0.5 * uDim);
  c = aces(c);
  c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  c += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

export type PostParams = { exposure: number; dim: number; time: number };

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

  constructor(
    private readonly gl: WebGLRenderer,
    private readonly spec: TierSpec,
  ) {
    // target half float perlu ekstensi; tanpa itu jatuh ke 8-bit (bloom tetap jalan, rentangnya lebih sempit)
    this.hdr = gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mat = (fragmentShader: string, uniforms: ShaderMaterial["uniforms"], additive = false) =>
      new ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: additive ? AdditiveBlending : NoBlending, transparent: additive });
    this.down = mat(DOWN, { tSrc: { value: null }, uTexel: { value: new Vector2() }, uThreshold: { value: 0 } });
    this.up = mat(UP, { tSrc: { value: null }, uTexel: { value: new Vector2() } }, true);
    this.final = mat(FINAL, { tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0 }, uExposure: { value: 1 }, uDim: { value: 0 }, uTime: { value: 0 } });
    this.tri = new Mesh(geo, this.down);
    this.tri.frustumCulled = false;
    this.scene = this.target(1, 1, true);
  }

  private target(w: number, h: number, main = false): WebGLRenderTarget {
    return new WebGLRenderTarget(w, h, {
      type: this.hdr ? HalfFloatType : UnsignedByteType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: main,
      stencilBuffer: false,
      samples: main ? this.spec.msaa : 0,
      generateMipmaps: false,
    });
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
  }

  private pass(material: ShaderMaterial, to: WebGLRenderTarget | null) {
    this.tri.material = material;
    this.gl.setRenderTarget(to);
    this.gl.render(this.tri, this.cam);
  }

  render(scene: Scene, camera: Camera, p: PostParams) {
    const gl = this.gl;
    const auto = gl.autoClear;
    gl.autoClear = true;
    gl.setRenderTarget(this.scene);
    gl.render(scene, camera);

    gl.autoClear = false;
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
    f.uExposure!.value = p.exposure;
    f.uDim!.value = p.dim;
    f.uTime!.value = p.time;
    this.pass(this.final, null);
    gl.autoClear = auto;
  }

  dispose() {
    this.scene.dispose();
    for (const m of this.mips) m.dispose();
    this.tri.geometry.dispose();
    this.down.dispose();
    this.up.dispose();
    this.final.dispose();
  }
}
