// =============================================================================
// HYDRA-UMC STUDIO - Universal Robots classic (pre-e-Series) shared
// kinematics engine: urClassicKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// UR3/UR5/UR10 classic all share the exact same real DH-parameter-based
// URDF structure (ros-industrial/universal_robot, BSD-3-Clause - see
// public/models/ur{3,5,10}classic/ATTRIBUTION.txt) - only the numeric
// chain differs per model, same "one engine, parameterized" reasoning
// urKinematicsShared.ts already uses for the e-Series. UNLIKE the
// e-Series, though, this classic generation's own joints do NOT all
// rotate about local Z (shoulder_pan/wrist_2 do, but shoulder_lift/
// elbow/wrist_1/wrist_3 rotate about Y instead) - so this is a
// "quaternion family" engine (arbitrary per-joint axis, position +
// quaternion) like Faze4Kinematics.ts/m710icKinematics.ts, just shared
// across 3 models instead of hand-duplicated, since the structure really
// is identical here (same reasoning urKinematicsShared.ts's own header
// gives for the e-Series).
// =============================================================================

import { Matrix4, Quaternion, Vector3, Euler } from 'three';
import type { KinematicsPoint } from './utils';

const DEG = Math.PI / 180;

export interface UrClassicJointStep {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export type UrClassicChain = [UrClassicJointStep, UrClassicJointStep, UrClassicJointStep, UrClassicJointStep, UrClassicJointStep, UrClassicJointStep];

function jointMatrix(pos: [number, number, number], rpy: [number, number, number], axis: [number, number, number], angleDeg: number): Matrix4 {
  const t = new Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
  const reorient = new Quaternion().setFromEuler(new Euler(rpy[0], rpy[1], rpy[2], 'ZYX'));
  const axisVec = new Vector3(axis[0], axis[1], axis[2]).normalize();
  const spin = new Quaternion().setFromAxisAngle(axisVec, angleDeg * DEG);
  const q = reorient.multiply(spin);
  return t.multiply(new Matrix4().makeRotationFromQuaternion(q));
}

function computeRootQuat(chain: UrClassicChain): Quaternion {
  const j1 = chain[0];
  const e = new Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new Vector3(...j1.axis).applyEuler(e).normalize();
  return new Quaternion().setFromUnitVectors(axisWorld, new Vector3(0, 1, 0));
}

function fkPosition(chain: UrClassicChain, rootM: Matrix4, j1: number, j2: number, j3: number): Vector3 {
  let m = rootM.clone();
  const joints = [j1, j2, j3, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    const c = chain[i];
    m = m.multiply(jointMatrix(c.pos, c.rpy, c.axis, joints[i]));
  }
  const out = new Vector3();
  out.setFromMatrixPosition(m);
  return out;
}

function solveOnce(chain: UrClassicChain, rootM: Matrix4, xt: number, yt: number, zt: number, g1: number, g2: number, g3: number) {
  let j1 = g1, j2 = g2, j3 = g3;
  const h = 0.001;
  for (let iter = 0; iter < 200; iter++) {
    const p = fkPosition(chain, rootM, j1, j2, j3);
    const fx = p.x - xt, fy = p.y - yt, fz = p.z - zt;
    const err = Math.hypot(fx, fy, fz);
    if (err < 1e-8) break;

    const p1 = fkPosition(chain, rootM, j1 + h, j2, j3), p2 = fkPosition(chain, rootM, j1, j2 + h, j3), p3 = fkPosition(chain, rootM, j1, j2, j3 + h);
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
  const p = fkPosition(chain, rootM, j1, j2, j3);
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

export interface UrClassicKinematics {
  jointsToCartesian(pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number };
  cartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint;
}

export function createUrClassicKinematics(chain: UrClassicChain): UrClassicKinematics {
  const rootM = new Matrix4().makeRotationFromQuaternion(computeRootQuat(chain));
  const zOffsetMm = fkPosition(chain, rootM, 0, 0, 0).y * 1000;

  function solveJ1J2J3(xt: number, yt: number, zt: number): { j1: number; j2: number; j3: number } {
    let best = { j1: 0, j2: 0, j3: 0, err: Infinity };
    for (const [g1, g2, g3] of SEEDS) {
      const r = solveOnce(chain, rootM, xt, yt, zt, g1, g2, g3);
      if (r.err < best.err) best = r;
      if (best.err < 1e-6) break;
    }
    return { j1: best.j1, j2: best.j2, j3: best.j3 };
  }

  return {
    jointsToCartesian(pt) {
      const p = fkPosition(chain, rootM, pt.j1 || 0, pt.j2 || 0, pt.j3 || 0);
      return {
        x: p.x * 1000,
        y: p.z * 1000,
        z: p.y * 1000 - zOffsetMm,
        a: pt.j4 || 0,
        b: pt.j5 || 0,
        c: pt.j6 || 0,
      };
    },
    cartesianToJoints(x, y, z, a, b, c) {
      const { j1, j2, j3 } = solveJ1J2J3(x / 1000, (z + zOffsetMm) / 1000, y / 1000);
      return { j1, j2, j3, j4: a || 0, j5: b || 0, j6: c || 0 };
    },
  };
}
