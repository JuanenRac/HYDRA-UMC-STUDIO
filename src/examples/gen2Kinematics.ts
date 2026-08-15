// =============================================================================
// HYDRA-UMC STUDIO - Kinova Gen2-specific kinematics: gen2Kinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain offsets copied verbatim from Kinovarobotics/kinova-ros's own
// kinova_description/urdf/j2s6s200_standalone.xacro (BSD-3-Clause - see
// public/models/gen2/ATTRIBUTION.txt). Every Gen2 arm joint's own <axis>
// is "0 0 1" - the same shared-Z-axis structure the UR family uses, so
// this reuses urKinematicsShared.ts's own engine.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrKinematics, type UrChain, type UrJointLimitsDeg } from './urKinematicsShared';
import type { UrMeshOffsets } from '../components/3d/URArm';

const IDENTITY_OFFSET = { pos: [0, 0, 0] as [number, number, number], rpy: [0, 0, 0] as [number, number, number] };

export const GEN2_MESH_OFFSETS: UrMeshOffsets = [
  IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET, IDENTITY_OFFSET,
];

export const GEN2_CHAIN: UrChain = [
  { pos: [0, 0, 0.15675], rpy: [0, 3.14159265359, 0] },
  { pos: [0, 0.0016, -0.11875], rpy: [-1.57079632679, 0, 3.14159265359] },
  { pos: [0, -0.410, 0], rpy: [0, 3.14159265359, 0] },
  { pos: [0, 0.2073, -0.0114], rpy: [-1.57079632679, 0, 3.14159265359] },
  { pos: [0, 0, -0.10375], rpy: [1.57079632679, 0, 3.14159265359] },
  { pos: [0, 0.10375, 0], rpy: [-1.57079632679, 0, 3.14159265359] },
];

// joint1/4/6 are "continuous" (no real limit) in the source xacro.
// joint2/3/5's own real numeric limits live in a macro-parameter default
// this project didn't chase down (kinova_common.xacro's own
// <xacro:property> definitions, referenced but not set in
// j2s6s200_standalone.xacro itself) - rather than invent plausible-
// looking numbers, every joint here uses the app's generic +/-180
// fallback, same convention Faze4/AR3 already use for their own
// "continuous, no precisely known limit" joints.
export const GEN2_JOINT_LIMITS_DEG: UrJointLimitsDeg = {
  j1: [-360, 360],
  j2: [-180, 180],
  j3: [-180, 180],
  j4: [-360, 360],
  j5: [-180, 180],
  j6: [-360, 360],
};

export const GEN2_HOME_POSE: KinematicsPoint = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };

const engine = createUrKinematics(GEN2_CHAIN, GEN2_JOINT_LIMITS_DEG, GEN2_HOME_POSE);

export const gen2JointsToCartesian = engine.jointsToCartesian;
export const gen2CartesianToJoints = engine.cartesianToJoints;
