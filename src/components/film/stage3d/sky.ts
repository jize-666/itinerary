/**
 * Kubah langit: warna dari suasana (cakrawala → zenit), cakram matahari, bulan, dan bintang. Digambar paling
 * akhir di bidang terjauh, jadi piksel yang tertutup lanskap tidak ikut dihitung.
 */
import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { COMMON, type Shared } from "./shared";

/** Arah bulan (dan cahaya kunci malam): kiri belakang panggung, cukup tinggi untuk menyapu tepi gong. */
export const MOON_DIR = new Vector3(-0.47, 0.42, -0.78).normalize();

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  // rotasi kamera saja (tanpa translasi), di bidang terjauh
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = /* glsl */ `
${COMMON}
uniform vec3 uMoonDir;
varying vec3 vDir;

/* Bintang: kisi 2D di tiap sisi kubus arah. Jari-jarinya dijaga ≥ ±1 piksel (terangnya yang diturunkan). */
vec3 starLayer(vec3 d, float cells, float density, float size) {
  vec3 a = abs(d);
  vec2 uv; float face;
  if (a.y >= a.x && a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 0.0 : 1.0; }
  else if (a.x >= a.z) { uv = d.zy / a.x; face = d.x > 0.0 ? 2.0 : 3.0; }
  else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
  vec2 p = uv * cells;
  vec2 id = floor(p) + face * 131.0;
  vec2 rnd = hash22(id);
  float on = step(1.0 - density, hash21(id + 3.7));
  float px = min(max(fwidth(p.x), fwidth(p.y)), 0.25);
  float r = size * (0.45 + rnd.x);
  float rr = max(r, px * 0.9);
  float dist = length(fract(p) - 0.5 - (rnd - 0.5) * 0.6);
  float s = smoothstep(rr, rr * 0.25, dist) * (r * r) / (rr * rr);
  float twinkle = 0.72 + 0.28 * sin(uTime * (0.8 + rnd.y * 2.4) + rnd.x * 60.0);
  vec3 tint = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.86, 0.66), step(0.72, rnd.y));
  return tint * s * on * twinkle;
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyColor(dir);
  // di bawah cakrawala: kabut gelap (biasanya tertutup lanskap)
  col = mix(col, uFogColor * 0.6, smoothstep(0.0, -0.18, dir.y));

  float above = smoothstep(-0.01, 0.07, dir.y);
  if (uStars > 0.003) {
    vec3 st = starLayer(dir, 62.0, 0.34, 0.05) * 1.5 + starLayer(dir, 27.0, 0.2, 0.075) * 3.2;
    col += st * uStars * above * (0.35 + 0.65 * smoothstep(0.0, 0.4, dir.y));
    // bulan: cakram kecil berpendar, redup bersama bintang
    float m = dot(dir, uMoonDir);
    float disc = smoothstep(0.99980, 0.99988, m);
    float shade = 0.82 + 0.18 * vnoise(dir.xy * 90.0);
    col += vec3(0.82, 0.88, 1.0) * (disc * shade * 1.5 + pow(max(m, 0.0), 900.0) * 0.16 + pow(max(m, 0.0), 60.0) * 0.03) * uStars;
  }

  // cakram matahari: putih hangat di atas, jingga dan membesar di dekat cakrawala
  float sd = dot(dir, uSunDir);
  float rad = 0.0165 * uSunScale;
  float sun = smoothstep(rad * rad * 1.2, rad * rad * 0.82, 2.0 * (1.0 - sd));
  vec3 sunCol = mix(vec3(6.0, 5.6, 4.5), vec3(4.6, 1.9, 0.6), uWarm);
  col += sunCol * sun * uSunDisc;

  gl_FragColor = vec4(col, 1.0);
}`;

export function createSky(shared: Shared) {
  const material = new ShaderMaterial({
    uniforms: { ...shared, uMoonDir: { value: MOON_DIR } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: BackSide,
    depthWrite: false,
  });
  const mesh = new Mesh(new SphereGeometry(1, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000; // sesudah semua benda padat
  mesh.matrixAutoUpdate = false;
  return {
    mesh,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
