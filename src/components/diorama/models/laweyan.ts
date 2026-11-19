import { type Modeler, type V3 } from "../geometry";

const clay = ["#b46c4e", "#a9654c", "#b97353", "#bf7858", "#ab6348", "#c07b5a"];
const limestone = "#d8bd91";
const plaster = "#e7cfaa";
const sand = "#c8ae88";
const stone = "#8c8775";
const wood = "#704c38";
const darkTeak = "#4b3c30";
const indigo = "#274254";
const ivory = "#eddbad";
const tau = Math.PI * 2;
type UV = [number, number];

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

class Surfaces {
  points: V3[] = [];
  faces: number[][] = [];
  colors: string[] = [];
  add(points: V3[], color: string) {
    const start = this.points.length;
    this.faces.push(points.map((_, i) => start + i));
    this.points.push(...points);
    this.colors.push(color);
  }
  draw(g: Modeler) {
    if (this.faces.length) g.mesh(this.points, this.faces, this.colors);
  }
}

function hipRoof(g: Modeler, width: number, depth: number, y: number, height: number) {
  const w = width * 0.5,
    d = depth * 0.5;
  const ridge = Math.max(w * 0.23, w - d * 0.93);
  function roofPoint(side: number, u: number, v: number, lift = 0): V3 {
    const hw = mix(w, ridge, v),
      hd = d * (1 - v),
      p = 2 * u - 1;
    const yv = y + height * (v < 0.16 ? 0.63 * v : 0.1008 + (v - 0.16) * 1.07) + lift;
    if (side === 0) return [hw * p, yv, hd];
    if (side === 1) return [hw, yv, -hd * p];
    if (side === 2) return [-hw * p, yv, -hd];
    return [-hw, yv, hd * p];
  }
  // The thick shell remains solid when decorative pantiles are hidden.
  const shell = new Surfaces();
  const tiles = new Surfaces();
  for (let side = 0; side < 4; side++) {
    for (const [a, b] of [
      [0, 0.16],
      [0.16, 1],
    ] as const) {
      shell.add(
        [roofPoint(side, 0, a), roofPoint(side, 1, a), roofPoint(side, 1, b), roofPoint(side, 0, b)],
        "#9d604a",
      );
    }
    shell.add(
      [
        roofPoint(side, 0, 0, -0.067),
        roofPoint(side, 1, 0, -0.067),
        roofPoint(side, 1, 0),
        roofPoint(side, 0, 0),
      ],
      "#784d38",
    );
    const rows = Math.max(5, Math.round((side % 2 ? w - ridge : d) / 0.14));
    for (let row = 0; row < rows; row++) {
      const v1 = row / rows,
        v2 = (row + 1) / rows,
        mid = (v1 + v2) / 2;
      const span = side % 2 ? 2 * d * (1 - mid) : 2 * mix(w, ridge, mid);
      const columns = Math.max(1, Math.round(span / 0.16));
      for (let col = 0; col < columns; col++) {
        const cast = clay[(col * 7 + row * 11 + side + Math.floor(col / 3) * 3) % clay.length]!;
        const stops = [0, 0.19, 0.42, 1] as const;
        const bulges = [0.005, 0.027, 0.007, 0.005] as const;
        for (let k = 0; k < 3; k++) {
          const u1 = (col + stops[k]!) / columns,
            u2 = (col + stops[k + 1]!) / columns;
          const a = bulges[k]!,
            b = bulges[k + 1]!;
          tiles.add(
            [
              roofPoint(side, u1, v1, a + 0.015),
              roofPoint(side, u2, v1, b + 0.015),
              roofPoint(side, u2, v2, b),
              roofPoint(side, u1, v2, a),
            ],
            cast,
          );
          if (k === 2)
            tiles.add(
              [
                roofPoint(side, u1, v1, 0.003),
                roofPoint(side, u2, v1, 0.003),
                roofPoint(side, u2, v1, b + 0.015),
                roofPoint(side, u1, v1, a + 0.015),
              ],
              "#8a5540",
            );
        }
      }
    }
    g.decoration((detail) => {
      for (let n = 0; n < 8; n++) {
        detail.beam(
          roofPoint(side, 0, n / 8, 0.03),
          roofPoint(side, 0, (n + 1) / 8, 0.03),
          0.074,
          0.068,
          n % 3 === 0 ? "#c17e5a" : "#aa684b",
        );
      }
    });
  }
  shell.add(
    [
      [-w, y - 0.067, -d],
      [w, y - 0.067, -d],
      [w, y - 0.067, d],
      [-w, y - 0.067, d],
    ],
    darkTeak,
  );
  shell.draw(g);
  g.decoration((detail) => tiles.draw(detail));
  const roofTop = y + height;
  const pieces = Math.max(4, Math.round((ridge * 2) / 0.185));
  for (let i = 0; i < pieces; i++) {
    const x = mix(-ridge, ridge, (i + 0.5) / pieces);
    g.box(
      [x, roofTop + 0.042, 0],
      [(ridge * 2) / pieces + 0.004, 0.073, 0.1],
      i % 3 === 0 ? "#c7835f" : "#b57654",
    );
  }
}

