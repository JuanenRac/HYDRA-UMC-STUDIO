// =============================================================================
// HYDRA-UMC STUDIO - Parol6-specific kinematics: parol6Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The shared cartesianToJoints/convertToCartesian in this folder's own
// utils.ts assume a simple planar 2-link arm (160mm/200mm) with the
// jN-in-Z/jN-in-Y rotation convention every OTHER *Arm.tsx shares. Parol6Arm.tsx
// deliberately does not use that convention - it's driven by the real PAROL6
// URDF's own per-joint transform chain instead (see that file's own header
// comment), so recorded/played trajectories computed by the shared formula
// don't correspond to sensible motion for it. This file provides the same
// {x,y,z,a,b,c} <-> {j1..j6} contract, computed against Parol6's REAL
// kinematics instead, so example trajectories and jog-to-Cartesian display
// behave sensibly for this robot too.
//
// The 6-step transform chain below (position, rpy, axis sign) is copied
// from the same PAROL6.urdf as Parol6Arm.tsx's own header comment - kept in
// sync BY HAND with that file (the same 3-way duplication trade-off already
// accepted for the shared 2-link formula) -
// deliberately not refactored into one shared data table this session,
// since Parol6Arm.tsx's own JSX is confirmed visually correct and touching
// its structure to extract a shared table would risk regressing that for a
// non-visual convenience.
//
// Only J1/J2/J3 (position) get a real numeric solve here - J4/J5/J6 (wrist
// orientation) are a simple pass-through of the requested a/b/c, matching
// how little the existing example generators in this folder actually vary
// orientation (every one of them holds a=b=0 and only ever varies c).
// =============================================================================

import { Matrix4, Euler, Vector3 } from 'three';
import type { KinematicsPoint } from './utils';

const DEG = Math.PI / 180;

interface JointStep {
  pos: [number, number, number];
  rpy: [number, number, number];
  axisSign: 1 | -1;
}

// Identical to the 6 joint groups in Parol6Arm.tsx, in meters/radians as authored in the URDF.
const PAROL6_CHAIN: JointStep[] = [
  { pos: [0, 0, 0], rpy: [0, 0, 0], axisSign: 1 },                                             // J1
  { pos: [0.0234207210610375, 0, 0.1105], rpy: [-1.5707963267949, 0, 0], axisSign: 1 },        // J2
  { pos: [0, -0.18, 0], rpy: [3.1416, 0, -1.5708], axisSign: -1 },                              // J3
  { pos: [0.0435, 0, 0], rpy: [1.5707963267949, 0, 3.14159265358979], axisSign: -1 },           // J4
  { pos: [0, 0, -0.17635], rpy: [-1.5708, 0, 0], axisSign: -1 },                                // J5
  { pos: [0, 0, 0], rpy: [1.5708, 0, 0], axisSign: -1 },                                        // J6
];

// Real limits from PAROL6.urdf's own <limit lower upper> (radians, converted here to degrees).
export const PAROL6_JOINT_LIMITS_DEG: Record<'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6', [number, number]> = {
  j1: [-97.40, 97.40],
  j2: [-56.15, 57.30],
  j3: [-114.59, 74.48],
  j4: [-114.59, 114.59],
  j5: [-120.32, 120.32],
  j6: [-177.62, 177.62],
};

// Root: ROS is Z-up, three.js is Y-up - same single fix-up rotation as Parol6Arm.tsx's own root group.
const ROOT = new Matrix4().makeRotationX(-Math.PI / 2);

function fkPosition(jointsDeg: number[]): Vector3 {
  let m = ROOT;
  for (let i = 0; i < 6; i++) {
    const { pos, rpy, axisSign } = PAROL6_CHAIN[i];
    const t = new Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    // ROS rpy = Rz(yaw)*Ry(pitch)*Rx(roll) = three.js 'ZYX' order, not 'XYZ' - see
    // Parol6Arm.tsx's rosEuler() header comment for the full explanation.
    const r = new Matrix4().makeRotationFromEuler(new Euler(rpy[0], rpy[1], rpy[2], 'ZYX'));
    const jr = new Matrix4().makeRotationZ(axisSign * jointsDeg[i] * DEG);
    m = m.clone().multiply(t).multiply(r).multiply(jr);
  }
  const out = new Vector3();
  out.setFromMatrixPosition(m);
  return out;
}

