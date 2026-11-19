import type { Modeler, V3 } from "../geometry";

type XY = [number, number];
const lime = "#e8d9ba",
  cream = "#f0e2c6",
  ochre = "#c9af83";
const stone = "#9d8c73",
  brick = "#9a5b40",
  teak = "#634331",
  teakLight = "#906745";
const tileColors = ["#a4664b", "#a76a4d", "#ad7152", "#9c6048", "#b17453", "#a96b50"];
const tau = Math.PI * 2;

function quad(g: Modeler, a: V3, b: V3, c: V3, d: V3, color: string) {
  g.mesh([a, b, c, d], [[0, 1, 2, 3]], color);
}

/** Extrude each convex slice into the thickness of the facade, preserving its reveal. */
function masonry(g: Modeler, contour: XY[], z: number, thick: number, color: string) {
  const count = contour.length;
  const points: V3[] = [];
  for (const depth of [z + thick / 2, z - thick / 2]) {
    for (const [x, y] of contour) points.push([x, y, depth]);
  }
  const front = contour.map((_, i) => i);
  const faces = [front, front.map((i) => count + i).reverse()];
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    faces.push([i, i + count, next + count, next]);
  }
  g.mesh(points, faces, color);
}

function arcade(
  g: Modeler,
  width: number,
  spring: number,
  rise: number,
  top: number,
  pier: number,
  depth: number,
) {
  const half = width / 2 - pier;
  const steps = 10;
  for (const side of [-1, 1]) {
    g.box([side * (width / 2 - pier / 2), top / 2, 0], [pier, top, depth], lime);
    g.box([side * (width / 2 - pier / 2), 0.17, 0], [pier + 0.035, 0.34, depth + 0.035], ochre);
    g.box([side * (width / 2 - pier / 2), spring - 0.015, 0], [pier + 0.035, 0.055, depth + 0.04], cream);
  }
  for (let i = 0; i < steps; i++) {
    const t1 = Math.PI * (1 - i / steps),
      t2 = Math.PI * (1 - (i + 1) / steps);
    const xl = Math.cos(t1) * half,
      xr = Math.cos(t2) * half;
    const yl = spring + Math.sin(t1) * rise,
      yr = spring + Math.sin(t2) * rise;
    masonry(
      g,
      [
        [xl, yl],
        [xr, yr],
        [xr, top],
        [xl, top],
      ],
      0,
      depth,
      lime,
    );
    const lip = 0.048;
    masonry(
      g,
      [
        [xl, yl],
        [xr, yr],
        [Math.cos(t2) * (half + lip), yr + Math.sin(t2) * lip],
        [Math.cos(t1) * (half + lip), yl + Math.sin(t1) * lip],
      ],
      0,
      depth + 0.038,
      i === steps / 2 ? cream : ochre,
    );
  }
}

function atRoof(
  w: number,
  d: number,
  ridge: number,
  y: number,
  h: number,
  side: number,
  t: number,
  u: number,
): V3 {
  const sx = w / 2 + (ridge / 2 - w / 2) * t,
    sz = d / 2 + (0.035 - d / 2) * t;
  const level = y + h * (0.45 * t + 0.55 * Math.pow(t, 1.55));
  if (side === 0) return [(2 * u - 1) * sx, level, sz];
  if (side === 1) return [sx, level, (1 - 2 * u) * sz];
  if (side === 2) return [(1 - 2 * u) * sx, level, -sz];
  return [-sx, level, (2 * u - 1) * sz];
}

