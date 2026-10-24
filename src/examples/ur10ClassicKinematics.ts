// =============================================================================
// HYDRA-UMC STUDIO - UR10 classic-specific kinematics: ur10ClassicKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain built from ros-industrial/universal_robot's own real DH
// parameters (d1=0.1273, a2=-0.612, a3=-0.5723, d4=0.163941,
// d5=0.1157, d6=0.0922, shoulder_offset=0.220941, elbow_offset=-0.1719 -
// see public/models/ur10classic/ATTRIBUTION.txt). See
// ur5ClassicKinematics.ts's own header for the full explanation.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrClassicKinematics, type UrClassicChain } from './urClassicKinematics';

// The official DH table of the UR10 (Universal Robots, the same one ros-industrial/universal_robot starts from).
// In the URDF the lateral offset d4 is split between the shoulder joint, the elbow joint and the step from wrist_1 to wrist_2, so that step
// is d4 minus the other two: putting d4 itself there (and the other two as well) moved the wrist 49 mm sideways.
export const UR10CLASSIC_DH = { d1: 0.1273, a2: -0.612, a3: -0.5723, d4: 0.163941, d5: 0.1157, d6: 0.0922, shoulderOffset: 0.220941, elbowOffset: -0.1719 } as const;
export const UR10CLASSIC_WRIST_1_LENGTH = UR10CLASSIC_DH.d4 - UR10CLASSIC_DH.shoulderOffset - UR10CLASSIC_DH.elbowOffset;

export const UR10CLASSIC_CHAIN: UrClassicChain = [
  { pos: [0, 0, 0.1273], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.220941, 0], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, -0.1719, 0.612], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0, 0.5723], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, UR10CLASSIC_WRIST_1_LENGTH, 0], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.1157], rpy: [0, 0, 0], axis: [0, 1, 0] },
];

export const UR10CLASSIC_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrClassicKinematics(UR10CLASSIC_CHAIN);

export const ur10ClassicJointsToCartesian = engine.jointsToCartesian;
export const ur10ClassicCartesianToJoints = engine.cartesianToJoints;
