// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-13-xy-table-large-raster.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-13-xy-table-large-raster',
  name: 'XY Table Large Raster',
  points: Array.from({ length: 40 }, (_, index) => {
    const row = Math.floor(index / 8);
    const inRow = index % 8;
    const col = row % 2 === 0 ? inRow : 7 - inRow;
    const phase = index / 39;
    return xyTableTaskPoint(
      55 + col * 70,
      45 + row * 76,
      195 + 28 * Math.sin(phase * Math.PI * 6),
      -30 + 60 * (inRow / 7),
      122 + 6 * Math.cos(phase * Math.PI * 4),
      0,
      0,
      row % 2 === 0 ? 0 : 180,
    );
  }),
};

export default example;
