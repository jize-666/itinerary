import type { Modeler, V3 } from "../geometry";

// Model dimensions are exhibition units. The three roof pitches, open columns,
// raised central floor and southern iron portico follow the city heritage record.
const wood = "#78533d",
  darkWood = "#594330",
  gold = "#c39a50";
const sky = "#86aeb2",
  deepSky = "#537f85",
  lightSky = "#a9c7c5";
const cream = "#d5c5a6",
  brass = "#ae874c";
const shingle = ["#805f4b", "#876752", "#82624e", "#7a5b49", "#856450", "#7e5f4d"];
const highShingle = ["#765b49", "#7c5e4b", "#755744", "#80614d", "#765946", "#785c49"];
const sheet = ["#888477", "#828075", "#8b877b", "#8b897e", "#848477"];

type Level = { x: number; z: number; y: number };
type Point2 = [number, number];
const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
] as const;
function rim({ x, z, y }: Level): [V3, V3, V3, V3] {
  return [
    [-x, y, z],
    [x, y, z],
    [x, y, -z],
    [-x, y, -z],
  ];
}
function mix(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function lift(p: V3, dy: number): V3 {
  return [p[0], p[1] + dy, p[2]];
}
function hash(a: number, b: number, c: number): number {
  let n = Math.imul(8191 + a, 374761393) ^ Math.imul(289 + b, 668265263) ^ Math.imul(c + 31, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

// A closed, hollow hip skirt. The lower surface, edges and independent shingle
// lips matter from the colonnade, where a roof made of single planes would vanish.
function roofBand(
  g: Modeler,
  low: Level,
  high: Level,
  rows: number,
  tileWidth: number,
  palette: string[],
  isSheet = false,
) {
  const lower = rim(low),
    upper = rim(high),
    thickness = isSheet ? 0.055 : 0.076;
  const vertices: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  function patch(points: V3[], color: string) {
    const start = vertices.length;
    vertices.push(...points);
    faces.push(points.map((_, i) => start + i));
    colors.push(color);
  }
  for (const [side, j] of edges) {
    const a = lower[side],
      b = lower[j],
      c = upper[j],
      d = upper[side];
    const al = lift(a, -thickness),
      bl = lift(b, -thickness),
      cl = lift(c, -thickness),
      dl = lift(d, -thickness);
    patch([a, b, c, d], isSheet ? "#747269" : "#674e3d");
    patch([bl, al, dl, cl], isSheet ? "#8d876f" : "#755842");
    patch([al, bl, b, a], isSheet ? "#6a7c77" : "#554333");
    patch([d, c, cl, dl], darkWood);
    const sample = (u: number, v: number, offset: number): V3 =>
      lift(mix(mix(a, b, u), mix(d, c, u), v), offset);
    for (let row = 0; row < rows; row++) {
      const t0 = row / rows,
        t1 = (row + 1) / rows;
      const left = mix(a, d, (t0 + t1) / 2),
        right = mix(b, c, (t0 + t1) / 2);
      const span = Math.hypot(right[0] - left[0], right[2] - left[2]);
      const count = Math.max(1, Math.round(span / tileWidth));
      const shift = isSheet ? 0 : (row % 2) * 0.5,
        margin = 0.0055 / span;
      for (let tile = -1; tile < count; tile++) {
        const u0 = Math.max(0, (tile + shift) / count) + margin,
          u1 = Math.min(1, (tile + 1 + shift) / count) - margin;
        if (u1 - u0 < 0.002) continue;
        const top = isSheet ? t1 : Math.max(t0, t1 - 0.006 / rows);
        const lead = isSheet ? 0.011 : 0.021;
        const l = sample(u0, t0, lead),
          r = sample(u1, t0, lead);
        const lt = sample(u0, top, 0.01),
          rt = sample(u1, top, 0.01);
        const color = palette[hash(side, row, tile) % palette.length]!;
        patch([l, r, rt, lt], color);
        if (!isSheet) patch([sample(u0, t0, 0.002), sample(u1, t0, 0.002), r, l], "#685041");
        if (isSheet && u0 > margin + 0.001) g.beam(lift(l, 0.003), lift(lt, 0.003), 0.016, 0.018, "#999689");
      }
    }
    // Hip flashing above the tile edges and a fine dark drip moulding below.
    g.beam(lift(a, 0.036), lift(d, 0.036), isSheet ? 0.048 : 0.061, 0.045, isSheet ? "#8d8a76" : "#94755c");
    g.beam(
      lift(a, -thickness + 0.003),
      lift(b, -thickness + 0.003),
      0.05,
      0.05,
      isSheet ? "#919d90" : "#624c39",
    );
  }
  g.mesh(vertices, faces, colors);
}

function floor(g: Modeler) {
  g.box([0, 0.065, 0], [9.05, 0.13, 5.12], "#887f6d");
  g.box([0, 0.14, 0], [9.12, 0.055, 5.18], "#baab91");
  g.box([0, 0.194, 0], [9.01, 0.064, 5.08], cream);
  const marble = ["#d2c7b3", "#cfc3af", "#d5c9b7", "#c9bfad", "#d0c5b5"];
  const verts: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  function tilePanel(
    width: number,
    depth: number,
    height: number,
    nx: number,
    nz: number,
    hues: string[],
    offsetZ = 0,
  ) {
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        const x = (ix / nx - 0.5) * width + 0.006,
          z = (iz / nz - 0.5) * depth + 0.006 + offsetZ;
        const w = width / nx - 0.012,
          d = depth / nz - 0.012,
          i = verts.length;
        verts.push([x, height, z], [x, height, z + d], [x + w, height, z + d], [x + w, height, z]);
        faces.push([i, i + 1, i + 2, i + 3]);
        colors.push(hues[hash(nx, iz, ix) % hues.length]!);
      }
  }
  tilePanel(8.98, 5.05, 0.23, 18, 10, marble);
  g.box([0, 0.295, -0.09], [6.76, 0.13, 3.21], "#9c907a");
  g.box([0, 0.375, -0.09], [6.82, 0.058, 3.27], "#c1ad8b");
  g.box([0, 0.414, -0.09], [6.78, 0.032, 3.24], "#c7bba6");
  tilePanel(6.75, 3.21, 0.433, 14, 7, marble, -0.09);
  // Narrow black stone inset, like the border of a marble floor.
  for (const sign of [-1, 1]) {
    g.box([0, 0.438, -0.09 + sign * 1.42], [6.4, 0.008, 0.027], "#746e62");
    g.box([sign * 3.19, 0.438, -0.09], [0.027, 0.008, 2.84], "#746e62");
  }
  g.box([0, 0.273, 1.61], [2.82, 0.086, 0.28], "#c8b79c");
  g.box([0, 0.19, 2.71], [2.48, 0.065, 1.11], "#b39a79");
  tilePanel(2.42, 1.08, 0.225, 10, 5, ["#ad715c", "#b57960", "#a66b57", "#b47a64"], 2.7);
  g.box([0, 0.142, 3.095], [2.65, 0.068, 0.36], "#d6c6aa");
  g.box([0, 0.063, 3.17], [2.72, 0.092, 0.315], "#b5a48b");
  g.mesh(verts, faces, colors);
}

// Low-relief cast iron scrolls are continuous, extruded strips with an open
// centre. Their silhouettes remain visible against the terrace and rear court.
function ironwork(g: Modeler, path: Point2[], z: number, width: number, depth: number, color: string) {
  const vertices: V3[] = [],
    faces: number[][] = [];
  for (const [i, point] of path.entries()) {
    const prev = path[i - 1] ?? point,
      next = path[i + 1] ?? point;
    const dx = next[0] - prev[0],
      dy = next[1] - prev[1],
      len = Math.hypot(dx, dy) || 1;
    const nx = ((-dy / len) * width) / 2,
      ny = ((dx / len) * width) / 2,
      [x, y] = point;
    vertices.push(
      [x + nx, y + ny, z - depth / 2],
      [x - nx, y - ny, z - depth / 2],
      [x - nx, y - ny, z + depth / 2],
      [x + nx, y + ny, z + depth / 2],
    );
    if (i)
      for (let side = 0; side < 4; side++) {
        const j = (side + 1) % 4,
          k = i * 4;
        faces.push([k - 4 + side, k - 4 + j, k + j, k + side]);
      }
  }
  const end = vertices.length - 4;
  faces.push([3, 2, 1, 0], [end, end + 1, end + 2, end + 3]);
  g.mesh(vertices, faces, color);
}

function ironColumn(g: Modeler, x: number, z: number, bottom: number, top: number, portico = false) {
  const foot = portico ? 0.125 : 0.103;
  g.box([x, bottom + 0.038, z], [foot * 2.25, 0.076, foot * 2.25], "#aaa58d");
  g.cylinder([x, bottom + 0.115, z], foot, foot * 0.83, 0.08, deepSky, 8);
  g.cylinder([x, bottom + 0.195, z], foot * 0.86, foot * 0.67, 0.08, portico ? brass : sky, 8);
  const y0 = bottom + 0.23,
    y1 = top - 0.17;
  g.cylinder(
    [x, (y0 + y1) / 2, z],
    portico ? 0.055 : 0.051,
    portico ? 0.046 : 0.042,
    y1 - y0,
    portico ? "#a99562" : deepSky,
    10,
  );
  g.cylinder([x, top - 0.14, z], 0.058, 0.086, 0.062, brass, 8);
  g.cylinder([x, top - 0.082, z], 0.081, 0.121, 0.074, portico ? gold : lightSky, 8);
  g.box([x, top - 0.025, z], [0.22, 0.05, 0.2], portico ? gold : sky);
}

function timberPost(g: Modeler, x: number, z: number, top: number, main = false) {
  const y = 0.434,
    w = main ? 0.19 : 0.135;
  g.box([x, y + 0.045, z], [w * 1.92, 0.09, w * 1.92], "#a29a84");
  g.cylinder([x, y + 0.133, z], w * 0.96, w * 0.73, 0.087, "#b6ad96", 8);
  g.box([x, y + 0.196, z], [w * 1.38, 0.044, w * 1.38], darkWood);
  const start = y + 0.216,
    end = top - 0.22;
  g.box([x, (start + end) / 2, z], [w, end - start, w], main ? sky : "#739b9e");
  g.box([x, start + 0.043, z], [w * 1.13, 0.086, w * 1.13], deepSky);
  for (const h of [start + 0.1, end - 0.084, end - 0.016]) g.box([x, h, z], [w * 1.1, 0.026, w * 1.1], gold);
  g.box([x, top - 0.18, z], [w * 1.25, 0.08, w * 1.25], wood);
  g.box([x, top - 0.11, z], [w * 1.54, 0.07, w * 1.54], gold);
  g.box([x, top - 0.047, z], [w * 1.8, 0.058, w * 1.8], sky);
}

function ringBeams(g: Modeler, w: number, d: number, y: number, h: number, t: number, color: string) {
  for (const s of [-1, 1]) {
    g.box([0, y, s * d], [2 * w + t, h, t], color);
    g.box([s * w, y, 0], [t, h, 2 * d], color);
  }
}

function timber(g: Modeler) {
  const outerX = [-4.25, -2.92, -1.53, 1.53, 2.92, 4.25],
    edgeZ = 2.31;
  for (const z of [-edgeZ, edgeZ]) for (const x of outerX) ironColumn(g, x, z, 0.23, 2.1);
  for (const x of [-4.25, 4.25]) for (const z of [-1.18, 0, 1.18]) ironColumn(g, x, z, 0.23, 2.1);
  ringBeams(g, 4.25, edgeZ, 2.113, 0.12, 0.105, "#74959a");
  ringBeams(g, 4.25, edgeZ, 2.065, 0.023, 0.112, gold);
  for (const s of [-1, 1]) {
    // Small pierced brackets below the perimeter beams.
    g.group([0, 0, s * edgeZ], s === 1 ? 0 : Math.PI, (d) => {
      for (const x of outerX)
        for (const k of [-1, 1]) {
          if (Math.abs(x + k * 0.25) > 4.26) continue;
          ironwork(
            d,
            [
              [x, 1.81],
              [x + k * 0.076, 1.95],
              [x + k * 0.162, 2.028],
              [x + k * 0.267, 2.061],
            ],
            0,
            0.025,
            0.03,
            "#9da797",
          );
        }
    });
  }
  for (const z of [-1.48, 1.48]) for (const x of [-3.1, -1.98, 1.98, 3.1]) timberPost(g, x, z, 2.72);
  for (const x of [-3.1, 3.1]) timberPost(g, x, 0, 2.72);
  ringBeams(g, 3.1, 1.48, 2.73, 0.145, 0.14, darkWood);
  ringBeams(g, 3.1, 1.48, 2.7, 0.025, 0.147, cream);
  for (const x of [-1.12, 1.12]) for (const z of [-0.76, 0.76]) timberPost(g, x, z, 3.27, true);
  // Progressively stepped timber under the upper roof, over the four saka guru.
  for (let i = 0; i < 4; i++)
    ringBeams(g, 1.12 + i * 0.075, 0.76 + i * 0.068, 3.25 + i * 0.085, 0.092, 0.18, i % 2 ? wood : gold);
  g.box([0, 3.59, 0], [2.57, 0.075, 1.78], "#668e92");
  ringBeams(g, 1.17, 0.73, 3.544, 0.011, 0.034, gold);
  ringBeams(g, 0.99, 0.58, 3.541, 0.012, 0.029, cream);
  // Visible rafters under the long slopes, with uninterrupted views between bays.
  for (const s of [-1, 1]) {
    for (let i = -7; i <= 7; i++) {
      const t = i / 7;
      g.beam([t * 4.48, 2.08, s * 2.59], [t * 3.76, 2.42, s * 2.02], 0.038, 0.065, wood);
      g.beam([t * 3.78, 2.4, s * 2.02], [t * 2.23, 3.055, s * 1.25], 0.048, 0.069, wood);
    }
    for (let i = -4; i <= 4; i++) {
      const t = i / 4;
      g.beam([s * 4.59, 2.08, t * 2.42], [s * 3.78, 2.4, t * 1.94], 0.042, 0.064, wood);
    }
  }
}

function chandelier(g: Modeler) {
  g.cylinder([0, 3.3, 0], 0.017, 0.015, 0.49, brass, 8);
  g.ball([0, 3.05, 0], [0.057, 0.095, 0.057], gold, 8, 5);
  g.cylinder([0, 2.88, 0], 0.054, 0.029, 0.28, brass, 8);
  g.ball([0, 2.7, 0], [0.13, 0.083, 0.13], gold, 10, 5);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * i) / 3,
      x = Math.cos(a),
      z = Math.sin(a);
    g.beam([0.06 * x, 2.72, 0.06 * z], [0.22 * x, 2.68, 0.22 * z], 0.021, 0.021, brass);
    g.beam([0.22 * x, 2.68, 0.22 * z], [0.293 * x, 2.76, 0.293 * z], 0.021, 0.021, gold);
    g.cylinder([0.293 * x, 2.8, 0.293 * z], 0.047, 0.06, 0.045, brass, 8);
    g.ball([0.293 * x, 2.875, 0.293 * z], [0.046, 0.066, 0.046], "#e8d8ac", 8, 5);
  }
  g.ball([0, 2.59, 0], [0.071, 0.103, 0.071], "#d4b57b", 8, 5);
}

