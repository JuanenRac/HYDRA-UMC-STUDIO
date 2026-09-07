// =============================================================================
// HYDRA-UMC STUDIO - tests/urKinematicsShared.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real unit tests for src/examples/urKinematicsShared.ts's createUrKinematics()
// engine - the real DH-chain FK + multi-seeded Newton-Raphson IK solver
// shared by every UR e-Series/UR20 model. Exercised here through the real
// UR5e chain/limits/home pose (already exported by ur5eKinematics.ts)
// rather than a synthetic chain, so this is testing the actual numbers a
// real robot in this app's catalog uses, not an artificial stand-in.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { createUrKinematics } from '../src/examples/urKinematicsShared';
import { UR5E_CHAIN, UR5E_JOINT_LIMITS_DEG, UR5E_HOME_POSE } from '../src/examples/ur5eKinematics';

const ur5e = createUrKinematics(UR5E_CHAIN, UR5E_JOINT_LIMITS_DEG, UR5E_HOME_POSE);

describe('createUrKinematics - forward kinematics', () => {
  it('the home pose z=0 maps to Cartesian z=0 by construction (zOffsetMm is derived from it)', () => {
    const cart = ur5e.jointsToCartesian(UR5E_HOME_POSE);
    expect(cart.z).toBeCloseTo(0, 3);
  });

  it('j1 rotation only changes the horizontal direction, not the radius or height', () => {
    const base = ur5e.jointsToCartesian(UR5E_HOME_POSE);
    const baseRadius = Math.hypot(base.x, base.y);
    const rotated = ur5e.jointsToCartesian({ ...UR5E_HOME_POSE, j1: 47 });
    const rotatedRadius = Math.hypot(rotated.x, rotated.y);
    expect(rotatedRadius).toBeCloseTo(baseRadius, 3);
    expect(rotated.z).toBeCloseTo(base.z, 3);
  });

  it('j4/j5/j6 pass straight through into a/b/c, unaffected by the position solve', () => {
    const cart = ur5e.jointsToCartesian({ ...UR5E_HOME_POSE, j4: 12, j5: -34, j6: 56 });
    expect(cart.a).toBe(12);
    expect(cart.b).toBe(-34);
    expect(cart.c).toBe(56);
  });
});

describe('createUrKinematics - inverse kinematics', () => {
  it('solving for the home pose Cartesian target recovers j2/j3 within solver tolerance', () => {
    const homeCart = ur5e.jointsToCartesian(UR5E_HOME_POSE);
    const solved = ur5e.cartesianToJoints(homeCart.x, homeCart.y, homeCart.z, 0, 0, 0);
    expect(solved.j2).toBeCloseTo(UR5E_HOME_POSE.j2, 1);
    expect(solved.j3).toBeCloseTo(UR5E_HOME_POSE.j3, 1);
  });

  it('a full forward -> inverse -> forward round trip lands back on the same Cartesian point', () => {
    const target = { j1: 25, j2: -60, j3: 40, j4: 0, j5: 0, j6: 0 };
    const cart = ur5e.jointsToCartesian(target);
    const solved = ur5e.cartesianToJoints(cart.x, cart.y, cart.z, cart.a, cart.b, cart.c);
    const recart = ur5e.jointsToCartesian(solved);
    expect(recart.x).toBeCloseTo(cart.x, 1);
    expect(recart.y).toBeCloseTo(cart.y, 1);
    expect(recart.z).toBeCloseTo(cart.z, 1);
  });

  it('j1 is solved directly via atan2 and clamped to the model limits', () => {
    const solved = ur5e.cartesianToJoints(100, 100, 0, 0, 0, 0);
    expect(solved.j1).toBeCloseTo(45, 5);
  });

  it('a/b/c are clamped to j4/j5/j6 limits rather than passed through unbounded', () => {
    // UR5e's own j4 limit is [-360, 360] - a value inside it must survive unclamped.
    const solved = ur5e.cartesianToJoints(200, 0, 0, 200, 0, 0);
    expect(solved.j4).toBe(200);
    // j3/j6 are limited to [-180, 180] on this model (continuous-but-clamped
    // convention, see ur5eKinematics.ts's own comment) - a value outside
    // that must be clamped, not passed through.
    const clamped = ur5e.cartesianToJoints(200, 0, 0, 0, 0, 999);
    expect(clamped.j6).toBe(180);
  });
});
