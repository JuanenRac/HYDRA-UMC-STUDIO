// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-4-xy-table-scan.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-4-xy-table-scan',
  name: 'XY Table Area Scan',
  points: [
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 },
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 },
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 },
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 },
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 },
      { j1: 0, j2: -54.662, j3: 105.01, j4: 0, j5: 69.672, j6: 0 }
]
};

export default example;
