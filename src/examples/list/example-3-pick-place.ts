// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-3-pick-place.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-3-pick-place',
  name: 'Pick and Place',
  points: [
      { j1: -14.036, j2: -38.81, j3: 109.226, j4: 0, j5: 58.036, j6: 0 },
      { j1: -14.036, j2: -69.196, j3: 94.369, j4: 0, j5: 73.564, j6: 0 },
      { j1: -14.036, j2: -38.81, j3: 109.226, j4: 0, j5: 58.036, j6: 0 },
      { j1: 14.036, j2: -38.81, j3: 109.226, j4: 0, j5: 58.036, j6: 0 },
      { j1: 14.036, j2: -69.196, j3: 94.369, j4: 0, j5: 73.564, j6: 0 },
      { j1: 14.036, j2: -38.81, j3: 109.226, j4: 0, j5: 58.036, j6: 0 }
]
};

export default example;
