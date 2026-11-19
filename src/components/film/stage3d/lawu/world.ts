import {
  type BufferGeometry,
  Color,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  Vector2,
  Group,
  InstancedMesh,
  Mesh,
  type Mesh as MeshType,
} from "three";
import { cameraAt, marks, travel } from "@/engine/stage/lawu/journey";
import { clamp, groundFrom, groundY, mix, SITE, smooth, world } from "@/engine/stage/lawu/ground";
import { firstLight, makeHorizon, refraction, solar } from "@/engine/stage/lawu/sun";
import type { Film } from "@/engine/slides/build-slides";
import type { TierSpec } from "@/engine/stage/tier";
import type { ChapterWorld } from "../chapters";
import type { Shared } from "../shared";
import { Forms, random, teaHouse, temple } from "./forms";
import { falls, groves, lights, relief, teaRows } from "./land";
import field from "./tea-skyline.json";
import { motes, surface, waterfall } from "./materials";
const rad = Math.PI / 180;
const palettes = [
  [0x515c78, 0x37445c, 0x25344b, 0x19263f, 0x101a30],
  [0xf4b983, 0xe1a78a, 0x99a9ae, 0x768ca6, 0x50658c],
  [0xc8d4c5, 0xaeccd2, 0x91b8c9, 0x799fba, 0x678bb0],
].map((p) => p.map((v) => new Color(v)));
export function createWorld(shared: Shared, spec: TierSpec, film: Film, bytes: ArrayBuffer | null): ChapterWorld {
  const g = groundFrom(bytes),
    center = world(SITE.tea);
  const rgb = new Uint8Array(field.size * field.size * 4);
  for (let k = 0; k < field.size * field.size; k++) {
    for (let channel = 0; channel < 3; channel++) rgb[k * 4 + channel] = field.horizons[k * 3 + channel]!;
    rgb[k * 4 + 3] = 255;
  }
  const skyline = new DataTexture(rgb, field.size, field.size, RGBAFormat);
  skyline.minFilter = LinearFilter;
  skyline.magFilter = LinearFilter;
  skyline.needsUpdate = true;
  const light = {
    uClear: { value: 0 },
    uDay: { value: 0 },
    uDawn: { value: 0 },
    uPassed: { value: 0 },
    uPixel: { value: 1000 },
    uRidge: { value: skyline },
    uPlot: { value: new Vector2(center.x, center.z) },
    uUpper: { value: -20 },
    uBearing: { value: 81.5 },
    uLocal: { value: g.source === "dem" ? 1 : 0 },
  };
  const profile = makeHorizon(g),
    first = firstLight(profile);
  const group = new Group(),
    q = spec.dof ? 5 : spec.msaa ? 3 : 1;
  const rock = surface(shared, light, q),
    land = surface(shared, light, q, true),
    water = waterfall(shared, light),
    glow = motes(shared, light);
  const stride = spec.dof ? 6.5 : spec.msaa ? 10 : 14;
  const ground = relief(g, land, stride);
  group.add(
    ground,
    ...teaRows(g, rock, spec.dof ? 0.6 : spec.msaa ? 0.85 : 1.18),
    ...groves(g, rock, spec.dof ? 5000 : spec.msaa ? 3800 : 2500),
  );
  for (const [key, geometry] of [
    ["gate", temple("gate")],
    ["pyramid", temple("pyramid")],
    ["house", teaHouse()],
  ] as const) {
    const node = new Mesh(geometry, rock),
      p = world(SITE[key]);
    node.position.set(p.x, groundY(g, p.x, p.z) + 0.13, p.z);
    group.add(node);
  }
  group.add(...falls(g, rock, water), lights(g, glow, spec.particles));
  // The returning lowlands are a scenic continuation: tile roofs and warm windows, never private addresses.
  const townForms = new Forms(),
    rng = random(2718);
  for (const index of [0, 6, 9, 10]) {
    const p = world(marks[index]!.site);
    for (let i = 0; i < 25; i++) {
      const x = p.x + (rng() - 0.5) * 26,
        z = p.z - rng() * 27 - 1;
      if (Math.abs(x - p.x) < 2.2 && z > p.z - 5) continue;
      const y = groundY(g, x, z),
        w = 0.6 + rng() * 1.0,
        d = 0.55 + rng() * 0.8,
        h = 0.32 + rng() * 0.37;
      townForms.box(x, y - 0.48, z, w, h + 0.48, d, 0x9d8d73);
      townForms.hip(x, y + h, z, w + 0.22, d + 0.23, 0.36);
      for (let j = -1; j <= 1; j += 2) townForms.box(x + j * w * 0.26, y + 0.16, z + d / 2, 0.14, 0.15, 0.017, 0xcca36a);
    }
  }
  group.add(new Mesh(townForms.geometry(), rock));
  const noon = new Color(),
    temp = new Color();
  let lastPose: { index: number; x: number; y: number; yaw: number; pitch: number; t: number } | null = null;
  return {
    group,
    ground,
    source: g.source,
    update({ camera, cursor, look, pixels, t, readyFraction = 1 }) {
      const state = travel(film, cursor);
      if (!state) {
        lastPose = null;
        return null;
      }
      state.amount *= readyFraction;
      const focus = mix(7, 32, clamp(Math.abs(state.index - Math.round(state.index)) * 2));
      if (state.amount < 0.5) return { ...state, focus };
      const pose = cameraAt(g, state.index, camera.aspect, look, stride);
      let yawDeg = pose.yaw,
        pitchDeg = pose.pitch;
      if (lastPose) {
        const moved =
          lastPose.index !== state.index || Math.abs(look.x - lastPose.x) + Math.abs(look.y - lastPose.y) > 0.00001;
        const cap = moved ? 15 * Math.min(0.25, Math.max(0, t - lastPose.t)) : 0;
        const dx = yawDeg - lastPose.yaw,
          dy = pitchDeg - lastPose.pitch,
          amount = Math.min(1, cap / Math.max(0.000001, Math.hypot(dx, dy)));
        yawDeg = lastPose.yaw + dx * amount;
        pitchDeg = lastPose.pitch + dy * amount;
      }
      lastPose = { index: state.index, x: look.x, y: look.y, yaw: yawDeg, pitch: pitchDeg, t };
      const yaw = yawDeg * rad,
        pitch = pitchDeg * rad;
      camera.position.set(pose.x, pose.y, pose.z);
      camera.up.set(0, 1, 0);
      camera.lookAt(pose.x + Math.sin(yaw) * 24, pose.y + Math.tan(pitch) * 24, pose.z - Math.cos(yaw) * 24);
      if (camera.fov !== pose.fov) {
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
      }
      const sun = solar(state.minute),
        alt = sun.altitude * rad,
        az = sun.azimuth * rad;
      shared.uSunDir.value.set(-Math.cos(az) * Math.cos(alt), Math.sin(alt), -Math.sin(az) * Math.cos(alt));
      const day = smooth((sun.altitude - 1) / 25),
        twilight = smooth((sun.altitude + 13) / 13);
      const clear =
        state.minute < 720
          ? smooth((sun.altitude + refraction(sun.altitude) + 0.2666 - profile(sun.azimuth) + 0.16) / 0.7)
          : smooth((sun.altitude + 1) / 6);
      light.uUpper.value = sun.altitude + refraction(sun.altitude) + 0.2666;
      light.uBearing.value = sun.azimuth;
      light.uDay.value = day;
      light.uDawn.value = twilight * (1 - day);
      light.uClear.value = clear;
      light.uPixel.value = pixels / Math.tan((camera.fov * rad) / 2);
      light.uPassed.value = state.passed;
      shared.uKeyDir.value.copy(shared.uSunDir.value);
      shared.uKeyDir.value.y = Math.max(0.1, shared.uKeyDir.value.y);
      shared.uKeyDir.value.normalize();
      shared.uSunDisc.value = twilight * (0.23 + 0.77 * clear);
      shared.uStars.value = 1 - twilight;
      shared.uWarm.value = 1 - day;
      shared.uSunScale.value = 0.48;
      shared.uSkyStretch.value = 1.36;
      for (let i = 0; i < 5; i++)
        shared.uSky.value[i]!.copy(palettes[0]![i]!).lerp(temp.copy(palettes[1]![i]!).lerp(palettes[2]![i]!, day), twilight);
      shared.uFogColor.value.copy(shared.uSky.value[0]!);
      shared.uKeyColor.value.copy(noon.setRGB(1.24, 1.07, 0.79)).multiplyScalar(0.21 + 0.79 * twilight);
      shared.uAmbSky.value.setRGB(0.43, 0.56, 0.65).multiplyScalar(0.46 + 0.54 * twilight);
      shared.uAmbGround.value.setRGB(0.2, 0.23, 0.19);
      shared.uNight.value = 1 - twilight;
      // A smooth, measured first ridge crossing also colours the existing common sky's horizon.
      if (Math.abs(state.minute - first) < 20) shared.uSky.value[0]!.lerp(temp.setRGB(1.12, 0.49, 0.22), 0.11 * clear);
      return { ...state, focus };
    },
    dispose() {
      const geometries = new Set<BufferGeometry>();
      group.traverse((obj) => {
        const mesh = obj as MeshType;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (obj instanceof InstancedMesh) obj.dispose();
      });
      for (const geometry of geometries) geometry.dispose();
      for (const m of [rock, land, water, glow]) m.dispose();
      skyline.dispose();
      group.clear();
    },
  };
}
