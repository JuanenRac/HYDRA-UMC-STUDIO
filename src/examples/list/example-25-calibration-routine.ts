// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-25-calibration-routine.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-25-calibration-routine',
  name: 'Calibration Routine',
  points: [
      { j1: 11.31, j2: -49.446, j3: 88.724, j4: 45, j5: 3.17, j6: 45 },
      { j1: 18.435, j2: -29.773, j3: 127.066, j4: -45, j5: -68.161, j6: -45 },
      { j1: -18.435, j2: -50.418, j3: 119.562, j4: -45, j5: -55.02, j6: -45 },
      { j1: -11.31, j2: -63.659, j3: 82.436, j4: 45, j5: 11.095, j6: 45 },
      { j1: 0, j2: -39.247, j3: 111.158, j4: 0, j5: -29.595, j6: 0 }
]
};

export default example;