function shutter(g: Modeler, x: number, base: number, z: number, width: number, height: number) {
  const teal = "#62786a",
    bars = "#506354";
  g.box([x, base + height + 0.029, z], [width + 0.105, 0.068, 0.1], limestone);
  g.box([x, base - 0.018, z + 0.006], [width + 0.095, 0.063, 0.135], limestone);
  for (const edge of [-1, 1])
    g.box([x + edge * (width / 2 + 0.012), base + height * 0.5, z], [0.043, height, 0.095], wood);
  g.box([x, base + height / 2, z - 0.035], [width * 0.96, height - 0.025, 0.036], bars);
  for (const edge of [-1, 1]) {
    const middle = x + edge * width * 0.24;
    g.box([middle, base + height * 0.5, z + 0.02], [width * 0.445, height - 0.02, 0.038], teal);
    for (let n = 0; n < 6; n++) {
      const sy = base + 0.077 + ((height - 0.12) * n) / 6;
      g.box([middle, sy, z + 0.05], [width * 0.34, 0.027, 0.036], "#819180");
    }
    g.box([middle, base + height - 0.032, z + 0.048], [width * 0.4, 0.028, 0.034], "#91a08a");
  }
}

function doorway(g: Modeler, half: number, openHeight: number, front: number) {
  g.box([0, 0.14, front + 0.105], [half * 2 + 0.32, 0.075, 0.24], stone);
  g.box([0, 0.094, front + 0.24], [half * 2 + 0.43, 0.047, 0.18], sand);
  for (const sign of [-1, 1]) {
    g.box(
      [sign * (half - 0.024), openHeight * 0.52 + 0.01, front],
      [0.051, openHeight - 0.06, 0.12],
      darkTeak,
    );
    g.box(
      [sign * (half - 0.022), openHeight * 0.45, front - 0.113],
      [0.033, openHeight * 0.8, 0.24],
      "#597060",
    );
    g.box([sign * (half - 0.008), openHeight * 0.43, front - 0.097], [0.025, 0.025, 0.026], "#c9a265");
  }
  g.box([0, openHeight - 0.02, front], [half * 2 + 0.045, 0.058, 0.13], darkTeak);
  for (let k = -2; k <= 2; k++)
    g.box([(k * half) / 3, openHeight + 0.067, front], [0.025, 0.122, 0.047], wood);
}

