import { BufferGeometry, Float32BufferAttribute, LatheGeometry, Path, Shape, ShapeGeometry, Vector2 } from 'three';
import { PASS_CARD } from '@/engine/pass3d/types';
import type { QualitySettings } from './quality';

const halfW = PASS_CARD.width / 2;
const halfH = PASS_CARD.height / 2;
const halfT = PASS_CARD.thickness / 2;
const bevel = 0.00021;

function outline(inset: number): Shape {
  const width = halfW - inset;
  const top = halfH - inset;
  const chamfer = 0.013 - inset * 0.58;
  const corner = 0.006 - inset;
  const tear = -0.0605;
  const tearRadius = 0.0028;
  const shape = new Shape();
  shape.moveTo(-width + chamfer, top);
  shape.lineTo(width - chamfer, top);
  shape.lineTo(width, top - chamfer);
  shape.lineTo(width, tear + tearRadius);
  shape.bezierCurveTo(width - tearRadius * 0.62, tear + tearRadius, width - tearRadius, tear + tearRadius * 0.58, width - tearRadius, tear);
  shape.bezierCurveTo(width - tearRadius, tear - tearRadius * 0.58, width - tearRadius * 0.62, tear - tearRadius, width, tear - tearRadius);
  shape.lineTo(width, -top + corner);
  shape.quadraticCurveTo(width, -top, width - corner, -top);
  shape.lineTo(-width + corner, -top);
  shape.quadraticCurveTo(-width, -top, -width, -top + corner);
  shape.lineTo(-width, tear - tearRadius);
  shape.bezierCurveTo(-width + tearRadius * 0.62, tear - tearRadius, -width + tearRadius, tear - tearRadius * 0.58, -width + tearRadius, tear);
  shape.bezierCurveTo(-width + tearRadius, tear + tearRadius * 0.58, -width + tearRadius * 0.62, tear + tearRadius, -width, tear + tearRadius);
  shape.lineTo(-width, top - chamfer);
  shape.closePath();
  return shape;
}

function cardFace(segments: number): ShapeGeometry {
  const shape = outline(bevel);
  const hole = new Path();
  hole.absarc(0, PASS_CARD.eyeletY, PASS_CARD.holeRadius, 0, 2 * Math.PI, false);
  shape.holes.push(hole);
  const geometry = new ShapeGeometry(shape, segments);
  const uv = geometry.getAttribute('uv');
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, pos.getX(i) / PASS_CARD.width + 0.5, pos.getY(i) / PASS_CARD.height + 0.5);
  }
  return geometry;
}

function giltEdge(segments: number): BufferGeometry {
  const profile = [[bevel, -halfT], [0, -halfT + bevel], [0, halfT - bevel], [bevel, halfT]];
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const pair of profile) {
    const inset = pair[0]!, z = pair[1]!;
    const points = outline(inset).getPoints(segments);
    for (let i = 0; i < points.length; i++) {
      positions.push(points[i]!.x, points[i]!.y, z);
      uvs.push(i / (points.length - 1), (z + halfT) / PASS_CARD.thickness);
    }
  }
  const row = positions.length / (3 * profile.length);
  for (let r = 0; r < profile.length - 1; r++) {
    for (let i = 0; i < row - 1; i++) {
      const a = r * row + i, b = a + row;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function brassEyelet(segments: number): LatheGeometry {
  const profile = [
    [0.00418, -0.00074], [0.00430, -0.00104], [0.00466, -0.00126],
    [0.00525, -0.00126], [0.00566, -0.00101], [0.00577, -0.00073],
    [0.00555, -0.00057], [0.00437, -0.00052], [0.00437, 0.00052],
    [0.00555, 0.00057], [0.00577, 0.00073], [0.00566, 0.00101],
    [0.00525, 0.00126], [0.00466, 0.00126], [0.00430, 0.00104],
    [0.00418, 0.00074], [0.00412, 0], [0.00418, -0.00074],
  ].map(([radius, depth]) => new Vector2(radius, depth));
  const geometry = new LatheGeometry(profile, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, PASS_CARD.eyeletY, 0);
  return geometry;
}

export function makeCardGeometry(settings: QualitySettings) {
  const front = cardFace(settings.contour);
  const back = front.clone();
  front.translate(0, 0, halfT);
  back.rotateY(Math.PI);
  back.translate(0, 0, -halfT);
  return { front, back, edge: giltEdge(settings.contour), eyelet: brassEyelet(settings.brassSides) };
}
