// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the Koch arm: KochChain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of KochArm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const KOCH_CHAIN: JointDef[] = [
  { pos: [0.012, 0, 0.0409], rpy: [0, 0, 0], axis: [0, 0, -1] },
  { pos: [0, -0.0209, 0.0154], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.0148, 0.0065, 0.1083], rpy: [0, 0, 0], axis: [0, -1, 0] },
  { pos: [-0.10048, 5e-05, 0.0026999], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [-0.045, 0.013097, 0], rpy: [0, 0, 0], axis: [1, 0, 0] },
];

// Root correction: joint 1's own world-frame axis (after its rpy) works out to plain world
// -Z, same situation as AR3/AR4 (see AR3Arm.tsx's own header for the general explanation).
// Aligning that to three.js +Y built the whole chain BELOW y=0 (confirmed against the real
// STL files: with target (0,1,0) every link's own assembled bounding box sits in
// [-0.182, ~0] on Y - entirely non-positive, i.e. upside-down/underground) - aligning to -Y
// instead (root effectively rotates the opposite way) builds every link at positive Y
// ([0, 0.182]) as expected, same fix already applied to AR3_ROOT_QUAT/AR4_ROOT_QUAT.
export const KOCH_ROOT_QUAT = (() => {
  const j1 = KOCH_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, -1, 0));
})();

export const KOCH_BASE_OFFSET: [number, number, number] = [0, 0, 0];
