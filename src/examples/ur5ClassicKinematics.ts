// =============================================================================
// HYDRA-UMC STUDIO - UR5 classic-specific kinematics: ur5ClassicKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain built from ros-industrial/universal_robot's own real DH
// parameters (d1=0.089159, a2=-0.42500, a3=-0.39225, d4=0.10915,
// d5=0.09465, d6=0.0823, shoulder_offset=0.13585, elbow_offset=-0.1197 -
// see public/models/ur5classic/ATTRIBUTION.txt). See
// urClassicKinematics.ts's own header for why this shared quaternion-
// family engine is used instead of urKinematicsShared.ts's e-Series one.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrClassicKinematics, type UrClassicChain } from './urClassicKinematics';

// The official DH table of the UR5 (Universal Robots, the same one ros-industrial/universal_robot starts from).
// In the URDF the lateral offset d4 is split between the shoulder joint, the elbow joint and the step from wrist_1 to wrist_2, so that step
// is d4 minus the other two: putting d4 itself there (and the other two as well) moved the wrist 16.2 mm sideways.
export const UR5CLASSIC_DH = { d1: 0.089159, a2: -0.425, a3: -0.39225, d4: 0.10915, d5: 0.09465, d6: 0.0823, shoulderOffset: 0.13585, elbowOffset: -0.1197 } as const;
export const UR5CLASSIC_WRIST_1_LENGTH = UR5CLASSIC_DH.d4 - UR5CLASSIC_DH.shoulderOffset - UR5CLASSIC_DH.elbowOffset;

export const UR5CLASSIC_CHAIN: UrClassicChain = [
  { pos: [0, 0, 0.089159], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.13585, 0], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, -0.1197, 0.425], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0, 0.39225], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, UR5CLASSIC_WRIST_1_LENGTH, 0], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.09465], rpy: [0, 0, 0], axis: [0, 1, 0] },
];

export const UR5CLASSIC_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrClassicKinematics(UR5CLASSIC_CHAIN);

export const ur5ClassicJointsToCartesian = engine.jointsToCartesian;
export const ur5ClassicCartesianToJoints = engine.cartesianToJoints;
