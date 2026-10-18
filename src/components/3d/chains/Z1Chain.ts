// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the Z1 arm: Z1Chain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of Z1Arm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const Z1_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.0585], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.045], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.35, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.218, 0, 0.057], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.07, 0, 0], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0.0492, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

export const Z1_ROOT_QUAT = (() => {
  const j1 = Z1_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const Z1_BASE_OFFSET: [number, number, number] = [0, 0, 0];
