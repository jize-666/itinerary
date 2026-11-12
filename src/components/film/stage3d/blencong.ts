/**
 * Blencong: lampu minyak dalang, digantung di kiri depan panggung. Wadah kuningan dari profil yang diputar,
 * rantai, nyala api (bidang yang selalu menghadap kamera), pendar, dan berkas cahaya ke arah gong.
 * Kuat cahayanya (uniform `uLampColor`) diatur dari Stage3D menurut suasana dan shot.
 */
import { AdditiveBlending, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COMMON, type Shared } from "./shared";

const BODY_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BODY_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 brass = vec3(0.72, 0.5, 0.2);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  // kuningan: pantulan langit + pijar dari nyala di atasnya
  vec3 col = brass * 0.25 * hemi(n) + skyColor(reflect(-v, n)) * brass * (0.5 + fres);
  col += uLampColor * brass * (0.09 * smoothstep(-0.2, 0.1, vWorld.y - uLampPos.y) + 0.03);
  col += specLight(n, v, vWorld, 50.0) * brass;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

const FLAME_VERT = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  // selalu menghadap kamera, tetap tegak
  vec4 c = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}`;

const FLAME_FRAG = /* glsl */ `
${COMMON}
uniform float uGlow;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - vec2(0.5, 0.22)) * vec2(2.0, 1.0);
  float t = uTime;
  // lidah api: lebar di bawah, runcing dan bergoyang di atas
  float sway = (vnoise(vec2(t * 3.1, p.y * 3.0)) - 0.5) * 0.5 * smoothstep(0.0, 0.7, p.y);
  float width = 0.2 * (1.0 - smoothstep(-0.05, 0.62 + 0.1 * vnoise(vec2(t * 5.0, 1.0)), p.y)) + 0.012;
  float body = smoothstep(width, width * 0.25, abs(p.x - sway * 0.25)) * smoothstep(-0.12, -0.02, p.y);
  vec3 flame = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.86, 0.5), smoothstep(0.1, 0.9, body)) * body * 7.0;
  // pendar lembut di sekeliling nyala
  float halo = exp(-dot(p * vec2(1.0, 0.85), p * vec2(1.0, 0.85)) * 6.0) * 0.7 + exp(-dot(p, p) * 1.3) * 0.12;
  vec3 col = (flame + vec3(1.0, 0.55, 0.2) * halo * 1.4) * uGlow;
  gl_FragColor = vec4(col, 1.0);
}`;

const SHAFT_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
void main() {
  vAlong = uv.y;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SHAFT_FRAG = /* glsl */ `
${COMMON}
uniform float uGlow;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // tepi kerucut memudar (dilihat menyamping), makin jauh dari lampu makin tipis
  float rim = pow(abs(dot(n, v)), 1.6);
  float fade = smoothstep(0.0, 0.12, vAlong) * pow(1.0 - vAlong, 1.4);
  float dust = 0.6 + 0.4 * fbm(vWorld.xy * 2.6 + vec2(uTime * 0.05, -uTime * 0.08));
  gl_FragColor = vec4(vec3(1.0, 0.6, 0.3) * rim * fade * dust * 0.16 * uGlow, 1.0);
}`;

export function createBlencong(shared: Shared, withShaft: boolean) {
  const group = new Group();
  const lamp = shared.uLampPos.value;
  const uGlow = { value: 1 };

  // wadah: mangkuk + cerat sumbu, digantung rantai
  const profile = [
    [0.0, -0.2],
    [0.07, -0.19],
    [0.16, -0.14],
    [0.2, -0.06],
    [0.185, -0.02],
    [0.12, -0.035],
    [0.03, -0.05],
    [0.0, -0.05],
  ].map(([x, y]) => new Vector2(x, y));
  const bodyGeo = mergeGeometries([
    new LatheGeometry(profile, 28),
    new CylinderGeometry(0.008, 0.008, 4, 5).translate(0.17, 2, 0),
    new CylinderGeometry(0.008, 0.008, 4, 5).translate(-0.17, 2, 0),
    new CylinderGeometry(0.012, 0.012, 0.36, 6).rotateZ(Math.PI / 2).translate(0, 0.02, 0),
  ]);
  const bodyMat = new ShaderMaterial({ uniforms: { ...shared }, vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, side: DoubleSide });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.copy(lamp).y -= 0.06;
  body.updateMatrix();
  body.matrixAutoUpdate = false;
  group.add(body);

  const flameMat = new ShaderMaterial({
    uniforms: { ...shared, uGlow, uSize: { value: 1.3 } },
    vertexShader: FLAME_VERT,
    fragmentShader: FLAME_FRAG,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const flame = new Mesh(new PlaneGeometry(1, 1), flameMat);
  flame.position.copy(lamp).y += 0.14;
  flame.updateMatrix();
  flame.matrixAutoUpdate = false;
  flame.frustumCulled = false;
  flame.renderOrder = 20;
  group.add(flame);

  let shaftMat: ShaderMaterial | null = null;
  if (withShaft) {
    // kerucut cahaya dari lampu ke lantai di depan gong
    const len = 3.6;
    const cone = new CylinderGeometry(0.05, 1.5, len, 40, 1, true).translate(0, -len / 2, 0);
    shaftMat = new ShaderMaterial({
      uniforms: { ...shared, uGlow },
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      side: DoubleSide,
    });
    const shaft = new Mesh(cone, shaftMat);
    shaft.position.copy(lamp);
    // condong ke pusat panggung
    shaft.rotation.set(-0.52, 0, -0.44);
    shaft.updateMatrix();
    shaft.matrixAutoUpdate = false;
    shaft.renderOrder = 19;
    group.add(shaft);
  }

  return {
    group,
    /** Kadar pijar nyala dan berkas (0–1,6), mengikuti kuat lampu. */
    setGlow(k: number) {
      uGlow.value = k;
    },
    dispose() {
      bodyGeo.dispose();
      bodyMat.dispose();
      flame.geometry.dispose();
      flameMat.dispose();
      shaftMat?.dispose();
    },
  };
}
