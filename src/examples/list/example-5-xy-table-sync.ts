// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-5-xy-table-sync.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-5-xy-table-sync',
  name: 'Sync Robot & XY Table',
  points: [
      { j1: 0, j2: -47.739, j3: 108.186, j4: 0, j5: -24.075, j6: 0 },
      { j1: -11.31, j2: -46.817, j3: 89.44, j4: 45, j5: -43.742, j6: 0 },
      { j1: 11.31, j2: -46.817, j3: 89.44, j4: -45, j5: -43.742, j6: 0 },
      { j1: 0, j2: -47.739, j3: 108.186, j4: 0, j5: -24.075, j6: 0 }
]
};

export default example;
