import { Box3, BufferGeometry, Matrix4, Ray, Vector3 } from "three";

type Surface = { a: Vector3; b: Vector3; c: Vector3; minY: number; maxY: number };
const cell = 1.4,
  inset = 0.16;
const ra = new Ray(),
  direction = new Vector3(),
  impact = new Vector3(),
  base = new Vector3(),
  side = new Vector3();
const va = new Vector3(),
  vb = new Vector3(),
  vc = new Vector3(),
  ab = new Vector3(),
  ac = new Vector3();
const up = new Vector3(0, 1, 0);
const key = (x: number, z: number) => x * 257 + z;
export class CollisionWorld {
  private buckets = new Map<number, Surface[]>();
  private candidates = new Set<Surface>();
  primitive(geo: BufferGeometry, world: Matrix4) {
    // A small enclosing box is enough for procedural posts, trunks and volumes.
    if (!geo.boundingBox) geo.computeBoundingBox();
    const b = geo.boundingBox!;
    const p: Vector3[] = [];
    for (const y of [b.min.y, b.max.y])
      for (const z of [b.min.z, b.max.z])
        for (const x of [b.min.x, b.max.x]) p.push(new Vector3(x, y, z).applyMatrix4(world));
    const indices = [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ] as const;
    for (const [a, c, d, e] of indices) {
      this.triangle(p[a]!, p[c]!, p[d]!);
      this.triangle(p[a]!, p[d]!, p[e]!);
    }
  }
  triangle(a: Vector3, b: Vector3, c: Vector3) {
    // Omit textile stitches, shingle grooves and other detail below the safety radius.
    if (Math.max(a.y, b.y, c.y) < 0.19 || ab.subVectors(b, a).cross(ac.subVectors(c, a)).lengthSq() < 0.00013)
      return;
    const s = {
      a: a.clone(),
      b: b.clone(),
      c: c.clone(),
      minY: Math.min(a.y, b.y, c.y),
      maxY: Math.max(a.y, b.y, c.y),
    };
    const x0 = Math.floor(Math.min(a.x, b.x, c.x) / cell),
      x1 = Math.floor(Math.max(a.x, b.x, c.x) / cell);
    const z0 = Math.floor(Math.min(a.z, b.z, c.z) / cell),
      z1 = Math.floor(Math.max(a.z, b.z, c.z) / cell);
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        const k = key(x, z);
        let bin = this.buckets.get(k);
        if (!bin) {
          bin = [];
          this.buckets.set(k, bin);
        }
        bin.push(s);
      }
  }
  // Maximum safe fraction of an eye movement, swept with a small near-plane footprint.
  fraction(from: Vector3, to: Vector3) {
    const len = direction.subVectors(to, from).length();
    if (len < 1e-7) return 1;
    direction.multiplyScalar(1 / len);
    let limit = len;
    if (to.y < 0.25 && to.y < from.y) limit = Math.min(limit, (len * (from.y - 0.25)) / (from.y - to.y));
    const bounds = new Box3().setFromPoints([from, to]).expandByScalar(inset * 2);
    if (
      bounds.min.x > 11 ||
      bounds.max.x < -11 ||
      bounds.min.z > 8.1 ||
      bounds.max.z < -8.1 ||
      bounds.min.y > 6.2
    )
      return Math.max(0, Math.min(1, limit / len));
    this.candidates.clear();
    for (
      let x = Math.floor(Math.max(-12, bounds.min.x) / cell);
      x <= Math.floor(Math.min(12, bounds.max.x) / cell);
      x++
    )
      for (
        let z = Math.floor(Math.max(-9, bounds.min.z) / cell);
        z <= Math.floor(Math.min(9, bounds.max.z) / cell);
        z++
      )
        this.buckets.get(key(x, z))?.forEach((s) => {
          if (s.maxY >= bounds.min.y && s.minY <= bounds.max.y) this.candidates.add(s);
        });
    side
      .crossVectors(direction, up)
      .normalize()
      .multiplyScalar(inset * 0.68);
    for (const offset of [
      va.set(0, 0, 0),
      side,
      vb.copy(side).negate(),
      vc.copy(up).multiplyScalar(-inset * 0.68),
    ]) {
      ra.set(base.copy(from).add(offset), direction);
      for (const s of this.candidates) {
        if (ra.intersectTriangle(s.a, s.b, s.c, false, impact)) {
          const hit = ra.origin.distanceTo(impact) - inset;
          if (hit < limit) limit = Math.max(0, hit);
        }
      }
    }
    return Math.max(0, Math.min(1, limit / len));
  }
}
