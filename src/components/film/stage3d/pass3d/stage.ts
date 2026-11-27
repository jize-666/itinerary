/**
 * Tiket 3D di panggung film (Tugas 12b): menyambungkan modul Codex (fisika `@/engine/pass3d`, rupa `./visual`, input
 * `./input`) ke runtime panggung.
 *
 *  - Dipasang saat film ≤ 2 slide dari slide tiket dan data tiket ada; dilepas (semua sumber GPU) bila lebih jauh.
 *  - Kait digantung di depan gong (`PASS.hook`), naik ke kegelapan atap selama perpindahan slide dan turun di
 *    akhirnya, mengikuti kemajuan gulir (`passLift`). Tali di atas kait naik lurus ke balok tumpang sari.
 *  - Material memakai uniform panggung yang sama (`COMMON`): langit, cahaya kunci, sekitar, kabut, kilatan gong.
 *    Cahaya titiknya adalah blencong, didekatkan secara maya ke kartu (rumus redup modul ini dibuat untuk lampu dekat).
 *  - Tiket hanya bisa dipegang saat film diam di slide tiket. Kemiringan HP menggeser gravitasi sedikit; angin lembut.
 */
import { Color, CylinderGeometry, Group, type IUniform, Mesh, type PerspectiveCamera, type Scene, Vector3 } from "three";
import type { Vec3 } from "@/engine/stage/shots";
import { createPassPhysics, type PassEvent, type PassStatus } from "@/engine/pass3d";
import type { Cursor } from "@/engine/stage/cue";
import { PASS, passCloseness, passLift, passWanted, tailLift } from "@/engine/stage/pass";
import type { TierSpec } from "@/engine/stage/tier";
import { COMMON, type Shared } from "../shared";
import type { PassContent } from "./content";
import { createPassInput, type PassPointer } from "./input";
import type { StageLighting } from "./lighting";
import { metalMaterial } from "./materials";
import type { PassQuality } from "./quality";
import { createPassVisual, type PassVisual } from "./visual";

export type PassStageState = PassStatus | "loading";

export type PassStage = {
  /** Sesudah kamera frame ini ditetapkan. `tilt`: kemiringan HP (−1…1), atau null di desktop. */
  update(o: {
    camera: PerspectiveCamera;
    cursor: Cursor;
    index: number;
    t: number;
    dt: number;
    tilt: { x: number; y: number } | null;
    /** Tiket penutup di samping gunungan: null kecuali film diam di slide terakhir dengan gerbang penutup. */
    tail?: { planted: number; hook: Vec3 } | null;
  }): void;
  setContent(content: PassContent | null): void;
  /** null = tiket 3D tidak ada (jauh, belum ada data, atau gagal dimuat). */
  state(): PassStageState | null;
  /** Tiket masih bergerak (dipegang, berayun, atau sedang turun): panggung harus terus digambar. */
  busy(): boolean;
  /** Masukan dari lapisan film. true = dipakai tiket (film tidak menggesernya). */
  pointerDown(p: PassPointer): boolean;
  pointerMove(p: PassPointer): boolean;
  pointerUp(p: PassPointer, cancelled: boolean): boolean;
  key(key: string, repeat: boolean): boolean;
  /** Arah layar kartu dan ukurannya (untuk Clawd, supaya tidak menutupi tiket). */
  center(): Vector3 | null;
  /** Tiket sedang dipegang: gerak pandang kamera ditahan supaya kartu tidak bergeser di bawah jari. */
  holding(): boolean;
  dispose(): void;
};

/** Angin lembut (m/s², puncak hembusan): modul fisika membuatnya bergelombang sendiri. Lebih kuat dari ini, hembusan
 * sesekali mengayunkan kartu lagi sesudah tenang (diukur: 0,07 berayun ulang ±1 dtk sesudah diam). */
const BREEZE: [number, number, number] = [0.04, 0, 0.015];
/** Jarak lampu maya dari kartu ke arah blencong (m), dan bagian cahaya blencong yang sampai. */
const LAMP_NEAR = 0.34;
const LAMP_SHARE = 0.9;
/** Di depan kelir tiket digambar sesudah tirai dan lembar gunungan (renderOrder 2000 dan 2001). */
const TAIL_ORDER = 2002;
/** Gunungan dianggap mendarat saat tertancap sebanyak ini; sentakan kecil (m/s) menggoyang tiket. */
const LAND_AT = 0.98;
const LAND_JOLT: [number, number, number] = [0.22, 0, 0.1];

