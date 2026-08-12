// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-2-circle.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-2-circle',
  name: 'Circle Trajectory',
  points: generateCircle(60, 36, 120)
};

export default example;
