// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Lite6Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - see
// XArm6Arm.tsx's own header for why this UFACTORY sibling reuses the same
// shared-Z-axis engine + rig with its own mesh filenames.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { LITE6_CHAIN, LITE6_MESH_OFFSETS } from '../../examples/lite6Kinematics';

const LITE6_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base.stl', 'link1.stl', 'link2.stl', 'link3.stl', 'link4.stl', 'link5.stl', 'link6.stl',
];

export default function Lite6Arm({ robot }: { robot: RobotState }) {
  return (
    <URArm
      robot={robot}
      config={{ meshBase: '/models/lite6/', chain: LITE6_CHAIN, meshOffsets: LITE6_MESH_OFFSETS, meshFiles: LITE6_MESH_FILES }}
    />
  );
}
