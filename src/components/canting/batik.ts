/**
 * Kain batik di GPU (Tugas 11): target malam dan target warna untuk satu kain mori, dipakai halaman /canting/ dan
 * film Hari 3.
 *
 * - Target malam (RGBA8): R = malam tetap (`keep`, krem sampai nglorod), G = malam tembok (`temp`, dikerok sesudah
 *   nila), B = panas malam (1 baru jatuh, 0 sudah dingin). Dab digambar sebagai cakram lembut dengan campuran MAX,
 *   jadi tumpang-tindih tidak menebal tanpa batas; bidang (isian, tembok) disapu bertahap.
 * - Target warna (RGBA8): R = nila yang terserap, G = soga yang terserap. Satu lintasan layar penuh dari target malam:
 *   malam menolak warna, kecuali di retak-retaknya (remukan), yang justru jadi ciri batik tulis.
 *
 * Keadaan kain ditentukan penuh oleh `BatikState` (progres torehan dan kadar tiap tahap), jadi maju dan mundur memberi
 * gambar yang sama persis. Target hanya digambar ulang bila keadaannya berubah.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  MaxEquation,
  Mesh,
  NoBlending,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  ShapeUtils,
  UnsignedByteType,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { DAB, type Trace } from "@/engine/canting/trace";
import { EMPTY_STATE, type BatikState } from "@/engine/canting/state";

export type { BatikState };
export { EMPTY_STATE };

export type BatikQuality = "high" | "medium" | "low";

/** Tinggi target per kualitas (lebar = tinggi × aspek). High tetap tajam saat kamera mendekat ke cucuk. */
export const TARGET_HEIGHT: Record<BatikQuality, number> = { high: 1600, medium: 1152, low: 768 };

/** Lebar jendela waktu (dalam progres torehan) selama malam masih panas dan mengilap. */
const HOT = 0.012;

/** Derau, retak malam, dan pola kerok: dipakai bersama lintasan warna dan permukaan kain (`surface.ts`). */
export const BATIK_NOISE = /* glsl */ `
vec2 bHash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float bNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = bHash2(i).x, b = bHash2(i + vec2(1.0, 0.0)).x, c = bHash2(i + vec2(0.0, 1.0)).x, d = bHash2(i + vec2(1.0, 1.0)).x;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// tepi sel Voronoi: retak-retak malam (remukan); 1 di garis retak
float bCracks(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = bHash2(i + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return 1.0 - smoothstep(0.0, 0.04, d2 - d1);
}
// bagian malam tembok yang sudah dikerok (0–1), tepi tidak rata; p = koordinat kain (x 0–aspek, y 0–1)
float bKerok(vec2 p, float k) {
  return smoothstep(0.0, 1.0, k * 1.3 - bNoise(p * 7.0) * 0.3);
}
`;