/** Four hipped roof planes. Staggered individual tiles leave a hairline of visible bedding. */
function roof(
  g: Modeler,
  width: number,
  depth: number,
  ridge: number,
  y: number,
  height: number,
  rows: number,
) {
  g.box([0, y - 0.045, 0], [width - 0.06, 0.075, depth - 0.06], teak);
  g.box([0, y - 0.012, 0], [width + 0.015, 0.04, depth + 0.015], brick);
  const tileWidth = 0.115;
  for (let face = 0; face < 4; face++) {
    const p = (t: number, u: number) => atRoof(width, depth, ridge, y, height, face, t, u);
    for (let row = 0; row < rows; row++) {
      const t = row / rows,
        next = (row + 1) / rows;
      quad(g, p(t, 0), p(t, 1), p(next, 1), p(next, 0), "#8c5340");
    }
    g.decoration((details) => {
      for (let row = 0; row < rows; row++) {
        const t = row / rows,
          next = (row + 1) / rows;
        const left = p(t, 0),
          right = p(t, 1);
        const span = Math.hypot(left[0] - right[0], left[2] - right[2]);
        const n = Math.max(2, Math.round(span / tileWidth));
        const shift = row % 2 === 0 ? 0.5 : 0;
        for (let i = -1; i < n; i++) {
          const lo = Math.max(0, (i + shift) / n),
            hi = Math.min(1, (i + 1 + shift) / n);
          if (hi - lo < 0.006) continue;
          const inset = Math.min(0.014 / n, (hi - lo) * 0.15);
          const a = p(t, lo + inset),
            b = p(t, hi - inset);
          const c = p(next, hi - inset),
            d = p(next, lo + inset);
          a[1] += 0.012;
          b[1] += 0.012;
          c[1] += 0.004;
          d[1] += 0.004;
          const shade = Math.abs(i * 17 + row * 31 + face * 7) % tileColors.length;
          quad(details, a, b, c, d, tileColors[shade]!);
        }
      }
      for (let row = 0; row < rows; row++) {
        const a = p(row / rows, 0),
          b = p((row + 1) / rows, 0);
        a[1] += 0.017;
        b[1] += 0.017;
        details.beam(a, b, 0.053, 0.047, "#ba805c");
      }
    });
  }
  g.box([0, y + height + 0.014, 0], [ridge + 0.07, 0.054, 0.096], "#ac7151");
}

/** Clip each diagonal to its panel. Daylight passes through the diamond brickwork. */
function lattice(g: Modeler, width: number, height: number) {
  const x0 = -width / 2,
    x1 = width / 2,
    y0 = -height / 2,
    y1 = height / 2;
  for (const s of [-1, 1]) {
    for (let k = -10; k <= 10; k++) {
      const b = k * 0.105,
        points: XY[] = [];
      const add = (x: number, y: number) => {
        if (
          x >= x0 - 1e-6 &&
          x <= x1 + 1e-6 &&
          y >= y0 - 1e-6 &&
          y <= y1 + 1e-6 &&
          !points.some(([px, py]) => Math.hypot(px - x, py - y) < 0.001)
        )
          points.push([x, y]);
      };
      add(x0, s * x0 + b);
      add(x1, s * x1 + b);
      add((y0 - b) / s, y0);
      add((y1 - b) / s, y1);
      if (points.length !== 2) continue;
      const [a, c] = [points[0]!, points[1]!];
      g.beam([a[0], a[1], 0], [c[0], c[1], 0], 0.023, 0.028, brick);
    }
  }
  for (const x of [x0, x1]) g.box([x, 0, 0], [0.042, height + 0.045, 0.08], ochre);
  for (const y of [y0, y1]) g.box([0, y, 0], [width, 0.043, 0.09], cream);
}

function buttress(g: Modeler, x: number, z: number, tall: number) {
  g.box([x, 0.135, z], [0.3, 0.27, 0.37], stone);
  g.box([x, tall / 2 + 0.09, z], [0.205, tall - 0.18, 0.285], cream);
  g.cylinder([x, tall / 2 + 0.09, z + 0.105], 0.105, 0.105, tall - 0.18, lime, 12);
  g.box([x, 0.35, z], [0.238, 0.05, 0.32], ochre);
  for (const [dy, width, height] of [
    [0.01, 0.29, 0.068],
    [0.071, 0.239, 0.061],
    [0.125, 0.19, 0.05],
  ] as const)
    g.box([x, tall + dy, z], [width, height, width + 0.025], dy > 0.05 ? lime : ochre);
}

