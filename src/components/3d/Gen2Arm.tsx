// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Gen2Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see
// XArm6Arm.tsx's own header for why Gen2 (same shared-Z-axis structure)
// reuses that same engine with its own mesh filenames.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { GEN2_CHAIN, GEN2_MESH_OFFSETS } from '../../examples/gen2Kinematics';

const GEN2_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base.STL', 'shoulder.STL', 'arm.STL', 'forearm.STL', 'wrist_spherical_1.STL', 'wrist_spherical_2.STL', 'hand_2finger.STL',
];

export default function Gen2Arm({ robot }: { robot: RobotState }) {
  return (
    <URArm
      robot={robot}
      config={{ meshBase: '/models/gen2/', chain: GEN2_CHAIN, meshOffsets: GEN2_MESH_OFFSETS, meshFiles: GEN2_MESH_FILES }}
    />
  );
}
