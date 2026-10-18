// =============================================================================
// HYDRA-UMC STUDIO - tests/jogSafety.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  MAX_JOG_JOINT_DELTA_DEG,
  excessiveJogStep,
  largestJointChange,
  nearestEquivalentAngle,
  withContinuousBase,
} from '../src/examples/jogSafety';
import { jointLimitsFor, jointsToCartesianForModel, resolveTargetJoints } from '../src/examples/robotKinematicsDispatch';
import type { RobotModel } from '../src/store';

describe('nearestEquivalentAngle', () => {
  it('keeps an angle that is already inside the limits and closest', () => {
    expect(nearestEquivalentAngle(10, 5, [-180, 180])).toBe(10);
  });
  it('picks the turn that stays next to the seed when the limits allow more than one', () => {
    expect(nearestEquivalentAngle(-170, 200, [-360, 360])).toBe(190);
    expect(nearestEquivalentAngle(170, -200, [-360, 360])).toBe(-190);
  });
  it('never leaves the limits', () => {
    expect(nearestEquivalentAngle(-170, 185, [-97.4, 187.4])).toBe(null); // 190 and -170 are both outside
    expect(nearestEquivalentAngle(-100, 150, [-97.4, 187.4])).toBe(null);
  });
  it('refuses a non-finite angle', () => {
    expect(nearestEquivalentAngle(Number.NaN, 0, [-180, 180])).toBe(null);
  });
});

describe('withContinuousBase', () => {
  it('leaves the solver result alone without a seed', () => {
    const solved = { j1: -97.4, j2: 0 };
    expect(withContinuousBase(solved, { x: -1, y: 0.1 }, undefined, [-97.4, 187.4])).toBe(solved);
  });
  it('does not touch a solver whose base is not the direction of the target', () => {
    const solved = { j1: 42, j2: 0 };
    expect(withContinuousBase(solved, { x: 1, y: 0 }, 0, [-360, 360])).toBe(solved);
  });
  it('leaves the result alone straight above the base', () => {
    const solved = { j1: 0, j2: 0 };
    expect(withContinuousBase(solved, { x: 0, y: 0 }, 90, [-360, 360])).toBe(solved);
  });
});

// The reproduction of the reported fault: a 1 mm jog next to the +-180 seam.
const CASES: { model: RobotModel; j1: number }[] = [
  { model: 'Parol6 (6-DOF)', j1: 185 },
  { model: 'UR5e (6-DOF)', j1: 200 },
  { model: 'UR5e (6-DOF)', j1: -190 },
  { model: 'UR10e (6-DOF)', j1: 181 },
];

describe('a 1 mm jog next to the +-180 seam', () => {
  for (const { model, j1 } of CASES) {
    it(`${model} at j1=${j1} moves the base by a few degrees at most`, () => {
      const joints = { j1, j2: -30, j3: 40, j4: 0, j5: 0, j6: 0 };
      const cart = jointsToCartesianForModel(model, joints);
      const solved = resolveTargetJoints(model, cart.x, cart.y + 1, cart.z, cart.a, cart.b, cart.c, joints, joints);
      expect(Math.abs(solved.j1 - j1)).toBeLessThan(5);
      const [min, max] = jointLimitsFor(model, 'j1');
      expect(solved.j1).toBeGreaterThanOrEqual(min - 1e-9);
      expect(solved.j1).toBeLessThanOrEqual(max + 1e-9);
      expect(excessiveJogStep(joints, solved)).toBe(null);
    });
  }

  it('the step is refused, not sent, when no seed is known and the solver jumps', () => {
    const joints = { j1: 185, j2: -30, j3: 40, j4: 0, j5: 0, j6: 0 };
    const cart = jointsToCartesianForModel('Parol6 (6-DOF)', joints);
    const unseeded = resolveTargetJoints('Parol6 (6-DOF)', cart.x, cart.y + 1, cart.z, cart.a, cart.b, cart.c, joints);
    expect(Math.abs(unseeded.j1 - 185)).toBeGreaterThan(100);
    const jump = excessiveJogStep(joints, unseeded);
    expect(jump?.joint).toBe('j1');
  });
});

describe('largestJointChange / excessiveJogStep', () => {
  it('names the joint that moves most', () => {
    const jump = largestJointChange({ j1: 0, j2: 0, j3: 0 }, { j1: 3, j2: -12, j3: 5 });
    expect(jump).toEqual({ joint: 'j2', deltaDeg: 12 });
  });
  it('accepts a step at the ceiling and refuses one just over it', () => {
    expect(excessiveJogStep({ j1: 0 }, { j1: MAX_JOG_JOINT_DELTA_DEG })).toBe(null);
    expect(excessiveJogStep({ j1: 0 }, { j1: MAX_JOG_JOINT_DELTA_DEG + 0.5 })?.joint).toBe('j1');
  });
  it('treats a missing joint as zero', () => {
    expect(excessiveJogStep({}, { j6: 1 })).toBe(null);
  });
});
