// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-14-xy-table-circle-chase.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-14-xy-table-circle-chase',
  name: 'XY Table Circle Chase',
  points: Array.from({ length: 48 }, (_, index) => {
    const t = (index * Math.PI * 2) / 48;
    return xyTableTaskPoint(
      290 + 145 * Math.cos(t),
      200 + 135 * Math.sin(t),
      205 + 34 * Math.cos(t * 2),
      26 * Math.sin(t * 2),
      122 + 10 * Math.sin(t * 3),
      0,
      0,
      (t * 360) / Math.PI,
    );
  }),
};

export default example;
