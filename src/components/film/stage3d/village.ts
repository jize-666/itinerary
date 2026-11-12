/**
 * Lampu desa di dataran: titik-titik hangat yang berkelompok menjadi dusun, menyala di malam hari dan
 * meredup saat langit terang. Letaknya dihitung sekali (deterministik) di atas tanah yang sama dengan
 * lanskap (`terrainHeight`); kedip dan redup oleh kabut dihitung di vertex shader.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from "three";
import { villageLights } from "@/engine/stage/terrain";
import { COMMON, type Shared } from "./shared";

const VERT = /* glsl */ `
${COMMON}
attribute vec3 aSeed;
uniform float uPixel;
varying vec3 vColor;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = length(mv.xyz);
  // redup oleh kabut, sama dengan applyFog
  float thin = mix(0.3, 1.0, exp(-max(position.y + 9.0, 0.0) * 0.035));
  float clear = exp(-uFogDensity * d * thin);
  float flick = 0.8 + 0.2 * sin(uTime * (1.2 + aSeed.x * 2.2) + aSeed.x * 40.0);
  // pendar ±0,2–0,4 m; yang lebih kecil dari satu piksel digambar satu piksel dengan terang diturunkan
  float size = uPixel * (0.2 + 0.2 * aSeed.z) / d;
  float small = min(1.0, size * size / 2.5);
  vColor = mix(vec3(1.0, 0.56, 0.22), vec3(1.0, 0.8, 0.5), aSeed.y) * flick * uNight * clear * small * 4.2;
  gl_PointSize = clamp(size, 1.6, 7.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  gl_FragColor = vec4(vColor * a * a, 1.0);
}`;

export function createVillage(shared: Shared, count: number) {
  const { position, seed } = villageLights(count);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(position, 3));
  geo.setAttribute("aSeed", new BufferAttribute(seed, 3));
  const uPixel = { value: 800 };
  const mat = new ShaderMaterial({ uniforms: { ...shared, uPixel }, vertexShader: VERT, fragmentShader: FRAG, blending: AdditiveBlending, depthWrite: false, transparent: true });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.matrixAutoUpdate = false;
  points.renderOrder = 10;
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
