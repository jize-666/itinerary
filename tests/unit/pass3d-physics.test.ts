import { describe, expect, it } from 'vitest';
import { createPassPhysics, DEFAULT_PHYSICS, PASS_CARD } from '@/engine/pass3d';
import type { PassEvent, PassState, Vec3 } from '@/engine/pass3d';

const FRAME = 1 / 60;
const start: Vec3 = [0.026, -0.218, 0];
const held: Vec3 = [0.088, -0.163, 0.041];
const local: Vec3 = [0.026, DEFAULT_PHYSICS.threadLength + PASS_CARD.anchorY + start[1], 0];

function elapsed(engine: ReturnType<typeof createPassPhysics>, seconds: number, dt = FRAME): PassState {
  for (let index = 0; index < Math.round(seconds / dt); index++) engine.step(dt);
  return engine.state;
}

function lengthErrors(state: PassState) {
  const { thread } = state;
  const link = DEFAULT_PHYSICS.threadLength / DEFAULT_PHYSICS.segments;
  const errors: number[] = [];
  for (let i = 3; i < thread.length; i += 3) {
    const distance = Math.hypot(thread[i]! - thread[i - 3]!, thread[i + 1]! - thread[i - 2]!, thread[i + 2]! - thread[i - 1]!);
    errors.push(Math.abs(distance / link - 1));
  }
  return errors;
}

function exercise(engine: ReturnType<typeof createPassPhysics>) {
  engine.setWind([0.19, 0, 0.06]);
  engine.setTilt(0.28, -0.13);
  engine.grab({ kind: 'card', local }, start);
  for (let i = 0; i < 32; i++) {
    const t = i / 31;
    engine.moveGrab([start[0] + (held[0] - start[0]) * t, start[1] + (held[1] - start[1]) * t, held[2] * t]);
    engine.step(i === 15 ? 0.5 : 1 / 120);
  }
  engine.release([0.28, 0.01, 1.25]);
  elapsed(engine, 0.7);
  engine.flip();
  elapsed(engine, 2);
  return engine.snapshot();
}

