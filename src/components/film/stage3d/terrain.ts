/**
 * Lanskap: satu jala polar berpusat di pendapa (rapat di dekat, renggang di jauh), tinggi dari
 * `terrainHeight`. Shader menggambar terasering sawah, hutan lereng, lampu desa di malam hari, dan kabut.
 */
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial } from "three";
import { TERRAIN, terrainHeight, type TerrainShape } from "@/engine/stage/terrain";
import { COMMON, type Shared } from "./shared";

const RINGS = 60;
const SPOKES = 200;

export function terrainGeometry(shape: TerrainShape): BufferGeometry {
  const count = (RINGS + 1) * (SPOKES + 1);
  const pos = new Float32Array(count * 3);
  const nrm = new Float32Array(count * 3);
  const h = (x: number, z: number) => terrainHeight(x, z, shape);
  let k = 0;
  for (let i = 0; i <= RINGS; i++) {
    const r = TERRAIN.inner * Math.pow(TERRAIN.outer / TERRAIN.inner, i / RINGS);
    for (let j = 0; j <= SPOKES; j++) {
      const a = (j / SPOKES) * Math.PI * 2;
      const [x, z] = [r * Math.sin(a), -r * Math.cos(a)];
      const y = i === 0 ? -0.6 : h(x, z); // tepi dalam masuk ke bawah lantai pendapa
      pos.set([x, y, z], k);
      // normal dari selisih tinggi; langkahnya ikut jarak supaya gunung jauh tidak berbintik
      const e = Math.max(0.6, r * 0.02);
      const [dx, dz] = [h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)];
      const l = Math.hypot(dx, 2 * e, dz);
      nrm.set([-dx / l, (2 * e) / l, -dz / l], k);
      k += 3;
    }
  }
  const index = new Uint32Array(RINGS * SPOKES * 6);
  let n = 0;
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SPOKES; j++) {
      const a = i * (SPOKES + 1) + j;
      const b = a + SPOKES + 1;
      index.set([a, b, a + 1, a + 1, b, b + 1], n);
      n += 6;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("normal", new BufferAttribute(nrm, 3));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vWorld = position;
  vNormal = normal;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = cameraPosition - vWorld;
  float dist = length(v);
  float r = length(vWorld.xz);
  float slope = 1.0 - n.y;
  float high = smoothstep(-4.0, 26.0, vWorld.y);

  // dasar: sawah di dataran, hutan di lereng, batu di puncak
  float patch = fbm(vWorld.xz * 0.035);
  vec3 sawah = mix(vec3(0.045, 0.085, 0.04), vec3(0.11, 0.13, 0.045), patch);
  vec3 hutan = mix(vec3(0.018, 0.045, 0.03), vec3(0.04, 0.075, 0.04), fbm(vWorld.xz * 0.09 + 4.0));
  vec3 batu = vec3(0.09, 0.085, 0.1);
  vec3 albedo = mix(sawah, hutan, clamp(high * 1.6 + smoothstep(0.02, 0.12, slope), 0.0, 1.0));
  albedo = mix(albedo, batu, smoothstep(0.55, 0.95, high) * 0.6);

  // terasering: garis kontur, memudar di kejauhan supaya tidak berkedip
  float lines = fract(vWorld.y * 1.25 + patch * 2.0);
  float w = fwidth(vWorld.y * 1.25) * 1.5 + 0.02;
  float ter = smoothstep(w, 0.0, abs(lines - 0.5) - 0.02) * smoothstep(0.004, 0.03, slope) * (1.0 - smoothstep(60.0, 260.0, dist)) * (1.0 - high);
  albedo *= 1.0 - 0.45 * ter;

  vec3 col = albedo * diffuseLight(n, vWorld);

  // lampu desa: titik hangat di petak-petak dataran, hanya malam; ukurannya ikut jarak supaya tetap utuh
  vec2 cell = vWorld.xz / 13.0;
  vec2 id = floor(cell);
  vec2 rnd = hash22(id);
  float lit = step(0.83, hash21(id + 7.3)) * (1.0 - smoothstep(-7.5, -4.0, vWorld.y)) * smoothstep(34.0, 70.0, r) * (1.0 - smoothstep(330.0, 470.0, r));
  float rad = 0.028 + dist * 0.00042;
  float dl = length(fract(cell) - 0.25 - 0.5 * rnd);
  float glow = smoothstep(rad, rad * 0.25, dl) + 0.18 * smoothstep(rad * 4.0, 0.0, dl);
  float flick = 0.82 + 0.18 * sin(uTime * (1.3 + rnd.x * 2.0) + rnd.y * 40.0);
  col += mix(vec3(1.0, 0.62, 0.26), vec3(1.0, 0.82, 0.5), rnd.x) * glow * lit * flick * uNight * 3.2;

  // kabut lembah: lebih pekat di tanah rendah
  col = applyFog(col, vWorld);
  float mist = (1.0 - exp(-dist * 0.004)) * exp(-max(vWorld.y - ${TERRAIN.plain.toFixed(1)}, 0.0) * 0.16) * 0.55;
  col = mix(col, uFogColor * 1.15, mist * (1.0 - 0.6 * uNight));

  gl_FragColor = vec4(col, 1.0);
}`;

export function createTerrain(shared: Shared, shape: TerrainShape) {
  const material = new ShaderMaterial({ uniforms: { ...shared }, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new Mesh(terrainGeometry(shape), material);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  return {
    mesh,
    reshape(next: TerrainShape) {
      mesh.geometry.dispose();
      mesh.geometry = terrainGeometry(next);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
