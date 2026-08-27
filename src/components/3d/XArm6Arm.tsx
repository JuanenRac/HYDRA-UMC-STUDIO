// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: XArm6Arm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared URArm.tsx rig - xArm6 shares
// the exact same "every joint rotates about local Z" structure as the UR
// family (see xarm6Kinematics.ts's own header), just with UFACTORY's own
// mesh filenames (link1.stl.."link6".stl, not UR's shoulder/upperarm/
// forearm/wristN naming) - see URArm.tsx's own meshFiles field.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import URArm from './URArm';
import { XARM6_CHAIN, XARM6_MESH_OFFSETS } from '../../examples/xarm6Kinematics';

const XARM6_MESH_FILES: [string, string, string, string, string, string, string] = [
  'base.stl', 'link1.stl', 'link2.stl', 'link3.stl', 'link4.stl', 'link5.stl', 'link6.stl',
];

export default function XArm6Arm({ robot }: { robot: RobotState }) {
  return (
    <URArm
      robot={robot}
      config={{ meshBase: '/models/xarm6/', chain: XARM6_CHAIN, meshOffsets: XARM6_MESH_OFFSETS, meshFiles: XARM6_MESH_FILES }}
    />
  );
}
