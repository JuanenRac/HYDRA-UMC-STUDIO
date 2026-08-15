// =============================================================================
// HYDRA-UMC STUDIO - AgileX PiPER-specific kinematics: piperKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from renesas-rdk/agilex_piper_arm_description's
// own urdf/reference/agilex_piper_arm_ref.urdf (Apache-2.0 - see
// public/models/piper/ATTRIBUTION.txt). Every PiPER joint's own <axis>
// is "0 0 1" - the same shared-Z-axis structure the UR family uses, so
// this reuses urKinematicsShared.ts's own engine.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

const IDENTITY_OFFSET = { pos: [0, 0, 0] as [number, number, number], rpy: [0, 0, 0] as [number, number, number] };

export const PIPER_MESH_OFFSETS: UrMeshOffsets = [
  IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET,
];

export const PIPER_CHAIN: UrChain = [
  { pos: [0, 0, 0.123], rpy: [0, 0, 0] },
  { pos: [0, 0, 0], rpy: [1.5708, -0.1359, -3.1416] },
  { pos: [0.28503, 0, 0], rpy: [0, 0, -1.7939] },
  { pos: [-0.021984, -0.25075, 0], rpy: [1.5708, 0, 0] },
  { pos: [0, 0, 0], rpy: [-1.5708, 0, 0] },
  { pos: [8.8259e-05, -0.091, 0], rpy: [1.5708, 0, 0] },
];

// From the source URDF's own <limit lower upper> (radians -> degrees).
export const PIPER_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-150, 150],
  j2: [0, 180],
  j3: [-170, 0],
  j4: [-100, 100],
  j5: [-70, 70],
  j6: [-120, 120],
};

export const PIPER_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

const engine = createUrKinematics(PIPER_CHAIN, PIPER_JOINT_LIMITS_DEG, PIPER_HOME_POSE);

export const piperJointsToCartesian = engine.jointsToCartesian;
export const piperCartesianToJoints = engine.cartesianToJoints;
