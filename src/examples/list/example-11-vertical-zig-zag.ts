// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-11-vertical-zig-zag.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-11-vertical-zig-zag',
  name: 'Vertical Zig-Zag',
  points: Array.from({ length: 10 }, (_, i) => cartesianToJoints(
    200, -50 + i * 11, i % 2 === 0 ? 110 : 180, 0, 0, 0
  ))
};

export default example;
