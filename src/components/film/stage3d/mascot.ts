/**
 * Maskot pemandu 3D (permintaan host 15 Nov: "ini wujud baru mu di website itinerary … upgrade design 3D ini … lebih
 * berekspresi, interactive, lebih lucu", lalu foto boneka maskot Claude: "ini lebih lucu, bisa jadi acuan
 * preferensi"). Bentuknya mengikuti foto itu:
 *  - badan kubus montok sedikit lebih tinggi dari lebarnya, sudut membulat besar seperti tanah liat, terakota doff;
 *  - wajah tanpa mulut: dua mata hitam kecil mengilap agak di bawah tengah, alis pendek tebal melengkung, pipi bulat
 *    merah muda (tampak juga saat netral); senang = mata chevron ^ ^;
 *  - dua lengan berupa tonjolan pendek di bagian bawah samping badan;
 *  - empat kaki kotak pendek berjajar di bawah bagian depan badan.
 * Dibangun dari kode supaya ekspresinya hidup tanpa mengubah bentuk: wajah digambar shader di muka depan badan (satu
 * draw call) sehingga mata berkedip, melirik, dan berubah mulus antar ekspresi (ekspresi dari paket coral-assistant,
 * `engine/mascot/face.ts`); lengan dan kaki satu draw call (instancing) yang digerakkan pose prosedural dengan
 * squash & stretch berpegas; partikel emosi satu draw call. Cahayanya memakai uniform panggung (langit, blencong,
 * kilatan gong) ditambah cahaya isi sendiri, jadi menyatu dengan adegan tetapi tidak tenggelam dalam gelap.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, Points, ShaderMaterial, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { approachFace, BLINK, blinkOpen, type Face, faceOf, type Mood, nextBlink } from "@/engine/mascot/face";
import { mixPose, type Motion, type Pose, poseAt } from "@/engine/mascot/pose";
import { COMMON, type Shared } from "./shared";

/** Badan (satuan maskot: lebar badan = 1): lebar, tinggi, tebal, jari-jari sudut. */
export const BODY = { w: 1, h: 1.08, d: 0.94, r: 0.2 } as const;
/** Lengan: tonjolan pendek di bagian bawah samping badan (sendi di tepi badan). */
const ARM = { x: 0.46, y: -0.21, size: [0.17, 0.24, 0.2] as const, out: 0.11 };
/** Kaki: empat kotak pendek berjajar di bawah bagian depan badan. */
const LEG = { y: -0.5, z: 0.16, size: [0.13, 0.24, 0.14] as const, hang: 0.1 };
const LEG_X = [-0.33, -0.11, 0.11, 0.33] as const;
/** Titik tengah wajah: sedikit di bawah tengah badan (mata di ±0,17). */
const FACE_Y = -0.07;
const EYE_X = 0.17;

const VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vObj = position;
  vObjN = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/* Cahaya maskot (tanah liat doff): cahaya panggung + isi lembut dari arah kamera + pinggiran hangat tipis. */
const LIGHT = /* glsl */ `
vec3 mascotLight(vec3 albedo, vec3 n, vec3 wp) {
  vec3 v = safeNormalize(cameraPosition - wp);
  float facing = max(dot(n, v), 0.0);
  vec3 fill = vec3(0.34, 0.3, 0.29) * (0.5 + 0.5 * facing) + vec3(0.06, 0.05, 0.08) * (n.y * 0.5 + 0.5);
  float rim = pow(clamp(1.0 - facing, 0.0, 1.0), 3.0);
  vec3 c = albedo * (diffuseLight(n, wp) * 0.8 + fill);
  c += rim * vec3(1.0, 0.66, 0.52) * 0.2;
  c += specLight(n, v, wp, 10.0) * 0.035;
  // dekat blencong badan tidak boleh melewati ambang bloom (berpendar seperti lampu): puncaknya dilunakkan
  float peak = max(c.r, max(c.g, c.b));
  return c / (1.0 + 0.8 * max(peak - 0.85, 0.0));
}`;

