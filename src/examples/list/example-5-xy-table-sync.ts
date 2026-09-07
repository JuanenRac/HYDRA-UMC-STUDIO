// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-5-xy-table-sync.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { xyTableTaskPoint } from '../utils';

const example: KinematicsExample = {
  id: 'example-5-xy-table-sync',
  name: 'XY Table Sync',
  points: Array.from({ length: 36 }, (_, index) => {
    const t = (index * Math.PI * 2) / 35;
    return xyTableTaskPoint(
      260 + 170 * Math.cos(t),
      200 + 110 * Math.sin(t * 2),
      205 + 30 * Math.cos(t * 3),
      30 * Math.sin(t * 3),
      118 + 12 * Math.sin(t * 2),
      0,
      0,
      (t * 180) / Math.PI,
    );
  }),
};
export default example;
