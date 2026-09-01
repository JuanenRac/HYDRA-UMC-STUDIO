// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-18-xy-table-snake.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-18-xy-table-snake',
  name: 'XY Table Snake Pattern',
  points: Array.from({ length: 42 }, (_, index) => {
    const row = Math.floor(index / 7);
    const inRow = index % 7;
    const col = row % 2 === 0 ? inRow : 6 - inRow;
    const phase = index / 41;
    return xyTableTaskPoint(
      65 + col * 75,
      45 + row * 58,
      200 + 32 * Math.sin(phase * Math.PI * 8),
      22 * Math.cos(phase * Math.PI * 4),
      115 + 10 * Math.sin(phase * Math.PI * 6),
      0,
      0,
      row % 2 === 0 ? 20 : -20,
    );
  }),
};

export default example;
