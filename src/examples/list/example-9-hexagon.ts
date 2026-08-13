// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-9-hexagon.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-9-hexagon',
  name: 'Hexagonal Path',
  points: generateCircle(50, 6, 120).map(p => ({ ...p, c: 0 }))
};

export default example;
