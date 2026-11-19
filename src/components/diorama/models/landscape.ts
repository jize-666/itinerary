import type { Modeler, V3 } from "../geometry";

const TAU = Math.PI * 2;
const stone = ["#b7a486", "#c1ae8f", "#bfad8e", "#c8b695", "#bdaa8e", "#b9a68a"];
const bark = ["#685342", "#775d45", "#816a50"] as const;
const lowerLeaves = ["#4c654b", "#546d4b", "#5b704c", "#627950"];
const upperLeaves = ["#718953", "#84975e", "#788c58", "#8c9b62"];
const oliveLeaves = ["#526b54", "#657b59", "#728663", "#7a8c64"];
const lightOlive = ["#83965e", "#8d9f6b", "#91a173", "#859b6b"];

function randomSequence(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function interpolate(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Build tapered limbs from two rings normal to their own axis. This also
// makes the sweep of the branches visible between separate clusters of leaves.
function branch(g: Modeler, a: V3, b: V3, base: number, tip: number, color: string, sides = 6) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  const direction: V3 = [dx / length, dy / length, dz / length];
  const h = Math.hypot(direction[0], direction[1]);
  const u: V3 = [direction[1] / h, -direction[0] / h, 0];
  const v: V3 = [
    direction[1] * u[2] - direction[2] * u[1],
    direction[2] * u[0] - direction[0] * u[2],
    direction[0] * u[1] - direction[1] * u[0],
  ];
  const vertices: V3[] = [];
  const faces: number[][] = [];
  for (const [center, radius] of [
    [a, base],
    [b, tip],
  ] as [V3, number][]) {
    for (let j = 0; j < sides; j++) {
      const ca = radius * Math.cos((j * TAU) / sides),
        sa = radius * Math.sin((j * TAU) / sides);
      vertices.push([
        center[0] + ca * u[0] + sa * v[0],
        center[1] + ca * u[1] + sa * v[1],
        center[2] + ca * u[2] + sa * v[2],
      ]);
    }
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([i, j, sides + j, sides + i]);
  }
  faces.push(Array.from({ length: sides }, (_, i) => sides + i));
  g.mesh(vertices, faces, color);
}

// Four staggered rings carry much more silhouette detail than a regular
// sphere. Warping the rings independently avoids concentric latitude lines.
function leafCluster(g: Modeler, center: V3, radii: V3, palette: string[], random: () => number, facets = 8) {
  const vertices: V3[] = [[center[0], center[1] - radii[1], center[2]]];
  const faces: number[][] = [];
  const colors: string[] = [];
  const phases = [-0.1, 0.2, -0.13, 0.11];
  const latitudes = [-0.72, -0.22, 0.3, 0.76];
  const offset = random() * TAU;
  const dominant = pick(palette, random);
  for (let ring = 0; ring < latitudes.length; ring++) {
    const latitude = latitudes[ring]!,
      radial = Math.sqrt(1 - latitude * latitude);
    for (let i = 0; i < facets; i++) {
      const theta = offset + (TAU * i) / facets + phases[ring]! + (random() - 0.5) * 0.2;
      const shape = radial * (0.79 + random() * 0.23);
      vertices.push([
        center[0] + Math.cos(theta) * shape * radii[0],
        center[1] + (latitude + (random() - 0.5) * 0.13) * radii[1],
        center[2] + Math.sin(theta) * shape * radii[2],
      ]);
    }
  }
  const top = vertices.length;
  vertices.push([center[0] + (random() - 0.5) * radii[0] * 0.18, center[1] + radii[1], center[2]]);
  const face = (...indices: number[]) => {
    faces.push(indices);
    colors.push(random() < 0.13 ? pick(palette, random) : dominant);
  };
  for (let i = 0; i < facets; i++) {
    const j = (i + 1) % facets;
    face(0, 1 + i, 1 + j);
    for (let ring = 0; ring < latitudes.length - 1; ring++) {
      const a = 1 + ring * facets + i,
        b = 1 + ring * facets + j;
      face(a, a + facets, b);
      face(b, a + facets, b + facets);
    }
    face(1 + 3 * facets + i, top, 1 + 3 * facets + j);
  }
  g.mesh(vertices, faces, colors);
}

function shadeTree(
  g: Modeler,
  x: number,
  z: number,
  height: number,
  radius: number,
  seed: number,
  openCrown = false,
) {
  const random = randomSequence(seed);
  const mainShade = openCrown ? oliveLeaves : lowerLeaves;
  const mainSun = openCrown ? lightOlive : upperLeaves;
  const split: V3 = [
    x + (random() - 0.5) * 0.14 * height,
    0.39 * height,
    z + (random() - 0.5) * 0.12 * height,
  ];
  const base: V3 = [x, 0.014, z];
  const bend: V3 = interpolate(base, split, 0.65);
  bend[0] -= 0.045 * height;
  const trunkRadius = height * (openCrown ? 0.025 : 0.033);
  branch(g, base, bend, trunkRadius * 1.32, trunkRadius, bark[0], 8);
  branch(g, bend, split, trunkRadius, trunkRadius * 0.83, bark[1], 7);
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 + random() * 0.3;
    branch(
      g,
      [x + Math.cos(a) * trunkRadius * 2.3, 0.018, z + Math.sin(a) * trunkRadius * 2.3],
      interpolate(base, bend, 0.24),
      trunkRadius * 0.32,
      trunkRadius * 0.47,
      bark[0],
      5,
    );
  }
  const arms = openCrown ? 5 : 6,
    firstAngle = random() * TAU;
  for (let i = 0; i < arms; i++) {
    const a = firstAngle + ((i + (random() - 0.5) * 0.3) * TAU) / arms;
    const reach = radius * (0.74 + random() * 0.25);
    const y = height * (0.64 + random() * 0.11);
    const end: V3 = [split[0] + Math.cos(a) * reach, y, split[2] + Math.sin(a) * reach];
    const elbow: V3 = [
      split[0] + Math.cos(a - 0.13) * reach * 0.46,
      y - height * 0.14,
      split[2] + Math.sin(a - 0.13) * reach * 0.46,
    ];
    branch(g, split, elbow, trunkRadius * 0.74, trunkRadius * 0.45, bark[1]);
    branch(g, elbow, end, trunkRadius * 0.47, trunkRadius * 0.22, bark[2], 5);
    for (let fork = -1; fork <= 1; fork++) {
      const ray = a + fork * (0.3 + random() * 0.32);
      const rr = reach * (fork === 0 ? 1.02 : 0.77);
      const crown: V3 = [
        split[0] + Math.cos(ray) * rr,
        y + height * (0.045 + random() * 0.12),
        split[2] + Math.sin(ray) * rr,
      ];
      branch(g, fork ? elbow : end, crown, trunkRadius * (fork ? 0.35 : 0.2), trunkRadius * 0.1, bark[2], 5);
      const spread = radius * (0.28 + random() * 0.11) * (openCrown ? 0.89 : 1);
      leafCluster(
        g,
        crown,
        [spread * 1.23, spread * (openCrown ? 0.78 : 0.63), spread],
        fork === 0 && i % 3 ? mainSun : mainShade,
        random,
      );
      if (!openCrown && fork === -1) {
        leafCluster(
          g,
          [crown[0] * 0.84 + split[0] * 0.16, crown[1] + spread * 0.36, crown[2] * 0.84 + split[2] * 0.16],
          [spread * 0.84, spread * 0.52, spread * 0.78],
          mainSun,
          random,
          7,
        );
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = firstAngle + (i * TAU) / 3;
    const high: V3 = [
      split[0] + Math.cos(a) * radius * 0.3,
      height * (0.88 + random() * 0.04),
      split[2] + Math.sin(a) * radius * 0.28,
    ];
    branch(g, split, high, trunkRadius * 0.5, trunkRadius * 0.12, bark[1], 5);
    leafCluster(g, high, [radius * 0.51, height * 0.13, radius * 0.51], mainSun, random, 9);
  }
}

// Tapered, pleated palm leaflets are built in one mesh per frond.
function palm(g: Modeler, x: number, z: number, height: number, seed: number) {
  const random = randomSequence(seed);
  const crown: V3 = [x + height * 0.08, height, z - height * 0.065];
  const mid: V3 = [x - height * 0.014, height * 0.52, z - height * 0.03];
  branch(g, [x, 0.014, z], mid, height * 0.034, height * 0.022, "#8d7b5e", 8);
  branch(g, mid, crown, height * 0.022, height * 0.028, "#8c805c", 8);
  for (let i = 2; i <= 12; i++) {
    const t = i / 13;
    const center =
      t <= 0.52 ? interpolate([x, 0, z], mid, t / 0.52) : interpolate(mid, crown, (t - 0.52) / 0.48);
    g.cylinder(
      center,
      height * (0.035 - Math.min(t, 1 - t) * 0.024),
      height * (0.034 - Math.min(t, 1 - t) * 0.024),
      height * 0.008,
      "#a19372",
      8,
    );
  }
  const frondPalette = ["#637b4d", "#73884d", "#819356", "#8c9a61", "#617b52"];
  for (let f = 0; f < 13; f++) {
    const angle = ((f + random() * 0.25) * TAU) / 13,
      reach = height * (0.27 + random() * 0.15);
    const lower = f % 3 === 0;
    const lift = height * (lower ? 0.09 : 0.18 + random() * 0.06);
    const fall = height * (lower ? 0.27 : 0.18);
    const dir: V3 = [Math.cos(angle), 0, Math.sin(angle)];
    const side: V3 = [-dir[2], 0, dir[0]];
    function stem(t: number): V3 {
      return [
        crown[0] + dir[0] * reach * t,
        crown[1] + lift * Math.sin(Math.PI * t * 0.87) - fall * t * t,
        crown[2] + dir[2] * reach * t,
      ];
    }
    const vertices: V3[] = [],
      faces: number[][] = [],
      colors: string[] = [];
    const shade = pick(frondPalette, random);
    for (let k = 0; k < 4; k++)
      branch(
        g,
        stem(k / 4),
        stem((k + 1) / 4),
        height * 0.01 * (1 - k * 0.2),
        height * 0.008 * (1 - k * 0.2),
        "#808d54",
        4,
      );
    for (let i = 1; i <= 11; i++) {
      const t = i / 13;
      for (const sign of [-1, 1]) {
        const length = (0.12 + 0.19 * Math.sin(Math.PI * t)) * reach * (1 - t * 0.35);
        const root = stem(t),
          heel = stem(t + 0.045);
        const end: V3 = [
          heel[0] + sign * side[0] * length + dir[0] * length * 0.54,
          heel[1] - length * (0.45 + t * 0.6),
          heel[2] + sign * side[2] * length + dir[2] * length * 0.54,
        ];
        const center = interpolate(root, end, 0.42);
        center[1] += length * 0.09;
        const v = vertices.length;
        vertices.push(root, heel, center, end);
        faces.push(
          sign < 0 ? [v, v + 1, v + 2] : [v, v + 2, v + 1],
          sign < 0 ? [v + 1, v + 3, v + 2] : [v + 1, v + 2, v + 3],
        );
        colors.push(shade, i % 4 ? shade : "#899758");
      }
    }
    g.mesh(vertices, faces, colors);
  }
}

// Small ornamental grass stands fill the negative space round the tree bases.
function grass(g: Modeler, x: number, z: number, radius: number, seed: number) {
  const random = randomSequence(seed);
  const vertices: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  const shades = ["#5d754b", "#72814c", "#89925b", "#637c52", "#95965b"];
  for (let i = 0; i < 19; i++) {
    const a = (i * TAU) / 19 + random() * 0.2,
      reach = radius * (0.32 + random() * 0.7);
    const y = radius * (0.46 + random() * 0.6),
      w = radius * (0.046 + random() * 0.07);
    const cx = x + Math.cos(a) * radius * 0.09,
      cz = z + Math.sin(a) * radius * 0.09;
    const sx = -Math.sin(a) * w,
      sz = Math.cos(a) * w,
      v = vertices.length;
    vertices.push(
      [cx, 0.025, cz],
      [cx + Math.cos(a) * reach * 0.42 + sx, y * 0.74, cz + Math.sin(a) * reach * 0.42 + sz],
      [cx + Math.cos(a) * reach * 0.41, y * 0.86, cz + Math.sin(a) * reach * 0.41],
      [cx + Math.cos(a) * reach * 0.42 - sx, y * 0.74, cz + Math.sin(a) * reach * 0.42 - sz],
      [cx + Math.cos(a) * reach, y, cz + Math.sin(a) * reach],
    );
    faces.push([v, v + 1, v + 2], [v, v + 2, v + 3], [v + 1, v + 4, v + 2], [v + 2, v + 4, v + 3]);
    const tone = pick(shades, random);
    colors.push(tone, tone, tone, tone);
  }
  g.mesh(vertices, faces, colors);
}

function gardenBed(g: Modeler, x: number, z: number, rx: number, rz: number, seed: number) {
  const random = randomSequence(seed);
  const rim = 0.067;
  const vertices: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  const count = 34;
  for (let j = 0; j < count; j++) {
    const a = (TAU * j) / count,
      ca = Math.cos(a),
      sa = Math.sin(a);
    const shape = 1 + Math.sin(a * 3 + seed) * 0.07 + Math.sin(a * 5) * 0.035;
    const dx = rx * shape,
      dz = rz * shape;
    vertices.push(
      [x + ca * dx, 0.009, z + sa * dz],
      [x + ca * dx, 0.072, z + sa * dz],
      [x + ca * (dx - rim), 0.076, z + sa * (dz - rim)],
    );
  }
  const center = vertices.length;
  vertices.push([x, 0.055, z]);
  for (let j = 0; j < count; j++) {
    const a = 3 * j,
      b = 3 * ((j + 1) % count);
    faces.push([a, a + 1, b + 1, b], [a + 1, a + 2, b + 2, b + 1], [a + 2, center, b + 2]);
    colors.push("#94856a", "#c9b68e", j % 9 ? "#777b52" : "#74784e");
  }
  g.mesh(vertices, faces, colors);
  for (let i = 0; i < 9; i++) {
    const a = (TAU * i) / 9 + random() * 0.15,
      r = 0.55 + random() * 0.18;
    const cx = x + Math.cos(a) * r * rx,
      cz = z + Math.sin(a) * r * rz,
      bush = 0.12 + random() * 0.1;
    if (i % 3 === 0) {
      grass(g, cx, cz, bush * 1.24, seed + i);
    } else {
      leafCluster(
        g,
        [cx, 0.09 + bush * 0.29, cz],
        [bush * 1.2, bush * 0.58, bush * 0.89],
        i % 4 ? oliveLeaves : lightOlive,
        random,
        6,
      );
    }
  }
}

function approach(g: Modeler) {
  const xMin = -1.48,
    xMax = 1.48,
    zMin = -0.7,
    zMax = 7.31;
  g.box([0, 0.012, (zMin + zMax) / 2], [xMax - xMin, 0.021, zMax - zMin], "#9a8c70");
  const rw = 0.3,
    tw = 0.56,
    random = randomSequence(231);
  for (let row = 0; zMin + row * rw < zMax; row++) {
    const low = zMin + row * rw,
      high = Math.min(low + rw, zMax);
    for (let col = -1; col < 7; col++) {
      const start = xMin + col * tw + (row % 2) * tw * 0.5;
      const l = Math.max(start, xMin),
        r = Math.min(start + tw, xMax);
      if (r - l < 0.08) continue;
      g.box(
        [(l + r) / 2, 0.023, (low + high) / 2],
        [r - l - 0.013, 0.012, high - low - 0.013],
        pick(stone, random),
      );
    }
  }
  for (const edge of [-1, 1]) {
    g.box([edge * 1.56, 0.025, (zMin + zMax) / 2], [0.11, 0.026, zMax - zMin], "#b1976e");
    g.box([edge * 1.5, 0.034, (zMin + zMax) / 2], [0.03, 0.013, zMax - zMin], "#dfca99");
    for (let i = 0; i < 19; i++) {
      g.box([edge * 1.56, 0.04, zMin + ((i + 0.3) * (zMax - zMin)) / 19], [0.101, 0.006, 0.012], "#968368");
    }
  }
  // A circular, eight-petalled stone inlay marks the change into the court.
  const z = 1.03,
    y = 0.039;
  g.cylinder([0, y, z], 1.015, 1.015, 0.008, "#9e875f", 48);
  g.cylinder([0, y + 0.006, z], 0.98, 0.98, 0.009, "#d5c09a", 48);
  g.cylinder([0, y + 0.012, z], 0.895, 0.895, 0.009, "#a59270", 48);
  g.cylinder([0, y + 0.018, z], 0.869, 0.869, 0.009, "#c6b391", 48);
  const verts: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (TAU * i) / 8,
      ca = Math.cos(a),
      sa = Math.sin(a),
      size = verts.length,
      level = y + 0.026;
    const point = (r: number, s: number): V3 => [ca * r - sa * s, level, z + sa * r + ca * s];
    verts.push(point(0.13, 0), point(0.46, 0.115), point(0.78, 0), point(0.46, -0.115));
    faces.push([size, size + 1, size + 2], [size, size + 2, size + 3]);
    colors.push("#9b825e", "#a78e67");
  }
  g.mesh(verts, faces, colors);
  g.cylinder([0, y + 0.025, z], 0.155, 0.155, 0.014, "#d4bd8e", 16);
}

function lamp(g: Modeler, x: number, z: number, height = 1.18) {
  // Collared cast-iron posts, made in sections, with a hexagonal glass lantern.
  const k = height / 1.18;
  const iron = "#3f554b",
    cap = "#7e754f",
    glass = "#ebcf91";
  g.cylinder([x, 0.055 * k, z], 0.16 * k, 0.14 * k, 0.11 * k, "#ac9d7e", 8);
  g.cylinder([x, 0.15 * k, z], 0.083 * k, 0.068 * k, 0.11 * k, iron, 8);
  g.cylinder([x, 0.48 * k, z], 0.044 * k, 0.029 * k, 0.56 * k, iron, 8);
  g.cylinder([x, 0.22 * k, z], 0.068 * k, 0.065 * k, 0.039 * k, cap, 8);
  g.cylinder([x, 0.8 * k, z], 0.072 * k, 0.095 * k, 0.08 * k, iron, 6);
  g.cylinder([x, 0.932 * k, z], 0.068 * k, 0.11 * k, 0.197 * k, glass, 6);
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6,
      ca = Math.cos(a),
      sa = Math.sin(a);
    g.beam(
      [x + 0.075 * k * ca, 0.831 * k, z + 0.075 * k * sa],
      [x + 0.114 * k * ca, 1.037 * k, z + 0.114 * k * sa],
      0.011 * k,
      0.012 * k,
      iron,
    );
  }
  g.cylinder([x, 1.046 * k, z], 0.14 * k, 0.136 * k, 0.032 * k, iron, 6);
  g.cylinder([x, 1.096 * k, z], 0.143 * k, 0.035 * k, 0.071 * k, iron, 6);
  g.cylinder([x, 1.151 * k, z], 0.03 * k, 0.008 * k, 0.068 * k, cap, 8);
}