const BODY_FRAG = /* glsl */ `
${COMMON}
${LIGHT}
uniform vec4 uEye;   // skala x, skala y (sudah dikali kedip), senang, hati
uniform vec4 uBrow;  // tampak, naik, sudut, asimetri
uniform vec2 uLook;
uniform float uCheeks;
uniform float uTint;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vWorld;
varying vec3 vN;

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
/* Elips (aproksimasi jarak bertanda yang cukup untuk anti-alias). */
float sdEll(vec2 p, vec2 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-5);
}
/* Hati (Inigo Quilez), tanpa sqrt: jarak ditulis dengan length. */
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.353553;
  return min(length(p - vec2(0.0, 1.0)), length(p - 0.5 * max(p.x + p.y, 0.0))) * sign(p.x - p.y);
}

/* Satu mata: titik hitam kecil agak lonjong (× skala ekspresi), chevron ^ saat senang, hati saat sayang. */
float eye(vec2 q) {
  float dot0 = sdEll(q, vec2(0.044, 0.056) * max(uEye.xy, vec2(0.03)));
  float chev = min(sdSeg(q, vec2(-0.058, -0.026), vec2(0.0, 0.032)), sdSeg(q, vec2(0.0, 0.032), vec2(0.058, -0.026))) - 0.019;
  float heart = sdHeart((q - vec2(0.0, -0.064)) / 0.135) * 0.135;
  return mix(mix(dot0, chev, uEye.z), heart, uEye.w);
}

/* Alis: lengkung pendek tebal di atas mata (dua ruas), diputar mengelilingi tengahnya. side −1 kiri, 1 kanan. */
float brow(vec2 p, float side) {
  vec2 c = vec2(side * ${EYE_X.toFixed(3)} - side * 0.005, 0.105 + uBrow.y + max(-side, 0.0) * uBrow.w);
  // + sudut: ujung dalam turun (marah); ujung dalam kiri = +x, kanan = −x
  float a = -side * uBrow.z;
  float cs = cos(a), sn = sin(a);
  vec2 q = mat2(cs, sn, -sn, cs) * (p - c);
  return min(sdSeg(q, vec2(-0.046, -0.01), vec2(0.0, 0.007)), sdSeg(q, vec2(0.0, 0.007), vec2(0.046, -0.01))) - 0.017;
}

void main() {
  vec3 n = safeNormalize(vN);
  // terakota doff seperti boneka di foto acuan, sedikit lebih terang di atas; memerah saat marah
  vec3 albedo = mix(vec3(0.5, 0.165, 0.095), vec3(0.64, 0.225, 0.13), smoothstep(-0.54, 0.54, vObj.y));
  albedo = mix(albedo, vec3(0.9, 0.04, 0.03), uTint * (0.3 + 0.08 * sin(uTime * 9.0)));
  vec3 col = mascotLight(albedo, n, vWorld);

  // wajah hanya di muka depan
  float onFace = smoothstep(0.6, 0.9, vObjN.z);
  if (onFace > 0.0) {
    vec2 p = vObj.xy - vec2(0.0, ${FACE_Y.toFixed(3)});
    float aa = max(fwidth(p.x), 1e-4) * 1.2;
    vec2 look = uLook * vec2(0.022, 0.016);
    vec3 lit = mascotLight(vec3(1.0), n, vWorld);
    float shade = clamp(dot(lit, vec3(0.333)), 0.35, 1.4);
    float ink = 0.0;
    float heartCol = 0.0;
    float cheek = 0.0;
    float gloss = 0.0;
    for (int i = 0; i < 2; i++) {
      float side = i == 0 ? -1.0 : 1.0;
      vec2 q = p - vec2(side * ${EYE_X.toFixed(3)}, 0.0) - look;
      float a = 1.0 - smoothstep(-aa, aa, eye(q));
      ink = max(ink, a * (1.0 - uEye.w));
      heartCol = max(heartCol, a * uEye.w);
      // kilau kecil di mata hitam yang mengilap (hanya mata titik yang terbuka)
      float showG = (1.0 - uEye.z) * (1.0 - uEye.w) * smoothstep(0.45, 0.8, uEye.y);
      gloss = max(gloss, (1.0 - smoothstep(-aa, aa, length(q - vec2(-0.012, 0.018) * uEye.xy) - 0.011)) * a * showG);
      ink = max(ink, (1.0 - smoothstep(-aa, aa, brow(p - look * 0.6, side))) * uBrow.x);
      // pipi bulat merah muda di bawah sisi luar mata
      float cd = length(p - vec2(side * 0.29, -0.08) - look * 0.4) - 0.066;
      cheek = max(cheek, 1.0 - smoothstep(-aa * 2.0, aa * 2.0, cd));
    }
    vec3 inkCol = vec3(0.016, 0.011, 0.013) * (0.8 + 0.2 * shade);
    col = mix(col, vec3(0.95, 0.4, 0.33) * shade * 0.82, cheek * uCheeks * onFace);
    col = mix(col, inkCol, ink * onFace);
    col = mix(col, vec3(1.25, 0.08, 0.2) * max(shade, 0.8), heartCol * onFace);
    col = mix(col, vec3(1.3), gloss * onFace);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const LIMB_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vN;
varying float vY;
void main() {
  vY = position.y;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const LIMB_FRAG = /* glsl */ `
