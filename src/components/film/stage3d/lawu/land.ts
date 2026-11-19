import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Points,
  type ShaderMaterial,
} from "three";
import { clamp, type Ground, groundY, mix, SITE, world } from "@/engine/stage/lawu/ground";
import { marks } from "@/engine/stage/lawu/journey";
import { Forms, random } from "./forms";
const center = world(SITE.tea);
const colour = (v: number) => new Color(v);
// Split dense vegetation into spatial batches so the frustum can skip whole rows and groves.
// All batches share the original geometry, colours and instance transforms.
function spatialBatches(mesh: InstancedMesh, x: number, z: number, radius: number, divisions: number) {
  if (divisions === 1) {
    mesh.computeBoundingSphere();
    return [mesh];
  }
  const buckets = Array.from({ length: divisions * divisions }, () => [] as number[]);
  const matrix = new Matrix4(),
    tint = new Color();
  const cell = (v: number) => Math.min(divisions - 1, Math.max(0, Math.floor(((v + radius) / (2 * radius)) * divisions)));
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    buckets[cell(matrix.elements[12] - x) + divisions * cell(matrix.elements[14] - z)]!.push(i);
  }
  const batches = buckets
    .filter((indices) => indices.length)
    .map((indices) => {
      const part = new InstancedMesh(mesh.geometry, mesh.material, indices.length);
      indices.forEach((original, local) => {
        mesh.getMatrixAt(original, matrix);
        part.setMatrixAt(local, matrix);
        if (mesh.instanceColor) {
          mesh.getColorAt(original, tint);
          part.setColorAt(local, tint);
        }
      });
      part.computeBoundingSphere();
      return part;
    });
  mesh.dispose();
  return batches;
}
export function relief(g: Ground, mat: ShaderMaterial, stride: number) {
  const [n, w, s, e] = g.bounds,
    a = world([n, w]),
    b = world([s, e]);
  const nx = Math.ceil((b.x - a.x) / stride) + 1,
    nz = Math.ceil((a.z - b.z) / stride) + 1;
  const pos: number[] = [],
    rgb: number[] = [],
    idx: number[] = [];
  const moss = colour(0x718454),
    loam = colour(0x778159),
    forest = colour(0x36564d),
    summit = colour(0x839088),
    c = new Color();
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = mix(a.x, b.x, i / (nx - 1)),
        z = mix(a.z, b.z, j / (nz - 1)),
        h = groundY(g, x, z);
      const mosaic = 0.5 + 0.23 * Math.sin(x * 0.051 + Math.sin(z * 0.026) * 2) + 0.23 * Math.sin(z * 0.061 + x * 0.017);
      c.copy(loam)
        .lerp(moss, mosaic)
        .lerp(forest, clamp((h - 115) / 83) * 0.87 + mosaic * 0.13)
        .lerp(summit, clamp((h - 250) / 60));
      pos.push(x, h, z);
      rgb.push(c.r, c.g, c.b);
      if (i < nx - 1 && j < nz - 1) {
        const k = j * nx + i;
        idx.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
      }
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(rgb, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return new Mesh(geometry, mat);
}
// March squares through local DEM heights. Each clipped hedge follows the same elevation along its
// long axis. No screen texture or flat parallel strip substitutes for the near rows.
export function teaRows(g: Ground, mat: ShaderMaterial, step: number) {
  const stems: Matrix4[] = [],
    tints: Color[] = [],
    o = new Object3D(),
    r = random(92);
  const leaf = colour(0x63823f),
    tip = colour(0x98a953);
  const span = 22,
    cells = Math.ceil((2 * span) / step),
    grid: number[][] = [];
  for (let j = 0; j <= cells; j++)
    grid.push(
      Array.from({ length: cells + 1 }, (_, i) => groundY(g, center.x - span + i * step, center.z - span + j * step)),
    );
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      const x = center.x - span + i * step,
        z = center.z - span + j * step;
      if (
        ((x - center.x) / 22) ** 2 + ((z - center.z) / 19) ** 2 > 1 ||
        Math.abs(x - center.x + Math.sin(z * 0.095) * 2) < 0.36
      )
        continue;
      const pts = [
        [x, z, grid[j]![i]!],
        [x + step, z, grid[j]![i + 1]!],
        [x + step, z + step, grid[j + 1]![i + 1]!],
        [x, z + step, grid[j + 1]![i]!],
      ];
      const vals = pts.map((v) => v[2]!);
      const interval = 0.17;
      for (let level = Math.ceil(Math.min(...vals) / interval) * interval; level <= Math.max(...vals); level += interval) {
        const cut: number[][] = [];
        for (let k = 0; k < 4; k++) {
          const p = pts[k]!,
            q = pts[(k + 1) % 4]!;
          if (p[2]! < level === q[2]! < level) continue;
          const f = (level - p[2]!) / (q[2]! - p[2]!);
          cut.push([mix(p[0]!, q[0]!, f), mix(p[1]!, q[1]!, f)]);
        }
        if (cut.length < 2) continue;
        const [p, q] = cut as [number[], number[]];
        const ax = q[0]! - p[0]!,
          az = q[1]! - p[1]!,
          len = Math.hypot(ax, az);
        if (len < 0.08) continue;
        o.position.set((p[0]! + q[0]!) / 2, level + 0.075, (p[1]! + q[1]!) / 2);
        o.rotation.set(0, Math.atan2(ax, az), 0);
        o.scale.set(0.24 + r() * 0.04, 0.13 + r() * 0.035, len * 0.6 + 0.09);
        o.updateMatrix();
        stems.push(o.matrix.clone());
        tints.push(leaf.clone().lerp(tip, r() * 0.66));
      }
    }
  const geo = new IcosahedronGeometry(1, 0);
  white(geo);
  const m = new InstancedMesh(geo, mat, stems.length);
  stems.forEach((v, i) => {
    m.setMatrixAt(i, v);
    m.setColorAt(i, tints[i]!);
  });
  return spatialBatches(m, center.x, center.z, span, step < 0.75 ? 4 : 1);
}
function white(g: BufferGeometry) {
  const rgb = new Float32Array(g.getAttribute("position").count * 3);
  rgb.fill(1);
  g.setAttribute("color", new Float32BufferAttribute(rgb, 3));
}
export function groves(g: Ground, mat: ShaderMaterial, count: number) {
  const a = new Forms(),
    r = random(811);
  a.plinth(0, 0, 0, 0.07, 0.77, 0.07, 0.04, 0.04, 0x605644);
  // Asymmetric layered crowns with distinct light-facing needles and a visible trunk.
  for (let h = 0; h < 3; h++) {
    const y = 0.32 + h * 0.22,
      rad = 0.33 - h * 0.078,
      base: number[][] = [];
    for (let k = 0; k < 8; k++) {
      const angle = (k * Math.PI) / 4;
      const rr = rad * (0.8 + r() * 0.4);
      base.push([Math.sin(angle) * rr, y + r() * 0.09, Math.cos(angle) * rr]);
    }
    for (let k = 0; k < 8; k++) {
      const b = base[k]!,
        d = base[(k + 1) % 8]!;
      a.face(
        [
          [b[0]!, b[1]!, b[2]!],
          [d[0]!, d[1]!, d[2]!],
          [0.025, y + 0.49, 0.03],
        ],
        0x607b59,
        0.78 + r() * 0.33,
      );
    }
  }
  const broad = new Forms();
  broad.plinth(0, 0, 0, 0.089, 0.82, 0.092, 0.043, 0.048, 0x695b47);
  // Shade trees around the fields and broadleaf forest in the ravine have irregular, overlapping crowns.
  for (const [cx, cy, cz, rad] of [
    [-0.18, 0.71, 0.05, 0.34],
    [0.19, 0.81, 0.04, 0.37],
    [-0.04, 1.01, -0.06, 0.32],
    [0.02, 0.72, -0.22, 0.29],
  ] as const) {
    const bot = [cx, cy - rad * 0.72, cz] as const,
      top = [cx - 0.04, cy + rad * 0.83, cz + 0.03] as const;
    const ring = Array.from({ length: 7 }, (_, k) => {
      const angle = (k * 2 * Math.PI) / 7;
      return [cx + Math.cos(angle) * rad * (0.82 + r() * 0.24), cy + (r() - 0.5) * 0.1, cz + Math.sin(angle) * rad] as const;
    });
    for (let k = 0; k < 7; k++) {
      const p = ring[k]!,
        q = ring[(k + 1) % 7]!;
      broad.face([bot, p, q], 0x44654d, 0.82 + r() * 0.13);
      broad.face([top, q, p], 0x72865c, 0.8 + r() * 0.32);
    }
  }
  const pine = a.geometry(),
    leaves = broad.geometry(),
    o = new Object3D(),
    clusters = [SITE.gate, SITE.pyramid, SITE.falls, SITE.house, SITE.tea, SITE.town];
  const groves: InstancedMesh[] = [];
  for (const [i, site] of clusters.entries()) {
    const ctr = world(site),
      n = Math.floor(count / clusters.length),
      tree = new InstancedMesh(i === 0 ? pine : leaves, mat, n);
    for (let j = 0; j < n; ) {
      const angle = r() * Math.PI * 2,
        dist = site === SITE.tea ? 20 + r() * 62 : 3 + r() ** 1.5 * 63;
      const x = ctr.x + Math.sin(angle) * dist,
        z = ctr.z + Math.cos(angle) * dist;
      if (Math.abs(x - ctr.x) < (i === 2 ? 4.9 : 4.1) && z > ctr.z - 10 && z < ctr.z + 40) continue;
      const y = groundY(g, x, z),
        h = (i === 2 ? 1.5 : 0.9) + r() ** 1.6 * (i === 2 ? 3.8 : 2.3);
      o.position.set(x, y - 0.12, z);
      o.scale.set(h * (0.72 + r() * 0.65), h, h);
      o.rotation.y = r() * 6;
      o.updateMatrix();
      tree.setMatrixAt(j, o.matrix);
      j++;
    }
    groves.push(...spatialBatches(tree, ctr.x, ctr.z, 84, count >= 5000 ? 3 : 1));
  }
  return groves;
}
export function falls(g: Ground, rock: ShaderMaterial, water: ShaderMaterial) {
  const { x, z } = world(SITE.falls),
    base = groundY(g, x, z),
    a = new Forms(),
    rand = random(728);
  // The gorge grows out of the measured hillside. A scalloped concave escarpment, irregular
  // strata, and sloping shoulders feather into the DEM on all four edges.
  const edge = (u: number) => -1.95 + 0.27 * Math.abs(u) + 0.64 * Math.sin(u * 0.54) + 0.33 * Math.sin(u * 1.33);
  const fade = (t: number) => {
    const v = clamp(t);
    return v * v * (3 - 2 * v);
  };
  const lump = (u: number, v: number) =>
    0.5 + 0.27 * Math.sin(2 * u + 0.44 * Math.cos(1.22 * v)) + 0.23 * Math.sin(v * 1.91 + u * 0.74);
  const height = (u: number, v: number) => {
    const y = groundY(g, x + u, z + v) - base;
    const span = fade((21 - Math.abs(u)) / 10) * fade((v + 19) / 11) * fade((12 - v) / 8);
    const crest = 7.3 + 1.2 * Math.sin(u * 0.56) + 0.61 * Math.sin(u * 1.24);
    const foot = 1.25 + 0.45 * Math.sin(u * 0.63);
    const flange = fade((edge(u) + foot - v) / (foot + 0.4));
    return y - 0.18 + span * (0.22 + Math.max(0, crest - y) * flange + (lump(u, v) - 0.45) * (0.1 + 1.18 * flange));
  };
  const nx = 97,
    nz = 74,
    verts: number[] = [],
    tints: number[] = [],
    indices: number[] = [],
    baseRock = colour(0x4f5854),
    wet = colour(0x354745),
    moss = colour(0x667755),
    highlight = colour(0x7c8171),
    c = new Color();
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const u = -21 + (i / nx) * 42,
        v = -19 + (j / nz) * 31,
        y = height(u, v);
      const steep = Math.hypot(height(u + 0.16, v) - y, height(u, v + 0.16) - y) / 0.16;
      const stratum = 0.5 + 0.5 * Math.sin(y * 4.75 + u * 0.24 + 0.9 * Math.sin(u * 0.58));
      c.copy(baseRock)
        .lerp(wet, 0.3 + 0.32 * (1 - stratum))
        .lerp(highlight, 0.12 + 0.27 * lump(u, v))
        .lerp(moss, clamp(1 - steep / 1.7) * (0.53 + 0.45 * lump(u, v)));
      verts.push(u, y, v);
      tints.push(c.r, c.g, c.b);
      if (j < nz && i < nx) {
        const k = j * (nx + 1) + i;
        indices.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
      }
    }
  const mountain = new BufferGeometry();
  mountain.setAttribute("position", new Float32BufferAttribute(verts, 3));
  mountain.setAttribute("color", new Float32BufferAttribute(tints, 3));
  mountain.setIndex(indices);
  mountain.computeVertexNormals();
  const cliff = new Mesh(mountain, rock);
  cliff.position.set(x, base, z);
  // Broken andesite boulders around the plunge pool, rendered in one draw.
  for (let i = 0; i < 190; i++) {
    const u = (rand() - 0.5) * 15,
      v = edge(u) + (rand() - 0.38) * 7,
      rr = 0.1 + Math.pow(rand(), 2) * 0.51,
      y = height(u, v);
    if (Math.abs(u) < 0.8 && v > -0.7) continue;
    const top = [u - 0.12 * rr, y + rr * 0.87, v + 0.06 * rr] as const;
    const skirt = Array.from({ length: 6 }, (_, k) => {
      const angle = (k * Math.PI) / 3;
      return [
        u + Math.sin(angle) * rr * (0.9 + rand() * 0.28),
        y + rr * (0.02 + rand() * 0.32),
        v + Math.cos(angle) * rr * (0.8 + rand() * 0.5),
      ] as const;
    });
    for (let k = 0; k < 6; k++) {
      const v1 = skirt[k]!,
        v2 = skirt[(k + 1) % 6]!;
      a.face([top, v1, v2], i % 4 === 0 ? 0x747b67 : 0x495c57, 0.82 + rand() * 0.23);
      a.face([v1, [v1[0], y - 0.35 * rr, v1[2]], [v2[0], y - 0.35 * rr, v2[2]], v2], 0x44534f);
    }
  }
  const stones = new Mesh(a.geometry(), rock);
  stones.position.copy(cliff.position);
  // A shallow tapering stream travels away from the falls between gravel banks.
  const bed = new Forms();
  const reach = (i: number, side: number): [number, number, number] => {
    const v = -0.7 + i * 0.59,
      w = 1.23 + 0.83 * Math.exp(-((v - 1) ** 2) / 7) + 0.16 * Math.sin(v * 0.7);
    const u = Math.sin(v * 0.19) * 0.66 + side * w;
    return [u, Math.max(0.16, groundY(g, x + u, z + v) - base + 0.11), v];
  };
  for (let i = 0; i < 44; i++)
    bed.face([reach(i, -1), reach(i + 1, -1), reach(i + 1, 1), reach(i, 1)], i < 7 ? 0x578d87 : 0x416e69);
  const stream = new Mesh(bed.geometry(), rock);
  stream.position.copy(cliff.position);
  const vs: number[] = [],
    uv: number[] = [],
    ind: number[] = [];
  const cols = 15,
    rows = 22;
  for (let yy = 0; yy <= rows; yy++)
    for (let xx = 0; xx <= cols; xx++) {
      const u = xx / cols,
        v = yy / rows,
        y = 0.18 + v * 7.14;
      vs.push(
        (u - 0.5) * (0.77 + 0.77 * (1 - v)) + 0.11 * Math.sin(v * 2.3),
        y,
        -2.44 + 2.72 * (1 - v * v) + 0.08 * Math.sin(u * 27 + v * 3),
      );
      uv.push(u, v);
      if (yy < rows && xx < cols) {
        const k = yy * (cols + 1) + xx;
        ind.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
      }
    }
  const skin = new BufferGeometry();
  skin.setAttribute("position", new Float32BufferAttribute(vs, 3));
  skin.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  skin.setIndex(ind);
  const curtain = new Mesh(skin, water);
  curtain.position.copy(cliff.position);
  return [cliff, stones, stream, curtain];
}
export function lights(g: Ground, mat: ShaderMaterial, density: number) {
  const rand = random(481),
    pos: number[] = [],
    serial: number[] = [],
    radius: number[] = [];
  const put = (x: number, y: number, z: number, id: number, r: number) => {
    pos.push(x, y, z);
    serial.push(id);
    radius.push(r);
  };
  marks.forEach((m, i) => {
    const c = world(m.site),
      x = c.x + (i % 2 === 0 ? -1.35 : 1.45),
      z = c.z + 2.65;
    put(x, groundY(g, x, z) + 0.58, z, i + 1, 0.105);
  });
  const f = world(SITE.falls);
  for (let i = 0; i < Math.round(200 * density); i++) {
    const x = f.x + (rand() - 0.5) * 2.8,
      z = f.z + (rand() - 0.35) * 1.8;
    put(x, groundY(g, f.x, f.z) + 0.12, z, -rand() * 18 - 0.001, 0.09 + rand() * 0.18);
  }
  const tea = world(SITE.tea);
  for (let i = 0; i < Math.round(335 * density); i++) {
    const x = tea.x + (rand() - 0.5) * 24,
      z = tea.z + (rand() - 0.5) * 22;
    put(x, groundY(g, x, z) + 0.17 + rand() * 0.052, z, 1000 + i, 0.025 + rand() * 0.03);
  }
  for (let i = 0; i < Math.round(40 * density); i++) {
    const x = tea.x + (rand() - 0.5) * 14,
      z = tea.z + (rand() - 0.5) * 14;
    put(x, groundY(g, x, z) + 0.3 + rand() * 1.15, z, 2000 + i, 0.05);
  }
  const city = world(marks[10].site);
  for (let i = 0; i < 270; i++) {
    const x = city.x + (rand() - 0.5) * 150,
      z = city.z - rand() * 105 - 8;
    put(x, groundY(g, x, z) + 0.3, z, 21 + i, 0.11 + rand() * 0.18);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geometry.setAttribute("serial", new Float32BufferAttribute(serial, 1));
  geometry.setAttribute("radius", new Float32BufferAttribute(radius, 1));
  return new Points(geometry, mat);
}