export function createPassStage({ scene, shared, spec, onEvent }: { scene: Scene; shared: Shared; spec: TierSpec; onEvent?: (e: PassEvent) => void }): PassStage {
  // ultra dan high memakai setelan tiket yang sama; "low" hanya untuk mode uji (lite)
  const quality: PassQuality = spec.msaa === 0 ? "low" : "high";
  const physics = createPassPhysics({ onEvent: (e) => onEvent?.(e) });
  physics.setWind(BREEZE);
  const lampPos = new Vector3();
  const lampColor = new Color(0, 0, 0);
  // uFlash panggung berupa warna (vec3); `COMMON` mendeklarasikannya demikian dan shader modul ini menerimanya
  const lighting: StageLighting = {
    uTime: shared.uTime,
    uKeyDir: shared.uKeyDir,
    uKeyColor: shared.uKeyColor,
    uAmbSky: shared.uAmbSky,
    uAmbGround: shared.uAmbGround,
    uLampPos: { value: lampPos },
    uLampColor: { value: lampColor },
    uFogColor: shared.uFogColor,
    uFogDensity: shared.uFogDensity,
    uNight: shared.uNight,
    uFlash: shared.uFlash as unknown as IUniform<number>,
    uSky: shared.uSky,
    uSunDir: shared.uSunDir,
    uSunColor: { value: new Color(0, 0, 0) },
  };
  const extraUniforms = { uSunDisc: shared.uSunDisc, uWarm: shared.uWarm, uSunScale: shared.uSunScale, uStars: shared.uStars, uSkyStretch: shared.uSkyStretch };
  const shader = { prelude: COMMON, extraUniforms };

  const rig = new Group();
  rig.name = "Tiket (kait)";
  rig.visible = false;
  scene.add(rig);
  // tali di atas kait: lurus ke balok, cukup panjang untuk kait yang sedang diangkat
  const upperLen = PASS.beam + PASS.drop - PASS.hook[1];
  const upperGeo = new CylinderGeometry(0.0007, 0.0007, upperLen, 6, 1, true);
  upperGeo.translate(0, upperLen / 2 + 0.0004, 0);
  // pola pilinan bahan tali mengikuti uv.y; disamakan kerapatannya dengan tali yang disimulasikan (106 mm)
  const uv = upperGeo.attributes.uv!;
  for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) * upperLen) / 0.106);
  const upperMat = metalMaterial(lighting, shader, "cord");
  const upper = new Mesh(upperGeo, upperMat);
  upper.frustumCulled = false;
  rig.add(upper);

  let content: PassContent | null = null;
  let visual: PassVisual | null = null;
  let input: ReturnType<typeof createPassInput> | null = null;
  let loading = false;
  let failed = false;
  let generation = 0;
  let disposed = false;
  let close = 0;
  let camera: PerspectiveCamera | null = null;
  let lastLift: number = PASS.drop;
  /** "pass": tergantung di depan gong di slide tiket; "tail": di samping gunungan penutup. Berganti hanya saat tak terlihat. */
  let mode: "pass" | "tail" = "pass";
  let tailPlanted = 0;
  let still = true;
  let landed = false;
  const tailHook = new Vector3(...PASS.hook);
  const camUp = new Vector3();
  const camRight = new Vector3();
  const camBack = new Vector3();
  const center = new Vector3();
  const blencong = new Vector3();

  /** Urutan gambar tiket: di atas kelir saat di samping gunungan, biasa di slide tiket. */
  const applyOrder = () => {
    const order = mode === "tail" ? TAIL_ORDER : 0;
    rig.traverse((o) => {
      o.renderOrder = order;
    });
  };

  const unmount = () => {
    generation++;
    loading = false;
    if (input?.activeId != null) input.pointerCancel(input.activeId);
    input = null;
    visual?.dispose();
    visual = null;
    rig.visible = false;
    physics.reset();
    physics.setWind(BREEZE);
  };

  const mount = () => {
    if (!content || loading || visual || failed) return;
    loading = true;
    const gen = ++generation;
    const canvases = [document.createElement("canvas"), document.createElement("canvas")] as const;
    createPassVisual({ content, quality, lighting, canvases, fonts: document.fonts, ...shader })
      .then((v) => {
        if (disposed || gen !== generation) return v.dispose();
        loading = false;
        visual = v;
        rig.add(v.object);
        applyOrder();
        physics.settle(false);
        input = createPassInput({ engine: physics, visual: v });
      })
      .catch(() => {
        // fon atau kanvas gagal: tiket DOM tetap tampil
        if (gen === generation) {
          loading = false;
          failed = true;
        }
      });
  };

  const ready = () => !!visual && !!input && !!camera && rig.visible && (mode === "tail" ? tailPlanted >= 0.999 && still : close >= 1);

  return {
    update({ camera: cam, cursor, index, t, dt, tilt, tail = null }) {
      camera = cam;
      const mounted = !!visual || loading;
      if (passWanted(cursor, index, mounted) && content) mount();
      else if (mounted) unmount();
      close = passCloseness(cursor, index);
      still = cursor.from === cursor.to;
      if (!visual) return;
      // ganti mode hanya saat tiket tak terlihat; mulai menggantung diam, dengan muka yang sama
      if (!!tail !== (mode === "tail") && !rig.visible) {
        mode = tail ? "tail" : "pass";
        applyOrder();
        physics.settle(physics.state.back);
        landed = false;
      }
      const tailMode = mode === "tail";
      if (tailMode) {
        tailPlanted = Math.max(0, Math.min(1, tail?.planted ?? 0));
        if (tail) tailHook.set(tail.hook[0], tail.hook[1], tail.hook[2]);
      }
      const lift = tailMode ? tailLift(tailPlanted) : passLift(close);
      lastLift = lift;
      // pass: jauh di luar bidikan (masih di atas atap); tail: belum ada gunungan. Tidak digambar, tidak disimulasikan
      rig.visible = tailMode ? tailPlanted > 0 : close > 0;
      if (!rig.visible) {
        landed = false;
        return;
      }
      if (tailMode) rig.position.set(tailHook.x, tailHook.y + lift, tailHook.z);
      else rig.position.set(PASS.hook[0], PASS.hook[1] + lift, PASS.hook[2]);
      rig.updateMatrixWorld();
      // tiket hanya bisa dipegang saat film diam di tempatnya: pegangan dilepas bila film mulai berpindah
      if (!ready() && input?.activeId != null) input.pointerCancel(input.activeId);
      if (tailMode) {
        if (tailPlanted < 0.9) landed = false;
        else if (!landed && tailPlanted >= LAND_AT) {
          // gunungan mendarat: tiket tersentak lalu menunjukkan "Matur nuwun" di balik kartu
          landed = true;
          physics.addImpulse(LAND_JOLT);
          if (!physics.state.back) physics.flip();
        }
      }
      if (tilt && input) input.applyTilt(tilt.x, tilt.y * 0.6, cam);
      else physics.setTilt(0, 0);
      const state = physics.step(Math.min(dt, 0.1));
      visual.update(state, t);
      center.set(state.position[0]!, state.position[1]!, state.position[2]!).applyMatrix4(rig.matrixWorld);
      if (tailMode) {
        // di depan kelir tidak ada blencong yang dekat: lampu maya dari atas dan depan kartu (relatif kamera)
        camRight.setFromMatrixColumn(cam.matrixWorld, 0);
        camUp.setFromMatrixColumn(cam.matrixWorld, 1);
        camBack.setFromMatrixColumn(cam.matrixWorld, 2);
        blencong.set(0, 0, 0).addScaledVector(camUp, 0.65).addScaledVector(camBack, 0.75).addScaledVector(camRight, 0.15).normalize();
      } else {
        // cahaya blencong yang sampai ke kartu: lampu maya di antara kartu dan blencong
        blencong.copy(shared.uLampPos.value).sub(center).normalize();
      }
      lampPos.copy(center).addScaledVector(blencong, LAMP_NEAR);
      lampColor.copy(shared.uLampColor.value).multiplyScalar(LAMP_SHARE);
    },
    setContent(next) {
      content = next;
      failed = false;
      if (!next) unmount();
      else if (visual) void visual.setContent(next).catch(() => undefined);
    },
    state() {
      if (visual) return physics.state.status;
      return loading ? "loading" : null;
    },
    busy() {
      if (!visual || !rig.visible) return false;
      const moving = mode === "tail" ? tailPlanted < 1 : close > 0 && close < 1;
      return moving || physics.state.status === "dragging" || physics.state.status === "swinging" || lastLift > 0;
    },
    pointerDown(p) {
      return ready() && !!input && !!camera && input.pointerDown(p, camera);
    },
    pointerMove(p) {
      return !!input && !!camera && input.pointerMove(p, camera);
    },
    pointerUp(p, cancelled) {
      if (!input || !camera) return false;
      return cancelled ? input.pointerCancel(p.id) : input.pointerUp(p, camera);
    },
    key(key, repeat) {
      if (!ready() || !input || key !== "Enter") return false;
      return input.keyDown(key, repeat);
    },
    center() {
      return visual && rig.visible ? center : null;
    },
    holding() {
      return input?.activeId != null;
    },
    dispose() {
      disposed = true;
      unmount();
      upperGeo.dispose();
      upperMat.dispose();
      rig.removeFromParent();
    },
  };
}
