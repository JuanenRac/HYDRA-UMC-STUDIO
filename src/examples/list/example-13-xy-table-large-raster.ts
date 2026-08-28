// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-13-xy-table-large-raster.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-13-xy-table-large-raster',
  name: 'XY Table Large Raster',
  // tx wraps every 5 points (`floor(i / 5)` below is what actually
  // defines a "row" here) - the wrap divisor has to match that same 5,
  // i.e. 5*20=100, not 300. With 300 and i*20 never reaching it across
  // this example's own point range, `% 300` was a no-op: tx grew
  // monotonically instead of resetting to the row's own left edge, so
  // each row picked up wherever the previous one ended (a diagonal
  // staircase) instead of a rectangular grid raster.
  points: generateRaster(20, 20, 3).map((p, i) => ({
      ...p,
      tx: 100 + (i * 20) % 100,
      ty: 100 + Math.floor(i / 5) * 50,
}))
};

export default example;
