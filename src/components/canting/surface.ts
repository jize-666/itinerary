/**
 * Permukaan kain batik (Tugas 11): membaca target malam dan warna dari `Batik` lalu menggambar mori yang ditenun,
 * diwarnai nila dan soga, berlapis malam (bening mengilap saat panas, krem buram saat dingin, berelief), dan malam
 * yang luruh saat nglorod.
 *
 * Warna dihitung linear. Versi halaman /canting/ (`surfaceMaterial`) memakai cahaya sendiri dan mengubah ke sRGB di
 * akhir; film Hari 3 (11.3) memakai potongan `BATIK_SURFACE` yang sama dengan cahaya panggung.
 */
import { Color, type Texture, Vector2, Vector3, ShaderMaterial, DoubleSide } from "three";
import { BATIK_NOISE } from "./batik";

/** Warna linear dasar (sRGB: mori #efe3c8, nila #2b3550, soga #8a5530). */
export const PALETTE = {
  mori: [0.863, 0.768, 0.578],
  nila: [0.024, 0.036, 0.081],
  soga: [0.254, 0.091, 0.03],
} as const;

/**
 * Potongan GLSL: `batikAlbedo(uv)` dan `batikNormal(uv)` (ruang tangen kain) dan `batikGloss`. Membutuhkan uniform:
 * tWax, tDye, uTexel, uAspect, uKerok, uLorod, uPrada.
 */
export const BATIK_SURFACE = /* glsl */ `
uniform sampler2D tWax;
uniform sampler2D tDye;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uKerok;
uniform float uLorod;
uniform float uPrada;
${BATIK_NOISE}
const vec3 MORI = vec3(${PALETTE.mori.join(", ")});
const vec3 NILA = vec3(${PALETTE.nila.join(", ")}) / vec3(${PALETTE.mori.join(", ")});
const vec3 SOGA = vec3(${PALETTE.soga.join(", ")}) / vec3(${PALETTE.mori.join(", ")});

vec2 batikP(vec2 uv) { return vec2(uv.x * uAspect, 1.0 - uv.y); }
// malam yang luruh saat nglorod: mulai di tempat acak, lalu merata
float batikLorod(vec2 p) { return smoothstep(0.0, 1.0, uLorod * 1.35 - bNoise(p * 5.0 + 9.0) * 0.35); }
// tebal malam yang masih di kain (0–1)
float batikWax(vec2 uv) {
  vec4 w = texture2D(tWax, uv);
  vec2 p = batikP(uv);
  float temp = w.g * (1.0 - bKerok(p, uKerok));
  return clamp(w.r + temp, 0.0, 1.0) * (1.0 - batikLorod(p));
}
float batikHot(vec2 uv) { return texture2D(tWax, uv).b * (1.0 - batikLorod(batikP(uv))); }

vec3 batikAlbedo(vec2 uv) {
  vec2 p = batikP(uv);
  vec4 d = texture2D(tDye, uv);
  // tenunan mori: lungsin dan pakan halus, dan benang yang sedikit tidak rata
  float warp = 0.5 + 0.5 * sin(p.x * 1150.0);
  float weft = 0.5 + 0.5 * sin(p.y * 1150.0 + sin(p.x * 3.0) * 2.0);
  float slub = bNoise(vec2(p.x * 40.0, p.y * 1100.0)) * 0.5 + bNoise(vec2(p.x * 1100.0, p.y * 40.0)) * 0.5;
  float weave = 0.9 + 0.05 * (warp * weft) + 0.05 * slub;
  vec3 col = MORI * weave;
  // warna meresap secara perkalian: nila lalu soga bertemu menjadi hitam kecokelatan (sogan)
  col *= mix(vec3(1.0), NILA, d.r);
  col *= mix(vec3(1.0), SOGA, d.g);
  // malam di atas kain: kuning bening dan sedikit lebih gelap (kain basah oleh malam); panas = lebih bening, amber
  float wax = batikWax(uv);
  float hot = batikHot(uv);
  // malam tidak rata tebalnya: sedikit lebih bening di bagian tipis
  float thick = 0.78 + 0.22 * bNoise(p * 70.0) + 0.1 * bNoise(p * 9.0);
  vec3 waxed = col * vec3(0.9, 0.78, 0.5) * (1.04 - 0.08 * thick) + vec3(0.03, 0.022, 0.008);
  col = mix(col, waxed, wax * 0.8 * thick);
  col = mix(col, col * vec3(0.72, 0.56, 0.3), hot * 0.45);
  // prada: emas di bagian krem sesudah nglorod (kilau di gong terakhir)
  float cream = (1.0 - max(d.r, d.g)) * (1.0 - wax);
  col = mix(col, vec3(0.78, 0.52, 0.2), uPrada * cream * 0.55);
  return col;
}

// normal ruang tangen dari relief malam (malam menebal di atas serat)
vec3 batikNormal(vec2 uv) {
  float hL = batikWax(uv - vec2(uTexel.x, 0.0));
  float hR = batikWax(uv + vec2(uTexel.x, 0.0));
  float hD = batikWax(uv - vec2(0.0, uTexel.y));
  float hU = batikWax(uv + vec2(0.0, uTexel.y));
  return normalize(vec3((hL - hR) * 1.6, (hD - hU) * 1.6, 1.0));
}

float batikGloss(vec2 uv) {
  float wax = batikWax(uv);
  return wax * (0.35 + 0.65 * batikHot(uv)) + uPrada * 0.4 * (1.0 - wax);
}
`;

