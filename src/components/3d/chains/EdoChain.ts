// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the Edo arm: EdoChain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of EdoArm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const EDO_CHAIN: JointDef[] = [
  { pos: [0.057188, 0.0059831, 0.13343], rpy: [1.5708, 6.9389e-16, -3.1416], axis: [0, 1, 0] },
  { pos: [0, 0.18967, 0], rpy: [0.94237, -0.4634, -0.11653], axis: [-0.88847, 0.2908, 0.35504] },
  { pos: [-0.024558, 0.12737, -0.16578], rpy: [0.97336, -0.36296, 2.8253], axis: [1, 0, 0] },
  { pos: [0.0088, -0.1588, 0], rpy: [-1.5708, 0, 0], axis: [0, 0, -1] },
  { pos: [0, 0, -0.1053], rpy: [3.1416, 1.1102e-14, 3.1416], axis: [-1, 0, 0] },
  { pos: [-0.0039, 0, 0.1636], rpy: [-1.5708, 1.249e-14, 0], axis: [0, -1, 0] },
];

export const EDO_ROOT_QUAT = (() => {
  const j1 = EDO_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const EDO_BASE_OFFSET: [number, number, number] = [0, 0, 0];