const quadVs = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** Dab: quad per instans di ruang kain (x 0–aspek, y 0–1, y ke bawah). */
const dabVs = /* glsl */ `
attribute vec4 aDab;      // x, y, r, layer
attribute float aTime;
uniform float uAspect;
uniform float uDraw;
uniform float uHot;
varying vec2 vLocal;
varying float vLayer;
varying float vHot;
void main() {
  vLocal = position.xy;
  vLayer = aDab.w;
  vHot = 1.0 - clamp((uDraw - aTime) / uHot, 0.0, 1.0);
  // sedikit lebih besar dari jari-jari supaya tepi lembut tidak terpotong
  vec2 p = aDab.xy + position.xy * aDab.z * 1.6;
  gl_Position = vec4(p.x / uAspect * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

const dabFs = /* glsl */ `
varying vec2 vLocal;
varying float vLayer;
varying float vHot;
void main() {
  float d = length(vLocal) * 1.6;
  // tepi malam: lembut sedikit, malam meresap ke serat di bagian tepi
  float a = 1.0 - smoothstep(0.82, 1.08, d);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vLayer < 0.5 ? a : 0.0, vLayer < 0.5 ? 0.0 : a, a * vHot, 0.0);
}`;

/** Bidang: poligon tersegitiga, disapu dari satu sisi ke sisi lain dengan tepi bergerigi (canting tembok bolak-balik). */
const fillVs = /* glsl */ `
uniform float uAspect;
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = vec4(position.x / uAspect * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
}`;

const fillFs = /* glsl */ `
varying vec2 vP;
uniform float uReveal;
uniform vec4 uBox;     // minX, minY, maxX, maxY
uniform float uLayer;
uniform float uHotFill;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  // arah sapuan: sepanjang sisi terpanjang kotak bidang; tepi depan bergerigi seperti goresan bolak-balik
  vec2 size = max(uBox.zw - uBox.xy, vec2(1e-5));
  float along = size.x > size.y ? (vP.x - uBox.x) / size.x : (vP.y - uBox.y) / size.y;
  float across = size.x > size.y ? (vP.y - uBox.y) / size.y : (vP.x - uBox.x) / size.x;
  float jag = 0.035 * sin(across * 48.0) + 0.02 * (hash(floor(vP * 900.0)) - 0.5);
  float front = uReveal * 1.08 - 0.04;
  if (along > front + jag) discard;
  float hot = uHotFill * smoothstep(front - 0.25, front, along);
  gl_FragColor = vec4(uLayer < 0.5 ? 1.0 : 0.0, uLayer < 0.5 ? 0.0 : 1.0, hot, 0.0);
}`;

/** Warna yang terserap kain, dari target malam dan kadar tiap tahap. */
const dyeFs = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tWax;
uniform float uNila;
uniform float uKerok;
uniform float uSoga;
uniform float uAspect;
${BATIK_NOISE}
// kadar celup di titik ini: kain diturunkan ke bak dari tepi bawah; garis basah bergelombang
float dip(float amount, vec2 uv, float seed) {
  if (amount <= 0.0) return 0.0;
  float level = amount * 1.25 - 0.12;
  float wave = 0.03 * sin(uv.x * 9.0 + seed) + 0.02 * (bNoise(uv * vec2(14.0, 6.0) + seed) - 0.5);
  return 1.0 - smoothstep(level - 0.06, level + 0.02, (1.0 - uv.y) + wave);
}
void main() {
  vec4 wax = texture2D(tWax, vUv);
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // retak berbeda untuk dua celupan (malam retak lagi saat kain diremas di bak kedua)
  float crackA = bCracks(p * 46.0) * (0.55 + 0.45 * bNoise(p * 11.0));
  float crackB = bCracks(p * 58.0 + 3.7) * (0.55 + 0.45 * bNoise(p * 13.0 + 2.0));
  float waxA = clamp(wax.r + wax.g, 0.0, 1.0);
  float nila = dip(uNila, vUv, 0.0) * mix(1.0, crackA * 0.8, waxA);
  float waxB = clamp(wax.r + wax.g * (1.0 - bKerok(p, uKerok)), 0.0, 1.0);
  float soga = dip(uSoga, vUv, 2.3) * mix(1.0, crackB * 0.6, waxB);
  // serat mori tidak menyerap rata: sedikit belang
  float mottle = 0.96 + 0.04 * bNoise(p * vec2(34.0, 24.0)) - 0.03 * bNoise(p * 4.0);
  gl_FragColor = vec4(clamp(nila * mottle, 0.0, 1.0), clamp(soga * mottle, 0.0, 1.0), 0.0, 1.0);
}`;

type FillDraw = { mesh: Mesh; t0: number; t1: number; material: ShaderMaterial };

export class Batik {
  readonly wax: WebGLRenderTarget;
  readonly dye: WebGLRenderTarget;
  readonly aspect: number;
  private readonly scene = new Scene();
  private readonly cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly dabMesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly fills: FillDraw[] = [];
  private readonly dyeQuad: Mesh<PlaneGeometry, ShaderMaterial>;
  private last: BatikState | null = null;

