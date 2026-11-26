import { advanceRotation, clamp, finite, limitLength, rotate, TAU, velocityFromRotation, wrapAngle } from './math';
import { DEFAULT_PHYSICS, PASS_CARD } from './types';
import type { GrabHandle, PassState, PassStatus, PhysicsConfig, PhysicsSnapshot, ResolvedPhysicsConfig, Vec3 } from './types';

const { width, height, thickness, anchorY } = PASS_CARD;
const BODY_INERTIA = [(height ** 2 + thickness ** 2) / 12, (width ** 2 + thickness ** 2) / 12, (width ** 2 + height ** 2) / 12];
const MAX_LINEAR_SPEED = 4;
const MAX_ANGULAR_SPEED = 48;
const ZERO: Vec3 = [0, 0, 0];

interface Grip {
  handle: GrabHandle;
  target: Float64Array;
  filtered: Float64Array;
  reach: number;
}

type StateScalars = 'grabActive' | 'status' | 'back' | 'twist' | 'seconds' | 'substeps' | 'energy';
type MutableState = Omit<PassState, StateScalars> & { -readonly [K in StateScalars]: PassState[K] };

function resolveConfig(input: PhysicsConfig): ResolvedPhysicsConfig {
  const config = { ...DEFAULT_PHYSICS };
  for (const key of Object.keys(config) as (keyof ResolvedPhysicsConfig)[]) {
    const value = input[key];
    if (value !== undefined) config[key] = finite(value, config[key]);
  }
  config.segments = Math.round(clamp(config.segments, 5, 32));
  config.threadLength = clamp(config.threadLength, 0.035, 0.45);
  config.iterations = Math.round(clamp(config.iterations, 4, 20));
  config.fixedStep = clamp(config.fixedStep, 1 / 400, 1 / 120);
  config.maxSubsteps = Math.round(clamp(config.maxSubsteps, 1, 24));
  config.beadMass = clamp(config.beadMass, 0.018, 0.3);
  config.gravity = clamp(config.gravity, 1, 20);
  config.tiltLimit = clamp(config.tiltLimit, 0, Math.PI / 5);
  config.airDrag = clamp(config.airDrag, 0, 16);
  config.angularDrag = clamp(config.angularDrag, 0, 16);
  config.cordDrag = clamp(config.cordDrag, 0, 16);
  config.twistSpring = clamp(config.twistSpring, 1, 45);
  config.twistDrag = clamp(config.twistDrag, 0, 16);
  config.gripCompliance = clamp(config.gripCompliance, 0, 0.001);
  return Object.freeze(config);
}

function triple(values: ArrayLike<number>): Vec3 {
  return [values[0]!, values[1]!, values[2]!];
}

function copyHandle(handle: GrabHandle): GrabHandle {
  if (handle.kind === 'thread') return { ...handle };
  return { kind: 'card', local: [...handle.local] };
}

export class PassPhysics {
  readonly config: ResolvedPhysicsConfig;
  readonly #state: MutableState;
  readonly #onEvent: PhysicsConfig['onEvent'];
  readonly #link: number;
  readonly #end: number;
  readonly #inverseBead: number;
  readonly #gripAlpha: number;
  readonly #damping: readonly [linear: number, angular: number, twist: number, cord: number];
  readonly #cordVelocity: Float64Array;
  readonly #oldCord: Float64Array;
  readonly #oldPosition = new Float64Array(3);
  readonly #oldOrientation = new Float64Array(4);
  readonly #wind = new Float64Array(3);
  readonly #offset = new Float64Array(3);
  readonly #inverseGradient = new Float64Array(3);
  readonly #work = new Float64Array(3);
  #grip: Grip | null = null;
  #accumulator = 0;
  #yaw = 0;
  #turnTarget = 0;
  #intendedBack = false;
  #quietTime = 0;
  #eventTime = 0;
  #knockTime = 0;
  #linkStretch = 0;