${COMMON}
${LIGHT}
uniform float uTint;
varying vec3 vWorld;
varying vec3 vN;
varying float vY;
void main() {
  vec3 albedo = mix(vec3(0.45, 0.15, 0.085), vec3(0.6, 0.21, 0.12), smoothstep(-0.5, 0.5, vY));
  albedo = mix(albedo, vec3(0.9, 0.04, 0.03), uTint * 0.22);
  gl_FragColor = vec4(mascotLight(albedo, safeNormalize(vN), vWorld), 1.0);
}`;

/** Jenis partikel emosi. */
export const EMOTE = { z: 0, heart: 1, sparkle: 2, anger: 3, sweat: 4, bang: 5, ask: 6, puff: 7 } as const;
type EmoteKind = keyof typeof EMOTE;

const EMOTE_VERT = /* glsl */ `
attribute vec4 aEmote; // jenis, kadar tampak, ukuran (m), putaran
uniform float uPixel;
varying vec4 vEmote;
void main() {
  vEmote = aEmote;
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aEmote.z * uPixel / max(-mv.z, 0.05), 0.0, 160.0);
}`;

const EMOTE_FRAG = /* glsl */ `
varying vec4 vEmote;
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.353553;
  return min(length(p - vec2(0.0, 1.0)), length(p - 0.5 * max(p.x + p.y, 0.0))) * sign(p.x - p.y);
}
void main() {
  if (vEmote.y <= 0.001) discard;
  vec2 p = (gl_PointCoord - 0.5) * vec2(2.0, -2.0);
  float c = cos(vEmote.w), s = sin(vEmote.w);
  p = mat2(c, -s, s, c) * p;
  float kind = vEmote.x;
  float aa = max(fwidth(p.x), 1e-3) * 1.2;
  float d = 1.0;
  vec3 col = vec3(1.0);
  vec3 edge = vec3(0.05, 0.03, 0.05);
  if (kind < 0.5) {
    // z
    d = min(min(sdSeg(p, vec2(-0.45, 0.45), vec2(0.45, 0.45)), sdSeg(p, vec2(0.45, 0.45), vec2(-0.45, -0.45))), sdSeg(p, vec2(-0.45, -0.45), vec2(0.45, -0.45))) - 0.14;
    col = vec3(0.75, 0.85, 1.2);
  } else if (kind < 1.5) {
    d = sdHeart(p * 1.15 + vec2(0.0, 0.55)) / 1.15;
    col = vec3(1.4, 0.16, 0.32);
  } else if (kind < 2.5) {
    // kilau bintang empat sudut
    vec2 a = abs(p);
    d = min(max(a.x * 3.2 + a.y * 0.9, a.y), max(a.y * 3.2 + a.x * 0.9, a.x)) - 0.75;
    col = vec3(1.7, 1.35, 0.55);
  } else if (kind < 3.5) {
    // tanda marah: empat urat melengkung di tiap kuadran, cembung ke pusat, terputus di sumbu
    vec2 a = abs(p);
    float arc = abs(length(a - vec2(0.92)) - 0.66) - 0.11;
    d = max(max(arc, 0.13 - min(a.x, a.y)), length(a) - 0.9);
    col = vec3(1.5, 0.08, 0.06);
  } else if (kind < 4.5) {
    // keringat: tetes
    d = max(length(p + vec2(0.0, 0.25)) - 0.55, dot(vec2(abs(p.x), p.y - 0.85), vec2(0.894, 0.447)));
    col = vec3(0.45, 0.8, 1.4);
  } else if (kind < 5.5) {
    d = min(sdSeg(p, vec2(0.0, 0.85), vec2(0.0, -0.2)) - 0.16, length(p - vec2(0.0, -0.68)) - 0.17);
    col = vec3(1.6, 1.1, 0.25);
  } else if (kind < 6.5) {
    // tanda tanya
    float hook = abs(length(p - vec2(0.0, 0.38)) - 0.36) - 0.13;
    hook = max(hook, -(p.y - 0.38) - max(p.x, 0.0) * 1.4);
    d = min(min(hook, sdSeg(p, vec2(0.04, 0.03), vec2(0.0, -0.22)) - 0.13), length(p - vec2(0.0, -0.66)) - 0.15);
    col = vec3(0.6, 1.0, 1.5);
  } else {
    // kepulan uap
    d = min(min(length(p - vec2(-0.3, -0.1)) - 0.42, length(p - vec2(0.3, -0.05)) - 0.4), length(p - vec2(0.0, 0.3)) - 0.42);
    col = vec3(0.8, 0.8, 0.85);
  }
  float body = 1.0 - smoothstep(-aa, aa, d);
  float outline = 1.0 - smoothstep(-aa, aa, d - 0.12);
  float a = max(body, outline) * vEmote.y;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(mix(edge, col, body) * a, a);
}`;

/** Satu partikel emosi yang sedang hidup. */
type Emote = { kind: EmoteKind; born: number; life: number; from: Vector3; drift: Vector3; size: number; spin: number; pop: boolean };

/** Bagian tubuh dalam InstancedMesh: dua lengan dan empat kaki. */
const PARTS = 6;

export type MascotInput = {
  t: number;
  dt: number;
  /** Letak maskot di dunia (titik tengah badan). */
  pos: Vector3;
  /** Titik yang dihadapi wajah (biasanya kamera). */
  face: Vector3;
  /** Arah terbang (dunia) bila sedang terbang, untuk condong dan berpaling; null bila diam. */
  travel: Vector3 | null;
  /** Tinggi badan di dunia (m). */
  size: number;
  mood: Mood;
  motion: Motion;
  motionSince: number;
  /** Arah lirikan mata −1…1. */
  look: { x: number; y: number };
};

export function createMascot(shared: Shared) {
  const root = new Group();
  root.name = "mascot";
  const body = new Group();
  root.add(body);

  // ---- badan + wajah ----
  const faceU = {
    uEye: { value: [1, 1, 0, 0] as [number, number, number, number] },
    uBrow: { value: [1, 0, 0, 0] as [number, number, number, number] },
    uLook: { value: [0, 0] as [number, number] },
    uCheeks: { value: 0 },
    uTint: { value: 0 },
  };
  const bodyMat = new ShaderMaterial({ uniforms: { ...shared, ...faceU }, vertexShader: VERT, fragmentShader: BODY_FRAG });
  const bodyMesh = new Mesh(new RoundedBoxGeometry(BODY.w, BODY.h, BODY.d, 5, BODY.r), bodyMat);
  bodyMesh.name = "mascot-body";
  body.add(bodyMesh);

  // ---- lengan dan kaki: satu kubus satuan bersudut bulat, diskalakan per bagian ----
  const partGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.2);
  const limbMat = new ShaderMaterial({ uniforms: { ...shared, uTint: faceU.uTint }, vertexShader: LIMB_VERT, fragmentShader: LIMB_FRAG });
  const limbs = new InstancedMesh(partGeo, limbMat, PARTS);
  limbs.instanceMatrix.setUsage(DynamicDrawUsage);
  limbs.frustumCulled = false;
  limbs.name = "mascot-limbs";
  body.add(limbs);

  // ---- partikel emosi ----
  const POOL = 14;
  const emoteGeo = new BufferGeometry();
  const ePos = new Float32Array(POOL * 3);
  const eAttr = new Float32Array(POOL * 4);
  const posAttr = new BufferAttribute(ePos, 3).setUsage(DynamicDrawUsage);
  const emAttr = new BufferAttribute(eAttr, 4).setUsage(DynamicDrawUsage);
  emoteGeo.setAttribute("position", posAttr);
  emoteGeo.setAttribute("aEmote", emAttr);
  const uPixel = { value: 800 };
  const emoteMat = new ShaderMaterial({ uniforms: { uPixel }, vertexShader: EMOTE_VERT, fragmentShader: EMOTE_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true });
  const emotes = new Points(emoteGeo, emoteMat);
  emotes.frustumCulled = false;
  emotes.renderOrder = 40;
  emotes.name = "mascot-emotes";

  // ---- keadaan gerak ----
  let face: Face = faceOf("neutral");
  let blinkAt = 2;
  let blinkPair = false;
  let lastMotion: Motion = "hover";
  let lastSince = 0;
  let prevPose: Pose | null = null;
  let blendFrom = -10;
  /** Pegas squash & stretch. */
  let squash = 0;
  let squashV = 0;
  let yaw = 0;
  const live: Emote[] = [];
  let lastMood: Mood = "neutral";
  let nextAmbient = 0;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const look = { x: 0, y: 0 };

  const v = new Vector3();
  const s = new Vector3();
  const pivot = new Matrix4();
  const rz4 = new Matrix4();
  const rx4 = new Matrix4();
  const off = new Matrix4();
  const m4 = new Matrix4();

  /**
   * Pasang satu bagian (tanpa alokasi per frame): sendinya di `at` (koordinat badan), diputar mengelilingi z lalu x,
   * dan kotaknya menggantung sejauh `hang` ke arah −y lokal.
   */
  const place = (i: number, at: readonly [number, number, number], rx: number, rz: number, size: readonly [number, number, number], hang: number) => {
    pivot.makeTranslation(at[0], at[1], at[2]);
    pivot.multiply(rz4.makeRotationZ(rz)).multiply(rx4.makeRotationX(rx));
    pivot.multiply(off.makeTranslation(0, -hang, 0)).multiply(m4.makeScale(size[0], size[1], size[2]));
    limbs.setMatrixAt(i, pivot);
  };

  /** Lahirkan partikel emosi di atas kepala. */
  const spawn = (kind: EmoteKind, t: number, opts: Partial<Pick<Emote, "life" | "size" | "pop">> & { dx?: number; dy?: number } = {}) => {
    if (live.length >= POOL) live.shift();
    const side = rand() < 0.5 ? -1 : 1;
    live.push({
      kind,
      born: t,
      life: opts.life ?? 1.6,
      from: new Vector3(opts.dx ?? side * (0.25 + 0.25 * rand()), BODY.h / 2 + 0.12 + (opts.dy ?? 0), 0.1),
      drift: new Vector3(side * (0.15 + 0.2 * rand()), 0.55 + 0.35 * rand(), 0),
      size: opts.size ?? 0.26,
      spin: (rand() - 0.5) * 0.6,
      pop: opts.pop ?? false,
    });
  };

  /** Partikel saat suasana hati baru dimulai, dan selama ia berlangsung. */
  const moodEmotes = (mood: Mood, t: number, fresh: boolean) => {
    if (fresh) {
      if (mood === "happy") for (let i = 0; i < 4; i++) spawn(i % 2 ? "sparkle" : "heart", t, { size: 0.22 + 0.06 * i });
      if (mood === "love") for (let i = 0; i < 5; i++) spawn("heart", t, { size: 0.2 + 0.05 * i, life: 2 });
      if (mood === "angry") {
        spawn("anger", t, { dx: 0.42, dy: 0.05, life: 5.5, size: 0.3, pop: true });
        spawn("puff", t, { dx: -0.3, size: 0.28, life: 1.1 });
        spawn("puff", t, { dx: 0.3, size: 0.24, life: 1.2 });
      }
      if (mood === "surprised") {
        spawn("bang", t, { dx: 0, dy: 0.12, life: 1.1, size: 0.34, pop: true });
        spawn("sweat", t, { dx: 0.5, dy: -0.25, life: 1.2, size: 0.18 });
      }
      if (mood === "curious") spawn("ask", t, { dx: 0.38, dy: 0.05, life: 1.4, size: 0.28, pop: true });
      nextAmbient = t + 0.6;
      return;
    }
    if (t < nextAmbient) return;
    if (mood === "sleeping") {
      spawn("z", t, { dx: 0.3 + 0.1 * rand(), size: 0.16 + 0.1 * rand(), life: 2.4 });
      nextAmbient = t + 1.1;
    } else if (mood === "sleepy") {
      spawn("z", t, { dx: 0.35, size: 0.13, life: 1.8 });
      nextAmbient = t + 2.6;
    } else if (mood === "love" || mood === "happy") {
      spawn(mood === "love" ? "heart" : "sparkle", t, { size: 0.16 + 0.08 * rand(), life: 1.6 });
      nextAmbient = t + (mood === "love" ? 0.55 : 0.9);
    } else if (mood === "angry") {
      spawn("puff", t, { dx: (rand() - 0.5) * 0.7, size: 0.2 + 0.08 * rand(), life: 1 });
      nextAmbient = t + 0.45;
    } else nextAmbient = t + 1;
  };

  return {
    root,
    emotes,
    /** Ketuk/klik: badan memantul ("boing"). */
    poke(strength = 1) {
      squashV -= 9 * strength;
    },
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2): ukuran partikel mengikuti lensa dan resolusi. */
    setPixel(px: number) {
      uPixel.value = px;
    },
    update(input: MascotInput) {
      const { t, dt } = input;
      // ---- wajah: menuju suasana hati, berkedip, melirik ----
      if (input.mood !== lastMood) {
        lastMood = input.mood;
        moodEmotes(input.mood, t, true);
        if (input.mood === "surprised" || input.mood === "angry") squashV -= 6;
        if (input.mood === "happy" || input.mood === "love") squashV += 5;
      } else moodEmotes(input.mood, t, false);
      face = approachFace(face, faceOf(input.mood), dt, input.mood === "surprised" ? 0.05 : 0.11);
      if (t >= blinkAt + BLINK.close + BLINK.open) {
        blinkAt = blinkPair ? t + 0.12 : nextBlink(t, rand());
        blinkPair = !blinkPair && rand() < BLINK.doubleChance;
      }
      const canBlink = input.mood !== "sleeping" && input.mood !== "sleepy";
      const blink = canBlink ? blinkOpen(t, blinkAt) : 1;
      look.x += (input.look.x - look.x) * Math.min(1, dt * 8);
      look.y += (input.look.y - look.y) * Math.min(1, dt * 8);
      faceU.uEye.value = [face.sx, face.sy * blink, face.happy, face.heart];
      faceU.uBrow.value = [face.brows, face.browY, face.browAngle, face.browAsym];
      faceU.uLook.value = [look.x, look.y];
      faceU.uCheeks.value = face.cheeks;
      faceU.uTint.value = face.tint;

      // ---- pose: gerakan baru dicampur dari pose sebelumnya selama 0,25 dtk ----
      if (input.motion !== lastMotion || input.motionSince !== lastSince) {
        prevPose = poseAt(lastMotion, t, lastSince);
        blendFrom = t;
        lastMotion = input.motion;
        lastSince = input.motionSince;
      }
      let pose = poseAt(input.motion, t, input.motionSince);
      const k = Math.min(1, (t - blendFrom) / 0.25);
      if (prevPose && k < 1) pose = mixPose(prevPose, pose, k * k * (3 - 2 * k));

      // pegas squash & stretch (dorongan dari ketukan dan pergantian suasana hati)
      const h = Math.min(dt, 1 / 30);
      squashV += (-220 * squash - 14 * squashV) * h;
      squash += squashV * h;
      const stretch = Math.max(0.6, pose.stretch * (1 + squash * 0.06));

      // ---- letak dan arah di dunia ----
      root.position.copy(input.pos);
      root.scale.setScalar(input.size / BODY.h);
      v.subVectors(input.face, input.pos);
      let goal = Math.atan2(v.x, v.z);
      if (input.travel && input.travel.lengthSq() > 1e-6) goal = Math.atan2(input.travel.x, input.travel.z) * 0.6 + goal * 0.4;
      let dy = goal - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      yaw += dy * Math.min(1, dt * 6);
      root.rotation.set(0, yaw, 0);
      body.position.set(0, pose.bob * BODY.h, 0);
      body.rotation.set(pose.tiltX, pose.spin, pose.tiltZ, "YXZ");
      const wide = 1 / Math.sqrt(stretch);
      body.scale.set(wide, stretch, wide);

      // ---- lengan dan kaki ----
      // lengan mencuat mendatar dari bagian bawah samping badan; "angkat" memutarnya ke atas, negatif terkulai
      place(0, [-ARM.x, ARM.y, 0.04], -pose.armL[1], -(Math.PI / 2 + pose.armL[0]), ARM.size, ARM.out);
      place(1, [ARM.x, ARM.y, 0.04], -pose.armR[1], Math.PI / 2 + pose.armR[0], ARM.size, ARM.out);
      LEG_X.forEach((x, i) => place(2 + i, [x, LEG.y, LEG.z], -pose.legs[i]!, 0, LEG.size, LEG.hang));
      limbs.instanceMatrix.needsUpdate = true;

      // ---- partikel emosi: naik dan memudar, dari kepala (mengikuti badan) ----
      root.updateMatrixWorld();
      for (let i = live.length - 1; i >= 0; i--) if (t - live[i]!.born > live[i]!.life) live.splice(i, 1);
      for (let i = 0; i < POOL; i++) {
        const em = live[i];
        if (!em) {
          eAttr[i * 4 + 1] = 0;
          continue;
        }
        const u = (t - em.born) / em.life;
        s.copy(em.from).addScaledVector(em.drift, em.pop ? 0.15 * Math.min(1, u * 4) : u);
        if (em.kind === "anger") s.x += 0.02 * Math.sin(t * 20);
        s.applyMatrix4(body.matrixWorld);
        ePos.set([s.x, s.y, s.z], i * 3);
        const appear = Math.min(1, u * (em.pop ? 10 : 5));
        const fade = 1 - Math.max(0, (u - 0.7) / 0.3);
        const popScale = em.pop ? 1 + 0.35 * Math.sin(Math.min(1, u * 6) * Math.PI) : 0.7 + 0.5 * u;
        eAttr.set([EMOTE[em.kind], appear * fade, em.size * input.size * popScale * (em.kind === "anger" ? 1 + 0.12 * Math.sin(t * 14) : 1), em.spin + (em.kind === "z" ? 0.3 : 0)], i * 4);
      }
      posAttr.needsUpdate = true;
      emAttr.needsUpdate = true;
    },
    dispose() {
      bodyMesh.geometry.dispose();
      bodyMat.dispose();
      partGeo.dispose();
      limbMat.dispose();
      emoteGeo.dispose();
      emoteMat.dispose();
    },
  };
}

export type MascotRig = ReturnType<typeof createMascot>;
