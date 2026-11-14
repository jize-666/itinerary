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

type Pt = readonly [number, number];
type EyeType = "open" | "round" | "small" | "happy" | "closed" | "sleepy" | "sad" | "angry";
type BrowKind = "raised" | "soft" | "sad" | "angry" | null;

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
  const line = (parent: Group, name: string, points: readonly Pt[], width = 0.044, depth = 0.022) => {
    if (points.length < 2) return;
    const bevel = 0.003;
    const half = (width - 2 * bevel) / 2;
    const dirs = points.slice(1).map((b, i) => new Vector2(b[0] - points[i]![0], b[1] - points[i]![1]).normalize());
    const normals = dirs.map((d) => new Vector2(-d.y, d.x));
    const left: Vector2[] = [];
    const right: Vector2[] = [];
    points.forEach((point, i) => {
      const p = new Vector2(point[0], point[1]);
      const first = i === 0;
      const last = i === points.length - 1;
      if (first) p.addScaledVector(dirs[0]!, -width * 0.2 + bevel);
      if (last) p.addScaledVector(dirs.at(-1)!, width * 0.2 - bevel);
      const n = first ? normals[0]!.clone() : last ? normals.at(-1)!.clone() : normals[i - 1]!.clone().add(normals[i]!).normalize();
      const offset = n.multiplyScalar(half / (first || last ? 1 : n.dot(normals[i]!)));
      left.push(p.clone().add(offset));
      right.push(p.clone().sub(offset));
    });
    const shape = new Shape([...left, ...right.reverse()]);
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
    e.position.set(sign * 0.43, 0.2, 0.005);
    parent.add(e);
    const marks = new Group();
    marks.name = name + "_Shape";
    marks.scale.set(DIMENSIONS.eyeShapeScale, DIMENSIONS.eyeShapeScale, 1);
    e.add(marks);
    const stroke = (points: readonly Pt[], width: number) => line(marks, name, points, width * DIMENSIONS.eyeStrokeScale, DIMENSIONS.eyeLineDepth);
    if (type === "open") box(`${name}_mark`, 0.13, 0.17, DIMENSIONS.eyeSolidDepth, 0.026, dark, marks);
    else if (type === "round" || type === "small") {
      const m = new Mesh(new SphereGeometry(1, 16, 10), dark);
      m.name = `${name}_mark`;
      m.scale.set(type === "small" ? 0.059 : 0.078, type === "small" ? 0.076 : 0.108, DIMENSIONS.eyeRoundDepth / 2);
      marks.add(m);
    } else if (type === "happy")
      stroke(
        [
          [-0.115, -0.045],
          [0, 0.065],
          [0.115, -0.045],
        ],
        0.052,
      );
    else if (type === "closed")
      stroke(
        [
          [-0.105, 0],
          [0.105, 0],
        ],
        0.041,
      );
    else if (type === "sleepy")
      stroke(
        [
          [-0.105, 0.025],
          [-0.052, -0.014],
          [0, -0.03],
          [0.052, -0.014],
          [0.105, 0.025],
        ],
        0.043,
      );
    else if (type === "sad")
      stroke(
        [
          [-0.09, 0.025],
          [0, -0.018],
          [0.09, 0.025],
        ],
        0.045,
      );
    else if (type === "angry") box(`${name}_mark`, 0.13, 0.1, DIMENSIONS.eyeSolidDepth, 0.02, dark, marks, [0, -0.025, 0]);
    return e;
  };

  const brow = (parent: Group, name: string, sign: number, kind: Exclude<BrowKind, null>) => {
    const x = sign * 0.43;
    let p: Pt[] = [];
    if (kind === "raised")
      p = [
        [-0.11, 0.39],
        [-0.02, 0.435],
        [0.09, 0.4],
      ];
    if (kind === "soft")
      p = [
        [-0.1, 0.365],
        [0, 0.39],
        [0.1, 0.365],
      ];
    if (kind === "sad")
      p = [
        [-0.11, 0.39 + sign * 0.045],
        [0.11, 0.39 - sign * 0.045],
      ];
    if (kind === "angry")
      p = [
        [-0.11, 0.365 - sign * 0.055],
        [0.11, 0.365 + sign * 0.055],
      ];
    line(
      parent,
      name,
      p.map(([a, b]) => [x + a, b + DIMENSIONS.browLift] as const),
      DIMENSIONS.browWidth,
      DIMENSIONS.browDepth,
    );
  };

  const features = {} as Record<Expression, { group: Group; eyes: Group[] }>;
  for (const ex of EXPRESSIONS) {
    const g = new Group();
    g.name = `Expression_${ex}`;
    face.add(g);
    g.visible = false;
    let types: [EyeType, EyeType] = ["open", "open"];
    let bs: [BrowKind, BrowKind] = [null, null];
    if (ex === "happy") types = ["happy", "happy"];
    if (ex === "curious") [types, bs] = [["round", "round"], ["raised", "soft"]];
    if (ex === "concerned") [types, bs] = [["small", "small"], ["sad", "sad"]];
    if (ex === "sad") [types, bs] = [["sad", "sad"], ["sad", "sad"]];
    if (ex === "surprised") [types, bs] = [["round", "round"], ["raised", "raised"]];
    if (ex === "angry") [types, bs] = [["angry", "angry"], ["angry", "angry"]];
    if (ex === "sleepy") types = ["sleepy", "sleepy"];
    if (ex === "blink") types = ["closed", "closed"];
    if (ex === "wink") types = ["open", "happy"];
    if (ex === "embarrassed") [types, bs] = [["sad", "sad"], ["soft", "soft"]];
    if (ex === "excited") [types, bs] = [["happy", "happy"], ["raised", "raised"]];
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
