/**
 * Partikel emosi di sekitar kepala maskot pemandu: zzz, hati, kilau, tanda marah, keringat, "!", "?", dan kepulan
 * uap. Bukan bagian dari karakter (kit Claude tidak boleh ditambah antena atau aksesori), hanya tanda yang muncul dan
 * memudar di udara. Satu draw call (Points); bentuknya digambar shader dari jarak bertanda.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, type Matrix4, Points, ShaderMaterial, Vector3 } from "three";
import type { Mood } from "@/engine/mascot/face";

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
    col = vec3(0.7, 0.8, 1.05);
  } else if (kind < 1.5) {
    d = sdHeart(p * 1.15 + vec2(0.0, 0.55)) / 1.15;
    col = vec3(1.1, 0.14, 0.28);
  } else if (kind < 2.5) {
    // kilau bintang empat sudut
    vec2 a = abs(p);
    d = min(max(a.x * 3.2 + a.y * 0.9, a.y), max(a.y * 3.2 + a.x * 0.9, a.x)) - 0.75;
    col = vec3(1.25, 1.0, 0.45);
  } else if (kind < 3.5) {
    // tanda marah: empat urat melengkung di tiap kuadran, cembung ke pusat, terputus di sumbu
    vec2 a = abs(p);
    float arc = abs(length(a - vec2(0.92)) - 0.66) - 0.11;
    d = max(max(arc, 0.13 - min(a.x, a.y)), length(a) - 0.9);
    col = vec3(1.1, 0.07, 0.05);
  } else if (kind < 4.5) {
    // keringat: tetes
    d = max(length(p + vec2(0.0, 0.25)) - 0.55, dot(vec2(abs(p.x), p.y - 0.85), vec2(0.894, 0.447)));
    col = vec3(0.4, 0.7, 1.1);
  } else if (kind < 5.5) {
    d = min(sdSeg(p, vec2(0.0, 0.85), vec2(0.0, -0.2)) - 0.16, length(p - vec2(0.0, -0.68)) - 0.17);
    col = vec3(1.2, 0.85, 0.22);
  } else if (kind < 6.5) {
    // tanda tanya
    float hook = abs(length(p - vec2(0.0, 0.38)) - 0.36) - 0.13;
    hook = max(hook, -(p.y - 0.38) - max(p.x, 0.0) * 1.4);
    d = min(min(hook, sdSeg(p, vec2(0.04, 0.03), vec2(0.0, -0.22)) - 0.13), length(p - vec2(0.0, -0.66)) - 0.15);
    col = vec3(0.5, 0.85, 1.15);
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

/** Satu partikel emosi yang sedang hidup (letak dalam koordinat badan: tengah badan = 0, lebar badan = 2). */
type Emote = { kind: EmoteKind; born: number; life: number; from: Vector3; drift: Vector3; size: number; spin: number; pop: boolean };

/** Puncak badan dalam koordinat badan kit (tinggi badan 1,9). */
const TOP = 0.95;
const POOL = 14;

