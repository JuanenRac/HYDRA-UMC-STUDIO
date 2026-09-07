// =============================================================================
// HYDRA-UMC STUDIO - xArm6-specific kinematics: xarm6Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from UFACTORY's own official
// xarm_description/urdf/xarm6/xarm6.urdf.xacro
// (github.com/xArm-Developer/xarm_ros2, BSD-3-Clause - see
// public/models/xarm6/ATTRIBUTION.txt). Every xArm6 joint's own <axis> is
// "0 0 1" - the same "rotates about local Z once its own <origin rpy> is
// applied" structure the UR family shares, so this reuses
// urKinematicsShared.ts's own engine rather than a bespoke one.
//
// Unlike UR's own official package, xArm6's <visual><origin> is (0,0,0)/
// (0,0,0) for every link - the STL meshes are already authored aligned to
// their own joint-chain frame, so UR3E_MESH_OFFSETS's kind of per-link
// re-centering isn't needed here; XARM6_MESH_OFFSETS below is all-identity.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

const IDENTITY_OFFSET = { pos: [0, 0, 0] as [number, number, number], rpy: [0, 0, 0] as [number, number, number] };

export const XARM6_MESH_OFFSETS: UrMeshOffsets = [
  IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET,
];

export const XARM6_CHAIN: UrChain = [
  { pos: [0, 0, 0.267], rpy: [0, 0, 0] },           // joint1
  { pos: [0, 0, 0], rpy: [-1.5708, 0, 0] },         // joint2
  { pos: [0.0535, -0.2845, 0], rpy: [0, 0, 0] },    // joint3
  { pos: [0.0775, 0.3425, 0], rpy: [-1.5708, 0, 0] }, // joint4
  { pos: [0, 0, 0], rpy: [1.5708, 0, 0] },          // joint5
  { pos: [0.076, 0.097, 0], rpy: [-1.5708, 0, 0] }, // joint6
];

// From the xacro's own default limits (joint3 in particular is asymmetric:
// -3.927..0.19198 rad).
export const XARM6_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-118, 120],
  j3: [-225, 11],
  j4: [-360, 360],
  j5: [-97, 180],
  j6: [-360, 360],
};

// A reasonable non-self-colliding "ready" pose - UFACTORY's own xArm
// Studio default is all-zero, which is a valid straight-up pose for this
// robot's own geometry (unlike UR, where all-zero is a folded/colliding
// pose), so all-zero is used as-is rather than inventing a bent pose.
export const XARM6_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

const engine = createUrKinematics(XARM6_CHAIN, XARM6_JOINT_LIMITS_DEG, XARM6_HOME_POSE);

export const xarm6JointsToCartesian = engine.jointsToCartesian;
export const xarm6CartesianToJoints = engine.cartesianToJoints;
