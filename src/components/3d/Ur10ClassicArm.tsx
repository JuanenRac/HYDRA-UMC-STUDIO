// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Ur10ClassicArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared UrClassicArm.tsx rig - see
// Ur5ClassicArm.tsx's own header for the full explanation.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import UrClassicArm from './UrClassicArm';
import { UR10CLASSIC_CHAIN } from '../../examples/ur10ClassicKinematics';

export default function Ur10ClassicArm({ robot }: { robot: RobotState }) {
  return <UrClassicArm robot={robot} config={{ meshBase: '/models/ur10classic/', chain: UR10CLASSIC_CHAIN }} />;
}
