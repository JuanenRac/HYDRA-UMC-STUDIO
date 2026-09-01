// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-4-xy-table-scan.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

const example: KinematicsExample = {
  id: 'example-4-xy-table-scan',
  name: 'XY Table Area Scan',
  // The carriage raster covers the work surface while the wrist performs a
  // small local inspection sweep.  Both motions are intentional and remain
  // independent through tx/ty versus the tool pose.
  points: Array.from({ length: 24 }, (_, index) => {
    const row = Math.floor(index / 6);
    const inRow = index % 6;
    const col = row % 2 === 0 ? inRow : 5 - inRow;
    const phase = index / 23;
    return xyTableTaskPoint(
      70 + col * 92,
      70 + row * 88,
      205 + 24 * Math.sin(phase * Math.PI * 4),
      34 * Math.cos(phase * Math.PI * 4),
      120 + 7 * Math.sin(phase * Math.PI * 8),
      0,
      0,
      phase * 180,
    );
  }),
};
export default example;
