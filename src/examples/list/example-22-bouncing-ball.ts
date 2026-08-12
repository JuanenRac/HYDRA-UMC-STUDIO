// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-22-bouncing-ball.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster, cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-22-bouncing-ball',
  name: 'Bouncing Ball',
  points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return cartesianToJoints(200 + t * 100 - 50, 0, 100 + Math.abs(Math.sin(t * Math.PI * 4)) * 50, 0, 0, 0)
})
};

export default example;
