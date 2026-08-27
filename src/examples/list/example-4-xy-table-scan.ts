// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-4-xy-table-scan.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-4-xy-table-scan',
  name: 'XY Table Area Scan',
  points: [
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: -100, ty: -100 },
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: -100, ty: 100 },
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: 0, ty: 100 },
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: 0, ty: -100 },
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: 100, ty: -100 },
      { ...cartesianToJoints(200, 0, 10, 0, 0, 0), tx: 100, ty: 100 }
  ]
};
export default example;
