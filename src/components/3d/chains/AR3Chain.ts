// =============================================================================
// HYDRA-UMC STUDIO - joint chain of the AR3 arm: AR3Chain.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Data of AR3Arm.tsx (joint origins, root rotation, base offset), kept apart from the component so that the
// kinematics modules can use it without importing a React component.
// =============================================================================
import * as THREE from 'three';
export interface JointDef {
  pos: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
}

export const AR3_CHAIN: JointDef[] = [
  { pos: [0, 0, 0.003445], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.064146, -0.16608], rpy: [1.5708, 0.5236, -1.5708], axis: [0, 0, -1] },
  { pos: [0.1525, -0.26414, 0], rpy: [0, 0, -1.4953816339], axis: [0, 0, -1] },
  { pos: [0, 0, 0.00675], rpy: [1.5708, -1.2554, -1.5708], axis: [0, 0, -1] },
  { pos: [0, 0, -0.22225], rpy: [3.1416, 0, -2.8262], axis: [-1, 0, 0] },
  { pos: [-0.000294, 0, 0.02117], rpy: [0, 0, 3.1416], axis: [0, 0, 1] },
];

// ROS URDF <origin rpy="r p y"/> composes as R = Rz(yaw)*Ry(pitch)*Rx(roll) - three.js's
// intrinsic 'ZYX' Euler order, NOT the default 'XYZ'. J1's own rpy here is single-axis (roll
// only), so AR3_ROOT_QUAT itself is unaffected by this - but J2, J4 and J5 below are all
// genuinely 2-axis, and using 'XYZ' for those produced completely wrong per-joint transforms
// (verified numerically against Parol6's own J3/J4, maxDiff=2 i.e. not even close), which is
// what made the assembled links not connect properly - not a data transcription or sign bug,
// an Euler composition order bug.
export const AR3_ROOT_QUAT = (() => {
  const j1 = AR3_CHAIN[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'ZYX');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, -1, 0));
})();

// base_link's own centering offset (X,Y,Z), applied AFTER the root rotation above -
// computed from base_link.STL's own real bounding box, see this file's header comment.
// Unaffected by the Euler order fix (J1's own rpy is single-axis, so ROOT_QUAT - and
// therefore base_link's own transform - didn't change).
export const AR3_BASE_OFFSET: [number, number, number] = [0, 0, 0.0477];
