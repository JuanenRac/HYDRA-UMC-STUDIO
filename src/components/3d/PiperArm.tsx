// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: PiperArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see
// XArm6Arm.tsx's own header for why PiPER (same shared-Z-axis structure)
// reuses that same engine with its own mesh filenames.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { PIPER_CHAIN, PIPER_MESH_OFFSETS } from '../../examples/piperKinematics';

const PIPER_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base_link.STL', 'link1.STL', 'link2.STL', 'link3.STL', 'link4.STL', 'link5.STL', 'link6.STL',
];

export default function PiperArm({ robot }: { robot: RobotState }) {
  return (
    <URArm
      robot={robot}
      config={{ meshBase: '/models/piper/', chain: PIPER_CHAIN, meshOffsets: PIPER_MESH_OFFSETS, meshFiles: PIPER_MESH_FILES }}
    />
  );
}
