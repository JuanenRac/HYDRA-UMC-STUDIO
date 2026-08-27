// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-17-xy-table-spiral-out.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster, cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-17-xy-table-spiral-out',
  name: 'XY Table Spiral Out',
  points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return {
        ...cartesianToJoints(200, 0, 110 + t * 40, 0, 0, 0),
        tx: 250 + t * 150 * Math.cos(t * Math.PI * 6),
        ty: 250 + t * 150 * Math.sin(t * Math.PI * 6),
      };
})
};

export default example;
