// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: UR3eArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see that file's
// own header for why the rig itself is shared across every UR model.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { UR3E_CHAIN, UR3E_MESH_OFFSETS } from '../../examples/ur3eKinematics';

export default function UR3eArm({ robot }: { robot: RobotState }) {
  return <URArm robot={robot} config={{ meshBase: '/models/ur3e/', chain: UR3E_CHAIN, meshOffsets: UR3E_MESH_OFFSETS }} />;
}