function portico(g: Modeler) {
  const front = 3.2,
    back = 1.83,
    eaveY = 1.91,
    apexY = 2.46,
    half = 1.16;
  // Two closed sloped facets on the projecting Bangsal Tosan, with an open pediment.
  for (const s of [-1, 1]) {
    const x = s * half;
    const a: V3 = [x, eaveY, front],
      b: V3 = [x, eaveY, back],
      c: V3 = [0, apexY, back],
      d: V3 = [0, apexY, front];
    const face = s === 1 ? [a, b, c, d] : [b, a, d, c];
    const underside = face.map((p) => lift(p, -0.042));
    g.mesh(
      [...face, ...underside],
      [
        [0, 1, 2, 3],
        [7, 6, 5, 4],
        [4, 5, 1, 0],
        [5, 6, 2, 1],
        [6, 7, 3, 2],
        [7, 4, 0, 3],
      ],
      ["#8b8b7b", "#86836c", brass, brass, brass, brass],
    );
    for (let k = 0; k < 7; k++) {
      const z = back + ((front - back) * k) / 6;
      g.beam([x, eaveY + 0.015, z], [0, apexY + 0.015, z], 0.022, 0.018, "#aaa591");
    }
    g.beam([x, eaveY, front], [0, apexY, front], 0.065, 0.06, gold);
    g.beam([x, eaveY, back], [x, eaveY, front], 0.063, 0.055, gold);
    for (const z of [2.02, 3.0]) ironColumn(g, s * 0.99, z, 0.225, 1.9, true);
    g.box([s * 0.99, 1.889, 2.52], [0.08, 0.095, 1.11], brass);
    // Cast scrolls in the plated gable, symmetric around its centre support.
    const xform = (points: Point2[]): Point2[] => points.map(([px, py]) => [s * px, py]);
    ironwork(
      g,
      xform([
        [0.01, 1.942],
        [0.16, 2.01],
        [0.33, 2.137],
        [0.39, 2.173],
        [0.43, 2.147],
        [0.427, 2.095],
        [0.38, 2.071],
        [0.34, 2.09],
      ]),
      front - 0.006,
      0.032,
      0.046,
      gold,
    );
    ironwork(
      g,
      xform([
        [0.1, 2.332],
        [0.13, 2.24],
        [0.2, 2.175],
        [0.27, 2.17],
        [0.3, 2.207],
        [0.28, 2.232],
      ]),
      front - 0.005,
      0.028,
      0.045,
      gold,
    );
    ironwork(
      g,
      xform([
        [0.22, 1.952],
        [0.37, 1.986],
        [0.48, 2.055],
        [0.54, 2.101],
        [0.58, 2.095],
        [0.59, 2.057],
        [0.55, 2.039],
      ]),
      front - 0.005,
      0.03,
      0.042,
      gold,
    );
    ironwork(
      g,
      xform([
        [0.54, 1.955],
        [0.67, 2.0],
        [0.73, 2.044],
        [0.77, 2.039],
        [0.77, 2.012],
      ]),
      front - 0.005,
      0.027,
      0.042,
      gold,
    );
    g.beam([s * 0.99, 1.61, 3.0], [s * 0.76, 1.877, 3.0], 0.033, 0.041, brass);
    g.beam([s * 0.99, 1.68, 3.0], [s * 0.49, 1.887, 3.0], 0.022, 0.035, gold);
  }
  g.box([0, 1.916, front], [2.32, 0.069, 0.073], gold);
  g.box([0, 1.865, front - 0.012], [2.18, 0.03, 0.075], deepSky);
  g.beam([0, 1.934, front], [0, 2.414, front], 0.042, 0.054, gold);
  g.ball([0, 2.131, front + 0.01], [0.063, 0.083, 0.026], gold, 8, 5);
  for (let i = 0; i < 11; i++) {
    const x = (i - 5) * 0.184;
    g.mesh(
      [
        [x - 0.055, 1.858, front],
        [x, 1.797, front + 0.003],
        [x + 0.055, 1.858, front],
        [x, 1.845, front + 0.024],
      ],
      [
        [0, 1, 3],
        [3, 1, 2],
      ],
      i % 2 ? sky : gold,
    );
  }
}

