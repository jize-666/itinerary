/**
 * Pendapa: lantai batu berhias kawung emas di atas dua undakan, empat saka guru berpernis merah-emas di atas
 * umpak, dan blandar yang mengikat puncaknya. Tanpa atap, supaya langit dan Lawu tetap terlihat.
 * Semua pola digambar shader (tanpa tekstur): tajam di layar retina, tanpa memori tekstur.
 */
import { BoxGeometry, type BufferGeometry, CylinderGeometry, Group, Mesh, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GONG_SHADOW } from "./gong";
import { COMMON, type Shared } from "./shared";

/** `cross` = letak balok tumpang sari (±x dan ±z) yang menyilang di antara blandar; blencong digantung di salah satu silangannya. */
export const PENDAPA = { half: 4.7, pillar: 3.5, height: 4.4, cross: 1.7 } as const;

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = mat3(modelMatrix) * normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FLOOR_FRAG = /* glsl */ `
${COMMON}
${GONG_SHADOW}
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float top = step(0.5, n.y);

  // batu gelap berurat halus
  float grain = fbm(vWorld.xz * 2.2) * 0.6 + fbm(vWorld.xz * 11.0) * 0.4;
  vec3 stone = mix(vec3(0.012, 0.014, 0.03), vec3(0.03, 0.032, 0.058), grain);

  // kawung: lingkaran di titik kisi dan di tengah petak, saling mengunci; garis emas tipis
  vec2 uv = vWorld.xz / 0.92;
  // lebar tepi garis ≥ sedikit di atas nol: di sisi tegak turunannya nol, dan smoothstep dengan dua batas sama tak terdefinisi
  float w = max(max(fwidth(uv.x), fwidth(uv.y)) * 1.3, 0.002);
  float d = min(abs(length(fract(uv) - 0.5) - 0.5), abs(length(fract(uv + 0.5) - 0.5) - 0.5));
  float line = smoothstep(0.02 + w, 0.02, d);
  // titik di tengah tiap kelopak
  vec2 q = fract(uv * 2.0 + 0.5) - 0.5;
  float dot4 = smoothstep(0.055 + w, 0.055, length(q));
  // bingkai tepi lantai
  float edge = max(abs(vWorld.x), abs(vWorld.z));
  float band = smoothstep(0.02 + w, 0.02, abs(edge - 4.42)) + smoothstep(0.012 + w, 0.012, abs(edge - 4.3));
  float gold = clamp(max(line, dot4 * 0.8) * step(edge, 4.3) + band, 0.0, 1.0) * top;

  vec3 goldCol = vec3(0.78, 0.55, 0.2);
  // pola memudar di kejauhan dan di sudut landai, supaya lantai tidak ramai di belakang teks
  float calm = 1.0 - 0.75 * smoothstep(5.0, 16.0, length(cameraPosition - vWorld));
  gold *= calm;
  vec3 albedo = mix(stone, goldCol * 0.2, gold);
  // gong dan gayor membayangi cahaya blencong; kaki tiangnya menggelapkan lantai di sekitarnya
  float shade = mix(1.0, gongShade(vWorld), top);
  float contact = mix(1.0, gongContact(vWorld), top);
  vec3 L;
  vec3 lamp = lampAt(vWorld, L);
  vec3 col = albedo * (hemi(n) * contact + uKeyColor * max(dot(n, uKeyDir), 0.0) + lamp * max(dot(n, L), 0.0) * shade);

  // batu dipoles: memantulkan langit di sudut landai, emas berkilat
  float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 refl = skyColor(reflect(-v, n));
  col += refl * mix(0.02 + 0.32 * fres, 0.26, gold) * mix(vec3(1.0), goldCol, gold) * top * contact;
  col += specLight(n, v, vWorld, mix(90.0, 46.0, gold)) * mix(vec3(0.2), goldCol * 1.1, gold) * mix(0.25, 1.0, shade);

  // bayangan kontak di kaki saka
  vec2 pc = abs(vWorld.xz) - 3.5;
  col *= 1.0 - 0.6 * smoothstep(0.75, 0.1, length(pc)) * top;

  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

const WOOD_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float y = vWorld.y;
  // umpak batu di bawah, pernis merah darah di atas
  float isStone = 1.0 - smoothstep(0.5, 0.52, y);
  vec3 lak = mix(vec3(0.11, 0.012, 0.012), vec3(0.2, 0.025, 0.02), fbm(vec2(y * 3.0, vLocal.x * 9.0 + vLocal.z * 7.0)));
  vec3 stone = vec3(0.05, 0.05, 0.07) * (0.7 + 0.6 * fbm(vWorld.xy * 6.0));

  // gelang emas dan lung-lungan (sulur bergelombang) di badan saka
  float w = max(fwidth(y) * 1.5, 0.002);
  float rings = 0.0;
  rings += smoothstep(0.035 + w, 0.035, abs(y - 0.62));
  rings += smoothstep(0.02 + w, 0.02, abs(y - 0.74));
  rings += smoothstep(0.035 + w, 0.035, abs(y - 3.86));
  rings += smoothstep(0.02 + w, 0.02, abs(y - 3.74));
  rings += smoothstep(0.02 + w, 0.02, abs(y - 2.2)) + smoothstep(0.02 + w, 0.02, abs(y - 2.36));
  float side = abs(n.x) > abs(n.z) ? vLocal.z : vLocal.x;
  float wave = sin(y * 9.0) * 0.07;
  float vine = smoothstep(0.014 + w, 0.014, abs(side - wave)) * step(0.8, y) * step(y, 3.7) * step(abs(n.y), 0.5);
  float curl = smoothstep(0.03 + w, 0.03, length(vec2(side - wave * 1.8, fract(y * 1.43) - 0.5) * vec2(1.0, 0.35)) - 0.035) * step(0.8, y) * step(y, 3.7) * step(abs(n.y), 0.5);
  // blandar: garis emas memanjang
  float beam = step(${(4.4 - 0.2).toFixed(2)}, y);
  float along = smoothstep(0.012 + w, 0.012, abs(y - 4.33)) + smoothstep(0.012 + w, 0.012, abs(y - 4.47));
  float gold = clamp((rings + vine + curl * 0.8) * (1.0 - isStone) * (1.0 - beam) + along * beam, 0.0, 1.0);

  vec3 goldCol = vec3(0.8, 0.56, 0.2);
  vec3 albedo = mix(mix(lak, stone, isStone), goldCol * 0.4, gold);
  vec3 col = albedo * diffuseLight(n, vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  col += skyColor(reflect(-v, n)) * (0.04 + 0.3 * fres) * mix(vec3(1.0, 0.5, 0.45), goldCol * 1.6, gold) * (1.0 - isStone);
  col += specLight(n, v, vWorld, mix(60.0, 40.0, gold)) * mix(vec3(0.35, 0.16, 0.14), goldCol * 1.8, gold) * (1.0 - 0.7 * isStone);

  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}`;

