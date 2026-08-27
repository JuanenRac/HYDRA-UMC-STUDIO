// =============================================================================
// HYDRA-UMC STUDIO - Robot Control Component: Ur5ClassicArm.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Thin per-model wrapper around the shared UrClassicArm.tsx rig - see
// that file's own header for why the CLASSIC UR generation needs its
// own engine, distinct from the e-Series' URArm.tsx.
// =============================================================================

import React from 'react';
import type { RobotState } from '../../store';
import UrClassicArm from './UrClassicArm';
import { UR5CLASSIC_CHAIN } from '../../examples/ur5ClassicKinematics';

export default function Ur5ClassicArm({ robot }: { robot: RobotState }) {
  return <UrClassicArm robot={robot} config={{ meshBase: '/models/ur5classic/', chain: UR5CLASSIC_CHAIN }} />;
}