describe('fixed-step boarding pass', () => {
  it('is deterministic, including events, with a clamped spike in the input sequence', () => {
    const a: PassEvent[] = [], b: PassEvent[] = [];
    expect(exercise(createPassPhysics({ onEvent: (event) => a.push(event) })))
      .toEqual(exercise(createPassPhysics({ onEvent: (event) => b.push(event) })));
    expect(a).toEqual(b);
    expect(a.map((event) => event.type)).toEqual(expect.arrayContaining(['grab', 'release', 'flip', 'swing-speed']));
  });

  it('continues exactly after restoring an in-flight grab and fractional accumulator', () => {
    const initial = createPassPhysics();
    initial.grab({ kind: 'thread', segment: 8, fraction: 0.42 }, [0.025, -0.045, 0.007]);
    elapsed(initial, 0.3);
    initial.step(0.002);
    const restored = createPassPhysics();
    restored.restore(JSON.parse(JSON.stringify(initial.snapshot())));
    expect(restored.state.grabActive).toBe(true);
    for (const engine of [initial, restored]) {
      engine.moveGrab([-0.018, -0.030, 0.025]);
      elapsed(engine, 0.4);
      engine.release([-0.23, 0.12, 0.04]);
      elapsed(engine, 0.9);
    }
    expect(restored.snapshot()).toEqual(initial.snapshot());
  });

  it.each([1 / 30, 1 / 60, 1 / 120])('keeps the rope in tolerance at dt=%f and through a 0.5 s spike', (dt) => {
    const engine = createPassPhysics();
    engine.flick([0.60, 0.04, 0.72]);
    engine.setWind([0.25, 0, 0.09]);
    for (let i = 0; i < 115; i++) {
      const state = engine.step(i === 10 ? 0.5 : dt);
      const values = [...state.thread, ...state.position, ...state.orientation, ...state.velocity, ...state.angularVelocity];
      expect(values.every(Number.isFinite)).toBe(true);
      expect(state.thread.slice(0, 3)).toEqual(Float64Array.of(0, 0, 0));
      expect(Math.abs(Math.hypot(...state.orientation) - 1)).toBeLessThan(1e-8);
      expect(Math.max(...lengthErrors(state))).toBeLessThan(0.085);
      if (i === 10) expect(state.substeps).toBe(DEFAULT_PHYSICS.maxSubsteps);
    }
    expect(Math.max(...lengthErrors(engine.state))).toBeLessThan(0.035);
  });

  it('settles after release from a 60° deflection within 7 seconds', () => {
    const events: PassEvent[] = [];
    const engine = createPassPhysics({ onEvent: (event) => events.push(event) });
    const origin = engine.snapshot();
    const angle = Math.PI / 3;
    const place = (point: number[]) => [Math.sin(angle) * -point[1]!, Math.cos(angle) * point[1]!, 0];
    const thread = origin.thread.flatMap((_, idx) => idx % 3 === 0 ? place(origin.thread.slice(idx, idx + 3)) : []);
    engine.restore({ ...origin, thread, position: place(origin.position), orientation: [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)] });
    elapsed(engine, 7);
    expect(Math.hypot(...engine.state.velocity)).toBeLessThan(0.009);
    expect(Math.hypot(...engine.state.angularVelocity)).toBeLessThan(0.13);
    expect(engine.state.status).toBe('resting');
    expect(events).toContainEqual({ type: 'rest', back: false });
  });

  it('tracks a card-local grab point and swings after unpinning it', () => {
    const engine = createPassPhysics();
    expect(engine.grab({ kind: 'card', local }, start)).toBe(true);
    engine.moveGrab(held);
    elapsed(engine, 0.65);
    expect(engine.state.status).toBe('dragging');
    expect(Math.hypot(...held.map((value, i) => value - engine.state.grabPoint[i]!))).toBeLessThan(0.0045);
    expect(engine.release([0.30, 0.02, 0.18])).toBe(true);
    const before = [...engine.state.position];
    elapsed(engine, 0.2);
    expect(engine.state.status).toBe('swinging');
    expect(Math.hypot(...before.map((value, i) => value - engine.state.position[i]!))).toBeGreaterThan(0.018);
  });

  it('tracks a point between thread particles, including when the last span is dragged', () => {
    const engine = createPassPhysics();
    const target: Vec3 = [0.039, -0.081, 0.018];
    expect(engine.grab({ kind: 'thread', segment: DEFAULT_PHYSICS.segments - 1, fraction: 0.55 }, [0, -0.101, 0])).toBe(true);
    engine.moveGrab(target);
    elapsed(engine, 0.85);
    expect(Math.hypot(...target.map((value, i) => value - engine.state.grabPoint[i]!))).toBeLessThan(0.005);
    expect(engine.release()).toBe(true);
    expect(Math.max(...lengthErrors(elapsed(engine, 0.5)))).toBeLessThan(0.085);
  });

  it('keeps a tight rope after unreachable, high-speed and non-finite grab inputs', () => {
    const engine = createPassPhysics();
    engine.grab({ kind: 'card', local }, start);
    for (let index = 0; index < 20; index++) {
      engine.moveGrab(index % 2 === 0 ? [1e12, -1e9, 900] : [-1e9, -1e6, 1e15]);
      engine.step(1 / 30);
    }
    engine.moveGrab([0.04, -0.18, -0.04]);
    elapsed(engine, 0.25);
    engine.moveGrab([NaN, -Infinity, Infinity]);
    engine.step(0.5);
    engine.release([Infinity, 1e9, -1e9]);
    const state = elapsed(engine, 1.2);
    expect([...state.thread, ...state.position, ...state.orientation].every(Number.isFinite)).toBe(true);
    expect(Math.max(...lengthErrors(state))).toBeLessThan(0.085);
  });

  it('tilts gravity by at most 12° at constant magnitude and moves the suspended body', () => {
    const engine = createPassPhysics();
    engine.setTilt(60, -60);
    const gravity = engine.state.gravity;
    expect(Math.hypot(...gravity)).toBeCloseTo(9.81, 9);
    expect(Math.acos(-gravity[1]! / 9.81)).toBeCloseTo(Math.PI / 15, 9);
    expect(gravity[0]).toBeGreaterThan(0);
    expect(gravity[2]).toBeLessThan(0);
    const state = elapsed(engine, 1.4);
    expect(state.position[0]).toBeGreaterThan(0.013);
    expect(state.position[2]).toBeLessThan(-0.013);
  });

  it('reaches the back and returns, with an explicit flip event for each side', () => {
    const events: PassEvent[] = [];
    const engine = createPassPhysics({ onEvent: (event) => events.push(event) });
    engine.flip();
    expect(elapsed(engine, 2.6).back).toBe(true);
    expect(engine.state.status).toBe('flipped');
    expect(Math.abs(engine.state.orientation[1]!)).toBeGreaterThan(0.99);
    engine.unflip();
    expect(elapsed(engine, 2.6).back).toBe(false);
    expect(engine.state.status).toBe('resting');
    expect(Math.abs(engine.state.orientation[3]!)).toBeGreaterThan(0.99);
    expect(events.filter((event) => event.type === 'flip')).toEqual([{ type: 'flip', back: true }, { type: 'flip', back: false }]);
  });

  it('turns past edge-on under an off-centre flick and winds back without a flip command', () => {
    const engine = createPassPhysics();
    engine.flick([0.1, 0.02, 1.28]);
    let maxTwist = 0;
    for (let i = 0; i < 92; i++) maxTwist = Math.max(maxTwist, Math.abs(engine.step(FRAME).twist));
    expect(maxTwist).toBeGreaterThan(Math.PI / 2);
    expect(elapsed(engine, 4.6).back).toBe(false);
  });

  it('emits a bounded eyelet knock when a taut cord catches a hard downward impulse', () => {
    const events: PassEvent[] = [];
    const engine = createPassPhysics({ onEvent: (event) => events.push(event) });
    elapsed(engine, 0.5);
    expect(events.some((event) => event.type === 'eyelet-knock')).toBe(false);
    engine.addImpulse([0.035, -0.77, 0]);
    engine.step(FRAME);
    const knocks = events.filter((event) => event.type === 'eyelet-knock');
    expect(knocks).toHaveLength(1);
    expect(knocks[0]!.strength).toBeGreaterThan(0.25);
    expect(knocks[0]!.strength).toBeLessThanOrEqual(1);
  });

  it('returns to an exact rest state after clearing tilt and wind with reset', () => {
    const engine = createPassPhysics();
    const baseline = engine.snapshot();
    exercise(engine);
    engine.reset();
    expect(engine.snapshot()).toEqual(baseline);
  });
});
