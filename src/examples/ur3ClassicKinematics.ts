// =============================================================================
// HYDRA-UMC STUDIO - UR3 classic-specific kinematics: ur3ClassicKinematics.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Chain built from ros-industrial/universal_robot's own real DH
// parameters (d1=0.1519, a2=-0.24365, a3=-0.21325, d4=0.11235,
// d5=0.08535, d6=0.0819, shoulder_offset=0.1198, elbow_offset=-0.0925 -
// see public/models/ur3classic/ATTRIBUTION.txt). See
// ur5ClassicKinematics.ts's own header for the full explanation.
// =============================================================================

import type { KinematicsPoint } from './utils';
import { createUrClassicKinematics, type UrClassicChain } from './urClassicKinematics';

export const UR3CLASSIC_CHAIN: UrClassicChain = [
  { pos: [0, 0, 0.1519], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.1198, 0], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, -0.0925, 0.24365], rpy: [0, 0, 0], axis: [0, 1, 0] },
  { pos: [0, 0, 0.21325], rpy: [0, Math.PI / 2, 0], axis: [0, 1, 0] },
  { pos: [0, 0.08505, 0], rpy: [0, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0, 0.08535], rpy: [0, 0, 0], axis: [0, 1, 0] },
];

export const UR3CLASSIC_HOME_POSE: KinematicsPoint = { j1: 0, j2: -90, j3: 0, j4: -90, j5: 0, j6: 0 };

const engine = createUrClassicKinematics(UR3CLASSIC_CHAIN);

export const ur3ClassicJointsToCartesian = engine.jointsToCartesian;
export const ur3ClassicCartesianToJoints = engine.cartesianToJoints;
