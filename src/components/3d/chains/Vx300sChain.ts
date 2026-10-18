// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the Vx300s arm: Vx300sChain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of Vx300sArm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}
export interface MeshOffset {
  pos: [number, number, number];
  rpy: [number, number, number];
}

export const VX300S_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.079], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.04805], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.05955, 0, 0.3], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.2, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
  { pos: [0.1, 0, 0], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0.069744, 0, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

// base, shoulder, upper_arm, upper_forearm, lower_forearm, wrist, gripper - 7 entries.
export const VX300S_MESH_OFFSETS: MeshOffset[] = [
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, -0.003], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [0, 0, 0], rpy: [0, 0, 0] },
  { pos: [0, 0, 0], rpy: [Math.PI, 0, 0] },
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI / 2] },
  { pos: [-0.02, 0, 0], rpy: [0, 0, Math.PI / 2] },
];

export const VX300S_ROOT_QUAT = (() => {
  const j1 = VX300S_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

export const VX300S_BASE_OFFSET: [number, number, number] = [0, 0, 0];