function house(g: Modeler, width: number, depth: number, eave: number, rise: number, small = false) {
  const x = width * 0.5,
    z = depth * 0.5,
    bottom = 0.14,
    h = eave - bottom - 0.038;
  g.box([0, 0.089, 0], [width + 0.18, 0.11, depth + 0.18], stone);
  g.box([0, bottom, 0], [width + 0.07, 0.07, depth + 0.07], limestone);
  const frontWall = (left: number, right: number, low: number, high: number, color = plaster) => {
    g.box([(left + right) / 2, (high + low) / 2, z], [right - left, high - low, 0.11], color);
  };
  const half = small ? 0.205 : 0.285;
  const doorTop = small ? 0.81 : 1.075;
  const windowWidth = small ? 0.26 : 0.46,
    windowCtr = x * 0.65,
    sill = small ? 0.45 : 0.53;
  const winTop = small ? 0.77 : 1.035;
  const leftWindow = windowCtr - windowWidth / 2,
    rightWindow = windowCtr + windowWidth / 2;
  for (const sign of [-1, 1]) {
    const intervals: [[number, number], [number, number]] = [
      [half, leftWindow],
      [rightWindow, x],
    ];
    for (const [left, right] of intervals) {
      const ranges = sign > 0 ? ([left, right] as const) : ([-right, -left] as const);
      frontWall(ranges[0], ranges[1], bottom, eave);
    }
    const a = sign > 0 ? leftWindow : -rightWindow,
      b = sign > 0 ? rightWindow : -leftWindow;
    frontWall(a, b, bottom, sill, limestone);
    frontWall(a, b, winTop, eave);
    shutter(g, sign * windowCtr, sill, z + 0.005, windowWidth, winTop - sill);
  }
  frontWall(-half, half, doorTop + 0.13, eave);
  doorway(g, half, doorTop, z);
  g.box([0, bottom + h / 2, -z], [width, h, 0.11], limestone);
  for (const sign of [-1, 1]) {
    g.box([sign * x, bottom + h / 2, 0], [0.11, h, depth], plaster);
    g.box([sign * (x + 0.004), 0.31, 0], [0.12, 0.28, depth + 0.026], limestone);
    g.box([sign * (x + 0.005), 0.47, 0], [0.137, 0.043, depth + 0.04], "#ae9b79");
    for (const end of [-1, 1]) {
      g.box([sign * x, eave * 0.53, end * z], [0.132, eave - 0.13, 0.143], limestone);
      g.box([sign * x, eave - 0.13, end * z], [0.168, 0.13, 0.178], plaster);
    }
    g.group([sign * (x + 0.061), 0, 0], (sign * Math.PI) / 2, (side) =>
      shutter(side, 0, 0.55, 0, small ? 0.27 : 0.39, 0.4),
    );
  }
  // The rear elevation also has actual timber trim and shutters.
  g.group([0, 0, -z - 0.06], Math.PI, (back) => {
    for (const s of [-1, 1]) shutter(back, s * x * 0.47, 0.53, 0, small ? 0.26 : 0.43, small ? 0.27 : 0.4);
  });
  g.box([0, eave - 0.056, 0], [width + 0.17, 0.085, depth + 0.17], darkTeak);
  g.box([0, eave - 0.008, 0], [width + 0.24, 0.044, depth + 0.23], "#9b7652");
  hipRoof(g, width + 0.4, depth + 0.4, eave + 0.037, rise);
}

function wall(g: Modeler, x: number, z: number, length: number, yaw: number, h: number) {
  if (length < 0.03) return;
  g.group([x, 0, z], yaw, (w) => {
    w.box([0, h / 2 + 0.056, 0], [length, h, 0.13], limestone);
    w.box([0, 0.176, 0], [length + 0.008, 0.24, 0.153], "#b59b7c");
    w.box([0, h + 0.062, 0], [length + 0.022, 0.063, 0.176], plaster);
    w.box([0, h + 0.103, 0], [length + 0.037, 0.035, 0.192], "#aa7154");
    const count = Math.max(1, Math.round(length / 0.87));
    for (let i = 0; i <= count; i++) {
      const px = length * (i / count - 0.5);
      w.box([px, h * 0.51 + 0.05, 0], [0.107, h + 0.038, 0.174], plaster);
      w.box([px, h + 0.1, 0], [0.141, 0.067, 0.206], limestone);
    }
  });
}

