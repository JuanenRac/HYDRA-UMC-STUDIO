// =============================================================================
// HYDRA-UMC STUDIO - UR20-specific kinematics: ur20Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets and joint limits copied verbatim from Universal Robots' own
// official config/ur20/default_kinematics.yaml and joint_limits.yaml
// (github.com/UniversalRobots/Universal_Robots_ROS2_Description,
// BSD-3-Clause - see public/models/ur20/ATTRIBUTION.txt). See
// urKinematicsShared.ts's own header for why the FK/IK engine is shared
// across every UR model instead of duplicated per model.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

// mesh_offset per link, from this model's own visual_parameters.yaml -
// re-centers each STL relative to that link's own joint-chain origin.
// Order: base, shoulder, upper_arm, forearm, wrist_1, wrist_2, wrist_3.
export const UR20_MESH_OFFSETS: UrMeshOffsets = [
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // base
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // shoulder
  { pos: [0, 0, 0.260], rpy: [Math.PI / 2, 0, -Math.PI / 2] },       // upper_arm
  { pos: [0, 0, 0.043], rpy: [Math.PI / 2, 0, -Math.PI / 2] },       // forearm
  { pos: [0, 0, -0.0775], rpy: [Math.PI / 2, 0, 0] },                // wrist_1
  { pos: [0, 0, -0.0749], rpy: [0, 0, 0] },                          // wrist_2
  { pos: [0, 0, -0.07], rpy: [Math.PI / 2, 0, 0] },                  // wrist_3
];

export const UR20_CHAIN: UrChain = [
  { pos: [0, 0, 0.2363], rpy: [0, 0, 0] },                        // shoulder_pan_joint
  { pos: [0, 0, 0], rpy: [1.570796327, 0, 0] },                   // shoulder_lift_joint
  { pos: [-0.862, 0, 0], rpy: [0, 0, 0] },                        // elbow_joint
  { pos: [-0.7287, 0, 0.201], rpy: [0, 0, 0] },                   // wrist_1_joint
  { pos: [0, -0.1593, 0], rpy: [1.570796327, 0, 0] },             // wrist_2_joint
  { pos: [0, 0.1543, 0], rpy: [1.5707963265897931, 3.1415926535897931, 3.1415926535897931] }, // wrist_3_joint
];

// wrist_3_joint has has_position_limits: false (continuous) in this
// model's own joint_limits.yaml, same as every other UR e-Series model -
// kept at the app's generic +/-180 fallback for a continuous joint (see
// ur3eKinematics.ts's own comment, and faze4Kinematics.ts's - the
// established convention across this app), not an arbitrary +/-360.
export const UR20_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-360, 360],
  j3: [-180, 180],
  j4: [-360, 360],
  j5: [-360, 360],
  j6: [-180, 180],
};

export const UR20_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrKinematics(UR20_CHAIN, UR20_JOINT_LIMITS_DEG, UR20_HOME_POSE);

export const ur20JointsToCartesian = engine.jointsToCartesian;
export const ur20CartesianToJoints = engine.cartesianToJoints;
