// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: UR20Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see that file's
// own header for why the rig itself is shared across every UR model.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { UR20_CHAIN, UR20_MESH_OFFSETS } from '../../examples/ur20Kinematics';

export default function UR20Arm({ robot }: { robot: RobotState }) {
  return <URArm robot={robot} config={{ meshBase: '/models/ur20/', chain: UR20_CHAIN, meshOffsets: UR20_MESH_OFFSETS }} />;
}
