import { CanvasTexture, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, NoColorSpace, Ray, Raycaster, Vector3 } from 'three';
import type { Intersection, Object3D } from 'three';
import type { GrabHandle, PassState, Vec3 } from '@/engine/pass3d/types';
import { makeCardGeometry } from './card-geometry';
import type { PassContent } from './content';
import { makeCord } from './cord';
import { loadFaceFonts, paintPassFaces } from './faces';
import type { FaceCanvases, PassFonts } from './faces';
import { createPassLighting } from './lighting';
import type { StageLighting } from './lighting';
import { faceMaterial, metalMaterial } from './materials';
import type { PassShaderOptions } from './materials';
import { PASS_QUALITY } from './quality';
import type { PassQuality } from './quality';

export interface PassVisualOptions extends PassShaderOptions {
  content: PassContent;
  quality?: PassQuality;
  lighting?: Partial<StageLighting>;
  /** Host-owned, dedicated print surfaces. The factory sizes them and dispose shrinks them to 1×1. */
  canvases: FaceCanvases;
  fonts: PassFonts;
}

export interface PassHit {
  handle: GrabHandle;
  /** Hook-local metres. */
  point: Vec3;
  /** World-space metres from the ray origin. */
  distance: number;
}

export interface PassVisual {
  readonly object: Group;
  readonly lighting: StageLighting;
  readonly quality: PassQuality;
  update(state: PassState, time: number): void;
  setContent(content: PassContent): Promise<void>;
  pick(ray: Ray, threadRadius?: number): PassHit | null;
  dispose(): void;
}

function makePrintTexture(canvas: HTMLCanvasElement, anisotropy: number): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = anisotropy;
  return texture;
}

export async function createPassVisual(options: PassVisualOptions): Promise<PassVisual> {
  const { canvases, fonts, quality = 'high' } = options;
  const settings = PASS_QUALITY[quality];
  const lighting = createPassLighting(options.lighting);
  const object = new Group();
  object.name = 'Boarding pass rig';
  const card = new Group();
  card.name = 'Card and eyelet';
  object.add(card);
  const geometry = makeCardGeometry(settings);
  const [frontTexture, backTexture] = canvases.map((canvas) => makePrintTexture(canvas, settings.anisotropy)) as [CanvasTexture, CanvasTexture];
  const front = new Mesh(geometry.front, faceMaterial(lighting, options, frontTexture, settings.relief));
  const back = new Mesh(geometry.back, faceMaterial(lighting, options, backTexture, settings.relief));
  const edge = new Mesh(geometry.edge, metalMaterial(lighting, options, 'edge'));
  const eyelet = new Mesh(geometry.eyelet, metalMaterial(lighting, options, 'eyelet'));
  const surfaces = [front, back, edge, eyelet];
  card.add(...surfaces);
  const cord = makeCord(settings);
  const braid = new Mesh(cord.geometry, metalMaterial(lighting, options, 'cord'));
  braid.frustumCulled = false;
  object.add(braid);
  object.visible = false;

  let disposed = false;
  let paintVersion = 0;
  let thread = new Float64Array(0);
  const raycaster = new Raycaster();
  const cardHits: Intersection<Object3D>[] = [];
  const localRay = new Ray();
  const inverse = new Matrix4();
  const from = new Vector3(), to = new Vector3(), nearest = new Vector3(), nearestRay = new Vector3();
  const local = new Vector3(), world = new Vector3();

  function update(state: PassState, time: number): void {
    if (disposed) return;
    const p = state.position, q = state.orientation;
    card.position.set(p[0]!, p[1]!, p[2]!);
    card.quaternion.set(q[0]!, q[1]!, q[2]!, q[3]!);
    cord.update(state);
    if (thread.length !== state.thread.length) thread = new Float64Array(state.thread.length);
    thread.set(state.thread);
    if (!options.lighting?.uTime) lighting.uTime.value = time;
    object.visible = true;
  }

  async function setContent(content: PassContent): Promise<void> {
    if (disposed) return;
    const version = ++paintVersion;
    try {
      await loadFaceFonts(fonts, content);
    } catch (error) {
      if (!disposed && version === paintVersion) throw error;
      return;
    }
    if (disposed || version !== paintVersion) return;
    paintPassFaces(canvases, settings.faceWidth, content);
    frontTexture.needsUpdate = true;
    backTexture.needsUpdate = true;
  }

  function pick(ray: Ray, threadRadius = 0.005): PassHit | null {
    if (disposed || !object.visible) return null;
    object.updateWorldMatrix(true, true);
    inverse.copy(object.matrixWorld).invert();
    raycaster.ray.copy(ray);
    cardHits.length = 0;
    raycaster.intersectObjects(surfaces, false, cardHits);
    const cardHit = cardHits[0];
    let hit: PassHit | null = null;
    if (cardHit) {
      local.copy(cardHit.point).applyMatrix4(inverse);
      const point: Vec3 = [local.x, local.y, local.z];
      card.worldToLocal(world.copy(cardHit.point));
      hit = { handle: { kind: 'card', local: [world.x, world.y, world.z] }, point, distance: cardHit.distance };
    }
    localRay.copy(ray).applyMatrix4(inverse);
    const maxRadius = Math.max(0, threadRadius);
    let closestSquared = maxRadius ** 2;
    for (let i = 0; i < thread.length - 3; i += 3) {
      from.fromArray(thread, i);
      to.fromArray(thread, i + 3);
      const squared = localRay.distanceSqToSegment(from, to, nearestRay, nearest);
      if (squared > closestSquared) continue;
      world.copy(nearestRay).applyMatrix4(object.matrixWorld);
      const distance = ray.origin.distanceTo(world);
      if (cardHit && distance > cardHit.distance + maxRadius * 0.12) continue;
      const fraction = from.distanceTo(nearest) / Math.max(1e-9, from.distanceTo(to));
      if (i === 0 && fraction < 0.02) continue;
      closestSquared = squared;
      hit = { handle: { kind: 'thread', segment: i / 3, fraction }, point: [nearest.x, nearest.y, nearest.z], distance };
    }
    return hit;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    paintVersion++;
    object.removeFromParent();
    for (const mesh of [...surfaces, braid]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    frontTexture.dispose();
    backTexture.dispose();
    for (const canvas of canvases) {
      canvas.width = 1;
      canvas.height = 1;
    }
    card.clear();
    object.clear();
  }

  try {
    await setContent(options.content);
    return { object, lighting, quality, update, setContent, pick, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
