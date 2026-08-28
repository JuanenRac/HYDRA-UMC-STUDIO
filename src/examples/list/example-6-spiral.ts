// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-6-spiral.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateSpiral } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-6-spiral',
  name: '3D Spiral',
  points: generateSpiral(3, 48, 60, 60, 180)
};

export default example;
