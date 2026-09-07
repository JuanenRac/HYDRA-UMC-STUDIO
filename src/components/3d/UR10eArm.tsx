// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: UR10eArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see that file's
// own header for why the rig itself is shared across every UR model.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { UR10E_CHAIN, UR10E_MESH_OFFSETS } from '../../examples/ur10eKinematics';

export default function UR10eArm({ robot }: { robot: RobotState }) {
  return <URArm robot={robot} config={{ meshBase: '/models/ur10e/', chain: UR10E_CHAIN, meshOffsets: UR10E_MESH_OFFSETS }} />;
}
