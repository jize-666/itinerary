/**
 * Gambar karakter kit Claude dengan lebih sedikit draw call, tanpa mengubah bentuknya (aturan host: "beban hemat
 * tapi jangan turunkan kualitas" = hemat lewat cara menggambar). Kit (`claude.ts`) tetap utuh sebagai acuan; di sini
 * jaringnya digambar ulang secara berkelompok:
 *  - empat kaki = satu InstancedMesh, dua lengan = satu, dua pipi = satu (matriks tiap anggota diambil dari pivot kit,
 *    jadi gerak tetap lewat pivot yang sama);
 *  - kedua mata satu ekspresi digabung jadi satu jaring (keduanya setinggi, jadi kedipan = skala Y jaring itu di garis
 *    tengah mata, sama dengan skala Y tiap mata di kit), dan kedua alis jadi satu jaring.
 * Dari ±13 draw call menjadi 5–6. Jaring kit yang digantikan disembunyikan, pivotnya tetap dipakai.
 */
import { type BufferGeometry, Group, InstancedMesh, type Material, Matrix4, Mesh, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EXPRESSIONS, type Expression } from "@/engine/mascot/face";
import { type ClaudeCharacter, DIMENSIONS } from "./claude";

const meshIn = (o: Object3D) => o.children.find((c): c is Mesh => (c as Mesh).isMesh)!;

/** Gabungkan jaring-jaring (satu bahan) jadi satu geometri dalam ruang `space`, digeser `shift` di Y. */
function merged(meshes: Mesh[], space: Object3D, shiftY = 0): BufferGeometry | null {
  if (!meshes.length) return null;
  const inv = new Matrix4().copy(space.matrixWorld).invert();
  const shift = new Matrix4().makeTranslation(0, -shiftY, 0);
  const parts = meshes.map((m) => {
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as BufferGeometry;
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    return g.applyMatrix4(new Matrix4().multiplyMatrices(shift, new Matrix4().multiplyMatrices(inv, m.matrixWorld)));
  });
  const out = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return out;
}

export function batchClaude(claude: ClaudeCharacter) {
  const { root, bodyRig, arms, legs, features } = claude;
  root.updateMatrixWorld(true);
  const face = bodyRig.getObjectByName("Face") as Group;
  const owned: { dispose(): void }[] = [];
  /**
   * Jaring kit yang digantikan kelompok dilepas dari pohon adegan (bukan sekadar disembunyikan): three tetap
   * menghitung matriks anak yang tersembunyi tiap frame, dan 12 grup ekspresi kit berisi ratusan simpul.
   */
  const detached: Object3D[] = [];
  const detach = (o: Object3D) => {
    o.removeFromParent();
    detached.push(o);
  };

  const instanced = (members: Mesh[], parent: Object3D) => {
    const first = members[0]!;
    const inst = new InstancedMesh(first.geometry, first.material as Material, members.length);
    inst.frustumCulled = false;
    inst.name = `${first.name}_Batch`;
    members.forEach((m) => detach(m));
    parent.add(inst);
    return inst;
  };
  const legMeshes = legs.map(meshIn);
  const armMeshes = arms.map(meshIn);
  const cheeks = face.children.filter((c): c is Mesh => c.name.startsWith("Cheek_"));
  const legInst = instanced(legMeshes, bodyRig);
  const armInst = instanced(armMeshes, bodyRig);
  const cheekInst = instanced(cheeks, face);
  cheeks.forEach((c, i) => cheekInst.setMatrixAt(i, c.matrix));

  // mata dan alis tiap ekspresi: satu jaring mata (berporos di garis tengah mata) dan satu jaring alis
  const eyeY = DIMENSIONS.eyeY - DIMENSIONS.bodyCenter[1];
  const faces = {} as Record<Expression, { eyes: Mesh; brows: Mesh | null }>;
  for (const ex of EXPRESSIONS) {
    const { group, eyes } = features[ex];
    group.visible = true;
    root.updateMatrixWorld(true);
    const eyeMeshes: Mesh[] = [];
    eyes.forEach((e) => e.traverse((o) => (o as Mesh).isMesh && eyeMeshes.push(o as Mesh)));
    const browMeshes = group.children.filter((c): c is Mesh => (c as Mesh).isMesh);
    const material = (eyeMeshes[0] ?? browMeshes[0])!.material as Material;
    const eyeGeo = merged(eyeMeshes, face, eyeY)!;
    const browGeo = merged(browMeshes, face);
    owned.push(eyeGeo);
    if (browGeo) owned.push(browGeo);
    const eyesMesh = new Mesh(eyeGeo, material);
    eyesMesh.name = `${ex}_Eyes_Batch`;
    eyesMesh.position.y = eyeY;
    const browsMesh = browGeo ? new Mesh(browGeo, material) : null;
    if (browsMesh) browsMesh.name = `${ex}_Brows_Batch`;
    const holder = new Group();
    holder.name = `${ex}_Batch`;
    holder.add(eyesMesh);
    if (browsMesh) holder.add(browsMesh);
    holder.visible = false;
    face.add(holder);
    detach(group);
    faces[ex] = { eyes: eyesMesh, brows: browsMesh };
  }

  let shown: Expression | null = null;
  const m = new Matrix4();
  return {
    /** Tampilkan ekspresi `ex` dengan bukaan mata `open` (skala Y, 1 = terbuka). */
    face(ex: Expression, open: number) {
      if (shown !== ex) {
        if (shown) faces[shown].eyes.parent!.visible = false;
        faces[ex].eyes.parent!.visible = true;
        shown = ex;
      }
      faces[ex].eyes.scale.y = open;
    },
    /** Salin pose pivot kit (lengan dan kaki) ke kelompok tiap frame. */
    pose() {
      legs.forEach((p, i) => {
        p.updateMatrix();
        legInst.setMatrixAt(i, m.multiplyMatrices(p.matrix, legMeshes[i]!.matrix));
      });
      arms.forEach((p, i) => {
        p.updateMatrix();
        armInst.setMatrixAt(i, m.multiplyMatrices(p.matrix, armMeshes[i]!.matrix));
      });
      legInst.instanceMatrix.needsUpdate = true;
      armInst.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      owned.forEach((g) => g.dispose());
      // jaring kit yang dilepas tidak lagi terjangkau `claude.dispose()` (menelusuri pohon adegan)
      for (const o of detached)
        o.traverse((n) => {
          if ((n as Mesh).isMesh) (n as Mesh).geometry.dispose();
        });
      legInst.dispose();
      armInst.dispose();
      cheekInst.dispose();
    },
  };
}
