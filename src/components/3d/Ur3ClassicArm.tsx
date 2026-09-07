// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Ur3ClassicArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared UrClassicArm.tsx rig - see
// Ur5ClassicArm.tsx's own header for the full explanation.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import UrClassicArm from './UrClassicArm';
import { UR3CLASSIC_CHAIN } from '../../examples/ur3ClassicKinematics';

export default function Ur3ClassicArm({ robot }: { robot: RobotState }) {
  return <UrClassicArm robot={robot} config={{ meshBase: '/models/ur3classic/', chain: UR3CLASSIC_CHAIN }} />;
}