function gateway(g: Modeler) {
  for (const end of [-1, 1])
    g.group([0, 0.1, end * 1.025], end > 0 ? 0 : Math.PI, (wall) => {
      arcade(wall, 2.52, 0.67, 0.29, 1.29, 0.24, 0.23);
      wall.box([0, 1.18, 0.135], [2.36, 0.11, 0.055], ochre);
      wall.box([0, 1.3, 0.08], [2.68, 0.105, 0.43], cream);
      wall.box([0, 1.395, 0.03], [2.59, 0.085, 0.32], lime);
      wall.box([0, 1.485, 0.035], [2.52, 0.075, 0.325], ochre);
      for (const x of [-1.13, -0.403, 0.403, 1.13]) wall.box([x, 1.86, 0], [0.113, 0.77, 0.23], cream);
      for (const x of [-0.775, 0, 0.775])
        wall.group([x, 1.88, -0.012], 0, (section) => section.decoration((d) => lattice(d, 0.665, 0.58)));
      wall.box([0, 2.217, 0], [2.52, 0.14, 0.3], cream);
      wall.box([0, 2.302, 0], [2.58, 0.04, 0.33], ochre);
      for (const x of [-1.27, 1.27]) buttress(wall, x, 0, 2.22);
      for (const x of [-1.48, 1.48]) buttress(wall, x, -0.08, 1.55);
      wall.box([0, 0.045, 0.27], [2.0, 0.09, 0.42], stone);
      wall.box([0, 0.085, 0.16], [1.96, 0.075, 0.27], "#c4ae8d");
      // Slim two-tier canopy over the central passage.
      wall.box([0, 1.055, 0.175], [2.02, 0.055, 0.33], "#97775c");
      wall.box([0, 1.105, 0.177], [2.08, 0.055, 0.355], lime);
    });
  for (const side of [-1, 1])
    g.group([side * 1.25, 0.1, 0], (side * Math.PI) / 2, (wall) => {
      wall.box([0, 1.53, 0], [2.1, 0.19, 0.18], ochre);
      wall.box([0, 2.21, 0], [2.15, 0.14, 0.22], cream);
      for (const x of [-0.96, 0, 0.96]) wall.box([x, 1.86, 0], [0.12, 0.72, 0.19], lime);
      for (const x of [-0.48, 0.48])
        wall.group([x, 1.88, 0], 0, (section) => section.decoration((d) => lattice(d, 0.77, 0.58)));
    });
  roof(g, 3.02, 2.48, 0.85, 2.46, 0.7, 9);
}

function marketMain(g: Modeler) {
  g.box([0, 0.055, 0], [5.93, 0.11, 2.45], stone);
  g.box([0, 0.12, 0], [5.81, 0.055, 2.34], "#cdbda2");
  for (const sign of [-1, 1]) {
    g.group([sign * 2.14, 0, -0.02], 0, (wing) => {
      for (const z of [-0.99, 0.99]) {
        wing.group([0, 0.145, z], z < 0 ? Math.PI : 0, (wall) => {
          for (const x of [-0.368, 0.368])
            wall.group([x, 0, 0], 0, (bay) => {
              arcade(bay, 0.736, 0.54, 0.2, 0.91, 0.083, 0.14);
            });
          wall.box([0, 0.955, 0], [1.53, 0.075, 0.2], ochre);
          wall.box([0, 1.01, 0], [1.59, 0.057, 0.23], cream);
        });
      }
      wing.group([sign * 0.75, 0.145, 0], (sign * Math.PI) / 2, (end) => {
        for (const x of [-0.485, 0.485])
          end.group([x, 0, 0], 0, (bay) => {
            arcade(bay, 0.97, 0.53, 0.21, 0.91, 0.1, 0.135);
            bay.box([0, 0.087, 0], [0.77, 0.174, 0.12], ochre);
          });
        end.box([0, 0.96, 0], [2.06, 0.08, 0.22], lime);
      });
      wing.box([0, 0.58, 0], [1.25, 0.075, 0.41], teakLight);
      for (const x of [-0.53, 0.53]) wing.box([x, 0.36, 0], [0.07, 0.39, 0.28], teak);
      // A hipped lower roof continues the two wings on either side of the high entrance.
      roof(wing, 1.67, 2.25, 0.53, 1.24, 0.39, 5);
    });
  }
  gateway(g);
}