function gate(g: Modeler) {
  const focus = 0.78,
    ringX = 0.635,
    ringY = 0.36,
    thickness = 0.12;
  for (const s of [-1, 1]) {
    const px = s * (ringX + 0.085);
    g.box([px, 0.16, 0], [0.36, 0.24, 0.37], "#ae8e70");
    g.box([px, 0.63, 0], [0.267, 0.77, 0.29], plaster);
    g.box([px, 1.11, 0], [0.293, 0.25, 0.3], limestone);
    g.box([px, 1.265, 0], [0.335, 0.087, 0.34], plaster);
    for (const z of [-0.16, 0.16]) {
      g.box([px, 0.65, z], [0.149, 0.47, 0.027], "#ba9878");
      g.box([px, 0.66, z * 1.05], [0.095, 0.4, 0.023], "#ddc39a");
    }
    // Open timber door leaves are secured against the inside of the gate.
    g.box([s * (ringX + 0.005), 0.6, -0.227], [0.041, 1.03, 0.405], wood);
    for (let i = 0; i < 4; i++) g.box([s * ringX, 0.61, -0.09 - i * 0.095], [0.049, 0.93, 0.019], darkTeak);
    for (const y of [0.37, 0.82]) g.box([s * (ringX - 0.011), y, -0.224], [0.045, 0.05, 0.39], "#a17d51");
  }
  const arch = new Surfaces();
  function arc(theta: number, r: number, h: number, z: number): V3 {
    return [Math.cos(theta) * r, focus + Math.sin(theta) * h, z];
  }
  for (let i = 0; i < 17; i++) {
    const a = (Math.PI * i) / 17,
      b = (Math.PI * (i + 1)) / 17;
    const innerA = arc(a, ringX, ringY, 0.145),
      innerB = arc(b, ringX, ringY, 0.145);
    const outerA = arc(a, ringX + thickness, ringY + 0.17, 0.145),
      outerB = arc(b, ringX + thickness, ringY + 0.17, 0.145);
    const an = arc(a, ringX, ringY, -0.145),
      bn = arc(b, ringX, ringY, -0.145);
    const onA = arc(a, ringX + thickness, ringY + 0.17, -0.145),
      onB = arc(b, ringX + thickness, ringY + 0.17, -0.145);
    const c = i % 2 ? "#e7cfa5" : "#d7ba91";
    arch.add([innerA, outerA, outerB, innerB], c);
    arch.add([bn, onB, onA, an], c);
    arch.add([an, innerA, innerB, bn], limestone);
    arch.add([outerA, onA, onB, outerB], plaster);
    arch.add([outerA, [outerA[0], 1.4, 0.145], [outerB[0], 1.4, 0.145], outerB], plaster);
    arch.add([onB, [onB[0], 1.4, -0.145], [onA[0], 1.4, -0.145], onA], limestone);
  }
  arch.draw(g);
  g.box([0, 1.412, 0], [1.8, 0.098, 0.38], plaster);
  g.box([0, 1.484, 0], [1.87, 0.063, 0.412], "#ad7e59");
  g.box([0, 1.536, 0], [1.64, 0.05, 0.35], limestone);
  g.box([0, 1.58, 0], [0.91, 0.075, 0.28], plaster);
  g.box([0, 1.64, 0], [0.7, 0.059, 0.298], "#b68b61");
  g.box([0, 1.693, 0], [0.43, 0.05, 0.23], plaster);
  for (const s of [-1, 1]) {
    g.cylinder([s * 0.72, 1.57, 0], 0.075, 0.057, 0.09, "#87694e", 8);
    g.ball([s * 0.72, 1.646, 0], [0.069, 0.085, 0.069], limestone, 8, 4);
  }
}

