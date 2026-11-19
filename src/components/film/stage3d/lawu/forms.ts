import { BufferGeometry, Color, Float32BufferAttribute } from "three";
type Point = readonly [number, number, number];
export const colors = {
  stone: 0x625e51,
  lip: 0x90856c,
  moss: 0x566b48,
  dark: 0x343d37,
  joint: 0x444a40,
  soil: 0x796447,
  plaster: 0xdec59a,
  wood: 0x725139,
  tile: 0x824d36,
  tileLight: 0xae7251,
  ivory: 0xeee2c8,
  ink: 0x292d29,
  brass: 0xc29b55,
  bark: 0x635342,
  pool: 0x386b67,
};
export function random(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
// Opaque architectural pieces share a vertex-coloured draw buffer per location. Faceted sides keep
// their own normals; matching copings, reliefs and steps can be added without another draw call.
export class Forms {
  pos: number[] = [];
  rgb: number[] = [];
  index: number[] = [];
  palette = new Map<number, Color>();
  face(points: readonly Point[], hex: number, shade = 1) {
    let c = this.palette.get(hex);
    if (!c) {
      c = new Color(hex);
      this.palette.set(hex, c);
    }
    const n = this.pos.length / 3;
    for (const p of points) {
      this.pos.push(...p);
      this.rgb.push(c.r * shade, c.g * shade, c.b * shade);
    }
    for (let i = 1; i < points.length - 1; i++) this.index.push(n, n + i, n + i + 1);
  }
  // Rectangular frustum measured from its bottom; Z+ is the entry face.
  plinth(x: number, y: number, z: number, w: number, h: number, d: number, topW: number, topD: number, hex: number) {
    const loop = (Y: number, a: number, b: number): Point[] => [
      [x - a / 2, Y, z + b / 2],
      [x + a / 2, Y, z + b / 2],
      [x + a / 2, Y, z - b / 2],
      [x - a / 2, Y, z - b / 2],
    ];
    const bottom = loop(y, w, d),
      top = loop(y + h, topW, topD);
    this.face(top, hex, 1.06);
    for (let i = 0; i < 4; i++) {
      const k = (i + 1) % 4;
      this.face([bottom[i]!, bottom[k]!, top[k]!, top[i]!], hex, [1, 0.91, 0.82, 0.94][i]);
    }
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, hex: number) {
    this.plinth(x, y, z, w, h, d, w, d, hex);
  }
  hip(x: number, y: number, z: number, w: number, d: number, h: number) {
    this.plinth(x, y, z, w, 0.06, d, w, d, colors.wood);
    this.plinth(x, y + 0.06, z, w, h, d, w * 0.56, 0.12, colors.tile);
    this.box(x, y + h + 0.06, z, w * 0.6, 0.055, 0.17, colors.tileLight);
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.rgb, 3));
    g.setIndex(this.index);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

export function temple(kind: "gate" | "pyramid") {
  const a = new Forms(),
    c = colors,
    rand = random(kind === "gate" ? 650 : 110);
  const steps = (start: number, end: number, y: number, height: number, width: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const z = start + ((end - start) * (i + 0.5)) / count;
      a.box(
        0,
        y - 0.22,
        z,
        width,
        0.22 + (height * (i + 1)) / count,
        Math.abs(end - start) / count + 0.018,
        i % 4 === 2 ? c.stone : c.lip,
      );
    }
  };
  // An entry axis, retaining walls and grass courts ascend eastwards. The DEM resolves the
  // hillside, the hand-built masonry resolves individual steps and the split gate.
  const court = (y: number, z: number, w: number, d: number) => {
    a.box(0, y - 1.45, z, w, 1.45, d, c.stone);
    a.box(0, y - 0.055, z, w + 0.1, 0.055, d + 0.1, c.lip);
    a.box(0, y, z, w - 0.22, 0.025, d - 0.22, c.moss);
    a.box(0, y + 0.02, z, 0.92, 0.027, d, c.lip);
    for (const side of [-1, 1]) {
      a.box(side * (w / 2 - 0.11), y + 0.01, z, 0.19, 0.24, d, c.stone);
      a.box(side * (w / 2 - 0.11), y + 0.25, z, 0.24, 0.06, d + 0.04, c.lip);
    }
  };
  if (kind === "gate") {
    for (let i = 0; i < 5; i++) {
      court(i * 0.31, -i * 2.15, 4.8 - i * 0.25, 2.2);
      steps(-i * 2.15 - 0.72, -i * 2.15 - 1.4, i * 0.31, 0.31, 1.05, 7);
    }
    for (const side of [-1, 1]) {
      const x = side * 1.14;
      a.plinth(x, 0.03, 0.06, 1.12, 0.25, 1.08, 0.99, 0.99, c.dark);
      for (let i = 0; i < 12; i++) {
        const w = 1.02 - i * 0.068;
        // Inner faces align vertically; outer faces recede in repeated corbelled ledges.
        const cx = side * (0.62 + w / 2);
        a.plinth(
          cx,
          0.28 + i * 0.17,
          0.06,
          w,
          0.14,
          0.92 - i * 0.038,
          w * 0.96,
          0.88 - i * 0.038,
          i % 3 === 0 ? c.stone : c.dark,
        );
        a.box(cx, 0.42 + i * 0.17, 0.06, w + 0.075, 0.048, 0.96 - i * 0.038, c.lip);
        if (i < 7) a.box(cx + side * w * 0.5, 0.34 + i * 0.17, 0.08, 0.12, 0.065, 0.56, c.stone);
      }
      // Black-and-white cloth wraps the gateway posts in three dimensions.
      const px = side * 0.69,
        pz = 0.82;
      a.box(px, 0, pz, 0.27, 0.79, 0.27, c.dark);
      for (let row = 0; row < 4; row++)
        for (let k = 0; k < 4; k++) {
          const col = (row + k) % 2 ? c.ink : c.ivory;
          a.box(px - 0.104 + k * 0.07, 0.24 + row * 0.067, pz + 0.142, 0.071, 0.068, 0.012, col);
          a.box(px + side * 0.141, 0.24 + row * 0.067, pz - 0.103 + k * 0.07, 0.012, 0.068, 0.071, col);
        }
      a.plinth(px, 0.78, pz, 0.37, 0.16, 0.37, 0.12, 0.12, c.stone);
      for (let i = 1; i < 4; i++) {
        a.box(side * 1.5, i * 0.31, -i * 2.15, 0.26, 0.45, 0.26, c.wood);
        a.hip(side * 1.5, i * 0.31 + 0.42, -i * 2.15, 0.59, 0.56, 0.32);
      }
    }
    a.hip(0, 1.8, -8.7, 1.55, 1.65, 0.7);
  } else {
    court(0, 0, 6.3, 5.7);
    const base = 0.04;
    for (let y = 0; y < 17; y++) {
      const w = 4.06 - y * 0.107,
        d = 3.76 - y * 0.092;
      a.plinth(0, base + y * 0.135, -0.22, w, 0.134, d, w - 0.082, d - 0.068, y % 4 === 0 ? c.joint : c.stone);
      // Individual courses alternate their head joints; only the front face needs accent incisions.
      for (let x = -w / 2 + 0.25 + (y % 2) * 0.24; x < w / 2 - 0.14; x += 0.52)
        a.box(x, base + y * 0.135, -0.221 + d / 2, 0.014, 0.13, 0.015, c.dark);
    }
    a.box(0, 2.335, -0.22, 2.43, 0.09, 2.38, c.lip);
    steps(2.42, -0.01, 0, 2.42, 0.81, 28);
    for (const side of [-1, 1]) {
      a.face(
        [
          [side * 0.46, 0, 2.5],
          [side * 0.46, 2.48, -0.15],
          [side * 0.46, 0, -0.15],
        ],
        c.lip,
      );
      for (let i = 0; i < 5; i++) {
        const x = side * (1.47 + rand() * 0.25),
          z = 1.9 - i * 0.9;
        a.box(x, 0.01, z, 0.4, 0.55, 0.2, c.stone);
        for (let k = 0; k < 4; k++)
          a.plinth(x + (k - 1.5) * 0.066, 0.12 + (k % 2) * 0.07, z + 0.11, 0.068, 0.16, 0.04, 0.035, 0.045, c.lip);
      }
    }
  }
  return a.geometry();
}
export function teaHouse() {
  const a = new Forms(),
    c = colors;
  a.box(0, -0.75, 0, 4.6, 0.8, 2.8, c.stone);
  a.box(0, 0.05, -0.28, 3.8, 0.87, 1.7, c.plaster);
  for (const x of [-1.46, -0.88, 0.88, 1.46]) {
    a.box(x, 0.3, 0.582, 0.36, 0.4, 0.05, c.ink);
    a.box(x, 0.28, 0.607, 0.42, 0.05, 0.07, c.wood);
    a.box(x, 0.31, 0.617, 0.022, 0.39, 0.02, c.ivory);
  }
  a.box(0, 0.06, 0.58, 0.45, 0.7, 0.06, c.wood);
  for (const x of [-1.96, -1, -0.47, 0.47, 1, 1.96]) a.box(x, 0.06, 1.05, 0.072, 0.91, 0.072, c.wood);
  a.hip(0, 0.92, -0.06, 4.5, 2.9, 0.68);
  for (let i = 0; i < 4; i++) a.box(0, -0.21 + i * 0.062, 1.73 - i * 0.14, 1.35, 0.14, 0.25, c.lip);
  return a.geometry();
}
