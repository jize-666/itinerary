import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Vector3 } from 'three';
import { PASS_CARD } from '@/engine/pass3d/types';
import type { PassState } from '@/engine/pass3d/types';
import type { QualitySettings } from './quality';

const TAU = Math.PI * 2;
const STRAND_RADIUS = PASS_CARD.cordDiameter * (37 / 140);
const STRAND_DISTANCE = PASS_CARD.cordDiameter / 2 - STRAND_RADIUS;
const WHIPPING_AT = 0.849;
const WHIPPING_WIDTH = 0.037;
const FORK_AT = 0.858;

function smooth(a: number, b: number, c: number, d: number, t: number): number {
  const v = (c - a) * 0.5;
  const w = (d - b) * 0.5;
  return b + t * (v + t * (3 * (c - b) - 2 * v - w + t * (2 * (b - c) + v + w)));
}

function sample(points: Float64Array, t: number, out: Vector3): void {
  const count = points.length / 3 - 1;
  const segment = Math.min(count - 1, Math.floor(t * count));
  const u = t * count - segment;
  const center = segment * 3;
  const prev = Math.max(0, center - 3);
  const after = Math.min(points.length - 3, center + 6);
  out.set(
    smooth(points[prev]!, points[center]!, points[center + 3]!, points[after]!, u),
    smooth(points[prev + 1]!, points[center + 1]!, points[center + 4]!, points[after + 1]!, u),
    smooth(points[prev + 2]!, points[center + 2]!, points[center + 5]!, points[after + 2]!, u),
  );
}

/** Two helical plies and the wrapped eyelet fork in one dynamic draw. */
export function makeCord(settings: QualitySettings) {
  const { cordSamples: samples, cordSides: sides } = settings;
  const row = sides + 1;
  const verticesPerPly = (samples + 1) * row;
  const positions = new Float32Array(6 * verticesPerPly);
  const normals = new Float32Array(positions.length);
  const uvs = new Float32Array(4 * verticesPerPly);
  const indices: number[] = [];
  const sin = new Float64Array(row), cos = new Float64Array(row);
  for (let side = 0; side < row; side++) {
    sin[side] = Math.sin(TAU * side / sides);
    cos[side] = Math.cos(TAU * side / sides);
  }
  for (let ply = 0; ply < 2; ply++) {
    for (let i = 0; i <= samples; i++) {
      for (let j = 0; j <= sides; j++) {
        const a = ply * verticesPerPly + i * row + j;
        uvs[a * 2] = j / sides;
        uvs[a * 2 + 1] = i / samples;
        if (i < samples && j < sides) indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
      }
    }
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage);
  const normal = new BufferAttribute(normals, 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const p = new Vector3(), ahead = new Vector3(), behind = new Vector3();
  const tangent = new Vector3(), frame = new Vector3(), cross = new Vector3();
  const cardNormal = new Vector3(), cardRight = new Vector3(), fork = new Vector3();
  const center = new Vector3(), ringNormal = new Vector3();

  function update(state: PassState): void {
    const q = state.orientation;
    const x = q[0]!, y = q[1]!, z = q[2]!, w = q[3]!;
    cardNormal.set(2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y));
    cardRight.set(1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w));
    fork.copy(cardNormal).addScaledVector(cardRight, 0.42).normalize();
    frame.set(1, 0, 0);
    const turns = samples >= 100 ? 23 : samples >= 80 ? 18 : 13;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      sample(state.thread, t, p);
      sample(state.thread, Math.min(1, t + 1 / samples), ahead);
      sample(state.thread, Math.max(0, t - 1 / samples), behind);
      tangent.subVectors(ahead, behind);
      if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
      else tangent.normalize();
      frame.addScaledVector(tangent, -frame.dot(tangent));
      if (frame.lengthSq() < 1e-5) frame.set(0, 0, 1).addScaledVector(tangent, -tangent.z);
      frame.normalize();
      cross.crossVectors(tangent, frame).normalize();
      const phase = t * turns * TAU + state.twist * t * 0.62;
      const wrap = Math.max(0, 1 - Math.abs(t - WHIPPING_AT) / WHIPPING_WIDTH);
      const spread = Math.min(1, Math.max(0, (t - FORK_AT) / (1 - FORK_AT)));
      const flare = Math.sin(Math.PI * spread) ** 0.86;
      const separation = STRAND_DISTANCE * (1 - 0.7 * wrap) * (1 - spread);
      const radius = STRAND_RADIUS + wrap * (0.00046 + 0.000095 * Math.sin((t - WHIPPING_AT) * 740));
      const helixX = Math.cos(phase) * separation, helixY = Math.sin(phase) * separation;
      for (let ply = 0; ply < 2; ply++) {
        const sign = ply === 0 ? 1 : -1;
        center.copy(p).addScaledVector(frame, sign * helixX).addScaledVector(cross, sign * helixY)
          .addScaledVector(fork, sign * 0.0031 * flare);
        for (let side = 0; side <= sides; side++) {
          const index = (ply * verticesPerPly + i * row + side) * 3;
          ringNormal.copy(frame).multiplyScalar(cos[side]!).addScaledVector(cross, sin[side]!);
          normals[index] = ringNormal.x;
          normals[index + 1] = ringNormal.y;
          normals[index + 2] = ringNormal.z;
          positions[index] = center.x + radius * ringNormal.x;
          positions[index + 1] = center.y + radius * ringNormal.y;
          positions[index + 2] = center.z + radius * ringNormal.z;
        }
      }
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  }
  return { geometry, update };
}
