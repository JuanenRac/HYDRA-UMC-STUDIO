// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the Faze4 arm: Faze4Chain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of Faze4Arm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const FAZE4_CHAIN: JointDef[] = [
  { pos: [0.075629, -0.21266, 0.050734], rpy: [-1.5708, 0, -1.5708], axis: [0, -1, 0] },
  { pos: [0, -0.20182, 0], rpy: [0, 0, -1.8111], axis: [0, 0, 1] },
  { pos: [0.32, 0, 0], rpy: [3.1416, 0, -1.1753], axis: [0, 0, -1] },
  { pos: [0, -0.0735, 0], rpy: [-0.5648, -0.78173, 1.7809], axis: [0.14804, 0.90477, 0.39934] },
  { pos: [0.037114, 0.22683, 0.10011], rpy: [2.2965, -0.74045, -0.57161], axis: [-1, 0, 0] },
  { pos: [0, 0, -0.042312], rpy: [-3.1416, 0, 0.2419], axis: [0, 0, 1] },
];

// Root correction, computed once: rotate joint 1's own world-frame axis onto three.js Y (up).
// ROS rpy composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - three.js 'ZYX' order, not 'XYZ' (see
// jointQuaternion's own comment below for the full explanation and how this was found).
export const FAZE4_ROOT_QUAT = (() => {
  const j1 = FAZE4_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
})();

// base_link's own centering/lift offset (X,Y,Z), applied AFTER the root rotation above -
// computed from base_link.STL's own real bounding box, see this file's header comment.
// Re-derived after the rpy Euler order fix below (J1's own rpy is a 2-axis rotation, so
// FAZE4_ROOT_QUAT itself changed, not just the mesh centering).
export const FAZE4_BASE_OFFSET: [number, number, number] = [-0.0756, -0.0157, -0.1697];