  constructor(input: PhysicsConfig = {}) {
    this.config = resolveConfig(input);
    this.#onEvent = input.onEvent;
    const { segments, threadLength, beadMass, fixedStep, airDrag, angularDrag, twistDrag, cordDrag, gripCompliance } = this.config;
    this.#link = threadLength / segments;
    this.#end = segments * 3;
    this.#inverseBead = 1 / beadMass;
    this.#gripAlpha = gripCompliance / (fixedStep * fixedStep);
    this.#damping = [Math.exp(-airDrag * fixedStep), Math.exp(-angularDrag * fixedStep), Math.exp(-(angularDrag + twistDrag) * fixedStep), Math.exp(-cordDrag * fixedStep)];
    this.#cordVelocity = new Float64Array(this.#end + 3);
    this.#oldCord = new Float64Array(this.#end + 3);
    this.#state = {
      thread: new Float64Array(this.#end + 3), position: new Float64Array(3), orientation: new Float64Array(4),
      velocity: new Float64Array(3), angularVelocity: new Float64Array(3), gravity: new Float64Array(3),
      grabPoint: new Float64Array(3), grabActive: false, status: 'ready', back: false, twist: 0, seconds: 0,
      substeps: 0, energy: 0,
    };
    this.reset();
  }

  get state(): PassState { return this.#state; }

  /** Hook remains at the origin. Resets time, wind, tilt, twist, and active input. */
  reset(): PassState {
    this.#state.seconds = 0;
    this.#wind.fill(0);
    this.#state.gravity.set([0, -this.config.gravity, 0]);
    return this.#placeAtRest(false, 'ready');
  }

  /** Quiet pose on either face, aligned with the current gravity, while preserving time and wind. */
  settle(back = this.#intendedBack): PassState {
    return this.#placeAtRest(back, back ? 'flipped' : 'resting');
  }

  #placeAtRest(back: boolean, status: PassStatus): PassState {
    const state = this.#state;
    const { segments, gravity, threadLength } = this.config;
    const gx = state.gravity[0]! / gravity, gy = state.gravity[1]! / gravity, gz = state.gravity[2]! / gravity;
    this.#accumulator = this.#quietTime = this.#eventTime = this.#linkStretch = 0;
    this.#knockTime = 0.20;
    this.#yaw = this.#turnTarget = back ? Math.PI : 0;
    this.#intendedBack = back;
    this.#grip = null;
    this.#cordVelocity.fill(0);
    state.velocity.fill(0);
    state.angularVelocity.fill(0);
    state.grabActive = false;
    state.grabPoint.fill(0);
    state.substeps = 0;
    const wy = Math.sqrt((1 - gy) / 2);
    const qx = -gz / (2 * wy), qz = gx / (2 * wy);
    if (back) state.orientation.set([-qz || 0, wy, qx || 0, 0]);
    else state.orientation.set([qx || 0, 0, qz || 0, wy]);
    state.thread.fill(0, 0, 3);
    for (let i = 1; i <= segments; i++) {
      const length = i * this.#link;
      const offset = i * 3;
      state.thread[offset] = gx * length || 0;
      state.thread[offset + 1] = gy * length;
      state.thread[offset + 2] = gz * length || 0;
    }
    state.position.set([gx * (threadLength + anchorY) || 0, gy * (threadLength + anchorY), gz * (threadLength + anchorY) || 0]);
    state.status = status;
    this.#updateDerivedState();
    return state;
  }

  /** Normalized right/depth inputs; intensity is limited to 1 across both axes. */
  setTilt(right: number, depth: number): void {
    const x = clamp(finite(right), -1, 1), z = clamp(finite(depth), -1, 1);
    const length = Math.sqrt(x * x + z * z);
    const angle = Math.min(1, length) * this.config.tiltLimit;
    const scale = length > 1e-8 ? this.config.gravity * Math.sin(angle) / length : 0;
    this.#state.gravity.set([x * scale, -this.config.gravity * Math.cos(angle), z * scale]);
  }

