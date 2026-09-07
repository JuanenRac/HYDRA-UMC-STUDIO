// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-17-xy-table-spiral-out.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-17-xy-table-spiral-out',
  name: 'XY Table Spiral Out',
  points: Array.from({ length: 54 }, (_, index) => {
    const progress = index / 53;
    const t = progress * Math.PI * 6;
    const radius = 25 + progress * 145;
    return xyTableTaskPoint(
      290 + radius * Math.cos(t),
      200 + radius * Math.sin(t),
      205 + 26 * Math.cos(t * 2),
      26 * Math.sin(t * 2),
      112 + progress * 30 + 8 * Math.sin(t * 3),
      0,
      0,
      (t * 180) / Math.PI,
    );
  }),
};

export default example;
