// =============================================================================
// HYDRA-UMC STUDIO - Kinova Gen3 Lite-specific kinematics: gen3LiteKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from Kinova's own official
// ros2_kortex/kortex_description/robots/gen3_lite.urdf
// (github.com/Kinovarobotics/ros2_kortex, BSD-3-Clause - see
// public/models/gen3lite/ATTRIBUTION.txt). Every Gen3 Lite arm joint's
// own <axis> is "0 0 1" - the same "rotates about local Z once its own
// <origin rpy> is applied" structure the UR family shares, so this
// reuses urKinematicsShared.ts's own engine (the source URDF also has a
// 2-finger gripper with mimic joints past the 6-DOF arm chain, not
// modeled here - out of scope the same way every other robot's own
// gripper geometry is, see Toolhead.tsx).
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

const IDENTITY_OFFSET = { pos: [0, 0, 0] as [number, number, number], rpy: [0, 0, 0] as [number, number, number] };

// GEN3 Lite's own end_effector_link (after joint 6) is a virtual frame with
// NO mesh in the source URDF - URArm.tsx's shared rig needs exactly 7 real
// mesh entries though, so the 7th slot re-uses upper_wrist_link's own mesh
// (the closest real geometry to that frame) rather than a fake/invented shape.
export const GEN3LITE_MESH_OFFSETS: UrMeshOffsets = [
  IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET,
];

export const GEN3LITE_CHAIN: UrChain = [
  { pos: [0, 0, 0.12825], rpy: [0, 0, 0] },
  { pos: [0, -0.03, 0.115], rpy: [1.5708, 0, 0] },
  { pos: [0, 0.28, 0], rpy: [-3.1416, 0, 0] },
  { pos: [0, -0.14, 0.02], rpy: [1.5708, 0, 0] },
  { pos: [0.0285, 0, 0.105], rpy: [0, 1.5708, 0] },
  { pos: [-0.105, 0, 0.0285], rpy: [0, -1.5708, 0] },
];

// From ros2_control's own command_interface position min/max (radians -> degrees).
export const GEN3LITE_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-154.1, 154.1],
  j2: [-154.1, 135.2],
  j3: [-154.1, 154.1],
  j4: [-148.4, 148.4],
  j5: [-147.2, 147.2],
  j6: [-148.4, 148.4],
};

export const GEN3LITE_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

const engine = createUrKinematics(GEN3LITE_CHAIN, GEN3LITE_JOINT_LIMITS_DEG, GEN3LITE_HOME_POSE);

export const gen3LiteJointsToCartesian = engine.jointsToCartesian;
export const gen3LiteCartesianToJoints = engine.cartesianToJoints;
