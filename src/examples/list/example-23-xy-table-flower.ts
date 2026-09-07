// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-23-xy-table-flower.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-23-xy-table-flower',
  name: 'XY Table Flower Pattern',
  // The rose curve belongs to tx/ty, so it is unmistakably the table that
  // draws the flower.  The head adds a smaller counter-orbit and height
  // modulation to resemble an active dispensing/inspection task.
  points: Array.from({ length: 72 }, (_, index) => {
    const t = (index * Math.PI * 2) / 72;
    const radius = 105 * Math.cos(4 * t);
    return xyTableTaskPoint(
      290 + radius * Math.cos(t),
      200 + radius * Math.sin(t),
      205 + 28 * Math.cos(t * 3),
      28 * Math.sin(t * 3),
      118 + 9 * Math.cos(t * 4),
      0,
      0,
      (t * 180) / Math.PI,
    );
  }),
};

export default example;
