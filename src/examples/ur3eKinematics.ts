// =============================================================================
// HYDRA-UMC STUDIO - UR3e-specific kinematics: ur3eKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets and joint limits copied verbatim from Universal Robots' own
// official config/ur3e/default_kinematics.yaml and joint_limits.yaml
// (github.com/UniversalRobots/Universal_Robots_ROS2_Description,
// BSD-3-Clause - see public/models/ur3e/ATTRIBUTION.txt). The FK/IK engine
// itself is shared with every other UR model in this folder - see
// urKinematicsShared.ts's own header for why that's a legitimate
// abstraction here (identical kinematic structure, only these numbers
// differ) unlike Parol6/Faze4/AR3/AR4, which are genuinely different robots.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

// mesh_offset per link, from this model's own visual_parameters.yaml -
// re-centers each STL relative to that link's own joint-chain origin.
// Order: base, shoulder, upper_arm, forearm, wrist_1, wrist_2, wrist_3.
export const UR3E_MESH_OFFSETS: UrMeshOffsets = [
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // base
  { pos: [0, 0, 0], rpy: [0, 0, Math.PI] },                          // shoulder
  { pos: [0, 0, 0.120], rpy: [Math.PI / 2, 0, -Math.PI / 2] },       // upper_arm
  { pos: [0, 0, 0.027], rpy: [Math.PI / 2, 0, -Math.PI / 2] },       // forearm
  { pos: [0, 0, -0.104], rpy: [Math.PI / 2, 0, 0] },                 // wrist_1
  { pos: [0, 0, -0.08535], rpy: [0, 0, 0] },                         // wrist_2
  { pos: [0, 0, -0.0921], rpy: [Math.PI / 2, 0, 0] },                // wrist_3
];

export const UR3E_CHAIN: UrChain = [
  { pos: [0, 0, 0.15185], rpy: [0, 0, 0] },                       // shoulder_pan_joint
  { pos: [0, 0, 0], rpy: [1.570796327, 0, 0] },                   // shoulder_lift_joint
  { pos: [-0.24355, 0, 0], rpy: [0, 0, 0] },                      // elbow_joint
  { pos: [-0.2132, 0, 0.13105], rpy: [0, 0, 0] },                 // wrist_1_joint
  { pos: [0, -0.08535, 0], rpy: [1.570796327, 0, 0] },            // wrist_2_joint
  { pos: [0, 0.0921, 0], rpy: [1.570796326589793, 3.141592653589793, 3.141592653589793] }, // wrist_3_joint
];

// wrist_3_joint has has_position_limits: false (continuous) in this model's
// own joint_limits.yaml - kept at the app's generic +/-180 fallback range,
// same convention RobotDetail.tsx already applies to Faze4/AR3's own
// continuous joints, rather than an arbitrary +/-360.
export const UR3E_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-360, 360],
  j3: [-180, 180],
  j4: [-360, 360],
  j5: [-360, 360],
  j6: [-180, 180],
};

// Universal Robots' own standard "ready" pose (ur_joint_control.xacro's
// mock initial_positions default: shoulder_lift=-90deg, wrist_1=-90deg,
// everything else 0) - a real, commonly-used, non-self-colliding pose,
// not an arbitrary reset angle.
export const UR3E_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrKinematics(UR3E_CHAIN, UR3E_JOINT_LIMITS_DEG, UR3E_HOME_POSE);

export const ur3eJointsToCartesian = engine.jointsToCartesian;
export const ur3eCartesianToJoints = engine.cartesianToJoints;