  constructor(
    private readonly gl: WebGLRenderer,
    private readonly trace: Trace,
    aspect: number,
    quality: BatikQuality,
  ) {
    this.aspect = aspect;
    const h = TARGET_HEIGHT[quality];
    const w = Math.round(h * aspect);
    const opts = { format: RGBAFormat, type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false } as const;
    this.wax = new WebGLRenderTarget(w, h, opts);
    this.dye = new WebGLRenderTarget(w, h, opts);

    // dab: satu draw call berinstans untuk seluruh malam garis dan cecek
    const quad = new InstancedBufferGeometry();
    quad.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    quad.setIndex(new BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    const n = trace.count;
    const dab = new Float32Array(n * 4);
    const time = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      dab[i * 4] = trace.dabs[i * DAB]!;
      dab[i * 4 + 1] = trace.dabs[i * DAB + 1]!;
      dab[i * 4 + 2] = trace.dabs[i * DAB + 2]!;
      dab[i * 4 + 3] = trace.dabs[i * DAB + 3]!;
      time[i] = trace.dabs[i * DAB + 4]!;
    }
    quad.setAttribute("aDab", new InstancedBufferAttribute(dab, 4));
    quad.setAttribute("aTime", new InstancedBufferAttribute(time, 1));
    quad.instanceCount = 0;
    // ruang kain y ke bawah, ruang klip y ke atas: urutan sudut segitiga terbalik, jadi kedua sisi digambar
    const maxBlend = { blending: CustomBlending, blendEquation: MaxEquation, blendSrc: OneFactor, blendDst: OneFactor, side: DoubleSide } as const;
    this.dabMesh = new Mesh(
      quad,
      new ShaderMaterial({
        vertexShader: dabVs,
        fragmentShader: dabFs,
        uniforms: { uAspect: { value: aspect }, uDraw: { value: 0 }, uHot: { value: HOT } },
        depthTest: false,
        depthWrite: false,
        ...maxBlend,
      }),
    );
    this.dabMesh.frustumCulled = false;

    // bidang: satu mesh per bidang (sapuan masing-masing berbeda)
    for (const f of trace.fills) {
      const contour = f.poly.map(([x, y]) => new Vector2(x, y));
      const tris = ShapeUtils.triangulateShape(contour, []);
      const pos = new Float32Array(contour.length * 3);
      contour.forEach((v, i) => {
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
      });
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      g.setIndex(tris.flat());
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const v of contour) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      }
      const material = new ShaderMaterial({
        vertexShader: fillVs,
        fragmentShader: fillFs,
        uniforms: {
          uAspect: { value: aspect },
          uReveal: { value: 0 },
          uBox: { value: [minX, minY, maxX, maxY] },
          uLayer: { value: f.layer === "keep" ? 0 : 1 },
          uHotFill: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
        ...maxBlend,
      });
      const mesh = new Mesh(g, material);
      mesh.frustumCulled = false;
      this.fills.push({ mesh, t0: f.t0, t1: f.t1, material });
    }

    this.dyeQuad = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        vertexShader: quadVs,
        fragmentShader: dyeFs,
        uniforms: {
          tWax: { value: this.wax.texture },
          uNila: { value: 0 },
          uKerok: { value: 0 },
          uSoga: { value: 0 },
          uAspect: { value: aspect },
        },
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      }),
    );
    this.dyeQuad.frustumCulled = false;
  }

  /** Gambar ulang target bila keadaan berubah. Kembali true bila ada yang digambar. */
  update(s: BatikState): boolean {
    const l = this.last;
    if (l && l.draw === s.draw && l.nila === s.nila && l.kerok === s.kerok && l.soga === s.soga && l.lorod === s.lorod) return false;
    const waxChanged = !l || l.draw !== s.draw;
    this.last = { ...s };
    const gl = this.gl;
    const prevTarget = gl.getRenderTarget();
    const prevAuto = gl.autoClear;
    gl.autoClear = false;
    if (waxChanged) {
      gl.setRenderTarget(this.wax);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
      const geo = this.dabMesh.geometry;
      geo.instanceCount = this.trace.countAt(s.draw);
      this.dabMesh.material.uniforms.uDraw!.value = s.draw;
      if (geo.instanceCount > 0) {
        this.scene.add(this.dabMesh);
        gl.render(this.scene, this.cam);
        this.scene.remove(this.dabMesh);
      }
      for (const f of this.fills) {
        if (s.draw <= f.t0) continue;
        const reveal = Math.min(1, (s.draw - f.t0) / Math.max(1e-6, f.t1 - f.t0));
        f.material.uniforms.uReveal!.value = reveal;
        f.material.uniforms.uHotFill!.value = 1 - Math.min(1, (s.draw - f.t1) / HOT);
        this.scene.add(f.mesh);
      }
      if (this.scene.children.length) gl.render(this.scene, this.cam);
      this.scene.clear();
    }
    const u = this.dyeQuad.material.uniforms;
    u.uNila!.value = s.nila;
    u.uKerok!.value = s.kerok;
    u.uSoga!.value = s.soga;
    gl.setRenderTarget(this.dye);
    this.scene.add(this.dyeQuad);
    gl.render(this.scene, this.cam);
    this.scene.remove(this.dyeQuad);
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAuto;
    return true;
  }

  get state(): BatikState | null {
    return this.last;
  }

  dispose() {
    this.wax.dispose();
    this.dye.dispose();
    this.dabMesh.geometry.dispose();
    this.dabMesh.material.dispose();
    for (const f of this.fills) {
      f.mesh.geometry.dispose();
      f.material.dispose();
    }
    this.dyeQuad.geometry.dispose();
    this.dyeQuad.material.dispose();
  }
}
