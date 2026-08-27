// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-18-xy-table-snake.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-18-xy-table-snake',
  name: 'XY Table Snake Pattern',
  // A real snake/boustrophedon reverses column direction on alternating
  // rows so consecutive rows connect at whichever edge they both end up
  // on, instead of every row restarting from column 0 - `col` below picks
  // 0,1,2,3,4 on even rows and 4,3,2,1,0 on odd rows (same alternation
  // example-11-vertical-zig-zag.ts already applies correctly on Z), so tx
  // actually snakes back and forth instead of jumping 300->100 between
  // every row the way a plain `i % 5` does regardless of row parity.
  points: Array.from({ length: 25 }, (_, i) => {
    const row = Math.floor(i / 5);
    const colInRow = i % 5;
    const col = row % 2 === 0 ? colInRow : 4 - colInRow;
    return {
      ...cartesianToJoints(200 + (i % 2 === 0 ? 20 : -20), 0, 105, 0, 0, 0),
      tx: 100 + col * 50,
      ty: 100 + row * 50,
    };
  })
};

export default example;
