// =============================================================================
// HYDRA-UMC STUDIO - tests/parol6Kinematics.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real unit tests for src/examples/parol6Kinematics.ts - Parol6's own
// real per-joint URDF transform chain and Newton-Raphson (j2,j3) solve,
// hard-coded (unlike urKinematicsShared.ts's parameterized UR engine)
// but structurally the same kind of real FK/IK pair.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  parol6CartesianToJoints,
  parol6JointsToCartesian,
  PAROL6_HOME_POSE,
  PAROL6_JOINT_LIMITS_DEG,
} from '../src/examples/parol6Kinematics';

describe('parol6JointsToCartesian / parol6CartesianToJoints', () => {
  it('a full forward -> inverse -> forward round trip lands back on the same Cartesian point', () => {
    const cart = parol6JointsToCartesian(PAROL6_HOME_POSE);
    const solved = parol6CartesianToJoints(cart.x, cart.y, cart.z, cart.a, cart.b, cart.c);
    const recart = parol6JointsToCartesian(solved);
    expect(recart.x).toBeCloseTo(cart.x, 1);
    expect(recart.y).toBeCloseTo(cart.y, 1);
    expect(recart.z).toBeCloseTo(cart.z, 1);
  });

  it('j1 rotation only changes horizontal direction, not radius or height', () => {
    const base = parol6JointsToCartesian(PAROL6_HOME_POSE);
    const baseRadius = Math.hypot(base.x, base.y);
    const rotated = parol6JointsToCartesian({ ...PAROL6_HOME_POSE, j1: 60 });
    expect(Math.hypot(rotated.x, rotated.y)).toBeCloseTo(baseRadius, 3);
    expect(rotated.z).toBeCloseTo(base.z, 3);
  });

  it('j4/j5/j6 pass straight through into a/b/c', () => {
    const cart = parol6JointsToCartesian({ ...PAROL6_HOME_POSE, j4: 10, j5: -20, j6: 30 });
    expect(cart.a).toBe(10);
    expect(cart.b).toBe(-20);
    expect(cart.c).toBe(30);
  });

  it('j1 is clamped to this model\'s own real +/-97.40 limit', () => {
    const solved = parol6CartesianToJoints(-1, 100, 0, 0, 0, 0); // atan2(100,-1) ~= 90.6deg, within range
    expect(solved.j1).toBeGreaterThanOrEqual(PAROL6_JOINT_LIMITS_DEG.j1[0]);
    expect(solved.j1).toBeLessThanOrEqual(PAROL6_JOINT_LIMITS_DEG.j1[1]);
  });

  it('a target requesting j1 outside the real limit is clamped, not passed through unbounded', () => {
    // A point almost directly "behind" the robot (atan2 close to +/-180deg)
    // is outside Parol6's real +/-97.40deg j1 range.
    const solved = parol6CartesianToJoints(-100, 1, 0, 0, 0, 0);
    expect(solved.j1).toBe(PAROL6_JOINT_LIMITS_DEG.j1[1]);
  });

  it('every solved joint stays within this model\'s own real limits for a reachable target', () => {
    const cart = parol6JointsToCartesian(PAROL6_HOME_POSE);
    const solved = parol6CartesianToJoints(cart.x, cart.y, cart.z, 5, -5, 15);
    for (const j of ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const) {
      const [lo, hi] = PAROL6_JOINT_LIMITS_DEG[j];
      expect(solved[j]).toBeGreaterThanOrEqual(lo);
      expect(solved[j]).toBeLessThanOrEqual(hi);
    }
  });
});
