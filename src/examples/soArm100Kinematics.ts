// =============================================================================
// HYDRA-UMC STUDIO - SO-ARM100-specific kinematics: soArm100Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from TheRobotStudio's own official
// Simulation/SO100/so100.urdf (github.com/TheRobotStudio/SO-ARM100,
// Apache-2.0 - see public/models/so100/ATTRIBUTION.txt).
//
// IMPORTANT: this robot only has 5 real arm joints (shoulder_pan,
// shoulder_lift, elbow_flex, wrist_flex, wrist_roll) - its 6th URDF
// joint is the gripper jaw, not a wrist orientation axis, so j6 is left
// unused here (see ATTRIBUTION.txt for why it isn't repurposed). Each
// joint's own axis is arbitrary (not always Z), so this uses the same
// quaternion-based approach as Faze4Arm.tsx/EdoArm.tsx, just with 5
// links in the chain instead of 6.
// =============================================================================

import { Matrix4, Quaternion, Vector3, Euler } from 'three';
import type { KinematicsPoint } from './utils';
import { SOARM100_CHAIN, SOARM100_ROOT_QUAT } from '../components/3d/SoArm100Arm';

const DEG = Math.PI / 180;

function jointMatrix(pos: [number, number, number], rpy: [number, number, number], axis: [number, number, number], angleDeg: number): Matrix4 {
  const t = new Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
  const reorient = new Quaternion().setFromEuler(new Euler(rpy[0], rpy[1], rpy[2], 'ZYX'));
  const axisVec = new Vector3(axis[0], axis[1], axis[2]).normalize();
  const spin = new Quaternion().setFromAxisAngle(axisVec, angleDeg * DEG);
  const q = reorient.multiply(spin);
  return t.multiply(new Matrix4().makeRotationFromQuaternion(q));
}

const ROOT_M = new Matrix4().makeRotationFromQuaternion(SOARM100_ROOT_QUAT);

function fkPosition(j1: number, j2: number, j3: number): Vector3 {
  let m = ROOT_M.clone();
  // Only 5 real joints - j4 (wrist_flex)/j5 (wrist_roll) held at 0 for the
  // position-only solve below, same reasoning as every other quat-family
  // robot's own fkPosition (position only depends on j1/j2/j3 here too).
  const joints = [j1, j2, j3, 0, 0];
  for (let i = 0; i < 5; i++) {
    const c = SOARM100_CHAIN[i];
    m = m.multiply(jointMatrix(c.pos, c.rpy, c.axis, joints[i]));
  }
  const out = new Vector3();
  out.setFromMatrixPosition(m);
  return out;
}

function solveOnce(xt: number, yt: number, zt: number, g1: number, g2: number, g3: number) {
  let j1 = g1, j2 = g2, j3 = g3;
  const h = 0.001;
  for (let iter = 0; iter < 200; iter++) {
    const p = fkPosition(j1, j2, j3);
    const fx = p.x - xt, fy = p.y - yt, fz = p.z - zt;
    const err = Math.hypot(fx, fy, fz);
    if (err < 1e-8) break;

    const p1 = fkPosition(j1 + h, j2, j3), p2 = fkPosition(j1, j2 + h, j3), p3 = fkPosition(j1, j2, j3 + h);
    const J = [
      [(p1.x - p.x) / h, (p2.x - p.x) / h, (p3.x - p.x) / h],
      [(p1.y - p.y) / h, (p2.y - p.y) / h, (p3.y - p.y) / h],
      [(p1.z - p.z) / h, (p2.z - p.z) / h, (p3.z - p.z) / h],
    ];
    const det = J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1])
              - J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0])
              + J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);
    if (Math.abs(det) < 1e-9) break;

    const repCol = (col: number, b: number[]) => {
      const R = J.map(row => row.slice());
      for (let r = 0; r < 3; r++) R[r][col] = b[r];
      return R;
    };
    const det3 = (M: number[][]) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    const b = [fx, fy, fz];
    const dj1 = det3(repCol(0, b)) / det;
    const dj2 = det3(repCol(1, b)) / det;
    const dj3 = det3(repCol(2, b)) / det;

    const stepNorm = Math.hypot(dj1, dj2, dj3);
    const damp = stepNorm > 20 ? 20 / stepNorm : 1;
    j1 -= dj1 * damp;
    j2 -= dj2 * damp;
    j3 -= dj3 * damp;
  }
  const p = fkPosition(j1, j2, j3);
  return { j1, j2, j3, err: Math.hypot(p.x - xt, p.y - yt, p.z - zt) };
}

const SEEDS: [number, number, number][] = (() => {
  const list: [number, number, number][] = [];
  for (let s1 = -180; s1 < 180; s1 += 30) {
    for (const [s2, s3] of [[0, 0], [-40, 30], [40, -30], [-30, -50], [30, 50], [-60, 60], [60, -60]] as [number, number][]) {
      list.push([s1, s2, s3]);
    }
  }
  return list;
})();

function solveJ1J2J3(xt: number, yt: number, zt: number): { j1: number; j2: number; j3: number } {
  let best = { j1: 0, j2: 0, j3: 0, err: Infinity };
  for (const [g1, g2, g3] of SEEDS) {
    const r = solveOnce(xt, yt, zt, g1, g2, g3);
    if (r.err < best.err) best = r;
    if (best.err < 1e-6) break;
  }
  return { j1: best.j1, j2: best.j2, j3: best.j3 };
}

const Z_OFFSET_MM = (() => {
  const p = fkPosition(0, 0, 0);
  return p.y * 1000;
})();

export function soArm100JointsToCartesian(pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number } {
  const p = fkPosition(pt.j1 || 0, pt.j2 || 0, pt.j3 || 0);
  return {
    x: p.x * 1000,
    y: p.z * 1000,
    z: p.y * 1000 - Z_OFFSET_MM,
    a: pt.j4 || 0,
    b: pt.j5 || 0,
    c: pt.j6 || 0,
  };
}

export function soArm100CartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint {
  const { j1, j2, j3 } = solveJ1J2J3(x / 1000, (z + Z_OFFSET_MM) / 1000, y / 1000);
  return { j1, j2, j3, j4: a || 0, j5: b || 0, j6: c || 0 };
}

export const SOARM100_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };
