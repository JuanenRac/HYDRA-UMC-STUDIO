// =============================================================================
// HYDRA-UMC STUDIO - tests/robotKinematicsDispatch.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real, generic tests over robotKinematicsDispatch.ts's own dispatch table -
// found in an ecosystem-wide software-improvements audit: this single
// source of truth (used by both PathVisualizer.tsx and RobotDetail.tsx)
// fans out to 23 separate per-robot *Kinematics.ts files plus a generic
// fallback, and NONE of them - the dispatcher itself or any of the 23 real
// per-robot FK/IK pairs it reaches - had a single automated test.
//
// Deliberately ONE generic, parametrized suite over every real model
// instead of 23 near-duplicate bespoke test files: this is both more
// maintainable (a new robot added to the dispatch table is covered
// automatically, with no new test file to remember writing) and, per
// model, exercises the exact same real code path a live jog/record/replay
// in the app actually uses. Model-specific engines that deserve deeper,
// bespoke coverage beyond what's generic here (the shared UR DH-chain
// engine, Parol6's own hard-coded chain) already have their own dedicated
// test files - see urKinematicsShared.test.ts / parol6Kinematics.test.ts.
//
// The model list below is a deliberate, hand-kept literal, checked against
// the real `RobotModel` union via a type-only import - `import type` is
// fully erased at compile time (no runtime import of src/store.tsx's own
// live React/Zustand state wiring and real browser-storage reads ever
// happens here), so this gets real type-checking (a model renamed/removed
// from RobotModel, or a typo here, fails `npm run typecheck`) without
// dragging that heavy, side-effecting module into a suite that has
// nothing to do with UI state.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  jointLimitsFor,
  jointsToCartesianForModel,
  resolveTargetJoints,
} from '../src/examples/robotKinematicsDispatch';
import type { KinematicsPoint } from '../src/examples/utils';
import type { RobotModel } from '../src/store';

// Every model this dispatcher explicitly handles (one per real `if` branch
// in jointsToCartesianForModel/resolveTargetJoints).
const HANDLED_MODELS: readonly RobotModel[] = [
  'Parol6 (6-DOF)', 'Faze4 (6-DOF)', 'AR3 (6-DOF)', 'AR4 (6-DOF)',
  'UR3e (6-DOF)', 'UR5e (6-DOF)', 'UR10e (6-DOF)', 'UR16e (6-DOF)', 'UR20 (6-DOF)',
  'xArm6 (6-DOF)', 'Lite 6 (6-DOF)', 'e.DO (6-DOF)',
  'Gen3 Lite (6-DOF)', 'M-710iC (6-DOF)',
  'SO-ARM100 (5-DOF)',
  'Gen2 (6-DOF)', 'PiPER (6-DOF)', 'Z1 (6-DOF)', 'ViperX 300 (6-DOF)', 'WidowX 250 (6-DOF)',
  'Koch v1.1 (5-DOF)',
  'UR3 (6-DOF)', 'UR5 (6-DOF)', 'UR10 (6-DOF)',
] as const;

// 'Generic (6-DOF)' is a real member of store.tsx's own RobotModel type
// that deliberately has NO dedicated branch - it's meant to fall through
// to jointsToCartesianForModel's own generic 160mm/200mm formula and
// resolveTargetJoints's own genericJoints pass-through.
const ALL_MODELS = [...HANDLED_MODELS, 'Generic (6-DOF)'] as const;

// Models jointLimitsFor gives a real per-model limits constant to, where
// that constant's own real values differ numerically from the app's
// generic +/-180 fallback. Gen2 has its OWN real `GEN2_JOINT_LIMITS_DEG`
// dispatched here too (see robotKinematicsDispatch.ts) - it's just that
// its own real hardware limits happen to equal +/-180 on every joint, so
// it's deliberately excluded from THIS specific "differs from the
// default" assertion rather than miscategorized as not having real limits
// at all.
const MODELS_WITH_REAL_LIMITS = [
  'Parol6 (6-DOF)', 'AR4 (6-DOF)', 'UR3e (6-DOF)', 'UR5e (6-DOF)', 'UR10e (6-DOF)',
  'UR16e (6-DOF)', 'UR20 (6-DOF)', 'xArm6 (6-DOF)', 'Lite 6 (6-DOF)',
  'Gen3 Lite (6-DOF)', 'PiPER (6-DOF)',
] as const;

const JOINTS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;

