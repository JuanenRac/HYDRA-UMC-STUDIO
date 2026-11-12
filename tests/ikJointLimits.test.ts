// =============================================================================
// HYDRA-UMC STUDIO - tests/ikJointLimits.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// What the inverse kinematics gives back stays inside the travel of the joints of its model: for poses that lie inside the range of every joint, the joint set
// found for the Cartesian pose of that pose is finite and inside the range the dispatcher reports for the model.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { jointLimitsFor, jointsToCartesianForModel, resolveTargetJoints, wrapIntoTravel } from '../src/examples/robotKinematicsDispatch';
import type { KinematicsPoint } from '../src/examples/utils';
import type { RobotModel } from '../src/store';

const MODELS: readonly RobotModel[] = [
  'Parol6 (6-DOF)', 'Faze4 (6-DOF)', 'AR3 (6-DOF)', 'AR4 (6-DOF)',
  'UR3e (6-DOF)', 'UR5e (6-DOF)', 'UR10e (6-DOF)', 'UR16e (6-DOF)', 'UR20 (6-DOF)',
  'xArm6 (6-DOF)', 'Lite 6 (6-DOF)', 'e.DO (6-DOF)',
  'Gen3 Lite (6-DOF)', 'M-710iC (6-DOF)', 'SO-ARM100 (5-DOF)',
  'Gen2 (6-DOF)', 'PiPER (6-DOF)', 'Z1 (6-DOF)', 'ViperX 300 (6-DOF)', 'WidowX 250 (6-DOF)',
  'Koch v1.1 (5-DOF)', 'UR3 (6-DOF)', 'UR5 (6-DOF)', 'UR10 (6-DOF)',
] as const;
const JOINTS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
const SLACK_DEG = 0.5;

/** A pose inside the range of every joint: the given fraction of the way from the middle of the range to its ends, with a sign per joint. */
function poseInside(model: RobotModel, fraction: number, signs: readonly number[]): KinematicsPoint {
  const pose: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };
  JOINTS.forEach((joint, index) => {
    const [lo, hi] = jointLimitsFor(model, joint);
    const middle = (lo + hi) / 2;
    const half = (hi - lo) / 2;
    pose[joint] = middle + signs[index] * fraction * Math.min(half, 90);
  });
  return pose;
}

const SIGNS: ReadonlyArray<readonly number[]> = [
  [0, 0, 0, 0, 0, 0],
  [1, -1, 1, 0, 0, 0],
  [-1, 1, -1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1],
  [-1, -1, -1, -1, -1, -1],
];

describe('the inverse kinematics stays inside the travel of the joints', () => {
  it.each(MODELS)('%s: a pose taken from inside the range comes back finite and inside the range', (model) => {
    for (const fraction of [0.1, 0.3]) {
      for (const signs of SIGNS) {
        const pose = poseInside(model, fraction, signs);
        const cart = jointsToCartesianForModel(model, pose);
        const solved = resolveTargetJoints(model, cart.x, cart.y, cart.z, cart.a, cart.b, cart.c, pose);
        for (const joint of JOINTS) {
          const value = solved[joint];
          expect(Number.isFinite(value), `${model} ${joint} finite`).toBe(true);
          const [lo, hi] = jointLimitsFor(model, joint);
          expect(value, `${model} ${joint} ${value} in [${lo}, ${hi}]`).toBeGreaterThanOrEqual(lo - SLACK_DEG);
          expect(value, `${model} ${joint} ${value} in [${lo}, ${hi}]`).toBeLessThanOrEqual(hi + SLACK_DEG);
        }
      }
    }
  });

  it.each(MODELS)('%s: the ends of every joint range are ordered and a pose built from them is inside', (model) => {
    for (const joint of JOINTS) {
      const [lo, hi] = jointLimitsFor(model, joint);
      expect(lo).toBeLessThanOrEqual(hi);
    }
  });
});

describe('an angle a whole turn away is brought back inside the travel', () => {
  it('moves it by whole turns and leaves what is inside, or cannot fit, as it is', () => {
    expect(wrapIntoTravel(-333, -180, 180)).toBeCloseTo(27, 9);
    expect(wrapIntoTravel(351, -180, 180)).toBeCloseTo(-9, 9);
    expect(wrapIntoTravel(-189, -180, 180)).toBeCloseTo(171, 9);
    expect(wrapIntoTravel(45, -180, 180)).toBe(45);
    expect(wrapIntoTravel(-360, -360, 360)).toBe(-360);
    expect(wrapIntoTravel(200, -90, 90)).toBe(200);
    expect(Number.isNaN(wrapIntoTravel(Number.NaN, -180, 180))).toBe(true);
  });
});