function subsidiary(g: Modeler) {
  const w = 2.78,
    d = 1.5;
  g.box([0, 0.07, 0], [w + 0.13, 0.14, d + 0.14], stone);
  g.box([0, 0.147, 0], [w + 0.07, 0.055, d + 0.09], "#ccb99b");
  for (const end of [-1, 1]) {
    g.group([0, 0.17, end * 0.68], end < 0 ? Math.PI : 0, (wall) => {
      for (const x of [-0.9, 0, 0.9])
        wall.group([x, 0, 0], 0, (bay) => {
          arcade(bay, 0.9, 0.46, 0.18, 0.77, 0.082, 0.13);
          if (x !== 0) bay.box([0, 0.125, 0], [0.72, 0.25, 0.105], ochre);
        });
      wall.box([0, 0.795, 0], [2.78, 0.075, 0.21], cream);
    });
  }
  for (const side of [-1, 1])
    g.group([side * 1.3, 0.17, 0], (side * Math.PI) / 2, (wall) => {
      arcade(wall, 1.38, 0.44, 0.22, 0.77, 0.16, 0.14);
      wall.box([0, 0.116, 0], [1.05, 0.232, 0.14], ochre);
      wall.box([0, 0.805, 0], [1.5, 0.065, 0.205], cream);
    });
  for (const x of [-0.85, 0.85]) {
    g.box([x, 0.45, -0.06], [0.67, 0.07, 0.39], teakLight);
    for (const foot of [-0.21, 0.21]) g.box([x + foot, 0.3, -0.06], [0.06, 0.23, 0.26], teak);
  }
  roof(g, 3.02, 1.73, 1.54, 1.055, 0.49, 6);
  for (const z of [-0.47, 0.47]) g.box([0, 1.35, z], [1.8, 0.04, 0.095], teak);
}

function ring(g: Modeler, cx: number, cy: number, cz: number, r: number, h: number, color: string) {
  const vertices: V3[] = [],
    faces: number[][] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const angle = (i * tau) / n;
    for (const [dr, dy] of [
      [-0.01, -0.45],
      [0.004, -0.5],
      [0.008, 0.4],
      [-0.01, 0.5],
    ] as const)
      vertices.push([cx + Math.cos(angle) * (r + dr), cy + h * dy, cz + Math.sin(angle) * (r + dr)]);
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 4; j++)
      faces.push([
        i * 4 + j,
        i * 4 + ((j + 1) % 4),
        ((i + 1) % n) * 4 + ((j + 1) % 4),
        ((i + 1) % n) * 4 + j,
      ]);
  g.mesh(vertices, faces, color);
}

