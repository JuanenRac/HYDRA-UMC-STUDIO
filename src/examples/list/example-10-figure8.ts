// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-10-figure8.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster, cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-10-figure8',
  name: 'Figure 8 (Infinity)',
  points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return cartesianToJoints(200 + 60 * Math.sin(t), 60 * Math.sin(t) * Math.cos(t), 130, 0, 0, 0)
})
};

export default example;
