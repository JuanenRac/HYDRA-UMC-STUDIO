// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-8-star.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-8-star',
  name: '5-Point Star',
  points: generateStar(60, 25, 5)
};

export default example;