// Radius (horizontal-plane distance) and height for a given (j2,j3), holding j1/j4/j5/j6 at 0 -
// j1 only rotates this R/height pair around the vertical axis, confirmed numerically, so solving
// position reduces to this 2-parameter (j2,j3) problem exactly like the shared formula's own
// 2-link solve, just against Parol6's real (non-planar-obvious) geometry instead of a clean 2-link one.
function radiusHeight(j2: number, j3: number): [number, number] {
  const p = fkPosition([0, j2, j3, 0, 0, 0]);
  return [Math.sqrt(p.x * p.x + p.z * p.z), p.y];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Newton-Raphson on the 2-parameter (j2,j3) -> (radius,height) system, multi-seeded (Parol6's
// real chain isn't a clean single-valued 2-link arm the way the shared formula's model is, so a
// single seed can converge to a degenerate/out-of-range solution for some targets) and clamped
// to the real joint limits as a last resort for a target outside the reachable workspace, rather
// than let the solver run away to a huge, meaningless angle for an unreachable point.
function solveJ2J3(targetRadius: number, targetHeight: number): { j2: number; j3: number } {
  const seeds: [number, number][] = [[-30, 30], [0, 0], [30, -30], [-50, 60], [50, -60]];
  let best = { j2: 0, j3: 0, err: Infinity };

  for (const [g2, g3] of seeds) {
    let j2 = g2, j3 = g3;
    let lastErr = Infinity;
    const h = 0.01;
    for (let iter = 0; iter < 80; iter++) {
      const [R, Y] = radiusHeight(j2, j3);
      const fR = R - targetRadius, fY = Y - targetHeight;
      const err = Math.hypot(fR, fY);
      if (err < 1e-7) break;
      if (err > lastErr * 1.5 && iter > 5) break;
      lastErr = err;

      const [R2, Y2] = radiusHeight(j2 + h, j3);
      const [R3, Y3] = radiusHeight(j2, j3 + h);
      const dRdj2 = (R2 - R) / h, dYdj2 = (Y2 - Y) / h;
      const dRdj3 = (R3 - R) / h, dYdj3 = (Y3 - Y) / h;
      const det = dRdj2 * dYdj3 - dRdj3 * dYdj2;
      if (Math.abs(det) < 1e-9) break;

      const maxStep = 15; // degrees per iteration, keeps a bad Jacobian from producing a huge jump
      const dj2 = clamp((fR * dYdj3 - fY * dRdj3) / det, -maxStep, maxStep);
      const dj3 = clamp((fY * dRdj2 - fR * dYdj2) / det, -maxStep, maxStep);
      j2 -= dj2;
      j3 -= dj3;
    }
    const [R, Y] = radiusHeight(j2, j3);
    const err = Math.hypot(R - targetRadius, Y - targetHeight);
    if (err < best.err) best = { j2, j3, err };
    if (best.err < 1e-6) break;
  }

  return {
    j2: clamp(best.j2, PAROL6_JOINT_LIMITS_DEG.j2[0], PAROL6_JOINT_LIMITS_DEG.j2[1]),
    j3: clamp(best.j3, PAROL6_JOINT_LIMITS_DEG.j3[0], PAROL6_JOINT_LIMITS_DEG.j3[1]),
  };
}

// z=0 in the app's own shared Cartesian convention maps to this many mm above Parol6's own
// neutral (j2=j3=0) pose height, chosen so the app's usual small z values (examples mostly use
// 0-20mm) and default 200mm-ish radius sit comfortably mid-workspace for this robot's real,
// smaller reach - not the shared formula's own unrelated "+195" constant (that one is tuned to
// the generic rig's own base height, not a universal number). Re-derived after the rpy Euler
// order fix (was 247 under the old, wrong 'XYZ' order - the neutral pose itself moved since
// J3/J4's origin transforms changed); the neutral pose's own horizontal reach (~200mm) happens
// to already match the app's default example radius closely, which is why it was picked again.
const Z_OFFSET_MM = 334;

export function parol6JointsToCartesian(pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number } {
  const j = [pt.j1 || 0, pt.j2 || 0, pt.j3 || 0, 0, 0, 0];
  const p = fkPosition(j);
  const radius = Math.sqrt(p.x * p.x + p.z * p.z) * 1000;
  const j1Rad = (pt.j1 || 0) * DEG;
  return {
    x: radius * Math.cos(j1Rad),
    y: radius * Math.sin(j1Rad),
    z: p.y * 1000 - Z_OFFSET_MM,
    a: pt.j4 || 0,
    b: pt.j5 || 0,
    c: pt.j6 || 0,
  };
}

export function parol6CartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint {
  const j1 = Math.atan2(y, x) * (180 / Math.PI);
  const targetRadius = Math.sqrt(x * x + y * y) / 1000;
  const targetHeight = (z + Z_OFFSET_MM) / 1000;
  const { j2, j3 } = solveJ2J3(targetRadius, targetHeight);
  return {
    j1: clamp(j1, PAROL6_JOINT_LIMITS_DEG.j1[0], PAROL6_JOINT_LIMITS_DEG.j1[1]),
    j2,
    j3,
    j4: clamp(a || 0, PAROL6_JOINT_LIMITS_DEG.j4[0], PAROL6_JOINT_LIMITS_DEG.j4[1]),
    j5: clamp(b || 0, PAROL6_JOINT_LIMITS_DEG.j5[0], PAROL6_JOINT_LIMITS_DEG.j5[1]),
    j6: clamp(c || 0, PAROL6_JOINT_LIMITS_DEG.j6[0], PAROL6_JOINT_LIMITS_DEG.j6[1]),
  };
}

// Sensible, reachable default pose used when a Parol6 robot is reset/homed - analogous to the
// generic j1:0,j2:-45,j3:45 reset pose (see RobotDetail.tsx), but within Parol6's real limits.
export const PAROL6_HOME_POSE: KinematicsPoint = { j1: 0, j2: -25, j3: 20, j4: 0, j5: 0, j6: 0 };