/**
 * Kain di gawangan: sedikit melendut di tengah dan bergelombang lembut di antara tali pengikat. Tinggi dan turunannya
 * dihitung analitis supaya normalnya tepat. `uDrape` 0 = datar.
 */
const vs = /* glsl */ `
uniform float uDrape;
uniform vec2 uSize;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
const float PI = 3.14159265;
void main() {
  vUv = uv;
  // lendut: nol di tepi, terdalam di tengah; gelombang: lipatan halus sejajar tinggi kain
  float sx = sin(PI * uv.x);
  float sy = sin(PI * uv.y);
  float wave = sin(uv.x * PI * 7.0 + 0.6) * 0.18;
  float h = uDrape * (-sx * sy + wave * sy * 0.6);
  float dhdu = uDrape * (-PI * cos(PI * uv.x) * sy + cos(uv.x * PI * 7.0 + 0.6) * PI * 7.0 * 0.18 * sy * 0.6);
  float dhdv = uDrape * (-sx * PI * cos(PI * uv.y) + wave * PI * cos(PI * uv.y) * 0.6);
  vec3 pos = position + vec3(0.0, 0.0, h);
  vec3 n = normalize(vec3(-dhdu / uSize.x, -dhdv / uSize.y, 1.0));
  vec4 w = modelMatrix * vec4(pos, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vTangent = normalize(mat3(modelMatrix) * normalize(vec3(1.0, 0.0, dhdu / uSize.x)));
  vBitangent = normalize(cross(vNormal, vTangent));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fs = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uPool;
${BATIK_SURFACE}
void main() {
  vec3 albedo = batikAlbedo(vUv);
  vec3 nt = batikNormal(vUv);
  vec3 N = normalize(vTangent * nt.x + vBitangent * nt.y + vNormal * nt.z);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 H = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float gloss = batikGloss(vUv);
  float spec = pow(max(dot(N, H), 0.0), mix(24.0, 110.0, gloss)) * gloss * 0.9;
  // genangan cahaya lampu di atas kain: terang di tengah, meredup ke tepi
  float pool = 1.0 - smoothstep(uPool.z * 0.35, uPool.z, length(vWorld.xy - uPool.xy));
  vec3 key = uLightColor * (0.55 + 0.6 * pool);
  vec3 col = albedo * (uAmbient * (0.8 + 0.3 * pool) + key * diff) + key * spec;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type SurfaceTargets = { wax: Texture; dye: Texture; width: number; height: number; aspect: number };

/** Materi kain untuk halaman /canting/: cahaya kunci + sekitar, keluaran sRGB. */
export function surfaceMaterial(t: SurfaceTargets) {
  return new ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    side: DoubleSide,
    uniforms: {
      tWax: { value: t.wax },
      tDye: { value: t.dye },
      uTexel: { value: new Vector2(1 / t.width, 1 / t.height) },
      uAspect: { value: t.aspect },
      uKerok: { value: 0 },
      uLorod: { value: 0 },
      uPrada: { value: 0 },
      uLightDir: { value: new Vector3(-0.45, 0.55, 0.7).normalize() },
      uLightColor: { value: new Color(1.0, 0.93, 0.82).multiplyScalar(1.15) },
      uAmbient: { value: new Color(0.32, 0.3, 0.34) },
      uDrape: { value: 0.012 },
      uSize: { value: new Vector2(t.aspect, 1) },
      // pusat genangan cahaya (x, y dunia) dan jari-jarinya
      uPool: { value: new Vector3(-0.1, 0.12, 1.15) },
    },
  });
}
