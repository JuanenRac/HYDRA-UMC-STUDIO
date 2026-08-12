// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-1-square.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-1-square',
  name: 'Square Trajectory',
  points: [
      { j1: -14.036, j2: -52.931, j3: 110.249, j4: 0, j5: -16.82, j6: 0 },
      { j1: -9.462, j2: -67.742, j3: 73.338, j4: 0, j5: -38.92, j6: 0 },
      { j1: 9.462, j2: -67.742, j3: 73.338, j4: 0, j5: -38.92, j6: 0 },
      { j1: 14.036, j2: -52.931, j3: 110.249, j4: 0, j5: -16.82, j6: 0 },
      { j1: -14.036, j2: -52.931, j3: 110.249, j4: 0, j5: -16.82, j6: 0 }
]
};

export default example;
