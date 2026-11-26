import { Matrix4, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Camera } from 'three';
import type { GrabHandle, PassPhysics, Vec3 } from '@/engine/pass3d';
import { PASS_CARD } from '@/engine/pass3d';
import type { PassVisual } from './index';

export interface PassPointer {
  id: number;
  /** Pointer in normalized device coordinates: +1 is right/up. */
  x: number;
  y: number;
  /** Monotonic seconds. */
  time: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface PassInputOptions {
  engine: PassPhysics;
  visual: PassVisual;
  tapSlop?: number;
  tapSeconds?: number;
  threadRadius?: number;
}

interface ActivePointer {
  id: number;
  x: number;
  y: number;
  started: number;
  lastTime: number;
  moved: boolean;
  handle: GrabHandle;
}

const triple = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/** Caller owns the event listeners, pointer capture, camera matrices and the render loop. */
export function createPassInput({ engine, visual, tapSlop = 7, tapSeconds = 0.34, threadRadius = 0.005 }: PassInputOptions) {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane();
  const cameraForward = new Vector3();
  const world = new Vector3(), offset = new Vector3(), latest = new Vector3(), previous = new Vector3();
  const velocity = new Vector3(), instant = new Vector3();
  const right = new Vector3(), depth = new Vector3();
  const inverse = new Matrix4();
  let active: ActivePointer | null = null;

  function worldRay(sample: PassPointer, camera: Camera) {
    camera.updateWorldMatrix(true, false);
    raycaster.setFromCamera(ndc.set(sample.x, sample.y), camera);
    return raycaster.ray;
  }

  function pointerDown(sample: PassPointer, camera: Camera): boolean {
    if (active) return false;
    const ray = worldRay(sample, camera);
    const hit = visual.pick(ray, threadRadius);
    if (!hit || !engine.grab(hit.handle, hit.point)) return false;
    latest.fromArray(hit.point);
    camera.getWorldDirection(cameraForward);
    visual.object.localToWorld(world.copy(latest));
    plane.setFromNormalAndCoplanarPoint(cameraForward, world);
    const cleared = ray.intersectPlane(plane, offset);
    if (cleared) offset.subVectors(world, offset);
    else offset.set(0, 0, 0);
    previous.copy(latest);
    velocity.set(0, 0, 0);
    active = { id: sample.id, x: sample.x, y: sample.y, started: sample.time, lastTime: sample.time, moved: false, handle: hit.handle };
    return true;
  }

  function pointerMove(sample: PassPointer, camera: Camera): boolean {
    if (!active || active.id !== sample.id) return false;
    const dx = (sample.x - active.x) * sample.viewportWidth * 0.5;
    const dy = (sample.y - active.y) * sample.viewportHeight * 0.5;
    active.moved ||= Math.hypot(dx, dy) > tapSlop;
    if (!active.moved) return true;
    const ray = worldRay(sample, camera);
    if (!ray.intersectPlane(plane, world)) return true;
    world.add(offset);
    visual.object.worldToLocal(latest.copy(world));
    engine.moveGrab(triple(latest));
    const dt = sample.time - active.lastTime;
    if (dt > 0.001 && latest.distanceToSquared(previous) > 1e-12) {
      instant.subVectors(latest, previous).multiplyScalar(1 / dt).clampLength(0, 3.2);
      velocity.lerp(instant, 1 - Math.exp(-dt * 43));
      previous.copy(latest);
      active.lastTime = sample.time;
    }
    return true;
  }

  function pointerUp(sample: PassPointer, camera: Camera): boolean {
    const interaction = active;
    if (!interaction || interaction.id !== sample.id) return false;
    pointerMove(sample, camera);
    active = null;
    const tap = !interaction.moved && sample.time - interaction.started <= tapSeconds;
    if (tap || !interaction.moved) {
      engine.release();
      if (tap && interaction.handle.kind === 'card') engine.flip();
      return true;
    }
    const pause = Math.max(0, sample.time - interaction.lastTime);
    velocity.multiplyScalar(Math.exp(-Math.max(0, pause - 0.025) * 28));
    engine.release(triple(velocity));
    if (interaction.handle.kind === 'card') {
      visual.object.updateWorldMatrix(true, false);
      inverse.copy(visual.object.matrixWorld).invert();
      right.setFromMatrixColumn(camera.matrixWorld, 0).transformDirection(inverse);
      depth.setFromMatrixColumn(camera.matrixWorld, 2).transformDirection(inverse);
      const across = velocity.dot(right);
      const clip = Math.max(0, Math.min(1.32, (Math.abs(across) - 0.32) * 1.72));
      const leverage = Math.min(1, Math.abs(interaction.handle.local[0]) / (PASS_CARD.width * 0.39));
      // A fast lateral flick off centre lifts the near edge, translating a hand twist to a 2D pointer.
      depth.multiplyScalar(clip * leverage * Math.sign(across));
      engine.flick(triple(depth), interaction.handle.local);
    }
    return true;
  }

  function pointerCancel(id: number): boolean {
    if (!active || active.id !== id) return false;
    active = null;
    engine.release();
    return true;
  }

  function keyDown(key: string, repeat = false): boolean {
    if (key !== 'Enter' && key !== ' ' && key !== 'Space' && key !== 'Spacebar') return false;
    if (!repeat) engine.flip();
    return true;
  }

  function applyTilt(screenRight: number, screenDepth: number, camera: Camera): void {
    camera.updateWorldMatrix(true, false);
    visual.object.updateWorldMatrix(true, false);
    inverse.copy(visual.object.matrixWorld).invert();
    right.setFromMatrixColumn(camera.matrixWorld, 0).transformDirection(inverse);
    depth.setFromMatrixColumn(camera.matrixWorld, 2).transformDirection(inverse);
    right.y = depth.y = 0;
    right.normalize();
    depth.normalize();
    engine.setTilt(right.x * screenRight + depth.x * screenDepth, right.z * screenRight + depth.z * screenDepth);
  }

  function canGrab(sample: PassPointer, camera: Camera): boolean {
    return visual.pick(worldRay(sample, camera), threadRadius) !== null;
  }

  return { canGrab, pointerDown, pointerMove, pointerUp, pointerCancel, keyDown, applyTilt, get activeId() { return active?.id ?? null; } };
}
