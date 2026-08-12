// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-15-pyramid.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-15-pyramid',
  name: 'Pyramid Contour',
  points: [
      { j1: -10.008, j2: -51.616, j3: 114.731, j4: 0, j5: -13.653, j6: 0 },
      { j1: -7.431, j2: -59.411, j3: 92.485, j4: 0, j5: -28.104, j6: 0 },
      { j1: 7.431, j2: -59.411, j3: 92.485, j4: 0, j5: -28.104, j6: 0 },
      { j1: 10.008, j2: -51.616, j3: 114.731, j4: 0, j5: -13.653, j6: 0 },
      { j1: -10.008, j2: -51.616, j3: 114.731, j4: 0, j5: -13.653, j6: 0 },
      { j1: -6.34, j2: -37.609, j3: 117.725, j4: 0, j5: -24.666, j6: 0 },
      { j1: -5.194, j2: -44.894, j3: 102.429, j4: 0, j5: -32.677, j6: 0 },
      { j1: 5.194, j2: -44.894, j3: 102.429, j4: 0, j5: -32.677, j6: 0 },
      { j1: 6.34, j2: -37.609, j3: 117.725, j4: 0, j5: -24.666, j6: 0 },
      { j1: -6.34, j2: -37.609, j3: 117.725, j4: 0, j5: -24.666, j6: 0 },
      { j1: 0, j2: -28.017, j3: 113.359, j4: 0, j5: -38.625, j6: 0 }
]
};

export default example;