export function landscape(g: Modeler) {
  approach(g);
  gardenBed(g, -7.69, -4.36, 1.84, 1.56, 928);
  shadeTree(g, -7.68, -4.48, 3.24, 1.37, 2980);
  gardenBed(g, 7.47, -4.6, 1.65, 1.55, 331);
  shadeTree(g, 7.51, -4.72, 3.56, 1.4, 1022);
  gardenBed(g, -9.15, -1.58, 0.91, 0.85, 258);
  shadeTree(g, -9.23, -1.68, 2.36, 0.92, 240, true);
  gardenBed(g, 9.21, -1.82, 0.92, 0.88, 483);
  shadeTree(g, 9.29, -1.89, 2.16, 0.92, 214, true);
  gardenBed(g, -5.7, -6.51, 0.74, 0.69, 35);
  palm(g, -5.68, -6.58, 2.76, 384);
  gardenBed(g, 5.94, -6.48, 0.76, 0.67, 34);
  palm(g, 5.92, -6.51, 3.02, 465);
  gardenBed(g, -8.18, 6.49, 1.07, 0.51, 349);
  shadeTree(g, -8.09, 6.51, 1.52, 0.68, 730, true);
  gardenBed(g, 8.37, 6.64, 0.99, 0.48, 907);
  shadeTree(g, 8.4, 6.64, 1.73, 0.76, 316, true);
  for (const side of [-1, 1]) {
    lamp(g, side * 1.74, 5.24);
    lamp(g, side * 1.76, -0.36, 1.08);
    lamp(g, side * 9.96, 2.88, 1.04);
    for (let i = 0; i < 6; i++) {
      const x = side * (1.7 + 0.05 * Math.sin(i)),
        z = 1.77 + 0.5 * i;
      grass(g, x, z, 0.13 + (i % 2) * 0.05, 269 + side * 53 + i);
    }
    for (let i = 0; i < 6; i++)
      grass(g, side * (2.22 + i * 0.87), 7.02 - 0.06 * (i % 2), 0.18 + 0.02 * (i % 3), 227 + side * 121 + i);
    for (let i = 0; i < 6; i++)
      grass(g, side * (9.99 - 0.07 * (i % 2)), -0.22 + i * 1.02, 0.2 + (i % 2) * 0.05, 501 + side * 78 + i);
  }
}
