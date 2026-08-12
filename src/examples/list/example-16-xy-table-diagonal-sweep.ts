// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-16-xy-table-diagonal-sweep.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-16-xy-table-diagonal-sweep',
  name: 'XY Table Diagonal Sweep',
  points: Array.from({ length: 20 }, (_, i) => ({
      ...cartesianToJoints(200 + 20 * Math.sin(i), 20 * Math.cos(i), 115, 0, 0, 0),
      tx: i * 20,
      ty: i * 20,
  }))
};

export default example;