function gawangan(g: Modeler, width: number, top: number, drop: number, blue: boolean) {
  const frame = width + 0.3,
    radius = 0.033,
    base = top - drop;
  for (const s of [-1, 1]) {
    const x = (s * frame) / 2;
    g.cylinder([x, top / 2 + 0.04, 0], 0.042, 0.034, top - 0.025, "#987244", 10);
    g.box([x, 0.104, 0], [0.105, 0.064, 0.45], wood);
    for (const y of [0.36, top - 0.19, top - 0.07]) g.cylinder([x, y, 0], 0.039, 0.039, 0.024, "#694b37", 10);
    g.beam([x, 0.12, s * 0.17], [x, 0.38, 0], 0.032, 0.033, "#a27c51");
  }
  g.beam([-frame / 2 - 0.055, top, 0], [frame / 2 + 0.055, top, 0], 0.065, 0.067, "#b18c56");
  function fabric(u: number, v: number, dz = 0): V3 {
    const sway = Math.sin(Math.PI * u);
    const folds = 0.06 * Math.sin(tau * (u * 2.8 + 0.095 * v)) + 0.015 * Math.sin(tau * (u * 5.7 - 0.14 * v));
    return [
      (u - 0.5) * width + 0.014 * v * Math.sin(u * tau),
      top + 0.006 - v * drop - 0.074 * sway * v + 0.023 * v * v * Math.sin(tau * (u * 2.6 + 0.15)),
      radius + 0.014 + folds * (0.22 * v + 0.78 * Math.sqrt(v)) + 0.045 * v * v + dz,
    ];
  }
  const textile = new Surfaces();
  const cols = 36,
    rows = 11;
  for (let x = 0; x < cols; x++) {
    const a = x / cols,
      b = (x + 1) / cols;
    for (let y = 0; y < rows; y++) {
      const c = y / rows,
        d = (y + 1) / rows;
      textile.add([fabric(a, c), fabric(a, d), fabric(b, d), fabric(b, c)], blue ? indigo : "#a5533a");
    }
    const pa = fabric(a, 0),
      pb = fabric(b, 0);
    function crest(point: V3, theta: number): V3 {
      return [point[0], point[1] + 0.042 * Math.sin(theta), point[2] - 0.049 * (1 - Math.cos(theta))];
    }
    for (let i = 0; i < 4; i++) {
      const j = (Math.PI * i) / 4,
        k = (Math.PI * (i + 1)) / 4;
      textile.add([crest(pa, j), crest(pb, j), crest(pb, k), crest(pa, k)], blue ? "#314e5e" : "#b36547");
    }
    const aBack = crest(pa, Math.PI),
      bBack = crest(pb, Math.PI);
    textile.add(
      [
        bBack,
        [bBack[0], bBack[1] - 0.14, bBack[2] - 0.01],
        [aBack[0], aBack[1] - 0.14, aBack[2] - 0.01],
        aBack,
      ],
      blue ? "#324854" : "#8f4b37",
    );
  }
  textile.draw(g);
  const designs = new Surfaces();
  function patch(points: UV[], color: string) {
    designs.add(
      points.map(([u, v]) => fabric(u, v, 0.008)),
      color,
    );
  }
  function band(v1: number, v2: number, color: string) {
    for (let i = 0; i < cols; i++)
      patch(
        [
          [i / cols, v1],
          [i / cols, v2],
          [(i + 1) / cols, v2],
          [(i + 1) / cols, v1],
        ],
        color,
      );
  }
  function mark(u: number, v: number, rx: number, ry: number, c: string) {
    patch(
      [
        [u, v - ry],
        [u - rx, v],
        [u, v + ry],
        [u + rx, v],
      ],
      c,
    );
  }
  function stroke(points: UV[], thickness: number, c: string) {
    for (let i = 1; i < points.length; i++) {
      const [u, v] = points[i - 1]!,
        [uu, vv] = points[i]!;
      const du = (uu - u) * width,
        dv = (vv - v) * drop,
        length = Math.hypot(du, dv);
      if (!length) continue;
      const nx = (((-dv / length) * thickness) / width) * 0.5,
        ny = (((du / length) * thickness) / drop) * 0.5;
      patch(
        [
          [u + nx, v + ny],
          [uu + nx, vv + ny],
          [uu - nx, vv - ny],
          [u - nx, v - ny],
        ],
        c,
      );
    }
  }
  band(0.022, 0.032, "#d6ac79");
  band(0.044, 0.051, ivory);
  band(0.923, 0.932, ivory);
  band(0.941, 0.966, blue ? "#ba8f5a" : "#773f34");
  band(0.974, 0.983, ivory);
  for (let i = 0; i < 25; i++) {
    const u = (i + 0.5) / 25;
    mark(u, 0.952, 0.009, 0.01, ivory);
    stroke(
      [
        [u - 0.007, 0.989],
        [u + 0.006, 0.988],
      ],
      0.008,
      "#d3bb8d",
    );
  }
  for (const u of [0.022, 0.975]) {
    for (let j = 0; j < 12; j++)
      stroke(
        [
          [u, j / 12],
          [u, (j + 1) / 12],
        ],
        0.012,
        "#caad7e",
      );
  }
  const nx = blue ? 6 : 4,
    ny = blue ? 4 : 3;
  for (let row = 0; row < ny; row++) {
    for (let i = 0; i < nx; i++) {
      const u = 0.085 + i * (0.83 / (nx - 1)) + (row % 2 === 0 ? -0.019 : 0.019);
      const v = 0.16 + row * (0.67 / (ny - 1));
      const golden = blue ? "#d3ad75" : "#edd099";
      if (blue) {
        const w = 0.062,
          h = 0.086;
        stroke(
          [
            [u, v - h],
            [u + w * 0.6, v - h * 0.54],
            [u + w, v],
            [u + w * 0.6, v + h * 0.54],
            [u, v + h],
            [u - w * 0.6, v + h * 0.54],
            [u - w, v],
            [u - w * 0.6, v - h * 0.54],
            [u, v - h],
          ],
          0.01,
          golden,
        );
        for (const sx of [-1, 1])
          for (const sy of [-1, 1]) {
            const xx = u + sx * 0.028,
              yy = v + sy * 0.034;
            patch(
              [
                [u + sx * 0.005, v + sy * 0.006],
                [xx, yy - sy * 0.014],
                [u + sx * 0.04, v + sy * 0.054],
                [xx - sx * 0.012, yy],
              ],
              ivory,
            );
          }
        // Scattered wax dots and rice-shaped isen fill the ground between the main repeats.
        for (const sx of [-1, 1])
          for (const sy of [-1, 1]) {
            const pale = sy === 1 ? "#d2b585" : "#bd9e72";
            mark(u + sx * 0.046, v + sy * 0.032, 0.0035, 0.0046, pale);
            mark(u + sx * 0.034, v + sy * 0.054, 0.0033, 0.0042, pale);
            mark(u + sx * 0.021, v + sy * 0.07, 0.0032, 0.004, pale);
            const ax = u + sx * 0.064,
              ay = v + sy * 0.06;
            stroke(
              [
                [ax - sx * 0.009, ay + sy * 0.022],
                [ax - sx * 0.003, ay + sy * 0.013],
                [ax + sx * 0.009, ay + sy * 0.008],
              ],
              0.006,
              pale,
            );
            patch(
              [
                [ax - sx * 0.008, ay + sy * 0.02],
                [ax - sx * 0.014, ay + sy * 0.01],
                [ax - sx * 0.011, ay + sy * 0.001],
                [ax - sx * 0.004, ay + sy * 0.009],
              ],
              golden,
            );
            mark(ax + sx * 0.007, ay + sy * 0.004, 0.0033, 0.0044, ivory);
          }
        mark(u, v, 0.009, 0.012, "#b88859");
        mark(u, v + 0.103, 0.005, 0.008, ivory);
      } else {
        stroke(
          [
            [u - 0.055, v + 0.06],
            [u + 0.054, v - 0.06],
          ],
          0.016,
          golden,
        );
        for (const sign of [-1, 1]) {
          patch(
            [
              [u + sign * 0.008, v - sign * 0.009],
              [u + sign * 0.061, v - sign * 0.014],
              [u + sign * 0.071, v - sign * 0.043],
              [u + sign * 0.028, v - sign * 0.038],
            ],
            ivory,
          );
        }
        mark(u, v + 0.089, 0.007, 0.012, "#d6a36a");
      }
    }
  }
  g.decoration((detail) => designs.draw(detail));
  // A short back fold and the visible open space beneath it give the cloth actual depth.
  g.box([frame / 2 - 0.085, base - 0.035, 0], [0.06, 0.047, 0.06], "#a78454");
}

