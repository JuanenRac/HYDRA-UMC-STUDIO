// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-23-xy-table-flower.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster, cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-23-xy-table-flower',
  name: 'XY Table Flower Pattern',
  points: Array.from({ length: 60 }, (_, i) => {
      const t = (i * Math.PI * 2) / 60;
      const r = 40 * Math.cos(4 * t);
      return {
        ...cartesianToJoints(200 + r * Math.cos(t), r * Math.sin(t), 110, 0, 0, 0),
        tx: 250 + 50 * Math.cos(t),
        ty: 250 + 50 * Math.sin(t)
      };
})
};

export default example;
