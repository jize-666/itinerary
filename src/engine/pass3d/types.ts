export type Vec3 = readonly [x: number, y: number, z: number];
export type PassStatus = 'ready' | 'dragging' | 'swinging' | 'resting' | 'flipped';

export const PASS_CARD = Object.freeze({
  width: 0.074,
  height: 0.150,
  thickness: 0.0012,
  eyeletY: 0.0635,
  holeRadius: 0.0042,
  anchorY: 0.0663,
  cordDiameter: 0.0014,
});

export type GrabHandle =
  | { kind: 'card'; local: Vec3 }
  | { kind: 'thread'; segment: number; fraction: number };

export type PassEvent =
  | { type: 'grab'; kind: GrabHandle['kind'] }
  | { type: 'release'; speed: number }
  | { type: 'flip'; back: boolean }
  | { type: 'eyelet-knock'; strength: number }
  | { type: 'swing-speed'; speed: number; angularSpeed: number }
  | { type: 'rest'; back: boolean };

export interface PhysicsConfig {
  segments?: number;
  threadLength?: number;
  iterations?: number;
  fixedStep?: number;
  maxSubsteps?: number;
  /** Per-bead mass in units of card mass. The hook is immovable. */
  beadMass?: number;
  gravity?: number;
  /** Radians. Both axes are limited together. */
  tiltLimit?: number;
  /** Exponential damping rates in inverse seconds. */
  airDrag?: number;
  angularDrag?: number;
  cordDrag?: number;
  twistSpring?: number;
  twistDrag?: number;
  /** Larger values give a looser grip. */
  gripCompliance?: number;
  onEvent?: (event: PassEvent) => void;
}

type FixedConfig = Required<Omit<PhysicsConfig, 'onEvent'>>;
export type ResolvedPhysicsConfig = Readonly<FixedConfig>;

export const DEFAULT_PHYSICS = Object.freeze({
  segments: 16,
  threadLength: 0.106,
  iterations: 10,
  fixedStep: 1 / 240,
  maxSubsteps: 8,
  beadMass: 0.055,
  gravity: 9.81,
  tiltLimit: 12 * Math.PI / 180,
  airDrag: 1.8,
  angularDrag: 2.7,
  cordDrag: 4.1,
  twistSpring: 15,
  twistDrag: 2.9,
  gripCompliance: 8e-7,
} satisfies FixedConfig);

/** Borrowed, in hook-local coordinates. Treat the arrays as read-only and do not retain across frames. */
export interface PassState {
  readonly thread: Float64Array;
  readonly position: Float64Array;
  readonly orientation: Float64Array;
  readonly velocity: Float64Array;
  readonly angularVelocity: Float64Array;
  readonly gravity: Float64Array;
  readonly grabPoint: Float64Array;
  readonly grabActive: boolean;
  readonly status: PassStatus;
  readonly back: boolean;
  readonly twist: number;
  readonly seconds: number;
  readonly substeps: number;
  readonly energy: number;
}

export interface PhysicsSnapshot {
  readonly config: ResolvedPhysicsConfig;
  readonly thread: number[];
  readonly threadVelocity: number[];
  readonly position: number[];
  readonly orientation: number[];
  readonly velocity: number[];
  readonly angularVelocity: number[];
  readonly gravity: number[];
  readonly wind: number[];
  readonly grip: { handle: GrabHandle; target: Vec3; filtered: Vec3 } | null;
  readonly accumulator: number;
  readonly seconds: number;
  readonly yaw: number;
  readonly turnTarget: number;
  readonly intendedBack: boolean;
  readonly quietTime: number;
  readonly eventTime: number;
  readonly knockTime: number;
  readonly status: PassStatus;
  readonly substeps: number;
}