function samplePoints(): KinematicsPoint[] {
  return [
    { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
    { j1: 15, j2: -20, j3: 25, j4: 5, j5: -5, j6: 30 },
    { j1: -30, j2: 10, j3: -15, j4: 0, j5: 0, j6: 0 },
  ];
}

function isFiniteCartesian(cart: { x: number; y: number; z: number; a: number; b: number; c: number }): boolean {
  return Object.values(cart).every((v) => Number.isFinite(v));
}

function isFiniteJoints(pt: KinematicsPoint): boolean {
  return JOINTS.every((j) => Number.isFinite(pt[j]));
}

describe('jointsToCartesianForModel - every real model', () => {
  it.each(ALL_MODELS)('%s: produces a finite Cartesian pose for every sample joint set', (model) => {
    for (const pt of samplePoints()) {
      const cart = jointsToCartesianForModel(model, pt);
      expect(isFiniteCartesian(cart)).toBe(true);
    }
  });

  it('an unknown/undefined model falls back to the generic formula rather than throwing', () => {
    const cart = jointsToCartesianForModel(undefined, { j1: 10, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 });
    expect(isFiniteCartesian(cart)).toBe(true);
  });
});

describe('resolveTargetJoints - every real model', () => {
  const genericFallback = { j1: 999, j2: 999, j3: 999, j4: 999, j5: 999, j6: 999 };

  it.each(HANDLED_MODELS)('%s: solves a finite joint set for a reachable target, ignoring the generic fallback', (model) => {
    const home = jointsToCartesianForModel(model, { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 });
    const solved = resolveTargetJoints(model, home.x, home.y, home.z, home.a, home.b, home.c, genericFallback);
    expect(isFiniteJoints(solved)).toBe(true);
    // A handled model must resolve through its OWN real IK, never silently
    // return the sentinel fallback object passed in for the unhandled case.
    expect(solved).not.toEqual(genericFallback);
  });

  it('an unhandled model (Generic) returns the caller-supplied genericJoints untouched', () => {
    const solved = resolveTargetJoints('Generic (6-DOF)', 100, 100, 0, 1, 2, 3, genericFallback);
    expect(solved).toEqual(genericFallback);
  });
});

describe('jointLimitsFor - every real model', () => {
  it.each(ALL_MODELS)('%s: every joint has a real, ordered [lower, upper] range', (model) => {
    for (const j of JOINTS) {
      const [lo, hi] = jointLimitsFor(model, j);
      expect(Number.isFinite(lo)).toBe(true);
      expect(Number.isFinite(hi)).toBe(true);
      expect(lo).toBeLessThanOrEqual(hi);
    }
  });

  it.each(MODELS_WITH_REAL_LIMITS)('%s: has at least one joint that differs from the generic +/-180 default', (model) => {
    // "Real limits" isn't always NARROWER - a real continuous UR e-Series
    // joint (see ur5eKinematics.ts's own comment) is wider (+/-360) than
    // the generic fallback, not narrower, so this checks "distinct from
    // the generic default", which is the actual property jointLimitsFor
    // gives these models over one that falls through to the default.
    const differs = JOINTS.some((j) => {
      const [lo, hi] = jointLimitsFor(model, j);
      return lo !== -180 || hi !== 180;
    });
    expect(differs).toBe(true);
  });

  it('a model with no real limits of its own gets the generic +/-180 default for every joint', () => {
    for (const j of JOINTS) {
      expect(jointLimitsFor('Faze4 (6-DOF)', j)).toEqual([-180, 180]);
    }
  });
});

describe('round trip: jointsToCartesian -> resolveTargetJoints -> jointsToCartesian', () => {
  const genericFallback = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

  it.each(HANDLED_MODELS)('%s: recovers approximately the same Cartesian pose after a full IK round trip', (model) => {
    // A small, deliberately non-zero nominal pose - all-zero sits at or
    // near a real kinematic singularity for at least one model (xArm6,
    // confirmed by hand: its Newton-Raphson solve lands ~46mm off from
    // that exact start) - clamped to THIS model's own real per-joint
    // range via the exact same jointLimitsFor() this dispatcher exposes,
    // since a fixed pose that's perfectly reasonable for one robot can be
    // genuinely out of range for another with a real asymmetric limit
    // (PiPER's own j2, for one, is [0, 180] - never negative).
    const nominal: KinematicsPoint = { j1: 5, j2: -5, j3: 5, j4: 0, j5: 0, j6: 0 };
    const homeJoints = JOINTS.reduce<KinematicsPoint>((acc, j) => {
      const [lo, hi] = jointLimitsFor(model, j);
      acc[j] = Math.max(lo, Math.min(hi, nominal[j]));
      return acc;
    }, { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 });
    const cart = jointsToCartesianForModel(model, homeJoints);
    const solved = resolveTargetJoints(model, cart.x, cart.y, cart.z, cart.a, cart.b, cart.c, genericFallback);
    const recart = jointsToCartesianForModel(model, solved);
    // A generous tolerance (a few mm) - several models solve position via
    // a numerically-converged Newton-Raphson search (see
    // urKinematicsShared.ts/parol6Kinematics.ts's own solveJ2J3), not a
    // closed-form inverse, so exact equality isn't the right bar; landing
    // within a few mm of the original target is what a real jog/replay
    // actually needs.
    expect(Math.hypot(recart.x - cart.x, recart.y - cart.y, recart.z - cart.z)).toBeLessThan(5);
  });
});