const at = (g: BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

export function createPendapa(shared: Shared) {
  const group = new Group();
  const { half, pillar: p, height: h } = PENDAPA;

  // lantai + dua undakan
  const floorGeo = mergeGeometries([
    at(new BoxGeometry(half * 2, 0.5, half * 2), 0, -0.25, 0),
    at(new BoxGeometry(half * 2 + 1.5, 0.3, half * 2 + 1.5), 0, -0.4, 0),
    at(new BoxGeometry(half * 2 + 3, 0.3, half * 2 + 3), 0, -0.62, 0),
  ]);
  const floorMat = new ShaderMaterial({ uniforms: { ...shared }, vertexShader: VERT, fragmentShader: FLOOR_FRAG });
  const floor = new Mesh(floorGeo, floorMat);

  // saka guru + umpak + blandar
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(at(new BoxGeometry(0.3, h - 0.5, 0.3), sx * p, 0.5 + (h - 0.5) / 2, sz * p));
      // umpak: limas terpancung
      parts.push(at(new CylinderGeometry(0.24, 0.36, 0.5, 4, 1).rotateY(Math.PI / 4), sx * p, 0.25, sz * p));
    }
  }
  const span = p * 2 + 0.7;
  for (const s of [-1, 1]) {
    parts.push(at(new BoxGeometry(span, 0.4, 0.3), 0, h, s * p));
    parts.push(at(new BoxGeometry(0.3, 0.4, span), s * p, h, 0));
  }
  // tumpang sari: empat balok ramping yang menyilang, membingkai langit di atas gong
  for (const s of [-1, 1]) {
    parts.push(at(new BoxGeometry(span - 0.3, 0.26, 0.2), 0, h + 0.02, s * PENDAPA.cross));
    parts.push(at(new BoxGeometry(0.2, 0.26, span - 0.3), s * PENDAPA.cross, h + 0.02, 0));
  }
  const woodGeo = mergeGeometries(parts);
  const woodMat = new ShaderMaterial({ uniforms: { ...shared }, vertexShader: VERT, fragmentShader: WOOD_FRAG });
  const wood = new Mesh(woodGeo, woodMat);

  for (const m of [floor, wood]) {
    m.matrixAutoUpdate = false;
    group.add(m);
  }
  return {
    group,
    dispose() {
      floorGeo.dispose();
      woodGeo.dispose();
      floorMat.dispose();
      woodMat.dispose();
    },
  };
}
