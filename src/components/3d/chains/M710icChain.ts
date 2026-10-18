// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the M710ic arm: M710icChain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of M710icArm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const M710IC_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.565], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0.150, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0, 0.870], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [0, 0, 0.170], rpy: [0, 0, 0], axis: [-1, 0, 0] },
  { pos: [1.016, 0, 0], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [0.175, 0, 0], rpy: [0, 0, 0], axis: [-1, 0, 0] },
];

export const M710IC_ROOT_QUAT = (() => {
  const j1 = M710IC_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const M710IC_BASE_OFFSET: [number, number, number] = [0, 0, 0];
