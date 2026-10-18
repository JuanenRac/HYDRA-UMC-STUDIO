// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the AR4 arm: AR4Chain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of AR4Arm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const AR4_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.092], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.06415, -0.07778], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
  { pos: [0, -0.305, 0], rpy: [0, 0, 3.1416], axis: [0, 0, -1] },
  { pos: [0, 0, 0], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
  { pos: [0, 0, -0.22294], rpy: [3.1416, 0, -1.5708], axis: [1, 0, 0] },
  { pos: [0, 0, 0.041], rpy: [0, 0, 0], axis: [0, 0, 1] },
];

// ROS URDF <origin rpy="r p y"/> composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - three.js's
// intrinsic 'ZYX' Euler order, NOT the default 'XYZ'. J1's own rpy here is single-axis (roll
// only), so AR4_ROOT_QUAT itself is unaffected by this - but J2, J4 and J5 below are all
// genuinely 2-axis, and using 'XYZ' for those produced completely wrong per-joint transforms
// (verified numerically against Parol6's own J3/J4, maxDiff=2 i.e. not even close), which is
// what made the assembled links not connect properly - not a data transcription or sign bug,
// an Euler composition order bug.
export const AR4_ROOT_QUAT = (() => {
  const j1 = AR4_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, -1, 0));
})();

// base_link's own centering offset (X,Y,Z), applied AFTER the root rotation above -
// computed from base_link.STL's own real bounding box, see this file's header comment.
// Unaffected by the Euler order fix (J1's own rpy is single-axis, so ROOT_QUAT - and
// therefore base_link's own transform - didn't change).
export const AR4_BASE_OFFSET: [number, number, number] = [0, 0, 0.0477];
