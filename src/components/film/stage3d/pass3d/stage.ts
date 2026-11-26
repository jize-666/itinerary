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
import { createPassPhysics, type PassEvent, type PassStatus } from "@/engine/pass3d";
import type { Cursor } from "@/engine/stage/cue";
import { PASS, passCloseness, passLift, passWanted } from "@/engine/stage/pass";
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
  update(o: { camera: PerspectiveCamera; cursor: Cursor; index: number; t: number; dt: number; tilt: { x: number; y: number } | null }): void;
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

export function createPassStage({ scene, shared, spec, onEvent }: { scene: Scene; shared: Shared; spec: TierSpec; onEvent?: (e: PassEvent) => void }): PassStage {
  const quality: PassQuality = spec.dof ? "high" : spec.msaa >= 2 ? "medium" : "low";
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
  const center = new Vector3();
  const blencong = new Vector3();

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

  const ready = () => !!visual && !!input && !!camera && close >= 1 && rig.visible;

  return {
    update({ camera: cam, cursor, index, t, dt, tilt }) {
      camera = cam;
      const mounted = !!visual || loading;
      if (passWanted(cursor, index, mounted) && content) mount();
      else if (mounted) unmount();
      close = passCloseness(cursor, index);
      if (!visual) return;
      const lift = passLift(close);
      lastLift = lift;
      // jauh di luar bidikan (masih di atas atap): tidak digambar dan tidak disimulasikan
      rig.visible = close > 0;
      if (!rig.visible) return;
      rig.position.set(PASS.hook[0], PASS.hook[1] + lift, PASS.hook[2]);
      rig.updateMatrixWorld();
      // tiket hanya bisa dipegang di slide tiket: pegangan dilepas bila film mulai berpindah
      if (close < 1 && input?.activeId != null) input.pointerCancel(input.activeId);
      if (tilt && input) input.applyTilt(tilt.x, tilt.y * 0.6, cam);
      else physics.setTilt(0, 0);
      const state = physics.step(Math.min(dt, 0.1));
      visual.update(state, t);
      // cahaya blencong yang sampai ke kartu: lampu maya di antara kartu dan blencong
      center.set(state.position[0]!, state.position[1]!, state.position[2]!).applyMatrix4(rig.matrixWorld);
      blencong.copy(shared.uLampPos.value).sub(center).normalize();
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
      return (close > 0 && close < 1) || physics.state.status === "dragging" || physics.state.status === "swinging" || lastLift > 0;
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
