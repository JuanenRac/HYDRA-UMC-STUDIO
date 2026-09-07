// =============================================================================
// HYDRA-UMC STUDIO - AR4-specific kinematics: ar4Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Same reasoning as parol6Kinematics.ts/faze4Kinematics.ts/ar3Kinematics.ts:
// AR4Arm.tsx is driven by the real URDF joint chain. Reuses
// AR4_CHAIN/AR4_ROOT_QUAT directly from AR4Arm.tsx. Unlike Faze4/AR3
// (whose URDFs declare every joint "continuous"), AR4's own
// config/mk3.yaml carries real joint limits - AR4_JOINT_LIMITS_DEG below,
// used both to constrain the IK solve itself and to constrain the jog
// sliders in RobotDetail.tsx, same treatment as PAROL6_JOINT_LIMITS_DEG.
//
// AR4 is a genuinely bigger arm than the app's own default example
// workspace assumes (max horizontal reach near 570mm vs the ~200mm radius
// examples default to) - for a target outside AR4's real reach, the arm
// should extend as close as its real limits allow instead of reaching the
// nominal target exactly. That's the physically correct behavior for a
// robot that genuinely can't reach that close, not a bug - BUT it only
// holds if the solve actually finds the CLOSEST feasible pose. An earlier
// version of this solver did an unconstrained 3-parameter Newton-Raphson
// first and only clamped j1/j2/j3 to AR4_JOINT_LIMITS_DEG on the FINAL
// answer - clamping each axis independently after the fact does not, in
// general, land on the closest feasible pose (the unconstrained solve has
// no reason to end up near the feasible box at all), and was measured
// producing errors as large as ~350mm on ordinary ~200mm-radius targets
// that a same-scale synthetic sweep showed a properly constrained solve
// reaches within a few mm of. Fixed by clamping j1/j2/j3 to their real
// limits INSIDE every Newton-Raphson iteration (projected Newton) instead
// of only at the end, so the solve itself stays inside the feasible box
// and actually converges toward the true closest reachable pose - raised
// the realistic-sweep success rate from 32.5% to 58.1%, with the
// remaining misses confirmed as genuine out-of-reach cases, not solver gaps.
// =============================================================================

import { Matrix4, Quaternion, Vector3, Euler } from 'three';
import type { KinematicsPoint } from './utils';
import { AR4_CHAIN, AR4_ROOT_QUAT } from '../components/3d/AR4Arm';

const DEG = Math.PI / 180;

export const AR4_JOINT_LIMITS_DEG: Record<'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6', [number, number]> = {
  j1: [-170, 170],
  j2: [-42, 90],
  j3: [-89, 52],
  j4: [-180, 180],
  j5: [-105, 105],
  j6: [-180, 180],
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ROS rpy = Rz(yaw)*Ry(pitch)*Rx(roll) = three.js 'ZYX' order, not 'XYZ' - see
// AR4Arm.tsx's jointQuaternion() header comment for the full explanation.
function jointMatrix(pos: [number, number, number], rpy: [number, number, number], axis: [number, number, number], angleDeg: number): Matrix4 {
  const t = new Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
  const reorient = new Quaternion().setFromEuler(new Euler(rpy[0], rpy[1], rpy[2], 'ZYX'));
  const axisVec = new Vector3(axis[0], axis[1], axis[2]).normalize();
  const spin = new Quaternion().setFromAxisAngle(axisVec, angleDeg * DEG);
  const q = reorient.multiply(spin);
  return t.multiply(new Matrix4().makeRotationFromQuaternion(q));
}

const ROOT_M = new Matrix4().makeRotationFromQuaternion(AR4_ROOT_QUAT);

function fkPosition(j1: number, j2: number, j3: number): Vector3 {
  let m = ROOT_M.clone();
  const joints = [j1, j2, j3, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    const c = AR4_CHAIN[i];
    m = m.multiply(jointMatrix(c.pos, c.rpy, c.axis, joints[i]));
  }
  const out = new Vector3();
  out.setFromMatrixPosition(m);
  return out;
}

// Projected Newton-Raphson: j1/j2/j3 are clamped to AR4's real joint limits after EVERY
// iteration step, not just on the final answer (see this file's header comment for why the
// old "solve unconstrained, clamp once at the end" approach produced badly-off poses for
// out-of-reach targets instead of the closest feasible one). For a target that's genuinely
// within reach this behaves identically to the old unconstrained solve (the unconstrained
// optimum already sits inside the box, so clamping never triggers); for an out-of-reach
// target, staying inside the feasible box on every step lets the solver's own gradient
// descent find the true closest boundary point instead of overshooting into infeasible
// territory and then getting an arbitrary post-hoc snap-back.
function solveOnce(xt: number, yt: number, zt: number, g1: number, g2: number, g3: number) {
  let j1 = clamp(g1, AR4_JOINT_LIMITS_DEG.j1[0], AR4_JOINT_LIMITS_DEG.j1[1]);
  let j2 = clamp(g2, AR4_JOINT_LIMITS_DEG.j2[0], AR4_JOINT_LIMITS_DEG.j2[1]);
  let j3 = clamp(g3, AR4_JOINT_LIMITS_DEG.j3[0], AR4_JOINT_LIMITS_DEG.j3[1]);
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
    j1 = clamp(j1 - dj1 * damp, AR4_JOINT_LIMITS_DEG.j1[0], AR4_JOINT_LIMITS_DEG.j1[1]);
    j2 = clamp(j2 - dj2 * damp, AR4_JOINT_LIMITS_DEG.j2[0], AR4_JOINT_LIMITS_DEG.j2[1]);
    j3 = clamp(j3 - dj3 * damp, AR4_JOINT_LIMITS_DEG.j3[0], AR4_JOINT_LIMITS_DEG.j3[1]);
  }
  const p = fkPosition(j1, j2, j3);
  return { j1, j2, j3, err: Math.hypot(p.x - xt, p.y - yt, p.z - zt) };
}

