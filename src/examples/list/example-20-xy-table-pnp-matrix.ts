// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-20-xy-table-pnp-matrix.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-20-xy-table-pnp-matrix',
  name: 'XY Table PnP Matrix',
  points: Array.from({ length: 9 }, (_, cell) => {
    const col = cell % 3;
    const row = Math.floor(cell / 3);
    const tx = 140 + col * 140;
    const ty = 85 + row * 115;
    const angle = ((row + col) % 2 === 0 ? 45 : -45);
    // Approach, place, retract: the table travels to each component while
    // the head performs a genuine vertical placement cycle with a small
    // lateral alignment gesture, rather than remaining frozen above it.
    return [
      xyTableTaskPoint(tx, ty, 190 - 18, -18, 148, 0, 90, angle),
      xyTableTaskPoint(tx, ty, 205, 0, 112, 0, 90, angle),
      xyTableTaskPoint(tx, ty, 220, 18, 142, 0, 90, angle),
    ];
  }).flat(),
};

export default example;
