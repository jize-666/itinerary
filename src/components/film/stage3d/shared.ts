/**
 * Uniform dan potongan GLSL yang dipakai bersama semua material panggung. Satu objek uniform dibagi ke semua
 * shader: suasana (langit, cahaya kunci, blencong, kabut) cukup ditulis sekali per frame.
 *
 * Semua shader menulis warna linear HDR; tone mapping dan sRGB dikerjakan di rantai post (post.ts).
 */
import { Color, type IUniform, Vector3 } from "three";
import { SKY_STOPS } from "@/engine/stage/mood";

export type Shared = {
  uTime: IUniform<number>;
  uSky: IUniform<Color[]>;
  uSunDir: IUniform<Vector3>;
  uSunDisc: IUniform<number>;
  uWarm: IUniform<number>;
  uSunScale: IUniform<number>;
  uStars: IUniform<number>;
  uKeyDir: IUniform<Vector3>;
  uKeyColor: IUniform<Color>;
  uAmbSky: IUniform<Color>;
  uAmbGround: IUniform<Color>;
  uLampPos: IUniform<Vector3>;
  uLampColor: IUniform<Color>;
  uFogColor: IUniform<Color>;
  uFogDensity: IUniform<number>;
  /** 0 siang … 1 malam: lampu desa, pendar bara. */
  uNight: IUniform<number>;
};

export function createShared(): Shared {
  return {
    uTime: { value: 0 },
    uSky: { value: SKY_STOPS.map(() => new Color(0, 0, 0)) },
    uSunDir: { value: new Vector3(0, 0.2, -1).normalize() },
    uSunDisc: { value: 0 },
    uWarm: { value: 0 },
    uSunScale: { value: 1 },
    uStars: { value: 1 },
    uKeyDir: { value: new Vector3(-0.4, 0.8, -0.45).normalize() },
    uKeyColor: { value: new Color(0, 0, 0) },
    uAmbSky: { value: new Color(0, 0, 0) },
    uAmbGround: { value: new Color(0, 0, 0) },
    uLampPos: { value: new Vector3(-1.7, 2.75, 2.1) },
    uLampColor: { value: new Color(0, 0, 0) },
    uFogColor: { value: new Color(0, 0, 0) },
    uFogDensity: { value: 0.01 },
    uNight: { value: 1 },
  };
}

const [, S1, S2, S3] = SKY_STOPS;

/** Deklarasi uniform bersama + fungsi langit, cahaya, dan kabut. Disisipkan di awal tiap shader. */
export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSky[5];
uniform vec3 uSunDir;
uniform float uSunDisc;
uniform float uWarm;
uniform float uSunScale;
uniform float uStars;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform vec3 uAmbSky;
uniform vec3 uAmbGround;
uniform vec3 uLampPos;
uniform vec3 uLampColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uNight;

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

/* Warna langit menurut arah pandang: gradien cakrawala → zenit + pendar di sekitar matahari. */
vec3 skyColor(vec3 dir) {
  float e = pow(asin(clamp(dir.y, 0.0, 1.0)) * 0.63662, 0.45);
  vec3 c = mix(uSky[0], uSky[1], smoothstep(0.0, ${S1.toFixed(2)}, e));
  c = mix(c, uSky[2], smoothstep(${S1.toFixed(2)}, ${S2.toFixed(2)}, e));
  c = mix(c, uSky[3], smoothstep(${S2.toFixed(2)}, ${S3.toFixed(2)}, e));
  c = mix(c, uSky[4], smoothstep(${S3.toFixed(2)}, 1.0, e));
  float d = max(dot(dir, uSunDir), 0.0);
  vec3 tint = mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.5, 0.2), uWarm);
  float halo = pow(d, 18.0) * 0.22 + pow(d, 160.0) * 0.7;
  c += tint * halo * uSunDisc * (0.5 + uWarm);
  return c;
}

/* Cahaya sekitar dari langit dan pantulan tanah. */
vec3 hemi(vec3 n) { return mix(uAmbGround, uAmbSky, n.y * 0.5 + 0.5); }

/* Blencong: lampu titik hangat; redup menurut jarak. Mengisi arah datangnya ke L. */
vec3 lampAt(vec3 wp, out vec3 L) {
  vec3 d = uLampPos - wp;
  float r2 = dot(d, d);
  L = d * inversesqrt(max(r2, 1e-4));
  return uLampColor / (1.0 + 0.22 * r2);
}

/* Difus: sekitar + kunci (matahari/bulan) + blencong. */
vec3 diffuseLight(vec3 n, vec3 wp) {
  vec3 L;
  vec3 lamp = lampAt(wp, L);
  return hemi(n) + uKeyColor * max(dot(n, uKeyDir), 0.0) + lamp * max(dot(n, L), 0.0);
}

/* Kilap Blinn-Phong dari kunci + blencong. */
vec3 specLight(vec3 n, vec3 v, vec3 wp, float shininess) {
  vec3 L;
  vec3 lamp = lampAt(wp, L);
  float a = pow(max(dot(n, normalize(L + v)), 0.0), shininess);
  float b = pow(max(dot(n, normalize(uKeyDir + v)), 0.0), shininess);
  return (lamp * a * step(0.0, dot(n, L)) + uKeyColor * b * step(0.0, dot(n, uKeyDir))) * (shininess + 8.0) * 0.0398;
}

/* Kabut: dekat memakai warna kabut, jauh melebur ke warna langit di cakrawala arah itu (tak ada garis sambungan). */
vec3 applyFog(vec3 c, vec3 wp) {
  vec3 v = wp - cameraPosition;
  float d = length(v);
  float f = 1.0 - exp(-uFogDensity * d);
  vec3 dir = v / max(d, 1e-4);
  vec3 far = skyColor(normalize(vec3(dir.x, 0.012, dir.z)));
  return mix(c, mix(uFogColor, far, smoothstep(30.0, 420.0, d)), f);
}
`;
