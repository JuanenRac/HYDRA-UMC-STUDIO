// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-13-xy-table-large-raster.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-13-xy-table-large-raster',
  name: 'XY Table Large Raster',
  points: generateRaster(20, 20, 3).map((p, i) => ({
      ...p,
      tx: 100 + (i * 20) % 300,
      ty: 100 + Math.floor(i / 5) * 50,
}))
};

export default example;
