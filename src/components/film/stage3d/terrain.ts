/**
 * Lanskap: satu jala polar berpusat di pendapa (rapat di dekat, renggang di jauh), tinggi dari
 * `terrainHeight`. Shader menggambar petak sawah (sebagian tergenang), terasering, hutan lereng, dan kabut.
 * Lampu desa ada di village.ts.
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
      // sisi atas = sisi depan (berlawanan arah jarum jam dilihat dari atas)
      index.set([a, a + 1, b, a + 1, b + 1, b], n);
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
  float plot = fbm(vWorld.xz * 0.035);
  float flatness = (1.0 - smoothstep(0.015, 0.09, slope)) * (1.0 - smoothstep(0.0, 0.25, high));
  // petak sawah: kisi miring yang sedikit meliuk; tiap petak lain umur padinya, sebagian tergenang
  vec2 g = mat2(0.83, -0.56, 0.56, 0.83) * vWorld.xz / 12.0 + (fbm(vWorld.xz * 0.009) - 0.5) * 2.4;
  vec2 gi = floor(g), gf = fract(g);
  float gw = max(fwidth(g.x), fwidth(g.y));
  float keep = flatness * (1.0 - smoothstep(0.18, 0.55, gw)); // rapat di kejauhan: melebur ke warna rata-rata
  float age = hash21(gi);
  float bund = 1.0 - smoothstep(0.02, 0.05 + gw, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y)));
  float flooded = step(age, 0.24) * keep;
  vec3 padi = mix(vec3(0.03, 0.085, 0.022), vec3(0.14, 0.13, 0.032), smoothstep(0.24, 1.0, age));
  vec3 sawah = mix(vec3(0.045, 0.085, 0.04), vec3(0.11, 0.13, 0.045), plot);
  sawah = mix(sawah, padi, keep * 0.85);
  sawah = mix(sawah, vec3(0.02, 0.028, 0.03), flooded * 0.85);
  sawah *= 1.0 - 0.55 * bund * keep;
  vec3 hutan = mix(vec3(0.018, 0.045, 0.03), vec3(0.04, 0.075, 0.04), fbm(vWorld.xz * 0.09 + 4.0));
  vec3 batu = vec3(0.09, 0.085, 0.1);
  vec3 albedo = mix(sawah, hutan, clamp(high * 1.6 + smoothstep(0.02, 0.12, slope), 0.0, 1.0));
  albedo = mix(albedo, batu, smoothstep(0.55, 0.95, high) * 0.6);

  // terasering: garis kontur, memudar di kejauhan supaya tidak berkedip
  float lines = fract(vWorld.y * 1.25 + plot * 2.0);
  // tebal garis ±0,2 m mendatar: dalam satuan tinggi ia menipis di lereng landai (kalau tidak, garisnya melebar jadi pita)
  float half_ = 0.25 * sqrt(2.0 * slope);
  float w = fwidth(vWorld.y * 1.25) * 1.5 + 0.004;
  float ter = smoothstep(w, 0.0, abs(lines - 0.5) - half_) * smoothstep(0.004, 0.03, slope) * (1.0 - smoothstep(60.0, 260.0, dist)) * (1.0 - high);
  albedo *= 1.0 - 0.45 * ter;

  vec3 col = albedo * diffuseLight(n, vWorld);
  // petak tergenang memantulkan langit
  vec3 vd = v / max(dist, 1e-4);
  col += skyColor(reflect(-vd, vec3(0.0, 1.0, 0.0))) * flooded * (1.0 - bund) * (0.1 + 0.5 * pow(1.0 - max(vd.y, 0.0), 4.0));

  // kabut lembah: lebih pekat di tanah rendah
  col = applyFog(col, vWorld);
  float mist = (1.0 - exp(-dist * 0.004)) * exp(-max(vWorld.y - ${TERRAIN.plain.toFixed(1)}, 0.0) * 0.16) * 0.34 * (0.55 + 0.9 * fbm(vWorld.xz * 0.012 + vec2(uTime * 0.004, 0.0)));
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
