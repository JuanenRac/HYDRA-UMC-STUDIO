// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-7-wave.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateWave } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-7-wave',
  name: 'Sine Wave Trace',
  points: generateWave(36, 120, 40, 2)
};

export default example;
