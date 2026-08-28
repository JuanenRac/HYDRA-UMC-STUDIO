// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-23-xy-table-flower.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-23-xy-table-flower',
  name: 'XY Table Flower Pattern',
  // The rose curve (r = 40*cos(4t), an 8-petal flower since k=4 is even)
  // has to drive tx/ty - the table's own real position - not the arm's
  // cartesianToJoints x/y, same convention every other "xy-table-*"
  // example in this folder already follows (example-14/16/17/20: the
  // pattern named in the file goes on tx/ty, the arm does something
  // secondary). This one had it backwards: the table traced a plain
  // circle while the arm drew the actual flower, so "XY Table Flower
  // Pattern" was true of the arm, not the table the name refers to.
  points: Array.from({ length: 60 }, (_, i) => {
      const t = (i * Math.PI * 2) / 60;
      const r = 40 * Math.cos(4 * t);
      return {
        ...cartesianToJoints(200 + 20 * Math.cos(t), 20 * Math.sin(t), 110, 0, 0, 0),
        tx: 250 + r * Math.cos(t),
        ty: 250 + r * Math.sin(t)
      };
})
};

export default example;
