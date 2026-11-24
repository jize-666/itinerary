/**
 * Maskot pemandu 3D di panggung. Rupanya kit `claude-3d-reference-kit` v4 milik host (arahan host 15 Nov: "update
 * maskot"), dipakai langsung lewat constructor `claude.ts` tanpa digambar ulang. Di sini hanya pembungkusnya, sesuai
 * brief kit ("tempatkan `root` di dalam `THREE.Group` lain … atur posisi, arah target, dan skala pada group pembungkus"):
 *  - letak, arah hadap (ke kamera/objek, condong ke arah terbang), dan skala di dunia;
 *  - pose dari `engine/mascot/pose.ts` dipasang ke pivot kit (badan, dua lengan, empat kaki). Arahan host 15 Nov
 *    ("gerak nya bisa dibuat lebih fleksibel? ganti aturan tanpa stretch itu. yang ga boleh cuma mengganti bentuk dan
 *    ukuran saja"): badan boleh memampat/memanjang (volume tetap, bertumpu di dasar badan) dan melentur seperti jeli
 *    (`engine/mascot/jelly.ts`), lengan dan kaki menyusul dengan pantulan, lengan memanjang sebentar saat menunjuk.
 *    Semua lentur itu mereda ke nol, jadi saat diam bentuk dan ukuran kit kembali persis;
 *  - ekspresi kit dari suasana hati (`engine/mascot/face.ts`), berganti di tengah kedipan;
 *  - cahaya: material kit MeshStandardMaterial, jadi panggung memberinya lampu three sendiri yang mengikuti uniform
 *    panggung tiap frame (langit, matahari/bulan, blencong, kilatan gong) ditambah isi lembut dari arah kamera, supaya
 *    menyatu dengan adegan tetapi tidak tenggelam dalam gelap. Lampu-lampu itu tidak menyentuh material panggung lain
 *    (ShaderMaterial tanpa `lights`);
 *  - partikel emosi (`emotes.ts`) di atas kepala.
 */
import { AmbientLight, Color, DirectionalLight, Euler, Group, HemisphereLight, Matrix4, type Mesh, Vector3 } from "three";
import type { Mood } from "@/engine/mascot/face";
import { Motor } from "@/engine/mascot/motor";
import type { Motion } from "@/engine/mascot/pose";
import { GONG, GONG_SCALE } from "@/engine/stage/gong";
import { createClaude, DIMENSIONS } from "./claude";
import { batchClaude } from "./claude-batch";
import { createEmotes } from "./emotes";
import type { Shared } from "./shared";

/** Tinggi badan kit (satuan kit; lebar badan 2). */
const BODY_H = DIMENSIONS.body[1];
/** Panjang lengan kit (pivot → ujung tangan). */
const ARM_LEN = DIMENSIONS.arm[0];
const CENTER_Y = DIMENSIONS.bodyCenter[1];
/** Titik tumpu regang dan lentur: dasar badan (di bawah tengah badan sejauh setengah tinggi). */
const ANCHOR = BODY_H / 2;

/** Albedo linear kanal merah badan (#F26D3D): dipakai untuk menjaga puncak terang di bawah ambang bloom. */
const BODY_RED = new Color(0xf26d3d).r;
/** Letak kilatan gong (sama dengan `flashLight` di shader panggung). */
const FLASH_AT = new Vector3(0, GONG.y * GONG_SCALE, 0.45 * GONG_SCALE);
/** Isi lembut maskot (linear): bagian rata dan bagian dari arah kamera. */
const FILL_FLAT = new Color(0.15, 0.135, 0.13);
const FILL_CAM = new Color(0.5, 0.45, 0.43);

export type MascotInput = {
  t: number;
  dt: number;
  /** Letak maskot di dunia (titik tengah badan). */
  pos: Vector3;
  /** Titik yang dihadapi wajah (biasanya kamera). */
  face: Vector3;
  /** Kamera, untuk arah cahaya isi. */
  camera: Vector3;
  /** Arah terbang (dunia) bila sedang terbang, untuk condong dan berpaling; null bila diam. */
  travel: Vector3 | null;
  /** Tinggi badan di dunia (m). */
  size: number;
  mood: Mood;
  motion: Motion;
  motionSince: number;
  /** Mode gerak dikurangi (brief kit: `still`, tanpa kedip). */
  still?: boolean;
  /**
   * Titik dunia yang digenggam (gagang canting Hari 3): lengan di sisi titik itu diarahkan dan dipanjangkan sampai
   * tangannya tepat di sana. Tanpa ini lengan mengikuti pose.
   */
  grip?: Vector3 | null;
};