function worktable(g: Modeler) {
  const w = 0.78,
    d = 0.46,
    top = 0.432;
  for (const x of [-0.33, 0.33])
    for (const z of [-0.17, 0.17]) {
      g.box([x, 0.255, z], [0.054, 0.38, 0.058], wood);
      g.box([x, 0.085, z], [0.064, 0.043, 0.065], darkTeak);
    }
  g.box([0, top - 0.047, 0], [w - 0.033, 0.072, d - 0.03], darkTeak);
  for (let i = 0; i < 4; i++)
    g.box([0, top, -d / 2 + (d * (i + 0.5)) / 4], [w, 0.048, d / 4 - 0.006], i % 3 ? "#a17b55" : "#96714e");
  // The copper reservoir is an open cup. The fine spout curves away from the bamboo handle.
  g.beam([-0.29, top + 0.035, 0.11], [-0.03, top + 0.074, 0.016], 0.045, 0.049, "#cb9b5f");
  g.beam([-0.055, top + 0.075, 0.022], [0.01, top + 0.087, -0.004], 0.027, 0.029, "#8b623d");
  const cup = new Surfaces();
  const cx = 0.045,
    cz = -0.008;
  for (let j = 0; j < 12; j++) {
    const a = (tau * j) / 12,
      b = (tau * (j + 1)) / 12;
    const rim = (t: number, r: number, height: number): V3 => [
      cx + r * Math.cos(t),
      height,
      cz - r * Math.sin(t),
    ];
    cup.add(
      [
        rim(a, 0.035, top + 0.053),
        rim(b, 0.035, top + 0.053),
        rim(b, 0.055, top + 0.135),
        rim(a, 0.055, top + 0.135),
      ],
      "#af7347",
    );
    cup.add(
      [
        rim(a, 0.055, top + 0.135),
        rim(b, 0.055, top + 0.135),
        rim(b, 0.043, top + 0.135),
        rim(a, 0.043, top + 0.135),
      ],
      "#d7a66b",
    );
    cup.add(
      [
        rim(a, 0.043, top + 0.135),
        rim(b, 0.043, top + 0.135),
        rim(b, 0.031, top + 0.07),
        rim(a, 0.031, top + 0.07),
      ],
      "#775443",
    );
  }
  cup.draw(g);
  const spout: V3[] = [
    [0.084, top + 0.077, -0.012],
    [0.116, top + 0.079, -0.022],
    [0.148, top + 0.109, -0.032],
    [0.164, top + 0.135, -0.037],
  ];
  for (let i = 1; i < spout.length; i++)
    g.beam(spout[i - 1]!, spout[i]!, i === 1 ? 0.021 : 0.013, i === 1 ? 0.021 : 0.013, "#a5764c");
  g.box([0.244, top + 0.045, 0.075], [0.1, 0.044, 0.085], "#e0b961", 0.22);
  g.box([0.266, top + 0.074, 0.087], [0.087, 0.029, 0.073], "#cfab5e", -0.16);
  g.cylinder([0.22, top + 0.04, -0.122], 0.07, 0.078, 0.045, "#ad7751", 10);
  g.cylinder([0.22, top + 0.065, -0.122], 0.065, 0.065, 0.009, "#765e3f", 10);
}

