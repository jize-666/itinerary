/**
 * Debu emas di udara panggung: titik-titik yang melayang pelan, terang di dekat blencong. Seluruh geraknya
 * dihitung di vertex shader dari benih per titik (tanpa pembaruan dari JS tiap frame).
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from "three";
import { COMMON, type Shared } from "./shared";

const VERT = /* glsl */ `
${COMMON}
attribute vec4 aSeed;
uniform float uPixel;
varying float vLight;
varying float vSeed;
void main() {
  // kotak udara di sekitar panggung; tiap titik melayang naik pelan dan berayun, lalu berulang
  vec3 box = vec3(13.0, 5.2, 12.0);
  float t = uTime * (0.012 + aSeed.w * 0.02);
  vec3 p = vec3(aSeed.x, fract(aSeed.y + t), aSeed.z);
  p.x += 0.035 * sin(uTime * 0.31 + aSeed.w * 40.0);
  p.z += 0.03 * cos(uTime * 0.27 + aSeed.w * 23.0);
  vec3 wp = (p - vec3(0.5, 0.0, 0.5)) * box + vec3(0.0, 0.15, 0.6);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  // terang oleh blencong, samar oleh cahaya sekitar; pudar di ujung daur dan terlalu dekat kamera
  vec3 dl = uLampPos - wp;
  float lamp = dot(uLampColor, vec3(0.33)) / (1.0 + 0.5 * dot(dl, dl));
  float life = smoothstep(0.0, 0.08, p.y) * smoothstep(1.0, 0.86, p.y);
  vLight = (lamp * 0.42 + 0.014 * dot(uAmbSky, vec3(0.33)) + 0.003) * life * smoothstep(0.35, 1.2, dist);
  vSeed = aSeed.w;
  // butir kecil: 1–4 px; yang lebih kecil dari satu piksel digambar satu piksel dengan terang diturunkan
  float size = uPixel * (0.0022 + 0.004 * aSeed.w * aSeed.w) / dist;
  vLight *= min(1.0, size * size);
  gl_PointSize = clamp(size, 1.0, 4.0);
}`;

const FRAG = /* glsl */ `
varying float vLight;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.05, length(q));
  vec3 gold = mix(vec3(1.0, 0.72, 0.36), vec3(1.0, 0.9, 0.7), vSeed);
  gl_FragColor = vec4(gold * a * vLight, 1.0);
}`;

export function createDust(shared: Shared, count: number) {
  const seed = new Float32Array(count * 4);
  let s = 7;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < seed.length; i++) seed[i] = rand();
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 4));
  const uPixel = { value: 800 };
  const mat = new ShaderMaterial({ uniforms: { ...shared, uPixel }, vertexShader: VERT, fragmentShader: FRAG, blending: AdditiveBlending, depthWrite: false, transparent: true });
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
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
