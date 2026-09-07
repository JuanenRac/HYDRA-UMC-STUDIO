// =============================================================================
// HYDRA-UMC STUDIO - shared Universal Robots kinematics engine: urKinematicsShared.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Every UR e-Series model (UR3e, UR5e, UR10e, UR16e, UR20, ...) shares the
// EXACT same kinematic structure - 6 revolute joints, every one of them
// rotating about its own local Z axis once its own <origin rpy> has been
// applied, per Universal Robots' own official
// github.com/UniversalRobots/Universal_Robots_ROS2_Description ur_macro.xacro
// (every <joint> there has `<axis xyz="0 0 1" />`, no exceptions - unlike
// Parol6's chain, which mixes +1/-1 axis signs per joint). Only the 6 link
// offsets (from that model's own default_kinematics.yaml) actually differ
// between models - same shape data, different numbers.
//
// This mirrors parol6Kinematics.ts's own approach (real per-joint transform
// chain, Newton-Raphson 2-parameter (j2,j3) solve for position, j4/j5/j6
// pass-through for orientation) but PARAMETERIZED by that chain instead of
// hard-coded, since here the structure genuinely is identical across models
// - unlike Parol6/Faze4/AR3/AR4, which are each a structurally different
// robot and don't share this kind of engine.
// =============================================================================

import { Matrix4, Euler, Vector3 } from 'three';
import type { KinematicsPoint } from './utils';

const DEG = Math.PI / 180;

export interface UrJointStep {
  /** <origin xyz="..."/> from that joint's own default_kinematics.yaml entry, meters. */
  pos: [number, number, number];
  /** <origin rpy="..."/>, radians, ROS 'ZYX' intrinsic composition (see rosEuler below). */
  rpy: [number, number, number];
}

/** shoulder_pan, shoulder_lift, elbow, wrist_1, wrist_2, wrist_3 origins, in that order. */
export type UrChain = [UrJointStep, UrJointStep, UrJointStep, UrJointStep, UrJointStep, UrJointStep];

export type UrJointLimitsDeg = Record<'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6', [number, number]>;

// ROS URDF <origin rpy="r p y"/> composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) -
// three.js's intrinsic 'ZYX' Euler order, not the default 'XYZ' - same fix
// already applied in Parol6Arm.tsx/parol6Kinematics.ts, needed here for the
// same reason (this chain's shoulder/wrist_2 joints have 2-axis rpy).
function rosEuler(rpy: [number, number, number]): Euler {
  return new Euler(rpy[0], rpy[1], rpy[2], 'ZYX');
}

// ROS is Z-up, three.js is Y-up - same single root fix-up rotation every
// other *Kinematics.ts in this folder applies.
const ROOT = new Matrix4().makeRotationX(-Math.PI / 2);

