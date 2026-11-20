/**
 * Kanvas malam interaktif untuk /canting/ (Tugas 11.2). Berbeda dengan `Batik` (torehan film yang ditentukan
 * progres), di sini malam datang dari tangan tamu: dab baru digambar ke target yang sama setiap frame, jadi malam
 * muncul di bawah cucuk pada frame yang sama dengan gerak pointer.
 *
 * - Target malam (RGBA8), kanal: R = klowong/cecek (tetap sampai lorod), G = tembok (dikerok sesudah nila),
 *   B = panas (1 baru jatuh), A = mbironi (malam sesudah nila, hanya menahan soga). Dab = cakram lembut, campuran MAX.
 * - Panas mendingin lewat satu lintasan layar penuh yang mengurangi kanal B. Pengurangan dikumpulkan sampai lebih
 *   dari dua anak tangga 8-bit, supaya di layar 120 Hz tidak hilang karena pembulatan.
 * - Urungkan: target dibangun ulang dari riwayat (dab lama digambar dingin).
 * - Target pensil (pola tuntunan) terpisah; target warna dihitung dari target malam seperti `Batik`.
 */
import {
  BufferAttribute,
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
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
  ReverseSubtractEquation,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { DYE_FS, QUAD_VS, TARGET_HEIGHT, type BatikQuality } from "./batik";

/** Banyak dab per draw call. */
const BATCH = 16384;
/** Malam dari bening panas sampai krem dingin (detik). */
export const COOL_SECONDS = 3.2;

const dabVs = /* glsl */ `
attribute vec4 aDab;      // x, y, r, lapisan (0 klowong/cecek, 1 tembok, 2 mbironi)
uniform float uAspect;
varying vec2 vLocal;
varying float vLayer;
void main() {
  vLocal = position.xy;
  vLayer = aDab.w;
  vec2 p = aDab.xy + position.xy * aDab.z * 1.6;
  gl_Position = vec4(p.x / uAspect * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

const dabFs = /* glsl */ `
varying vec2 vLocal;
varying float vLayer;
uniform float uHeat;
void main() {
  float d = length(vLocal) * 1.6;
  float a = 1.0 - smoothstep(0.82, 1.08, d);
  if (a <= 0.0) discard;
  vec4 c = vec4(0.0);
  if (vLayer < 0.5) c.r = a; else if (vLayer < 1.5) c.g = a; else c.a = a;
  c.b = a * uHeat;
  gl_FragColor = c;
}`;

const coolFs = /* glsl */ `
uniform float uStep;
void main() { gl_FragColor = vec4(0.0, 0.0, uStep, 0.0); }`;

export type Amounts = { nila: number; kerok: number; soga: number };

export class WaxCanvas {
  readonly wax: WebGLRenderTarget;
  readonly dye: WebGLRenderTarget;
  readonly guide: WebGLRenderTarget;
  readonly aspect: number;
  private readonly scene = new Scene();
  private readonly cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly dabs: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly attr: InstancedBufferAttribute;
  private readonly cool: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly dyeQuad: Mesh<PlaneGeometry, ShaderMaterial>;
  /** Dab yang menunggu digambar frame ini (x, y, r, lapisan). */
  private queue: number[] = [];
  private pendingCool = 0;
  /** Masih ada malam panas sampai saat ini (detik, jam `frame`). */
  private hotUntil = -1;
  private clock = 0;
  private dyeDirty = true;
  private lastAmounts: Amounts = { nila: -1, kerok: -1, soga: -1 };
  /** Banyak dab di kain (untuk uji dan pemantau). */
  count = 0;

  constructor(
    private readonly gl: WebGLRenderer,
    aspect: number,
    quality: BatikQuality,
  ) {
    this.aspect = aspect;
    const h = TARGET_HEIGHT[quality];
    const w = Math.round(h * aspect);
    const opts = { format: RGBAFormat, type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false } as const;
    this.wax = new WebGLRenderTarget(w, h, opts);
    this.dye = new WebGLRenderTarget(w, h, opts);
    // pensil cukup separuh resolusi (garis tipis abu-abu yang pudar)
    this.guide = new WebGLRenderTarget(Math.round(w / 2), Math.round(h / 2), opts);

    const quad = new InstancedBufferGeometry();
    quad.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    quad.setIndex(new BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    this.attr = new InstancedBufferAttribute(new Float32Array(BATCH * 4), 4);
    this.attr.setUsage(DynamicDrawUsage);
    quad.setAttribute("aDab", this.attr);
    quad.instanceCount = 0;
    // ruang kain y ke bawah membalik urutan sudut segitiga: gambar kedua sisi (lihat batik.ts)
    this.dabs = new Mesh(
      quad,
      new ShaderMaterial({
        vertexShader: dabVs,
        fragmentShader: dabFs,
        uniforms: { uAspect: { value: aspect }, uHeat: { value: 1 } },
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        blending: CustomBlending,
        blendEquation: MaxEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
      }),
    );
    this.dabs.frustumCulled = false;

    this.cool = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        vertexShader: QUAD_VS,
        fragmentShader: coolFs,
        uniforms: { uStep: { value: 0 } },
        depthTest: false,
        depthWrite: false,
        blending: CustomBlending,
        blendEquation: ReverseSubtractEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
      }),
    );
    this.cool.frustumCulled = false;

    this.dyeQuad = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        vertexShader: QUAD_VS,
        fragmentShader: DYE_FS,
        uniforms: { tWax: { value: this.wax.texture }, uNila: { value: 0 }, uKerok: { value: 0 }, uSoga: { value: 0 }, uAspect: { value: aspect } },
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      }),
    );
    this.dyeQuad.frustumCulled = false;
    this.clearTargets(true);
  }

  /** Antrekan dab baru (x, y, r, lapisan per dab); digambar panas di `frame` berikutnya. */
  add(dabs: ArrayLike<number>) {
    for (let i = 0; i < dabs.length; i++) this.queue.push(dabs[i]!);
  }

  /** Bangun ulang seluruh malam dari riwayat (urungkan, mulai lagi, pulih dari simpanan): semua dingin. */
  rebuild(all: Float32Array) {
    this.queue = [];
    this.pendingCool = 0;
    this.hotUntil = -1;
    this.count = 0;
    this.clearTargets(false);
    this.draw(this.wax, all, 0);
    this.dyeDirty = true;
  }

  /** Pola pensil (x, y, r per dab; lapisan diabaikan) atau kosong. */
  setGuide(dabs: ArrayLike<number> | null) {
    const gl = this.gl;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(this.guide);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    gl.setRenderTarget(prev);
    if (!dabs || !dabs.length) return;
    const n = Math.floor(dabs.length / 3);
    const flat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      flat[i * 4] = dabs[i * 3]!;
      flat[i * 4 + 1] = dabs[i * 3 + 1]!;
      flat[i * 4 + 2] = dabs[i * 3 + 2]!;
      flat[i * 4 + 3] = 0;
    }
    this.draw(this.guide, flat, 0, false);
  }

  /**
   * Satu frame: gambar dab yang menunggu, dinginkan malam panas, perbarui warna bila perlu. `dt` dalam detik.
   * Kembali true bila ada target yang berubah.
   */
  frame(dt: number, amounts: Amounts): boolean {
    this.clock += dt;
    let changed = false;
    if (this.queue.length) {
      const batch = Float32Array.from(this.queue);
      this.queue = [];
      this.draw(this.wax, batch, 1);
      this.hotUntil = this.clock + COOL_SECONDS;
      this.dyeDirty = true;
      changed = true;
    }
    if (this.clock <= this.hotUntil + 0.1) {
      this.pendingCool += dt / COOL_SECONDS;
      if (this.pendingCool >= 2 / 255) {
        this.pass(this.wax, this.cool, () => (this.cool.material.uniforms.uStep!.value = this.pendingCool));
        this.pendingCool = 0;
        changed = true;
      }
    }
    const a = this.lastAmounts;
    if (this.dyeDirty || a.nila !== amounts.nila || a.kerok !== amounts.kerok || a.soga !== amounts.soga) {
      this.lastAmounts = { ...amounts };
      this.dyeDirty = false;
      const u = this.dyeQuad.material.uniforms;
      u.uNila!.value = amounts.nila;
      u.uKerok!.value = amounts.kerok;
      u.uSoga!.value = amounts.soga;
      this.pass(this.dye, this.dyeQuad);
      changed = true;
    }
    return changed;
  }

  /** Masih ada malam panas (kain perlu digambar ulang tiap frame). */
  get hot() {
    return this.clock <= this.hotUntil + 0.1;
  }

  private clearTargets(guide: boolean) {
    const gl = this.gl;
    const prev = gl.getRenderTarget();
    gl.setClearColor(0x000000, 0);
    for (const t of guide ? [this.wax, this.dye, this.guide] : [this.wax, this.dye]) {
      gl.setRenderTarget(t);
      gl.clear(true, false, false);
    }
    gl.setRenderTarget(prev);
  }

  /** Gambar dab (4 angka per dab) ke `target` dalam beberapa draw call. */
  private draw(target: WebGLRenderTarget, flat: Float32Array, heat: number, counted = true) {
    const n = Math.floor(flat.length / 4);
    if (!n) return;
    const geo = this.dabs.geometry;
    const arr = this.attr.array as Float32Array;
    this.dabs.material.uniforms.uHeat!.value = heat;
    for (let i = 0; i < n; i += BATCH) {
      const m = Math.min(BATCH, n - i);
      arr.set(flat.subarray(i * 4, (i + m) * 4));
      this.attr.clearUpdateRanges();
      this.attr.addUpdateRange(0, m * 4);
      this.attr.needsUpdate = true;
      geo.instanceCount = m;
      this.pass(target, this.dabs);
    }
    if (counted) this.count += n;
  }

  private pass(target: WebGLRenderTarget, mesh: Mesh, before?: () => void) {
    before?.();
    const gl = this.gl;
    const prev = gl.getRenderTarget();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    this.scene.add(mesh);
    gl.render(this.scene, this.cam);
    this.scene.remove(mesh);
    gl.setRenderTarget(prev);
    gl.autoClear = auto;
  }

  dispose() {
    this.wax.dispose();
    this.dye.dispose();
    this.guide.dispose();
    this.dabs.geometry.dispose();
    this.dabs.material.dispose();
    this.cool.geometry.dispose();
    this.cool.material.dispose();
    this.dyeQuad.geometry.dispose();
    this.dyeQuad.material.dispose();
  }
}