export function createEmotes() {
  const geo = new BufferGeometry();
  const pos = new Float32Array(POOL * 3);
  const attr = new Float32Array(POOL * 4);
  const posAttr = new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage);
  const emAttr = new BufferAttribute(attr, 4).setUsage(DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("aEmote", emAttr);
  const uPixel = { value: 800 };
  const mat = new ShaderMaterial({ uniforms: { uPixel }, vertexShader: EMOTE_VERT, fragmentShader: EMOTE_FRAG, transparent: true, depthWrite: false, premultipliedAlpha: true });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 40;
  points.name = "mascot-emotes";

  const live: Emote[] = [];
  let lastMood: Mood | null = null;
  let nextAmbient = 0;
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const s = new Vector3();

  const spawn = (kind: EmoteKind, t: number, opts: Partial<Pick<Emote, "life" | "size" | "pop">> & { dx?: number; dy?: number } = {}) => {
    if (live.length >= POOL) live.shift();
    const side = rand() < 0.5 ? -1 : 1;
    live.push({
      kind,
      born: t,
      life: opts.life ?? 1.6,
      from: new Vector3(opts.dx ?? side * (0.5 + 0.5 * rand()), TOP + 0.25 + (opts.dy ?? 0), 0.2),
      drift: new Vector3(side * (0.3 + 0.4 * rand()), 1.1 + 0.7 * rand(), 0),
      size: opts.size ?? 0.26,
      spin: (rand() - 0.5) * 0.6,
      pop: opts.pop ?? false,
    });
  };

  /** Partikel saat suasana hati baru dimulai, dan selama ia berlangsung. Ukuran dalam tinggi badan. */
  const moodEmotes = (mood: Mood, t: number, fresh: boolean) => {
    if (fresh) {
      if (mood === "happy") for (let i = 0; i < 4; i++) spawn(i % 2 ? "sparkle" : "heart", t, { size: 0.2 + 0.05 * i });
      if (mood === "love") for (let i = 0; i < 5; i++) spawn("heart", t, { size: 0.18 + 0.05 * i, life: 2 });
      if (mood === "angry") {
        spawn("anger", t, { dx: 0.85, dy: 0.1, life: 5.5, size: 0.28, pop: true });
        spawn("puff", t, { dx: -0.6, size: 0.24, life: 1.1 });
        spawn("puff", t, { dx: 0.6, size: 0.2, life: 1.2 });
      }
      if (mood === "surprised") {
        spawn("bang", t, { dx: 0, dy: 0.25, life: 1.1, size: 0.3, pop: true });
        spawn("sweat", t, { dx: 1.0, dy: -0.5, life: 1.2, size: 0.16 });
      }
      if (mood === "curious") spawn("ask", t, { dx: 0.8, dy: 0.1, life: 1.4, size: 0.26, pop: true });
      nextAmbient = t + 0.6;
      return;
    }
    if (t < nextAmbient) return;
    if (mood === "sleeping") {
      spawn("z", t, { dx: 0.6 + 0.2 * rand(), size: 0.14 + 0.09 * rand(), life: 2.4 });
      nextAmbient = t + 1.1;
    } else if (mood === "sleepy") {
      spawn("z", t, { dx: 0.7, size: 0.12, life: 1.8 });
      nextAmbient = t + 2.6;
    } else if (mood === "love" || mood === "happy") {
      spawn(mood === "love" ? "heart" : "sparkle", t, { size: 0.14 + 0.07 * rand(), life: 1.6 });
      nextAmbient = t + (mood === "love" ? 0.55 : 0.9);
    } else if (mood === "angry") {
      spawn("puff", t, { dx: (rand() - 0.5) * 1.4, size: 0.18 + 0.07 * rand(), life: 1 });
      nextAmbient = t + 0.45;
    } else nextAmbient = t + 1;
  };

  return {
    points,
    setPixel(px: number) {
      uPixel.value = px;
    },
    /**
     * Perbarui partikel pada jam `t`: `body` = matriks dunia badan (pusat badan, satuan kit), `height` = tinggi badan
     * di dunia (m), dipakai untuk ukuran partikel.
     */
    update(t: number, mood: Mood, body: Matrix4, height: number) {
      moodEmotes(mood, t, mood !== lastMood);
      lastMood = mood;
      for (let i = live.length - 1; i >= 0; i--) if (t - live[i]!.born > live[i]!.life) live.splice(i, 1);
      for (let i = 0; i < POOL; i++) {
        const em = live[i];
        if (!em) {
          attr[i * 4 + 1] = 0;
          continue;
        }
        const u = (t - em.born) / em.life;
        s.copy(em.from).addScaledVector(em.drift, em.pop ? 0.15 * Math.min(1, u * 4) : u);
        if (em.kind === "anger") s.x += 0.04 * Math.sin(t * 20);
        s.applyMatrix4(body);
        pos.set([s.x, s.y, s.z], i * 3);
        const appear = Math.min(1, u * (em.pop ? 10 : 5));
        const fade = 1 - Math.max(0, (u - 0.7) / 0.3);
        const popScale = em.pop ? 1 + 0.35 * Math.sin(Math.min(1, u * 6) * Math.PI) : 0.7 + 0.5 * u;
        attr.set([EMOTE[em.kind], appear * fade, em.size * height * popScale * (em.kind === "anger" ? 1 + 0.12 * Math.sin(t * 14) : 1), em.spin + (em.kind === "z" ? 0.3 : 0)], i * 4);
      }
      posAttr.needsUpdate = true;
      emAttr.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