  /** Peak signed air acceleration in m/s². The gust phase is simulation time. */
  setWind(acceleration: Vec3): void {
    for (let axis = 0; axis < 3; axis++) this.#wind[axis] = clamp(finite(acceleration[axis]!), -2, 2);
  }

  grab(handle: GrabHandle, target: Vec3): boolean {
    if (this.#grip) return false;
    const initial = new Float64Array(3);
    let reach: number;
    if (handle.kind === 'card') {
      const x = clamp(finite(handle.local[0]), -width / 2, width / 2);
      const y = clamp(finite(handle.local[1]), -height / 2, height / 2);
      const z = clamp(finite(handle.local[2]), -thickness / 2, thickness / 2);
      handle = { kind: 'card', local: [x, y, z] };
      reach = this.config.threadLength + Math.hypot(x, y - anchorY, z);
      rotate(initial, this.#state.orientation, x, y, z);
      for (let axis = 0; axis < 3; axis++) initial[axis]! += this.#state.position[axis]!;
    } else {
      const segment = clamp(Math.floor(finite(handle.segment)), 0, this.config.segments - 1);
      const fraction = clamp(finite(handle.fraction), 0, 1);
      if (segment + fraction < 0.001) return false;
      handle = { kind: 'thread', segment, fraction };
      reach = this.#link * (segment + fraction);
      const points = this.#state.thread;
      for (let axis = 0; axis < 3; axis++) {
        const i = segment * 3 + axis;
        initial[axis] = points[i]! * (1 - fraction) + points[i + 3]! * fraction;
      }
    }
    this.#grip = { handle, reach, target: new Float64Array(3), filtered: initial };
    this.#state.grabActive = true;
    this.#state.status = 'dragging';
    this.#quietTime = 0;
    this.#state.grabPoint.set(initial);
    this.moveGrab(target);
    this.#onEvent?.({ type: 'grab', kind: handle.kind });
    return true;
  }

  moveGrab(target: Vec3): void {
    const grip = this.#grip;
    if (!grip) return;
    for (let axis = 0; axis < 3; axis++) grip.target[axis] = clamp(finite(target[axis]!, grip.filtered[axis]!), -1, 1);
    limitLength(grip.target, grip.reach * 1.008);
  }

  /** The solver already carries momentum. The optional gesture velocity adds a bounded flick. */
  release(velocity?: Vec3): boolean {
    const grip = this.#grip;
    if (!grip) return false;
    this.#grip = null;
    this.#state.grabActive = false;
    this.#state.grabPoint.fill(0);
    this.#state.status = 'swinging';
    if (velocity) {
      const boost: Vec3 = [0.21 * finite(velocity[0]), 0.21 * finite(velocity[1]), 0.21 * finite(velocity[2])];
      if (grip.handle.kind === 'card') this.addImpulse(boost, grip.handle.local);
      else this.#releaseThread(grip.handle, boost);
    }
    this.#onEvent?.({ type: 'release', speed: Math.hypot(...this.#state.velocity) });
    return true;
  }

  #releaseThread(handle: Extract<GrabHandle, { kind: 'thread' }>, boost: Vec3): void {
    const offset = handle.segment * 3;
    for (let axis = 0; axis < 3; axis++) {
      const speed = clamp(boost[axis]!, -0.75, 0.75);
      if (offset !== 0) this.#cordVelocity[offset + axis]! += (1 - handle.fraction) * speed;
      if (offset + 3 < this.#end) this.#cordVelocity[offset + 3 + axis]! += handle.fraction * speed;
    }
    if (offset + 3 === this.#end) {
      const ratio = handle.fraction;
      this.addImpulse([boost[0] * ratio, boost[1] * ratio, boost[2] * ratio], [0, anchorY, 0]);
    }
  }

  /** Impulse in N·s per unit card mass, at a card-local point in metres. */
  addImpulse(impulse: Vec3, local: Vec3 = ZERO): void {
    const x = clamp(finite(impulse[0]), -1.7, 1.7);
    const y = clamp(finite(impulse[1]), -1.7, 1.7);
    const z = clamp(finite(impulse[2]), -1.7, 1.7);
    if (x === 0 && y === 0 && z === 0) return;
    const v = this.#state.velocity, w = this.#state.angularVelocity;
    v[0]! += x;
    v[1]! += y;
    v[2]! += z;
    const r = this.#offset;
    rotate(r, this.#state.orientation, clamp(finite(local[0]), -width / 2, width / 2), clamp(finite(local[1]), -height / 2, height / 2), clamp(finite(local[2]), -thickness / 2, thickness / 2));
    this.#applyInverseInertia(r[1]! * z - r[2]! * y, r[2]! * x - r[0]! * z, r[0]! * y - r[1]! * x);
    for (let axis = 0; axis < 3; axis++) w[axis]! += this.#inverseGradient[axis]!;
    limitLength(v, MAX_LINEAR_SPEED);
    limitLength(w, MAX_ANGULAR_SPEED);
    this.#quietTime = 0;
    this.#state.status = this.#grip ? 'dragging' : 'swinging';
    this.#updateDerivedState();
  }

  flick(velocity: Vec3, local: Vec3 = [width * 0.44, -height * 0.36, 0]): void {
    this.addImpulse(velocity, local);
  }

  setFlip(back: boolean): boolean {
    if (back === this.#intendedBack) return false;
    this.#intendedBack = back;
    const middle = back ? Math.PI : 0;
    this.#turnTarget = middle + TAU * Math.round((this.#yaw - middle) / TAU);
    this.#quietTime = 0;
    this.#state.status = this.#grip ? 'dragging' : 'swinging';
    this.#onEvent?.({ type: 'flip', back });
    return true;
  }

  flip(): boolean { return this.setFlip(!this.#intendedBack); }
  unflip(): boolean { return this.setFlip(false); }

  step(dt: number): PassState {
    const h = this.config.fixedStep;
    const cap = this.config.maxSubsteps;
    this.#accumulator += clamp(finite(dt), 0, h * cap);
    const count = Math.min(cap, Math.floor((this.#accumulator + h * 1e-8) / h));
    this.#accumulator = Math.max(0, this.#accumulator - count * h);
    this.#state.substeps = count;
    for (let index = 0; index < count; index++) this.#advance(h);
    this.#updateDerivedState();
    return this.#state;
  }

  #advance(h: number): void {
    const state = this.#state;
    const { thread, position, orientation, velocity, angularVelocity, gravity } = state;
    const time = state.seconds + h;
    state.seconds = time;
    this.#linkStretch = 0;
    this.#oldCord.set(thread);
    this.#oldPosition.set(position);
    this.#oldOrientation.set(orientation);
    const gust = this.#wind[0] || this.#wind[1] || this.#wind[2]
      ? 0.58 * Math.sin(time * 2.15) + 0.31 * Math.sin(time * 4.47 + 1.2) + 0.11 * Math.sin(time * 8.3)
      : 0;
    const wx = this.#wind[0]! * gust, wy = this.#wind[1]! * gust, wz = this.#wind[2]! * gust;
    const [linearDamp, angularDamp, twistDamp, cordDamp] = this.#damping;
    for (let index = 3; index < this.#end; index += 3) {
      const exposure = 0.52 + 0.48 * index / this.#end;
      thread[index]! += (this.#cordVelocity[index]! * cordDamp + (gravity[0]! + wx * exposure) * h) * h;
      thread[index + 1]! += (this.#cordVelocity[index + 1]! * cordDamp + (gravity[1]! + wy * exposure) * h) * h;
      thread[index + 2]! += (this.#cordVelocity[index + 2]! * cordDamp + (gravity[2]! + wz * exposure) * h) * h;
    }
    position[0]! += (velocity[0]! * linearDamp + (gravity[0]! + wx) * h) * h;
    position[1]! += (velocity[1]! * linearDamp + (gravity[1]! + wy) * h) * h;
    position[2]! += (velocity[2]! * linearDamp + (gravity[2]! + wz) * h) * h;
    const spring = this.#grip ? this.config.twistSpring * 0.28 : this.config.twistSpring;
    const twisting = clamp(this.#turnTarget - this.#yaw, -TAU, TAU) * spring;
    const alpha = this.#work;
    this.#gyroscopicAcceleration();
    advanceRotation(orientation,
      (angularVelocity[0]! * angularDamp + alpha[0]! * h) * h,
      (angularVelocity[1]! * twistDamp + (alpha[1]! + twisting + 3 * wx - 2 * wz) * h) * h,
      (angularVelocity[2]! * angularDamp + alpha[2]! * h) * h);
    this.#filterGrab(h);
    this.#syncAnchor();
    const iterations = this.config.iterations;
    for (let iter = 0; iter < iterations; iter++) {
      if (this.#grip) this.#solveGrip();
      // The long-range tethers transmit card weight before adjacent links distribute it.
      this.#solveSpan(0, this.#end, this.config.threadLength, true);
      for (let i = 12; i < this.#end; i += 12) this.#solveSpan(0, i, this.#link * (i / 3), true);
      if (iter % 2 === 0) {
        for (let i = this.#end; i > 0; i -= 3) this.#solveSpan(i - 3, i, this.#link);
      } else {
        for (let i = 3; i <= this.#end; i += 3) this.#solveSpan(i - 3, i, this.#link);
      }
    }
    this.#updateGripPoint();
    for (let i = 3; i < this.#end; i++) this.#cordVelocity[i] = clamp((thread[i]! - this.#oldCord[i]!) / h, -MAX_LINEAR_SPEED, MAX_LINEAR_SPEED);
    for (let axis = 0; axis < 3; axis++) velocity[axis] = (position[axis]! - this.#oldPosition[axis]!) / h;
    velocityFromRotation(angularVelocity, orientation, this.#oldOrientation, h);
    limitLength(velocity, MAX_LINEAR_SPEED);
    limitLength(angularVelocity, MAX_ANGULAR_SPEED);
    this.#updateHeading();
    this.#updateMotion(h);
  }

  #gyroscopicAcceleration(): void {
    const { orientation: q, angularVelocity: w } = this.#state;
    const local = this.#work;
    rotate(local, q, w[0]!, w[1]!, w[2]!, true);
    const x = local[0]!, y = local[1]!, z = local[2]!;
    const ix = BODY_INERTIA[0]!, iy = BODY_INERTIA[1]!, iz = BODY_INERTIA[2]!;
    rotate(local, q, (iy - iz) * y * z / ix, (iz - ix) * z * x / iy, (ix - iy) * x * y / iz);
  }

  #syncAnchor(): void {
    const { position, orientation, thread } = this.#state;
    const offset = this.#offset;
    rotate(offset, orientation, 0, anchorY, 0);
    const end = this.#end;
    thread[end] = position[0]! + offset[0]!;
    thread[end + 1] = position[1]! + offset[1]!;
    thread[end + 2] = position[2]! + offset[2]!;
  }

  #applyInverseInertia(x: number, y: number, z: number): void {
    const q = this.#state.orientation;
    const out = this.#inverseGradient;
    rotate(out, q, x, y, z, true);
    rotate(out, q, out[0]! / BODY_INERTIA[0]!, out[1]! / BODY_INERTIA[1]!, out[2]! / BODY_INERTIA[2]!);
  }

  #solveSpan(a: number, b: number, length: number, tensionOnly = false): void {
    const { thread, position, orientation } = this.#state;
    const dx = thread[b]! - thread[a]!, dy = thread[b + 1]! - thread[a + 1]!, dz = thread[b + 2]! - thread[a + 2]!;
    const lengthSquared = dx * dx + dy * dy + dz * dz;
    if (tensionOnly && lengthSquared <= length * length) return;
    const distance = Math.sqrt(lengthSquared);
    const error = distance - length;
    if (Math.abs(error) < 1e-9) return;
    const nearZero = distance < 1e-10;
    const nx = nearZero ? 0 : dx / distance, ny = nearZero ? -1 : dy / distance, nz = nearZero ? 0 : dz / distance;
    const aWeight = a === 0 ? 0 : this.#inverseBead;
    let bWeight = this.#inverseBead;
    const rigid = b === this.#end;
    if (rigid) {
      const rx = thread[b]! - position[0]!, ry = thread[b + 1]! - position[1]!, rz = thread[b + 2]! - position[2]!;
      const gx = ry * nz - rz * ny, gy = rz * nx - rx * nz, gz = rx * ny - ry * nx;
      this.#applyInverseInertia(gx, gy, gz);
      const inv = this.#inverseGradient;
      bWeight = 1 + gx * inv[0]! + gy * inv[1]! + gz * inv[2]!;
      this.#linkStretch = Math.max(this.#linkStretch, error * (tensionOnly ? 1 : 0.55));
    }
    const correction = -error / (aWeight + bWeight);
    if (a !== 0) {
      thread[a]! -= nx * correction * aWeight;
      thread[a + 1]! -= ny * correction * aWeight;
      thread[a + 2]! -= nz * correction * aWeight;
    }
    if (rigid) {
      position[0]! += nx * correction;
      position[1]! += ny * correction;
      position[2]! += nz * correction;
      const inv = this.#inverseGradient;
      advanceRotation(orientation, inv[0]! * correction, inv[1]! * correction, inv[2]! * correction);
      this.#syncAnchor();
    } else {
      thread[b]! += nx * correction * bWeight;
      thread[b + 1]! += ny * correction * bWeight;
      thread[b + 2]! += nz * correction * bWeight;
    }
  }

  #filterGrab(h: number): void {
    const grip = this.#grip;
    if (!grip) return;
    const delta = this.#work;
    for (let axis = 0; axis < 3; axis++) delta[axis] = (grip.target[axis]! - grip.filtered[axis]!) * Math.min(1, 46 * h);
    limitLength(delta, 1.75 * h);
    for (let axis = 0; axis < 3; axis++) grip.filtered[axis]! += delta[axis]!;
  }

  #solveGrip(): void {
    const grip = this.#grip;
    if (!grip) return;
    const target = grip.filtered;
    const { handle } = grip;
    const { position, orientation, thread } = this.#state;
    if (handle.kind === 'card') {
      const offset = this.#offset;
      for (let axis = 0; axis < 3; axis++) {
        rotate(offset, orientation, ...handle.local);
        const error = position[axis]! + offset[axis]! - target[axis]!;
        this.#solveGripAxis(axis, error, 1, offset[0]!, offset[1]!, offset[2]!, 0);
      }
      this.#syncAnchor();
      return;
    }
    const a = handle.segment * 3, b = a + 3;
    const bFraction = handle.fraction, aFraction = 1 - bFraction;
    const aFactor = a === 0 ? 0 : aFraction * this.#inverseBead;
    const bFactor = b === this.#end ? 0 : bFraction * this.#inverseBead;
    const rigid = b === this.#end ? bFraction : 0;
    const weight = aFraction * aFactor + bFraction * bFactor;
    for (let axis = 0; axis < 3; axis++) {
      const error = thread[a + axis]! * aFraction + thread[b + axis]! * bFraction - target[axis]!;
      const rx = thread[b]! - position[0]!, ry = thread[b + 1]! - position[1]!, rz = thread[b + 2]! - position[2]!;
      const correction = this.#solveGripAxis(axis, error, rigid, rx, ry, rz, weight);
      if (aFactor !== 0) thread[a + axis]! += aFactor * correction;
      if (bFactor !== 0) thread[b + axis]! += bFactor * correction;
      if (rigid !== 0) this.#syncAnchor();
    }
  }

  #solveGripAxis(axis: number, error: number, rigid: number, rx: number, ry: number, rz: number,
    beadWeight: number): number {
    // r × e_axis, multiplied by the fraction of this handle that lies on the rigid card.
    const gx = rigid * (axis === 1 ? -rz : axis === 2 ? ry : 0);
    const gy = rigid * (axis === 0 ? rz : axis === 2 ? -rx : 0);
    const gz = rigid * (axis === 0 ? -ry : axis === 1 ? rx : 0);
    const inv = this.#inverseGradient;
    let effective = beadWeight + rigid * rigid + this.#gripAlpha;
    if (rigid !== 0) {
      this.#applyInverseInertia(gx, gy, gz);
      effective += gx * inv[0]! + gy * inv[1]! + gz * inv[2]!;
    }
    if (effective < 1e-10) return 0;
    const correction = -error / effective;
    if (rigid !== 0) {
      this.#state.position[axis]! += rigid * correction;
      advanceRotation(this.#state.orientation, inv[0]! * correction, inv[1]! * correction, inv[2]! * correction);
    }
    return correction;
  }

  #updateGripPoint(): void {
    const handle = this.#grip?.handle;
    if (!handle) return;
    const { grabPoint, position, orientation, thread } = this.#state;
    if (handle.kind === 'card') {
      rotate(grabPoint, orientation, ...handle.local);
      for (let axis = 0; axis < 3; axis++) grabPoint[axis]! += position[axis]!;
    } else {
      const n = handle.segment * 3;
      for (let axis = 0; axis < 3; axis++) grabPoint[axis] = thread[n + axis]! * (1 - handle.fraction) + thread[n + axis + 3]! * handle.fraction;
    }
  }

  #updateHeading(): void {
    const q = this.#state.orientation;
    const x = q[0]!, y = q[1]!, z = q[2]!, w = q[3]!;
    const normalX = 2 * (x * z + w * y), normalZ = 1 - 2 * (x * x + y * y);
    const heading = normalX * normalX + normalZ * normalZ > 0.025
      ? Math.atan2(normalX, normalZ)
      : Math.atan2(2 * (w * y - x * z), 1 - 2 * (y * y + z * z));
    this.#yaw += wrapAngle(heading - wrapAngle(this.#yaw));
    this.#state.back = normalZ < 0;
  }

  #updateMotion(h: number): void {
    const state = this.#state;
    const onEvent = this.#onEvent;
    const v = state.velocity, w = state.angularVelocity;
    const speedSquared = v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2;
    const angularSquared = w[0]! ** 2 + w[1]! ** 2 + w[2]! ** 2;
    if (this.#grip) {
      state.status = 'dragging';
      this.#quietTime = 0;
    } else if (speedSquared < 0.009 ** 2 && angularSquared < 0.13 ** 2 && Math.abs(this.#turnTarget - this.#yaw) < 0.09) {
      this.#quietTime += h;
      if (this.#quietTime >= 0.32) {
        const status = state.back ? 'flipped' : 'resting';
        if (state.status !== status) {
          state.status = status;
          onEvent?.({ type: 'rest', back: state.back });
        }
      }
    } else {
      this.#quietTime = 0;
      state.status = 'swinging';
    }
    this.#knockTime = Math.min(0.25, this.#knockTime + h);
    const radialSpeed = this.#linkStretch / h;
    const threshold = speedSquared > 0.12 ** 2 ? 0.13 : 0.24;
    if (radialSpeed > threshold && this.#knockTime >= 0.19) {
      onEvent?.({ type: 'eyelet-knock', strength: clamp((radialSpeed - threshold) / 0.72, 0, 1) });
      this.#knockTime = 0;
    }
    this.#eventTime += h;
    if (this.#eventTime >= 0.075) {
      this.#eventTime = 0;
      if (state.status === 'swinging' || state.grabActive) onEvent?.({ type: 'swing-speed', speed: Math.sqrt(speedSquared), angularSpeed: Math.sqrt(angularSquared) });
    }
  }

  #updateDerivedState(): void {
    const { position, orientation, velocity: v, angularVelocity: w, gravity } = this.#state;
    const local = this.#work;
    rotate(local, orientation, w[0]!, w[1]!, w[2]!, true);
    const potential = -(gravity[0]! * position[0]! + gravity[1]! * position[1]! + gravity[2]! * position[2]!)
      + this.config.gravity * (this.config.threadLength + anchorY);
    this.#state.energy = 0.5 * (v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2
      + BODY_INERTIA[0]! * local[0]! ** 2 + BODY_INERTIA[1]! * local[1]! ** 2 + BODY_INERTIA[2]! * local[2]! ** 2) + Math.max(0, potential);
    this.#state.twist = this.#yaw;
    this.#state.back = 1 - 2 * (orientation[0]! ** 2 + orientation[1]! ** 2) < 0;
  }

  snapshot(): PhysicsSnapshot {
    const s = this.#state, grip = this.#grip;
    return {
      config: this.config,
      thread: [...s.thread], threadVelocity: [...this.#cordVelocity],
      position: [...s.position], orientation: [...s.orientation], velocity: [...s.velocity], angularVelocity: [...s.angularVelocity],
      gravity: [...s.gravity], wind: [...this.#wind],
      grip: grip && { handle: copyHandle(grip.handle), target: triple(grip.target), filtered: triple(grip.filtered) },
      accumulator: this.#accumulator, seconds: s.seconds, yaw: this.#yaw, turnTarget: this.#turnTarget,
      intendedBack: this.#intendedBack, quietTime: this.#quietTime, eventTime: this.#eventTime,
      knockTime: this.#knockTime, status: s.status, substeps: s.substeps,
    };
  }

  /** Restores a snapshot from the same configuration. No input or motion events are emitted. */
  restore(snapshot: PhysicsSnapshot): PassState {
    for (const key of Object.keys(this.config) as (keyof ResolvedPhysicsConfig)[]) {
      if (snapshot.config[key] !== this.config[key]) throw new RangeError(`Physics snapshot config mismatch (${key}).`);
    }
    const state = this.#state;
    const arrays = [
      [state.thread, snapshot.thread], [this.#cordVelocity, snapshot.threadVelocity], [state.position, snapshot.position],
      [state.orientation, snapshot.orientation], [state.velocity, snapshot.velocity], [state.angularVelocity, snapshot.angularVelocity],
      [state.gravity, snapshot.gravity], [this.#wind, snapshot.wind],
    ] as const;
    for (const [output, values] of arrays) {
      if (output.length !== values.length || !values.every(Number.isFinite)) throw new RangeError('Invalid physics snapshot array.');
    }
    for (const [output, values] of arrays) output.set(values);
    this.#grip = null;
    const saved = snapshot.grip;
    if (saved) {
      const handle = copyHandle(saved.handle);
      const reach = handle.kind === 'thread' ? (handle.segment + handle.fraction) * this.#link
        : this.config.threadLength + Math.hypot(handle.local[0], handle.local[1] - anchorY, handle.local[2]);
      this.#grip = { handle, reach, target: Float64Array.from(saved.target), filtered: Float64Array.from(saved.filtered) };
    }
    this.#accumulator = snapshot.accumulator;
    this.#yaw = snapshot.yaw;
    this.#turnTarget = snapshot.turnTarget;
    this.#intendedBack = snapshot.intendedBack;
    this.#quietTime = snapshot.quietTime;
    this.#eventTime = snapshot.eventTime;
    this.#knockTime = snapshot.knockTime;
    state.seconds = snapshot.seconds;
    state.status = snapshot.status;
    state.substeps = snapshot.substeps;
    state.grabActive = this.#grip !== null;
    if (this.#grip) this.#updateGripPoint();
    else state.grabPoint.fill(0);
    this.#updateDerivedState();
    return state;
  }
}

export function createPassPhysics(config?: PhysicsConfig): PassPhysics {
  return new PassPhysics(config);
}