const fruitColors = [
  ["#f3ad44", "#dd8f36", "#f1bd5c"],
  ["#87944c", "#a4a656", "#748847"],
  ["#b25a3d", "#cb7043", "#bb664c"],
  ["#d9ae54", "#efd183", "#c99749"],
];
function basket(g: Modeler, x: number, y: number, z: number, r: number, kind: number) {
  const height = r * 0.69,
    n = 14,
    vertices: V3[] = [],
    faces: number[][] = [],
    colors: string[] = [];
  const wicker = ["#b38a55", "#c19966", "#a97d4c", "#bb9360"];
  for (let row = 0; row <= 4; row++) {
    const q = row / 4;
    for (let i = 0; i < n; i++) {
      const a = (i * tau) / n,
        radius = r * (0.7 + 0.32 * q - 0.02 * q * q);
      vertices.push([x + radius * Math.cos(a), y + height * q, z + radius * Math.sin(a)]);
      if (row === 4) continue;
      const j = (i + 1) % n;
      faces.push([row * n + i, (row + 1) * n + i, (row + 1) * n + j, row * n + j]);
      colors.push(wicker[(i + row * 3) % wicker.length]!);
    }
  }
  g.mesh(vertices, faces, colors);
  ring(g, x, y + height, z, r, 0.017, "#d6ad72");
  ring(g, x, y + height * 0.44, z, r * 0.84, 0.009, "#956c46");
  const palette = fruitColors[kind % fruitColors.length]!;
  const fruitRadius = r * 0.245;
  for (let i = 0; i < 8; i++) {
    const a = (tau * i) / 8 + kind,
      reach = r * 0.68;
    g.ball(
      [x + reach * Math.cos(a), y + height - 0.002, z + reach * Math.sin(a)],
      [fruitRadius, fruitRadius * (kind === 1 ? 0.75 : 0.92), fruitRadius * 0.9],
      palette[i % 3]!,
      7,
      4,
    );
  }
  for (let i = 0; i < 3; i++) {
    const a = (tau * i) / 3 + kind * 0.3,
      reach = r * 0.26;
    g.ball(
      [x + reach * Math.cos(a), y + height + r * 0.22, z + reach * Math.sin(a)],
      [fruitRadius * 1.12, fruitRadius * 0.94, fruitRadius],
      palette[(i + 1) % 3]!,
      7,
      4,
    );
  }
}

function awning(g: Modeler, width: number, top: number, length: number) {
  const stripes = 13,
    colors = ["#af6550", "#dfc895"];
  for (const x of [-width / 2 + 0.03, width / 2 - 0.03]) {
    g.cylinder([x, top / 2, -0.27], 0.024, 0.021, top, teak, 7);
    g.cylinder([x, (top - 0.19) / 2, length - 0.32], 0.019, 0.017, top - 0.19, teak, 7);
    g.beam([x, top - 0.36, length - 0.32], [x, top - 0.12, length - 0.56], 0.023, 0.023, teakLight);
  }
  g.box([0, top - 0.2, length - 0.32], [width + 0.04, 0.025, 0.033], teak);
  for (let i = 0; i < stripes; i++) {
    const x1 = width * (i / stripes - 0.5),
      x2 = width * ((i + 1) / stripes - 0.5),
      xMid = (x1 + x2) / 2;
    const c = colors[i % 2]!;
    const zBack = -0.32,
      zFront = zBack + length;
    quad(g, [x1, top, zBack], [x1, top - 0.2, zFront], [x2, top - 0.2, zFront], [x2, top, zBack], c);
    g.mesh(
      [
        [x1, top - 0.199, zFront],
        [x1, top - 0.26, zFront + 0.014],
        [xMid, top - 0.287, zFront + 0.016],
        [x2, top - 0.26, zFront + 0.014],
        [x2, top - 0.199, zFront],
      ],
      [[0, 1, 2, 3, 4]],
      c,
    );
  }
}

function fruitStand(g: Modeler) {
  g.box([0, 0.355, 0], [1.42, 0.07, 0.52], teakLight);
  for (const x of [-0.59, 0.59])
    for (const z of [-0.18, 0.18]) g.box([x, 0.196, z], [0.053, 0.32, 0.053], teak);
  g.box([0, 0.16, -0.16], [1.23, 0.045, 0.04], teakLight);
  for (const x of [-0.32, 0.35]) {
    g.box([x, 0.106, -0.035], [0.41, 0.052, 0.23], "#9f7950");
    for (const y of [0.15, 0.21]) g.box([x, y, 0.085], [0.415, 0.034, 0.025], "#ab8659");
  }
  g.decoration((d) => {
    basket(d, -0.47, 0.395, 0.02, 0.164, 0);
    basket(d, -0.07, 0.395, -0.02, 0.202, 1);
    basket(d, 0.39, 0.395, 0.006, 0.176, 2);
    basket(d, 0.78, 0.04, 0.07, 0.175, 3);
    awning(d, 1.56, 1.13, 0.64);
  });
}

