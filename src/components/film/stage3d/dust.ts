/**
 * Partikel panggung per fase (Tugas 8.4; jenis, kadar, dan sebaran di engine/stage/particles.ts). Satu `Points`,
 * satu draw call, empat jenis butir:
 * - debu lampu: debu emas di udara pendapa, terang di dekat blencong (seperti sebelumnya);
 * - embun: melayang rendah di atas sawah dan hanyut pelan, berkilau sesekali saat cahaya kunci memantul;
 * - debu emas siang: berputar pelan di udara, berkilau saat dipandang ke arah matahari, menjingga saat senja;
 * - kunang-kunang: mengembara rendah dan berkedip (kilat singkat lalu meredup), bercahaya sendiri.
 * Gerak seluruhnya dihitung di vertex shader dari benih per butir. Dari JS hanya kadar per jenis (sekali per
 * perubahan langit) dan letak dasar butir (sekali per bentuk lanskap). Jenis yang kadarnya nol tidak dirasterisasi.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector4 } from "three";
import { kindIndex, kindOf, type Ground, type ParticleMix, placeParticle } from "@/engine/stage/particles";
import { COMMON, type Shared } from "./shared";

const VERT = /* glsl */ `
${COMMON}
attribute vec4 aSeed;
attribute vec3 aBase;
attribute float aKind;
uniform float uPixel;
uniform vec4 uMix;
varying vec3 vColor;
varying float vGlow;
void main() {
  float k = aKind;
  float amount = k < 0.5 ? uMix.x : (k < 1.5 ? uMix.y : (k < 2.5 ? uMix.z : uMix.w));
  vColor = vec3(0.0);
  vGlow = 0.0;
  if (amount < 0.002) {
    // jenis ini sedang tidak tampak: di luar layar, tanpa piksel
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  float s = aSeed.w;
  float key = dot(uKeyColor, vec3(0.333));
  vec3 keyTint = uKeyColor / max(key * 3.0, 1e-3);
  vec3 wp;
  vec3 col;
  float size;
  float glow = 0.0;
  if (k < 0.5) {
    // debu lampu: kotak udara di sekitar panggung; tiap butir naik pelan dan berayun, lalu berulang
    vec3 box = vec3(13.0, 5.2, 12.0);
    float t = uTime * (0.012 + s * 0.02);
    vec3 p = vec3(aSeed.x, fract(aSeed.y + t), aSeed.z);
    p.x += 0.035 * sin(uTime * 0.31 + s * 40.0);
    p.z += 0.03 * cos(uTime * 0.27 + s * 23.0);
    wp = (p - vec3(0.5, 0.0, 0.5)) * box + vec3(0.0, 0.15, 0.6);
    vec3 dl = uLampPos - wp;
    float lamp = dot(uLampColor, vec3(0.33)) / (1.0 + 0.5 * dot(dl, dl));
    float life = smoothstep(0.0, 0.08, p.y) * (1.0 - smoothstep(0.86, 1.0, p.y));
    col = mix(vec3(1.0, 0.72, 0.36), vec3(1.0, 0.9, 0.7), s) * (lamp * 0.42 + 0.014 * dot(uAmbSky, vec3(0.33)) + 0.003) * life;
    size = 0.0022 + 0.004 * s * s;
  } else if (k < 1.5) {
    // embun: melayang rendah dan hanyut pelan; berkilau sesekali memantulkan langit subuh (sebelum sarapan matahari
    // belum tampak, jadi terangnya dari langit, bukan dari cahaya kunci)
    wp = aBase + vec3(0.3 * sin(uTime * 0.05 + s * 40.0), 0.06 * sin(uTime * 0.4 + s * 20.0), 0.3 * cos(uTime * 0.045 + s * 31.0));
    float glint = pow(max(0.5 + 0.5 * sin(uTime * (0.8 + 2.4 * aSeed.x) + s * 60.0), 0.0), 10.0);
    float sky = 2.2 * dot(uSky[1], vec3(0.333)) + 0.25 * key;
    col = mix(vec3(0.8, 0.9, 1.0), keyTint, 0.25) * sky * (0.18 + 1.6 * glint);
    size = 0.01 + 0.01 * s;
  } else if (k < 2.5) {
    // debu emas siang: berputar pelan di udara; berkilau saat dipandang ke arah matahari (hamburan ke depan)
    float t = uTime * (0.02 + 0.03 * s);
    wp = aBase + vec3(0.55 * sin(t * 3.1 + s * 17.0), 0.5 * sin(t * 1.7 + s * 9.0), 0.55 * cos(t * 2.3 + s * 29.0));
    float fwd = pow(max(dot(safeNormalize(wp - cameraPosition), uSunDir), 0.0), 4.0);
    col = mix(vec3(1.0, 0.86, 0.6), keyTint, 0.5) * (key * (0.06 + 1.3 * fwd) + 0.03 * dot(uAmbSky, vec3(0.33)));
    size = 0.005 + 0.007 * s * s;
  } else {
    // kunang-kunang: mengembara rendah dan berkedip (kilat singkat lalu meredup), bercahaya sendiri
    wp = aBase + vec3(0.6 * sin(uTime * 0.23 + s * 31.0), 0.25 * sin(uTime * 0.37 + s * 17.0), 0.6 * cos(uTime * 0.19 + s * 13.0));
    // kedip: menyala cepat, bertahan sebentar, meredup pelan; di antara kedip tetap berpendar samar. Puncaknya melewati
    // ambang bloom, jadi berpendar
    float ph = fract(uTime * (0.2 + 0.16 * aSeed.x) + s * 7.0);
    float flash = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.22, 0.6, ph));
    col = vec3(0.82, 1.0, 0.4) * (0.12 + 1.7 * flash);
    size = 0.04 + 0.025 * aSeed.x;
    glow = 1.0;
  }
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.05);
  // butir kecil: yang lebih kecil dari satu piksel digambar satu piksel dengan terang diturunkan; pudar terlalu dekat
  // kamera dan di kabut jauh
  float px = uPixel * size / dist;
  float fade = smoothstep(0.35, 1.2, dist) * exp(-uFogDensity * dist * 0.8);
  vColor = col * amount * fade * min(1.0, px * px);
  vGlow = glow;
  gl_PointSize = clamp(px, 1.0, glow > 0.5 ? 16.0 : 4.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vGlow;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  // butir: cakram tajam; kunang-kunang: inti terang dengan pendar lembut di sekelilingnya
  float a = mix(1.0 - smoothstep(0.05, 0.5, r), exp(-r * r * 70.0) + 0.35 * exp(-r * r * 12.0), vGlow);
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

export function createDust(shared: Shared, count: number, ground: Ground) {
  const seed = new Float32Array(count * 4);
  let s = 7;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < seed.length; i++) seed[i] = rand();
  const kinds = Array.from({ length: count }, (_, i) => kindOf(i, count));
  const kind = new Float32Array(kinds.map(kindIndex));
  const base = new Float32Array(count * 3);
  const place = (g: Ground) => {
    for (let i = 0; i < count; i++) {
      const p = placeParticle(kinds[i]!, [seed[i * 4]!, seed[i * 4 + 1]!, seed[i * 4 + 2]!, seed[i * 4 + 3]!], g);
      base.set(p, i * 3);
    }
  };
  place(ground);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 4));
  geo.setAttribute("aKind", new BufferAttribute(kind, 1));
  const baseAttr = new BufferAttribute(base, 3);
  geo.setAttribute("aBase", baseAttr);
  const uPixel = { value: 800 };
  const uMix = { value: new Vector4(1, 0, 0, 0) };
  const mat = new ShaderMaterial({ uniforms: { ...shared, uPixel, uMix }, vertexShader: VERT, fragmentShader: FRAG, blending: AdditiveBlending, depthWrite: false, transparent: true });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.matrixAutoUpdate = false;
  points.renderOrder = 30;
  return {
    points,
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2): ukuran titik mengikuti lensa dan resolusi. */
    setPixel(v: number) {
      uPixel.value = v;
    },
    /** Kadar tampak tiap jenis (`particleMix`), sekali per perubahan langit. */
    setMix(m: ParticleMix) {
      uMix.value.set(m.lamp, m.dew, m.motes, m.fireflies);
    },
    /** Lanskap berubah bentuk (sungai bergeser mengikuti layar): embun dan kunang-kunang ikut tanah dan muka air. */
    setGround(g: Ground) {
      place(g);
      baseAttr.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
