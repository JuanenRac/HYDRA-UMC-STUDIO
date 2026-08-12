// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-18-xy-table-snake.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-18-xy-table-snake',
  name: 'XY Table Snake Pattern',
  points: Array.from({ length: 25 }, (_, i) => ({
      ...cartesianToJoints(200 + (i % 2 === 0 ? 20 : -20), 0, 105, 0, 0, 0),
      tx: 100 + (i % 5) * 50,
      ty: 100 + Math.floor(i / 5) * 50,
  }))
};

export default example;
