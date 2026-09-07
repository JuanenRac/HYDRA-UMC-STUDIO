// =============================================================================
// HYDRA-UMC STUDIO - UR10e-specific kinematics: ur10eKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets and joint limits copied verbatim from Universal Robots' own
// official config/ur10e/default_kinematics.yaml and joint_limits.yaml
// (github.com/UniversalRobots/Universal_Robots_ROS2_Description,
// BSD-3-Clause - see public/models/ur10e/ATTRIBUTION.txt). See
// urKinematicsShared.ts's own header for why the FK/IK engine is shared
// across every UR model instead of duplicated per model.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

// mesh_offset per link, from this model's own visual_parameters.yaml -
// re-centers each STL relative to that link's own joint-chain origin.
// Order: base, shoulder, upper_arm, forearm, wrist_1, wrist_2, wrist_3.
// UR16e reuses these same base/shoulder/wrist_1/wrist_2/wrist_3 offsets -
// see ur16eKinematics.ts's own comment.
export const UR10E_MESH_OFFSETS: UrMeshOffsets = [
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // base
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // shoulder
  { pos: [0, 0, 0.1762], rpy: [Math.PI / 2, 0, -Math.PI / 2] },      // upper_arm
  { pos: [0, 0, 0.0393], rpy: [Math.PI / 2, 0, -Math.PI / 2] },      // forearm
  { pos: [0, 0, -0.135], rpy: [Math.PI / 2, 0, 0] },                 // wrist_1
  { pos: [0, 0, -0.12], rpy: [0, 0, 0] },                            // wrist_2
  { pos: [0, -0.0005, -0.1168], rpy: [Math.PI / 2, 0, 0] },          // wrist_3
];

export const UR10E_CHAIN: UrChain = [
  { pos: [0, 0, 0.1807], rpy: [0, 0, 0] },                        // shoulder_pan_joint
  { pos: [0, 0, 0], rpy: [1.570796327, 0, 0] },                   // shoulder_lift_joint
  { pos: [-0.6127, 0, 0], rpy: [0, 0, 0] },                       // elbow_joint
  { pos: [-0.57155, 0, 0.17415], rpy: [0, 0, 0] },                // wrist_1_joint
  { pos: [0, -0.11985, 0], rpy: [1.570796327, 0, 0] },            // wrist_2_joint
  { pos: [0, 0.11655, 0], rpy: [1.570796326589793, 3.141592653589793, 3.141592653589793] }, // wrist_3_joint
];

// wrist_3_joint has has_position_limits: false (continuous) in this
// model's own joint_limits.yaml, same as every other UR e-Series model -
// kept at the app's generic +/-180 fallback for a continuous joint (see
// ur3eKinematics.ts's own comment, and faze4Kinematics.ts's - the
// established convention across this app), not an arbitrary +/-360.
export const UR10E_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-360, 360],
  j3: [-180, 180],
  j4: [-360, 360],
  j5: [-360, 360],
  j6: [-180, 180],
};

export const UR10E_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrKinematics(UR10E_CHAIN, UR10E_JOINT_LIMITS_DEG, UR10E_HOME_POSE);

export const ur10eJointsToCartesian = engine.jointsToCartesian;
export const ur10eCartesianToJoints = engine.cartesianToJoints;