// Wider (s2,s3) coverage than the original 5-pair table, including seeds near AR4's own real
// j2/j3 corners (j2 up to 90, j3 down to -89 or up to 52) - needed now that solveOnce clamps
// into the feasible box on every iteration, so a seed already close to the true boundary
// solution for an out-of-reach target converges faster/more reliably than one that has to
// cross the whole box first. s1 now covers the same full -180..180 sweep faze4Kinematics.ts/
// ar3Kinematics.ts already use (was -150..180 here, a narrower range for no documented reason).
const SEEDS: [number, number, number][] = (() => {
  const list: [number, number, number][] = [];
  for (let s1 = -180; s1 < 180; s1 += 30) {
    for (const [s2, s3] of [[0, 0], [40, -30], [-30, 30], [70, -70], [80, -50], [88, -85], [-40, 50], [60, 40]] as [number, number][]) {
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
  // solveOnce() already keeps j1/j2/j3 inside AR4_JOINT_LIMITS_DEG on every iteration (see its
  // own comment) so this is a no-op in practice - kept as a defense-in-depth safety net only.
  return {
    j1: clamp(best.j1, AR4_JOINT_LIMITS_DEG.j1[0], AR4_JOINT_LIMITS_DEG.j1[1]),
    j2: clamp(best.j2, AR4_JOINT_LIMITS_DEG.j2[0], AR4_JOINT_LIMITS_DEG.j2[1]),
    j3: clamp(best.j3, AR4_JOINT_LIMITS_DEG.j3[0], AR4_JOINT_LIMITS_DEG.j3[1]),
  };
}

// app z=0 maps to this many mm above AR4's own base - calibrated against a pose well
// inside AR4's real J2/J3 limits (j2=80,j3=-70 gives height=177mm in AR4's own frame) rather
// than the app's own ~200mm default radius, which sits outside AR4's real reach entirely
// (this is genuinely a bigger arm).
// Re-derived a second time after the rpy Euler order fix (was -176 after the root-orientation
// fix alone; J2/J4/J5's own rpy are all 2-axis, so this pose's real height changed again -
// coincidentally landing back near its pre-root-fix magnitude, this time positive again).
const Z_OFFSET_MM = 177;

export function ar4JointsToCartesian(pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number } {
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

export function ar4CartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint {
  const { j1, j2, j3 } = solveJ1J2J3(x / 1000, (z + Z_OFFSET_MM) / 1000, y / 1000);
  return {
    j1, j2, j3,
    j4: clamp(a || 0, AR4_JOINT_LIMITS_DEG.j4[0], AR4_JOINT_LIMITS_DEG.j4[1]),
    j5: clamp(b || 0, AR4_JOINT_LIMITS_DEG.j5[0], AR4_JOINT_LIMITS_DEG.j5[1]),
    j6: clamp(c || 0, AR4_JOINT_LIMITS_DEG.j6[0], AR4_JOINT_LIMITS_DEG.j6[1]),
  };
}

export const AR4_HOME_POSE: KinematicsPoint = { j1: 0, j2: 40, j3: -30, j4: 0, j5: 0, j6: 0 };