function pottedPlant(g: Modeler, x: number, z: number, size: number) {
  g.group([x, 0.063, z], 0, (p) => {
    p.cylinder([0, 0.12 * size, 0], 0.106 * size, 0.16 * size, 0.24 * size, "#aa7155", 10);
    p.cylinder([0, 0.235 * size, 0], 0.167 * size, 0.167 * size, 0.043 * size, "#c08968", 10);
    p.cylinder([0, 0.255 * size, 0], 0.135 * size, 0.135 * size, 0.012 * size, "#5c5140", 10);
    const leaves = new Surfaces();
    const greens = ["#738667", "#668069", "#88946b", "#60806e"];
    for (let i = 0; i < 11; i++) {
      const a = (tau * i) / 11 + 0.34 * i,
        h = size * (0.26 + (i % 4) * 0.074),
        len = size * (0.23 + (i % 3) * 0.065),
        wd = size * (0.042 + (i % 3) * 0.013);
      const leaf = (dist: number, y: number, wide: number): V3 => [
        Math.cos(a) * dist - Math.sin(a) * wide,
        0.26 * size + y,
        Math.sin(a) * dist + Math.cos(a) * wide,
      ];
      const base = leaf(0, 0, 0),
        lm = leaf(len * 0.51, h * 0.88, -wd),
        rm = leaf(len * 0.51, h * 0.88, wd);
      const vein = leaf(len * 0.53, h * 0.99, 0),
        end = leaf(len, h * 0.73, 0);
      leaves.add([base, vein, lm], greens[i % 4]!);
      leaves.add([base, rm, vein], greens[(i + 1) % 4]!);
      leaves.add([lm, vein, end], greens[i % 4]!);
      leaves.add([vein, rm, end], greens[(i + 1) % 4]!);
    }
    p.decoration((detail) => leaves.draw(detail));
  });
}

function paving(g: Modeler, x: number, z: number, width: number, depth: number, stonework: boolean) {
  const main = stonework ? "#a6987f" : "#c09b76";
  g.box([x, 0.034, z], [width, 0.05, depth], main);
  g.decoration((d) => {
    const shades = stonework
      ? ["#c5b59c", "#c1b098", "#bbaa90", "#cbbaa1"]
      : ["#d1b391", "#cdae88", "#d5b995", "#c6a581"];
    const s = stonework ? 0.39 : 0.32,
      h = stonework ? 0.245 : 0.214;
    const rows = Math.ceil(depth / h);
    const faces = new Surfaces();
    for (let r = 0; r < rows; r++) {
      const back = -depth / 2 + (depth * r) / rows + 0.009,
        front = -depth / 2 + (depth * (r + 1)) / rows - 0.009;
      const origin = -(width / 2) - (r % 2) * s * 0.5;
      for (let i = 0, along = origin; along < width / 2; i++, along += s) {
        const l = Math.max(-width / 2, along) + 0.008,
          rr = Math.min(width / 2, along + s) - 0.008;
        if (rr - l < 0.035) continue;
        const rise = 0.061 + (i % 2) * 0.0007;
        faces.add(
          [
            [x + l, rise, z + back],
            [x + l, rise, z + front],
            [x + rr, rise, z + front],
            [x + rr, rise, z + back],
          ],
          shades[(r * 5 + i * 3 + Math.floor(i * 0.4)) % shades.length]!,
        );
      }
    }
    faces.draw(d);
  });
}

export function laweyan(g: Modeler) {
  // An invented workshop courtyard, viewed from the western alley and the broad southern entrance.
  paving(g, -2.961, 0, 1.15, 5.72, true);
  paving(g, 0.57, 2.565, 5.94, 0.58, true);
  paving(g, 0.45, -0.205, 5.72, 4.95, false);
  g.group([-0.41, 0, -1.62], 0, (h) => house(h, 3.32, 1.71, 1.455, 1.205));
  g.group([2.46, 0, 0.46], -Math.PI / 2, (h) => house(h, 2.93, 1.46, 1.34, 0.99));
  g.group([2.45, 0, -2.18], 0, (h) => house(h, 1.7, 0.92, 1.02, 0.73, true));

  wall(g, 0.45, -2.8, 6.1, 0, 0.79);
  wall(g, 3.48, -0.17, 5.21, Math.PI / 2, 0.78);
  wall(g, -3.465, -1.56, 2.49, Math.PI / 2, 0.96);
  wall(g, -2.35, -1.39, 2.72, Math.PI / 2, 1.13);
  wall(g, -2.35, 1.93, 0.66, Math.PI / 2, 0.98);
  g.group([-2.35, 0, 0.765], -Math.PI / 2, gate);
  wall(g, -2.04, 2.22, 0.62, 0, 0.92);
  wall(g, 2.04, 2.22, 2.93, 0, 0.88);
  for (const x of [-1.77, 0.592]) {
    g.box([x, 0.54, 2.22], [0.23, 0.94, 0.25], plaster);
    g.box([x, 1.02, 2.22], [0.263, 0.074, 0.278], "#b58762");
    g.box([x, 1.078, 2.22], [0.209, 0.051, 0.218], limestone);
  }
  // The line of the western gutter and cover grilles leads into the gang.
  g.box([-2.53, 0.067, -0.6], [0.08, 0.012, 4.2], "#837c69");
  for (const z of [-1.88, -0.32, 1.11])
    for (let i = 0; i < 5; i++) g.box([-2.53, 0.079, z + 0.05 * i], [0.106, 0.014, 0.016], "#615f52");

  g.group([-0.87, 0.02, 0.48], -0.59, (f) => gawangan(f, 1.55, 1.55, 1.1, true));
  g.group([0.88, 0.01, -0.18], -0.31, (f) => gawangan(f, 0.83, 1.23, 0.76, false));
  g.group([0.34, 0.02, 1.22], -0.26, worktable);
  g.group([0.9, 0.061, 1.33], 0.22, (s) => {
    for (const xx of [-0.115, 0.115])
      for (const zz of [-0.09, 0.09]) s.box([xx, 0.115, zz], [0.038, 0.23, 0.039], wood);
    s.box([0, 0.238, 0], [0.31, 0.049, 0.25], "#b3915e");
    for (let n = 0; n < 6; n++) s.box([-0.12 + n * 0.048, 0.266, 0], [0.018, 0.011, 0.207], "#d2aa73");
  });
  pottedPlant(g, -1.98, -0.35, 0.88);
  pottedPlant(g, 1.26, 1.72, 0.88);
  pottedPlant(g, -2.02, -2.51, 0.76);
  pottedPlant(g, 3.15, 1.82, 0.67);
}
