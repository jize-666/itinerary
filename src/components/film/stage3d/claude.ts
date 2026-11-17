/**
 * Karakter maskot pemandu dari `claude-3d-reference-kit` v4.0.0 milik host (arahan host 15 Nov: "update maskot").
 * Port setia `src/claude-character.js` kit itu: geometri, material, 12 ekspresi, dan gerak prosedural tidak diubah
 * (brief kit: "Pakai langsung … constructor … Jangan menggambar ulang model"). Bedanya hanya: TypeScript, impor addon
 * untuk three versi repo, dan klip GLB (AnimationClip) tidak ikut karena gerak dihitung prosedural.
 *
 * Satuan: lebar badan = 2,0; Y atas; depan +Z; titik asal di tengah lantai (telapak kaki).
 * Identitas yang dijaga kit: satu badan-kepala balok lebar berbevel tipis, oranye #F26D3D doff, dua lengan balok,
 * empat kaki sebaris di Z +0,10, dua mata arang, dua pipi peach, tanpa mulut. Ekspresi = pergantian mata/alis saja.
 */
import { CircleGeometry, DataTexture, ExtrudeGeometry, Group, LinearFilter, LinearMipmapLinearFilter, type Material, Mesh, MeshStandardMaterial, RepeatWrapping, RGBAFormat, Shape, SphereGeometry, Vector2 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BLINKABLE, EXPRESSIONS, type Expression } from "@/engine/mascot/face";
import { type BrowKind, browPoints, EYE_BOX, EYE_OVAL, EYE_STROKE, type EyeType, expressionShape, FACE_DIM, type Pt, strokeOutline } from "@/engine/mascot/kit-face";

export { BLINKABLE, EXPRESSIONS, type Expression };

export const PALETTE = Object.freeze({ body: "#F26D3D", eyes: "#242120", cheeks: "#F3A184" });
export const MOTIONS = Object.freeze(["still", "idle", "hover", "peek", "wave", "walk", "comfort"] as const);
export type KitMotion = (typeof MOTIONS)[number];
export const DIMENSIONS = Object.freeze({
  body: [2, 1.9, 1.4] as const,
  bodyCenter: [0, 1.47, 0] as const,
  bodyBevel: 0.065,
  arm: [0.52, 0.3, 0.42] as const,
  armPivotX: 0.98,
  armPivotY: 1.27,
  armZ: 0.1,
  leg: [0.24, 0.52, 0.38] as const,
  legX: [-0.72, -0.24, 0.24, 0.72] as const,
  legZ: 0.1,
  totalHeight: 2.42,
  totalWidth: 3.0,
  eyeX: 0.43,
  eyeY: 1.67,
  eyeShapeScale: 1.65,
  eyeStrokeScale: 1.5,
  eyeLineDepth: 0.032,
  eyeSolidDepth: 0.034,
  eyeRoundDepth: 0.048,
  browLift: 0.065,
  browWidth: 0.044,
  browDepth: 0.028,
  cheekX: 0.57,
  cheekY: 1.28,
  cheekRadius: 0.095,
});

