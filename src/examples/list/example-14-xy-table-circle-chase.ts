// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-14-xy-table-circle-chase.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-14-xy-table-circle-chase',
  name: 'XY Table Circle Chase',
  points: Array.from({ length: 24 }, (_, i) => {
      const t = (i * Math.PI * 2) / 24;
      return {
        ...cartesianToJoints(200 + 30 * Math.cos(t * 2), 30 * Math.sin(t * 2), 110, 0, 0, 0),
        tx: 250 + 100 * Math.cos(t),
        ty: 250 + 100 * Math.sin(t)
      };
})
};

export default example;