function fkPosition(chain: UrChain, jointsDeg: number[]): Vector3 {
  let m = ROOT;
  for (let i = 0; i < 6; i++) {
    const { pos, rpy } = chain[i];
    const t = new Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    const r = new Matrix4().makeRotationFromEuler(rosEuler(rpy));
    const jr = new Matrix4().makeRotationZ(jointsDeg[i] * DEG); // every UR joint's own axis is local Z
    m = m.clone().multiply(t).multiply(r).multiply(jr);
  }
  const out = new Vector3();
  out.setFromMatrixPosition(m);
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Radius/height for a given (j2,j3) holding j1/j4/j5/j6 at 0 - j1 only spins
// this pair around the vertical axis (confirmed numerically, same as
// Parol6's own equivalent comment), so position solves down to this
// 2-parameter problem for any arm in this "shoulder+elbow, wrist for
// orientation only" family, UR included.
function radiusHeight(chain: UrChain, j2: number, j3: number): [number, number] {
  const p = fkPosition(chain, [0, j2, j3, 0, 0, 0]);
  return [Math.sqrt(p.x * p.x + p.z * p.z), p.y];
}

// Same multi-seeded Newton-Raphson as parol6Kinematics.ts's solveJ2J3 -
// UR's shoulder_lift/elbow pair isn't guaranteed single-valued either (an
// elbow-up/elbow-down ambiguity exists for many reachable targets), so
// several seeds are tried and the best (lowest residual) kept, clamped to
// the model's real limits as a last resort for unreachable targets.
function solveJ2J3(chain: UrChain, limits: UrJointLimitsDeg, targetRadius: number, targetHeight: number): { j2: number; j3: number } {
  const seeds: [number, number][] = [[-90, 90], [0, 0], [90, -90], [-45, 90], [45, -90], [-120, 120]];
  let best = { j2: 0, j3: 0, err: Infinity };

  for (const [g2, g3] of seeds) {
    let j2 = g2, j3 = g3;
    let lastErr = Infinity;
    const h = 0.01;
    for (let iter = 0; iter < 80; iter++) {
      const [R, Y] = radiusHeight(chain, j2, j3);
      const fR = R - targetRadius, fY = Y - targetHeight;
      const err = Math.hypot(fR, fY);
      if (err < 1e-7) break;
      if (err > lastErr * 1.5 && iter > 5) break;
      lastErr = err;

      const [R2, Y2] = radiusHeight(chain, j2 + h, j3);
      const [R3, Y3] = radiusHeight(chain, j2, j3 + h);
      const dRdj2 = (R2 - R) / h, dYdj2 = (Y2 - Y) / h;
      const dRdj3 = (R3 - R) / h, dYdj3 = (Y3 - Y) / h;
      const det = dRdj2 * dYdj3 - dRdj3 * dYdj2;
      if (Math.abs(det) < 1e-9) break;

      const maxStep = 15;
      const dj2 = clamp((fR * dYdj3 - fY * dRdj3) / det, -maxStep, maxStep);
      const dj3 = clamp((fY * dRdj2 - fR * dYdj2) / det, -maxStep, maxStep);
      j2 -= dj2;
      j3 -= dj3;
    }
    const [R, Y] = radiusHeight(chain, j2, j3);
    const err = Math.hypot(R - targetRadius, Y - targetHeight);
    if (err < best.err) best = { j2, j3, err };
    if (best.err < 1e-6) break;
  }

  return {
    j2: clamp(best.j2, limits.j2[0], limits.j2[1]),
    j3: clamp(best.j3, limits.j3[0], limits.j3[1]),
  };
}

// z=0 in the app's own shared Cartesian convention is mapped to sit just
// above this model's own home-pose height, same reasoning as Parol6's own
// Z_OFFSET_MM (see that file's comment) - computed here from the actual
// home pose FK rather than hand-tuned per model, since there's no live
// render available per-model to iterate against visually the way Parol6's
// constant was originally tuned.
function computeZOffsetMm(chain: UrChain, homePose: KinematicsPoint): number {
  const p = fkPosition(chain, [homePose.j1 || 0, homePose.j2 || 0, homePose.j3 || 0, 0, 0, 0]);
  return p.y * 1000;
}

export interface UrKinematics {
  jointsToCartesian(pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number };
  cartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint;
}

/** Builds a real FK/IK pair for one UR model from its own chain/limits/home pose. */
export function createUrKinematics(chain: UrChain, limits: UrJointLimitsDeg, homePose: KinematicsPoint): UrKinematics {
  const zOffsetMm = computeZOffsetMm(chain, homePose);

  return {
    jointsToCartesian(pt) {
      const j = [pt.j1 || 0, pt.j2 || 0, pt.j3 || 0, 0, 0, 0];
      const p = fkPosition(chain, j);
      const radius = Math.sqrt(p.x * p.x + p.z * p.z) * 1000;
      const j1Rad = (pt.j1 || 0) * DEG;
      return {
        x: radius * Math.cos(j1Rad),
        y: radius * Math.sin(j1Rad),
        z: p.y * 1000 - zOffsetMm,
        a: pt.j4 || 0,
        b: pt.j5 || 0,
        c: pt.j6 || 0,
      };
    },
    cartesianToJoints(x, y, z, a, b, c) {
      const j1 = Math.atan2(y, x) * (180 / Math.PI);
      const targetRadius = Math.sqrt(x * x + y * y) / 1000;
      const targetHeight = (z + zOffsetMm) / 1000;
      const { j2, j3 } = solveJ2J3(chain, limits, targetRadius, targetHeight);
      return {
        j1: clamp(j1, limits.j1[0], limits.j1[1]),
        j2,
        j3,
        j4: clamp(a || 0, limits.j4[0], limits.j4[1]),
        j5: clamp(b || 0, limits.j5[0], limits.j5[1]),
        j6: clamp(c || 0, limits.j6[0], limits.j6[1]),
      };
    },
  };
}