function handCart(g: Modeler) {
  g.box([0, 0.35, 0], [0.54, 0.055, 0.67], teakLight);
  for (const x of [-0.247, 0.247]) {
    for (const y of [0.43, 0.51]) g.box([x, y, 0], [0.026, 0.057, 0.66], "#af8758");
    for (const z of [-0.289, 0.289]) g.box([x, 0.44, z], [0.038, 0.24, 0.046], teak);
    g.beam([x * 0.79, 0.32, -0.2], [x * 0.8, 0.5, -0.62], 0.029, 0.029, teak);
    g.beam([x * 0.78, 0.33, -0.2], [x * 0.9, 0.034, -0.22], 0.032, 0.038, teak);
  }
  g.box([0, 0.205, 0.1], [0.68, 0.046, 0.05], "#4c5045");
  for (const side of [-1, 1])
    g.group([side * 0.31, 0.205, 0.1], Math.PI / 2, (wheel) => {
      const center: V3 = [0, 0, 0];
      for (let i = 0; i < 12; i++) {
        const a = (i * tau) / 12,
          b = ((i + 1) * tau) / 12;
        const from: V3 = [0.182 * Math.cos(a), 0.182 * Math.sin(a), 0],
          to: V3 = [0.182 * Math.cos(b), 0.182 * Math.sin(b), 0];
        wheel.beam(from, to, 0.03, 0.035, "#5c5547");
        wheel.beam(center, from, 0.012, 0.016, "#906f4a");
      }
    });
  basket(g, 0, 0.39, 0.12, 0.182, 3);
}

function street(g: Modeler) {
  const x0 = -3.72,
    x1 = 3.73;
  const trace = (x: number) => 0.86 - 0.112 * x;
  const band = (left: number, right: number, level: number, color: string) => {
    quad(
      g,
      [x0, level, trace(x0) + right],
      [x1, level, trace(x1) + right],
      [x1, level, trace(x1) + left],
      [x0, level, trace(x0) + left],
      color,
    );
  };
  band(-0.81, 0.8, 0.021, "#a7957c");
  band(-0.53, 0.53, 0.029, "#968779");
  for (const side of [-1, 1]) {
    for (let i = 0; i < 21; i++) {
      const x = x0 + ((i + 0.5) * (x1 - x0)) / 21,
        z = trace(x) + side * 0.57;
      g.box([x, 0.05, z], [((x1 - x0) / 21) * 0.982, 0.057, 0.091], i % 3 ? "#c5b39a" : "#b6a48e", 0.112);
    }
  }
  // Broken joints, quiet enough to read as masonry instead of road markings.
  g.decoration((grout) => {
    for (let row = 0; row < 7; row++) {
      const zOffset = (row - 3) * 0.136;
      for (let i = 0; i < 22; i++) {
        const x = x0 + (i + (row % 2 ? 0.68 : 0.3)) * 0.33;
        grout.box(
          [x, 0.031, trace(x) + zOffset],
          [0.311, 0.006, 0.128],
          ["#9e8f7f", "#a49483", "#a19280", "#a69680"][(i + row * 3) % 4]!,
          0.112,
        );
      }
    }
  });
}

export function pasar(g: Modeler) {
  street(g);
  g.group([-0.48, 0, -1.51], 0.112, marketMain);
  g.group([2.09, 0, 1.93], 0.112, subsidiary);
  g.group([-2.37, 0, 0.4], 0.112, fruitStand);
  g.group([-3.22, 0, 2.44], -0.19, (cart) => cart.decoration(handCart));
}