function roof(g: Modeler) {
  roofBand(g, { x: 4.8, z: 2.73, y: 2.16 }, { x: 3.85, z: 2.09, y: 2.52 }, 1, 0.4, sheet, true);
  roofBand(g, { x: 3.93, z: 2.15, y: 2.553 }, { x: 2.35, z: 1.31, y: 3.14 }, 6, 0.255, shingle);
  roofBand(g, { x: 2.4, z: 1.357, y: 3.19 }, { x: 0.77, z: 0.031, y: 5.03 }, 13, 0.222, highShingle);
  // Rounded seams on the ridge with restrained, short copper end terminals.
  g.beam([-0.83, 5.054, 0], [0.83, 5.054, 0], 0.105, 0.103, "#9a7957");
  g.beam([-0.82, 5.105, 0], [0.82, 5.105, 0], 0.046, 0.048, "#b1956b");
  for (const s of [-1, 1]) {
    g.beam([s * 0.72, 5.1, 0], [s * 0.856, 5.162, 0], 0.045, 0.057, "#9e8059");
    g.beam([s * 0.856, 5.162, 0], [s * 0.88, 5.24, 0], 0.033, 0.04, "#aa895c");
  }
  // Modulated pale-blue drip trim, a small detail discernible below the eave.
  const corners = rim({ x: 4.785, z: 2.721, y: 2.112 });
  const vertices: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  for (const [s, next] of edges) {
    const a = corners[s],
      b = corners[next],
      span = Math.hypot(a[0] - b[0], a[2] - b[2]);
    const count = Math.floor(span / 0.155);
    for (let i = 0; i < count; i++) {
      const l = mix(a, b, (i + 0.1) / count),
        r = mix(a, b, (i + 0.9) / count),
        m = lift(mix(l, r, 0.5), -0.062);
      const vi = vertices.length;
      // The shallow diamond has an outside face and a dark, turned-under edge.
      const push: V3 = [
        (l[0] + r[0]) * 0.5 + (s === 1 ? 0.011 : s === 3 ? -0.011 : 0),
        m[1] + 0.023,
        (l[2] + r[2]) * 0.5 + (s === 0 ? 0.011 : s === 2 ? -0.011 : 0),
      ];
      vertices.push(l, m, r, push);
      faces.push([vi, vi + 1, vi + 3], [vi + 3, vi + 1, vi + 2]);
      colors.push(lightSky, sky);
    }
  }
  g.mesh(vertices, faces, colors);
}

export function pendhapa(g: Modeler) {
  floor(g);
  timber(g);
  chandelier(g);
  roof(g);
  portico(g);
}
