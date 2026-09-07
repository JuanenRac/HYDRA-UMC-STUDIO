// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: UR16eArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see that file's
// own header for why the rig itself is shared across every UR model.
// UR16e's mesh set (public/models/ur16e/) reuses UR10e's own official
// base/shoulder/wrist1/wrist2/wrist3 STL files verbatim (same frame, only
// the upper_arm/forearm links are UR16e-specific, shortened for its higher
// payload rating) - see that folder's own ATTRIBUTION.txt.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { UR16E_CHAIN, UR16E_MESH_OFFSETS } from '../../examples/ur16eKinematics';

export default function UR16eArm({ robot }: { robot: RobotState }) {
  return <URArm robot={robot} config={{ meshBase: '/models/ur16e/', chain: UR16E_CHAIN, meshOffsets: UR16E_MESH_OFFSETS }} />;
}
