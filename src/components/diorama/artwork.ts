import {
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  DoubleSide,
  type BufferGeometry,
} from "three";
import { Modeler, modelMaterial } from "./geometry";
import { pendhapa } from "./models/pendhapa";
import { pasar } from "./models/pasar";
import { laweyan } from "./models/laweyan";
import { landscape } from "./models/landscape";
import { makeStudio } from "./studio";

export type SurfaceMode = "material" | "clay" | "wire";

export function makeArtwork() {
  const builder = new Modeler();
  builder.group([0, 0, -3.65], 0, pendhapa);
  builder.group([5.75, 0, 3.05], -0.17, pasar);
  builder.group([-5.7, 0, 3], 0.12, laweyan);
  landscape(builder);
  const originalMaterial = modelMaterial();
  const models = builder.finish(originalMaterial);
  const studio = makeStudio();
  const group = new Group();
  group.add(studio.group, models);
  const surfaces = new Map<Mesh, Material | Material[]>(),
    instances = new Map<InstancedMesh, InstancedMesh["instanceColor"]>();
  models.traverse((o) => {
    if (o instanceof Mesh) {
      surfaces.set(o, o.material);
      if (o instanceof InstancedMesh) instances.set(o, o.instanceColor);
    }
  });
  const clay = new MeshStandardMaterial({ color: "#c2b8a3", roughness: 0.95, side: DoubleSide });
  const wire = new MeshStandardMaterial({
    color: "#e3c38a",
    wireframe: true,
    roughness: 1,
    side: DoubleSide,
  });
  function setMode(mode: SurfaceMode) {
    instances.forEach((color, obj) => {
      obj.instanceColor = mode === "material" ? color : null;
    });
    surfaces.forEach((original, mesh) => {
      mesh.material = mode === "material" ? original : mode === "clay" ? clay : wire;
    });
  }
  function dispose() {
    const mats = new Set<Material>([clay, wire, originalMaterial]),
      geometries = new Set<BufferGeometry>();
    surfaces.forEach((original, mesh) => {
      (Array.isArray(original) ? original : [original]).forEach((m) => mats.add(m));
      geometries.add(mesh.geometry);
      if (mesh instanceof InstancedMesh) mesh.dispose();
    });
    mats.forEach((m) => m.dispose());
    geometries.forEach((g) => g.dispose());
    studio.dispose();
    group.clear();
  }
  return { group, key: studio.key, collision: builder.collision, setMode, dispose };
}