export function createMascot(shared: Shared) {
  const claude = createClaude({ expression: "neutral" });
  const { bodyRig, arms, legs } = claude;
  // digambar berkelompok: ±13 draw call menjadi 5–6, bentuk dan pivot kit tetap
  const batch = batchClaude(claude);
  /** Pembungkus di dunia; `claude.root` tetap di titik asalnya. */
  const root = new Group();
  root.name = "mascot";
  root.add(claude.root);
  // digambar sesudah kelir dan gunungan (lapisan layar penuh, renderOrder 2000–2001, tanpa uji kedalaman) supaya
  // Clawd tetap tampak di depan gerbang; tetap diuji kedalaman terhadap panggung, dan tetap buram 0 (alpha 1)
  claude.root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.renderOrder = 2100;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.transparent = true;
  });
  const emotes = createEmotes();
  emotes.points.renderOrder = 2110;

  // ---- lampu yang mengikuti panggung (koordinat dunia) ----
  const lights = new Group();
  lights.name = "mascot-lights";
  const hemi = new HemisphereLight(0, 0, Math.PI);
  const flat = new AmbientLight(FILL_FLAT, Math.PI);
  const dirLight = (name: string) => {
    const l = new DirectionalLight(0, Math.PI);
    l.name = name;
    lights.add(l, l.target);
    return l;
  };
  const key = dirLight("mascot-key");
  const lamp = dirLight("mascot-lamp");
  const flash = dirLight("mascot-flash");
  const fill = dirLight("mascot-fill");
  fill.color.copy(FILL_CAM);
  lights.add(hemi, flat);

  /** Penggerak bersama film 3D dan 2,5D: wajah, pose, loncatan ketukan, jeli, sendi. */
  const motor = new Motor();
  bodyRig.matrixAutoUpdate = false;
  const euler = new Euler(0, 0, 0, "YXZ");
  const mRot = new Matrix4();
  const mFlex = new Matrix4();
  const mInv = new Matrix4();
  let yaw = 0;

  const v = new Vector3();
  const lampC = new Color();

  /** Lampu arah dari `from` menuju maskot di `at`. */
  const aim = (light: DirectionalLight, at: Vector3, dir: Vector3) => {
    light.target.position.copy(at);
    light.position.copy(at).addScaledVector(dir, 4);
    light.target.updateMatrixWorld();
  };

  const updateLights = (at: Vector3, camera: Vector3) => {
    // blencong dan kilatan gong: lampu titik di panggung; untuk maskot (kecil) cukup arah + redaman di letaknya
    v.subVectors(shared.uLampPos.value, at);
    const r2 = v.lengthSq();
    lampC.copy(shared.uLampColor.value).multiplyScalar(1 / (1 + 0.22 * r2));
    aim(lamp, at, v.normalize());
    const fc = shared.uFlash.value;
    v.subVectors(FLASH_AT, at);
    const f2 = v.lengthSq();
    flash.color.copy(fc).multiplyScalar(1 / (1 + 0.6 * f2));
    // jumlah lampu tetap (menyembunyikan lampu mengompilasi ulang shader semua bahan berlampu = tersendat tiap pukulan)
    aim(flash, at, v.normalize());
    aim(key, at, shared.uKeyDir.value);
    v.subVectors(camera, at).normalize();
    aim(fill, at, v);
    // dekat blencong badan tidak boleh melewati ambang bloom (berpendar seperti lampu): semua lampu dilunakkan bersama
    const peak = BODY_RED * (lampC.r + shared.uKeyColor.value.r + shared.uAmbSky.value.r * 0.8 + FILL_FLAT.r + FILL_CAM.r);
    const soft = 0.8 / (1 + 0.8 * Math.max(peak - 0.85, 0));
    lamp.color.copy(lampC).multiplyScalar(soft);
    key.color.copy(shared.uKeyColor.value).multiplyScalar(soft);
    hemi.color.copy(shared.uAmbSky.value).multiplyScalar(soft);
    hemi.groundColor.copy(shared.uAmbGround.value).multiplyScalar(soft);
    flat.color.copy(FILL_FLAT).multiplyScalar(soft / 0.8);
    fill.color.copy(FILL_CAM).multiplyScalar(soft / 0.8);
  };

  /** Arahkan lengan di sisi `grip` ke titik itu (dunia) dan panjangkan sampai tangannya di sana. */
  const gripLocal = new Vector3();
  const reachFor = (grip: Vector3) => {
    root.updateMatrixWorld();
    gripLocal.copy(grip).applyMatrix4(mInv.copy(bodyRig.matrixWorld).invert());
    const i = gripLocal.x >= 0 ? 1 : 0;
    const arm = arms[i]!;
    const d = gripLocal.sub(arm.position);
    const len = d.length();
    if (len < 1e-5) return;
    d.divideScalar(len);
    // lengan menjulur di sumbu X lokal (+X kanan, −X kiri); Euler XYZ dengan x = 0: arah = R(y) R(z) · (±1, 0, 0)
    const s = i ? 1 : -1;
    const z = Math.asin(Math.max(-1, Math.min(1, s * d.y)));
    const y = Math.atan2(-s * d.z, s * d.x);
    arm.rotation.set(0, y, z);
    arm.scale.set(Math.max(0.6, Math.min(3, len / ARM_LEN)), 1, 1);
  };

  return {
    root,
    emotes: emotes.points,
    lights,
    character: claude,
    /** Ketuk/klik: badan meloncat kecil, memampat lalu memantul, dan bergoyang sedikit ke samping. */
    poke(strength = 1) {
      motor.poke(strength);
    },
    /** Lentur badan saat ini (untuk tes dan pratinjau). */
    flex: motor.jelly,
    /** Tinggi kanvas dalam piksel perangkat ÷ tan(fov/2): ukuran partikel mengikuti lensa dan resolusi. */
    setPixel(px: number) {
      emotes.setPixel(px);
    },
    update(input: MascotInput) {
      const { t, dt } = input;
      // ---- letak dan arah di dunia (titik asal kit = telapak kaki; `pos` = tengah badan) ----
      const scale = input.size / BODY_H;
      root.scale.setScalar(scale);
      root.position.copy(input.pos).y -= CENTER_Y * scale;
      v.subVectors(input.face, input.pos);
      let goal = Math.atan2(v.x, v.z);
      if (input.travel && input.travel.lengthSq() > 1e-6) goal = Math.atan2(input.travel.x, input.travel.z) * 0.6 + goal * 0.4;
      let dy = goal - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      yaw += input.still ? dy : dy * Math.min(1, dt * 6);
      root.rotation.set(0, yaw, 0);

      const m = motor.update({
        t,
        dt,
        mood: input.mood,
        motion: input.motion,
        motionSince: input.motionSince,
        still: input.still,
        base: [input.pos.x / input.size, input.pos.y / input.size, input.pos.z / input.size],
        yaw,
      });
      batch.face(m.expression, m.open);

      // ---- pivot kit. Badan: tumpu di dasar badan, lentur (geser) + regang bervolume tetap, lalu putaran pose ----
      const { pose, stretch, shearX: shx, shearZ: shz } = m;
      const lift = m.lift * BODY_H;
      const wide = 1 / Math.sqrt(stretch);
      euler.set(pose.tiltX, pose.spin, pose.tiltZ, "YXZ");
      mRot.makeRotationFromEuler(euler);
      const sy = stretch * ANCHOR;
      mFlex.set(wide, shx * stretch, 0, shx * sy, 0, stretch, 0, sy - ANCHOR + CENTER_Y + lift, 0, shz * stretch, wide, shz * sy, 0, 0, 0, 1);
      bodyRig.matrix.multiplyMatrices(mFlex, mRot);
      bodyRig.matrixWorldNeedsUpdate = true;
      // lengan (+ angkat = naik, + ayun = ke depan, panjang = reach), kaki (+ = ke depan)
      const [lr, lf, rr, rf] = m.arms as [number, number, number, number];
      arms[0]!.rotation.set(0, lf, -lr);
      arms[1]!.rotation.set(0, -rf, rr);
      arms[0]!.scale.set(pose.reach[0], 1, 1);
      arms[1]!.scale.set(pose.reach[1], 1, 1);
      legs.forEach((l, i) => l.rotation.set(-m.legs[i]!, 0, 0));
      if (input.grip) reachFor(input.grip);
      batch.pose();

      root.updateMatrixWorld();
      updateLights(input.pos, input.camera);
      emotes.update(t, input.mood, bodyRig.matrixWorld, input.size);
    },
    dispose() {
      batch.dispose();
      claude.dispose();
      emotes.dispose();
      lights.children.forEach((l) => (l as { dispose?: () => void }).dispose?.());
      lights.removeFromParent();
      emotes.points.removeFromParent();
      root.removeFromParent();
    },
  };
}

export type MascotRig = ReturnType<typeof createMascot>;