/** Normal map tanah liat yang deterministik dan berulang (kit: tertanam sebagai PNG di GLB; bukan shader khusus). */
export function createClayNormalData(size = 256) {
  const height = new Float32Array(size * size);
  let seed = 7812341;
  for (let i = 0; i < height.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    height[i] = seed / 4294967295;
  }
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]!;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = (h(x - 1, y) - h(x + 1, y)) * 0.65;
      const ny = (h(x, y - 1) - h(x, y + 1)) * 0.65;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round(((nx / length) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((ny / length) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  return { data, size };
}

export function createClayNormalTexture(): DataTexture {
  const { data, size } = createClayNormalData();
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = "Clay_Micrograin";
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}


export function createClaude({ expression = "neutral" as Expression } = {}) {
  const root = new Group();
  root.name = "Claude";
  root.userData = { asset: "claude-inspired-reference", version: "4.0.0", front: "+Z", up: "+Y", bodyWidth: 2 };
  const clayNormal = createClayNormalTexture();
  const orange = new MeshStandardMaterial({ name: "Clay_Orange", color: PALETTE.body, roughness: 0.86, metalness: 0, normalMap: clayNormal, normalScale: new Vector2(0.24, 0.24) });
  const dark = new MeshStandardMaterial({ name: "Face_Charcoal", color: PALETTE.eyes, roughness: 0.65, metalness: 0 });
  const pink = new MeshStandardMaterial({ name: "Cheeks_Peach", color: PALETTE.cheeks, roughness: 0.88, metalness: 0 });
  const bodyRig = new Group();
  bodyRig.name = "BodyRig";
  bodyRig.position.y = 1.47;
  root.add(bodyRig);

  const box = (name: string, w: number, h: number, d: number, r: number, mat: Material, parent: Group, position: readonly [number, number, number] = [0, 0, 0], segments = 2) => {
    const m = new Mesh(new RoundedBoxGeometry(w, h, d, segments, r), mat);
    m.name = name;
    m.position.set(position[0], position[1], position[2]);
    parent.add(m);
    return m;
  };
  box("Body", 2, 1.9, 1.4, 0.065, orange, bodyRig, [0, 0, 0], 3);
  const arms: Group[] = [];
  [-1, 1].forEach((sign, i) => {
    const p = new Group();
    p.name = i ? "Arm_PosX" : "Arm_NegX";
    p.position.set(sign * 0.98, -0.2, 0.1);
    bodyRig.add(p);
    box(i ? "ArmMesh_PosX" : "ArmMesh_NegX", DIMENSIONS.arm[0], DIMENSIONS.arm[1], DIMENSIONS.arm[2], 0.035, orange, p, [(sign * DIMENSIONS.arm[0]) / 2, 0, 0]);
    arms.push(p);
  });
  const legs: Group[] = [];
  DIMENSIONS.legX.forEach((x, i) => {
    const p = new Group();
    p.name = `Leg_0${i + 1}`;
    p.position.set(x, -0.95, DIMENSIONS.legZ);
    bodyRig.add(p);
    box(`LegMesh_0${i + 1}`, 0.24, 0.52, 0.38, 0.022, orange, p, [0, -0.26, 0]);
    legs.push(p);
  });
  const face = new Group();
  face.name = "Face";
  face.position.z = 0.714;
  bodyRig.add(face);
  [-1, 1].forEach((sign, i) => {
    const c = new Mesh(new CircleGeometry(0.095, 16), pink);
    c.name = i ? "Cheek_PosX" : "Cheek_NegX";
    c.position.set(sign * 0.57, -0.19, 0);
    face.add(c);
  });

  // Satu goresan tersambung yang diekstrusi: chevron tebal tetap mulus di puncaknya (tanpa tonjolan sambungan).
  // Garis tepinya dari `kit-face.ts` (sama dengan gambar SVG film 2,5D).
  const line = (parent: Group, name: string, points: readonly Pt[], width = 0.044, depth = 0.022) => {
    if (points.length < 2) return;
    const bevel = 0.003;
    const shape = new Shape(strokeOutline(points, width, bevel).map(([x, y]) => new Vector2(x, y)));
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth: depth - 2 * bevel, steps: 1, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
    const mesh = new Mesh(geometry, dark);
    mesh.name = name + "_Stroke";
    mesh.position.z = 0.009 - (depth - 2 * bevel) / 2;
    parent.add(mesh);
  };

  const eye = (parent: Group, name: string, type: EyeType, sign: number) => {
    const e = new Group();
    e.name = name;
    e.position.set(sign * FACE_DIM.eyeX, FACE_DIM.eyeY, 0.005);
    parent.add(e);
    const marks = new Group();
    marks.name = name + "_Shape";
    marks.scale.set(DIMENSIONS.eyeShapeScale, DIMENSIONS.eyeShapeScale, 1);
    e.add(marks);
    const solid = EYE_BOX[type];
    const oval = EYE_OVAL[type];
    const stroke = EYE_STROKE[type];
    if (solid) box(`${name}_mark`, solid.w, solid.h, DIMENSIONS.eyeSolidDepth, solid.r, dark, marks, [0, solid.y, 0]);
    else if (oval) {
      const m = new Mesh(new SphereGeometry(1, 16, 10), dark);
      m.name = `${name}_mark`;
      m.scale.set(oval.rx, oval.ry, DIMENSIONS.eyeRoundDepth / 2);
      marks.add(m);
    } else if (stroke) line(marks, name, stroke.points, stroke.width * DIMENSIONS.eyeStrokeScale, DIMENSIONS.eyeLineDepth);
    return e;
  };

  const brow = (parent: Group, name: string, sign: number, kind: Exclude<BrowKind, null>) => {
    line(parent, name, browPoints(kind, sign), DIMENSIONS.browWidth, DIMENSIONS.browDepth);
  };

  const features = {} as Record<Expression, { group: Group; eyes: Group[] }>;
  for (const ex of EXPRESSIONS) {
    const g = new Group();
    g.name = `Expression_${ex}`;
    face.add(g);
    g.visible = false;
    const { eyes: types, brows: bs } = expressionShape(ex);
    const es = types.map((t, i) => eye(g, `${ex}_Eye_${i ? "PosX" : "NegX"}`, t, i ? 1 : -1));
    bs.forEach((b, i) => {
      if (b) brow(g, `${ex}_Brow_${i}`, i ? 1 : -1, b);
    });
    features[ex] = { group: g, eyes: es };
  }

  let current: Expression = "neutral";
  function setExpression(name: Expression) {
    for (const [key, val] of Object.entries(features)) {
      val.group.visible = key === name;
      val.eyes.forEach((e) => e.scale.set(1, 1, 1));
    }
    current = name;
    return root;
  }

  function resetPose() {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    bodyRig.position.set(0, 1.47, 0);
    bodyRig.rotation.set(0, 0, 0);
    arms.forEach((a) => a.rotation.set(0, 0, 0));
    legs.forEach((l) => l.rotation.set(0, 0, 0));
    features[current].eyes.forEach((e) => e.scale.set(1, 1, 1));
  }

  /** Gerak prosedural kit (dipakai pratinjau dan sebagai acuan); `stage3d/mascot.ts` memakai pivot yang sama. */
  function update(timeSeconds = 0, { motion = "idle" as KitMotion, blink = true } = {}) {
    resetPose();
    const t = timeSeconds;
    if (motion === "idle") bodyRig.rotation.z = 0.018 * Math.sin((t * Math.PI * 2) / 3.2);
    if (motion === "hover") {
      root.position.y = 0.48 + 0.055 * Math.sin((t * Math.PI * 2) / 2.4);
      root.rotation.z = 0.04 * Math.sin((t * Math.PI * 2) / 3.2);
      arms[0]!.rotation.z = -0.15;
      arms[1]!.rotation.z = 0.15;
      legs.forEach((l, i) => (l.rotation.x = 0.07 * Math.sin(t * 2.3 + i * 0.7)));
    }
    if (motion === "peek") {
      root.position.y = 0.48 + 0.035 * Math.sin(t * 2.4);
      root.rotation.y = -0.55 + 0.06 * Math.sin(t * 1.8);
      root.rotation.z = 0.15;
      bodyRig.rotation.x = 0.11;
      arms[0]!.rotation.z = -0.16;
      arms[1]!.rotation.z = 0.28;
    }
    if (motion === "wave") {
      arms[1]!.rotation.z = 1.12 + 0.22 * Math.sin(t * 7);
      bodyRig.rotation.z = -0.045;
    }
    if (motion === "walk") {
      const a = Math.sin((t * Math.PI * 2) / 1.1);
      bodyRig.position.y = 1.47 + 0.022 * (1 - Math.cos((t * Math.PI * 4) / 1.1));
      legs.forEach((l, i) => (l.rotation.x = (i % 2 ? 1 : -1) * 0.32 * a));
      arms[0]!.rotation.x = 0.12 * a;
      arms[1]!.rotation.x = -0.12 * a;
    }
    if (motion === "comfort") {
      root.rotation.z = -0.06;
      arms[1]!.rotation.z = 0.4;
      arms[1]!.rotation.y = -0.4 + 0.06 * Math.sin(t * 3);
      bodyRig.rotation.x = 0.04;
    }
    if (blink && BLINKABLE.includes(current)) {
      const p = t % 4.6;
      const v = p > 4.3 && p < 4.46 ? Math.max(0.08, Math.abs(p - 4.38) / 0.08) : 1;
      features[current].eyes.forEach((e) => (e.scale.y = v));
    }
  }

  function dispose() {
    const geometries = new Set<{ dispose(): void }>();
    root.traverse((o) => {
      if (o instanceof Mesh) geometries.add(o.geometry);
    });
    geometries.forEach((g) => g.dispose());
    [orange, dark, pink].forEach((m) => m.dispose());
    clayNormal.dispose();
    root.removeFromParent();
  }

  setExpression(expression);
  return {
    root,
    bodyRig,
    arms,
    legs,
    features,
    setExpression,
    resetPose,
    update,
    dispose,
    get expression() {
      return current;
    },
  };
}

export type ClaudeCharacter = ReturnType<typeof createClaude>;
