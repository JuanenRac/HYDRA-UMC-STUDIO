// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-21-heart.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster, cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-21-heart',
  name: 'Heart Shape Trace',
  points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return cartesianToJoints(200 + 40 * Math.pow(Math.sin(t), 3), 35 * Math.cos(t) - 10 * Math.cos(2*t) - 5 * Math.cos(3*t) - 2 * Math.cos(4*t), 110, 0, 0, 0);
  })
};

export default example;
