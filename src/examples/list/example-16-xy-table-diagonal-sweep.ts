// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-16-xy-table-diagonal-sweep.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-16-xy-table-diagonal-sweep',
  name: 'XY Table Diagonal Sweep',
  points: Array.from({ length: 36 }, (_, index) => {
    const progress = index / 35;
    return xyTableTaskPoint(
      60 + progress * 430,
      55 + progress * 280,
      190 + 42 * Math.sin(progress * Math.PI * 4),
      -32 + 64 * progress,
      120 + 14 * Math.sin(progress * Math.PI * 6),
      0,
      0,
      -35 + progress * 70,
    );
  }),
};

export default example;
