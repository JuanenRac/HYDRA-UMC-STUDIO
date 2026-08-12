// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-20-xy-table-pnp-matrix.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-20-xy-table-pnp-matrix',
  name: 'XY Table PnP Matrix',
  points: Array.from({ length: 9 }, (_, i) => {
      const tx = 100 + (i % 3) * 100;
      const ty = 100 + Math.floor(i / 3) * 100;
      return [
        { ...cartesianToJoints(200, 0, 140, 0, 90, 0), tx, ty },
        { ...cartesianToJoints(200, 0, 100, 0, 90, 0), tx, ty },
        { ...cartesianToJoints(200, 0, 140, 0, 90, 0), tx, ty },
      ];
}).flat()
};

export default example;
