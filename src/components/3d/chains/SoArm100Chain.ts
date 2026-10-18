// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the SoArm100 arm: SoArm100Chain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of SoArm100Arm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const SOARM100_CHAIN: JointDef[] = [
  { pos: [0, -0.0452, 0.0165], rpy: [1.57079, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0.1025, 0.0306], rpy: [-1.8, 0, 0], axis: [1, 0, 0] },
  { pos: [0, 0.11257, 0.028], rpy: [1.57079, 0, 0], axis: [1, 0, 0] },
  { pos: [0, 0.0052, 0.1349], rpy: [-1, 0, 0], axis: [1, 0, 0] },
  { pos: [0, -0.0601, 0], rpy: [0, 1.57079, 0], axis: [0, 1, 0] },
];

export const SOARM100_ROOT_QUAT = (() => {
  const j1 = SOARM100_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const SOARM100_BASE_OFFSET: [number, number, number] = [0, 0, 0];
