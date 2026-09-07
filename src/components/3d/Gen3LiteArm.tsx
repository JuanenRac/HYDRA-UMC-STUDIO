// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Gen3LiteArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see
// XArm6Arm.tsx's own header for why this shares the same-Z-axis engine.
// The 7th mesh slot re-uses upper_wrist_link.STL (see
// gen3LiteKinematics.ts's own header for why - the source URDF's real
// 7th frame has no mesh of its own).
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { GEN3LITE_CHAIN, GEN3LITE_MESH_OFFSETS } from '../../examples/gen3LiteKinematics';

const GEN3LITE_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base_link.STL', 'shoulder_link.STL', 'arm_link.STL', 'forearm_link.STL', 'lower_wrist_link.STL', 'upper_wrist_link.STL', 'upper_wrist_link.STL',
];

export default function Gen3LiteArm({ robot }: { robot: RobotState }) {
  return (
    <URArm
      robot={robot}
      config={{ meshBase: '/models/gen3lite/', chain: GEN3LITE_CHAIN, meshOffsets: GEN3LITE_MESH_OFFSETS, meshFiles: GEN3LITE_MESH_FILES }}
    />
  );
}
