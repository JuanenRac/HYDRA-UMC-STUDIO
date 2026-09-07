// =============================================================================
// HYDRA-UMC STUDIO - Lite 6-specific kinematics: lite6Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from UFACTORY's own official
// xarm_description/urdf/lite6/lite6.urdf.xacro
// (github.com/xArm-Developer/xarm_ros2, BSD-3-Clause - see
// public/models/lite6/ATTRIBUTION.txt). Same "every joint's own <axis> is
// local Z" structure as xArm6/the UR family - see xarm6Kinematics.ts's own
// header for why this reuses urKinematicsShared.ts's engine. Same
// all-identity mesh offsets too (Lite 6's own STLs are already aligned to
// their joint-chain frame, like xArm6's).
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

const IDENTITY_OFFSET = { pos: [0, 0, 0] as [number, number, number], rpy: [0, 0, 0] as [number, number, number] };

export const LITE6_MESH_OFFSETS: UrMeshOffsets = [
  IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET,
];

export const LITE6_CHAIN: UrChain = [
  { pos: [0, 0, 0.2435], rpy: [0, 0, 0] },              // joint1
  { pos: [0, 0, 0], rpy: [1.5708, -1.5708, 3.1416] },   // joint2
  { pos: [0.2002, 0, 0], rpy: [-3.1416, 0, 1.5708] },   // joint3
  { pos: [0.087, -0.22761, 0], rpy: [1.5708, 0, 0] },   // joint4
  { pos: [0, 0, 0], rpy: [1.5708, 0, 0] },              // joint5
  { pos: [0, 0.0625, 0], rpy: [-1.5708, 0, 0] },        // joint6
];

// From the xacro's own default limits (joint3 asymmetric: -0.061087..5.235988 rad).
export const LITE6_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-150, 150],
  j3: [-3.5, 300],
  j4: [-360, 360],
  j5: [-124, 124],
  j6: [-360, 360],
};

// All-zero is a valid, non-colliding "ready" pose for this robot's own
// geometry - same reasoning as xArm6's own home pose.
export const LITE6_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

const engine = createUrKinematics(LITE6_CHAIN, LITE6_JOINT_LIMITS_DEG, LITE6_HOME_POSE);

export const lite6JointsToCartesian = engine.jointsToCartesian;
export const lite6CartesianToJoints = engine.cartesianToJoints;
