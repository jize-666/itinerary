import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { CollisionWorld } from "@/engine/diorama/collision";

export type V3 = [number, number, number];
const up = new Vector3(0, 1, 0);
const identity = new Quaternion();
const v = (p: V3) => new Vector3(...p);
const matrix = (p: V3, q: Quaternion, s: V3) => new Matrix4().compose(v(p), q, v(s));
type Piece = { matrix: Matrix4; color: Color };
type Batch = { geometry: BufferGeometry; pieces: Piece[] };
type Store = {
  batches: Map<string, Batch>;
  colors: Map<string, Color>;
  positions: number[];
  normals: number[];
  rgb: number[];
  collision: CollisionWorld;
};
const A = new Vector3(),
  B = new Vector3(),
  C = new Vector3(),
  normal = new Vector3(),
  edge = new Vector3();

function addTriangle(st: Store, a: Vector3, b: Vector3, c: Vector3, color: Color) {
  normal.crossVectors(edge.subVectors(b, a), normal.subVectors(c, a)).normalize();
  for (const p of [a, b, c]) {
    st.positions.push(p.x, p.y, p.z);
    st.normals.push(normal.x, normal.y, normal.z);
    st.rgb.push(color.r, color.g, color.b);
  }
}

export class Modeler {
  constructor(
    private st: Store = {
      batches: new Map(),
      colors: new Map(),
      positions: [],
      normals: [],
      rgb: [],
      collision: new CollisionWorld(),
    },
    private transform = new Matrix4(),
    private solid = true,
  ) {}
  get collision() {
    return this.st.collision;
  }
  group(position: V3, yaw: number, callback: (g: Modeler) => void) {
    const child = new Matrix4().multiplyMatrices(
      this.transform,
      matrix(position, new Quaternion().setFromAxisAngle(up, yaw), [1, 1, 1]),
    );
    callback(new Modeler(this.st, child, this.solid));
  }
  decoration(callback: (g: Modeler) => void) {
    callback(new Modeler(this.st, this.transform, false));
  }
  private color(value: string) {
    let c = this.st.colors.get(value);
    if (!c) {
      c = new Color(value);
      this.st.colors.set(value, c);
    }
    return c;
  }
  private instance(key: string, shape: () => BufferGeometry, m: Matrix4, color: string, collide = false) {
    let batch = this.st.batches.get(key);
    if (!batch) {
      batch = { geometry: shape(), pieces: [] };
      this.st.batches.set(key, batch);
    }
    const world = new Matrix4().multiplyMatrices(this.transform, m);
    batch.pieces.push({ matrix: world, color: this.color(color) });
    if (this.solid && collide) this.st.collision.primitive(batch.geometry, world);
  }
  box(center: V3, size: V3, color: string, rotY = 0) {
    this.instance(
      "box",
      () => new BoxGeometry(),
      matrix(center, new Quaternion().setFromAxisAngle(up, rotY), size),
      color,
      Math.max(...size) > 0.33,
    );
  }
  cylinder(center: V3, rBottom: number, rTop: number, height: number, color: string, sides = 12) {
    const radius = Math.max(0.00001, rTop, rBottom);
    const bottom = Math.round((rBottom / radius) * 100) / 100,
      top = Math.round((rTop / radius) * 100) / 100;
    this.instance(
      "c" + sides + "/" + bottom + "/" + top,
      () => new CylinderGeometry(top, bottom, 1, sides),
      matrix(center, identity, [radius, height, radius]),
      color,
      Math.max(radius * 2, height) > 0.48,
    );
  }
  beam(from: V3, to: V3, width: number, depth: number, color: string) {
    const start = v(from),
      end = v(to),
      along = end.sub(start),
      length = along.length();
    if (length < 1e-7) return;
    const center = start.addScaledVector(along, 0.5);
    this.instance(
      "box",
      () => new BoxGeometry(),
      new Matrix4().compose(
        center,
        new Quaternion().setFromUnitVectors(up, along.normalize()),
        new Vector3(width, length, depth),
      ),
      color,
      length > 0.43 && Math.max(width, depth) > 0.045,
    );
  }
  ball(center: V3, radii: V3, color: string, segments = 9, rings = 5) {
    this.instance(
      "s" + segments + "/" + rings,
      () => new SphereGeometry(1, segments, rings),
      matrix(center, identity, radii),
      color,
      Math.max(...radii) > 0.37,
    );
  }
  mesh(vertices: V3[], faces: number[][], colors: string | string[]) {
    const points = vertices.map((p) => v(p).applyMatrix4(this.transform));
    for (const [i, face] of faces.entries()) {
      const color = this.color(typeof colors === "string" ? colors : colors[i % colors.length]!);
      for (let j = 1; j < face.length - 1; j++) {
        const a = points[face[0]!]!,
          b = points[face[j]!]!,
          c = points[face[j + 1]!]!;
        addTriangle(this.st, a, b, c, color);
        if (this.solid) this.st.collision.triangle(a, b, c);
      }
    }
  }
  finish(material: MeshStandardMaterial) {
    const group = new Group();
    for (const batch of this.st.batches.values()) {
      const { geometry, pieces } = batch;
      if (pieces.length >= 14 || (pieces.length >= 6 && geometry.getAttribute("position").count > 100)) {
        const m = material.clone();
        m.vertexColors = false;
        m.onBeforeCompile = material.onBeforeCompile;
        const mesh = new InstancedMesh(geometry, m, pieces.length);
        for (let i = 0; i < pieces.length; i++) {
          mesh.setMatrixAt(i, pieces[i]!.matrix);
          mesh.setColorAt(i, pieces[i]!.color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
      } else {
        const pos = geometry.getAttribute("position"),
          indices = geometry.index;
        const count = indices ? indices.count : pos.count;
        for (const piece of pieces)
          for (let i = 0; i < count; i += 3) {
            A.fromBufferAttribute(pos, indices ? indices.getX(i) : i).applyMatrix4(piece.matrix);
            B.fromBufferAttribute(pos, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(piece.matrix);
            C.fromBufferAttribute(pos, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(piece.matrix);
            addTriangle(this.st, A, B, C, piece.color);
          }
        geometry.dispose();
      }
    }
    if (this.st.positions.length) {
      const geo = new BufferGeometry();
      geo.setAttribute("position", new Float32BufferAttribute(this.st.positions, 3));
      geo.setAttribute("normal", new Float32BufferAttribute(this.st.normals, 3));
      geo.setAttribute("color", new Float32BufferAttribute(this.st.rgb, 3));
      geo.computeBoundingSphere();
      group.add(new Mesh(geo, material));
    }
    group.children.forEach((obj) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.matrixAutoUpdate = false;
    });
    this.st.positions.length = 0;
    this.st.normals.length = 0;
    this.st.rgb.length = 0;
    this.st.batches.clear();
    return group;
  }
}

export function modelMaterial(metal = false) {
  const mat = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: DoubleSide,
    roughness: metal ? 0.49 : 0.81,
    metalness: metal ? 0.56 : 0.055,
  });
  // Model-space fibres stay on the wood while the camera moves. Use fine, low-contrast grain.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 dioPoint;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
      vec4 dioP = vec4(transformed,1.);
      #ifdef USE_INSTANCING
        dioP = instanceMatrix * dioP;
      #endif
      dioPoint = (modelMatrix * dioP).xyz;`,
      );
    shader.fragmentShader =
      "varying vec3 dioPoint;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float warmth = smoothstep(.016,.13,diffuseColor.r-diffuseColor.g) * (1.-smoothstep(.48,.72,diffuseColor.r));
      float sway = sin(dioPoint.y*2.7+dioPoint.z*1.4)*.48;
      float grain = sin(dioPoint.x*83.+dioPoint.z*41.+sway*4.)*.5 + sin(dioPoint.x*142.+dioPoint.z*37.+sway)*.25;
      float resolvable=1.-smoothstep(.012,.055,length(fwidth(dioPoint)));
      diffuseColor.rgb *= 1.+resolvable*warmth*.085*grain;`,
      );
  };
  return mat;
}
