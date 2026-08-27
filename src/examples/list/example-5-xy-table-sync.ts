// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-5-xy-table-sync.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-5-xy-table-sync',
  name: 'XY Table Sync',
  points: [
      { ...cartesianToJoints(150, 0, 10, 0, 0, 0), tx: -50, ty: -50 },
      { ...cartesianToJoints(200, 50, 10, 0, 0, 0), tx: 0, ty: 50 },
      { ...cartesianToJoints(250, 0, 10, 0, 0, 0), tx: 50, ty: -50 },
      { ...cartesianToJoints(200, -50, 10, 0, 0, 0), tx: 0, ty: 0 },
      { ...cartesianToJoints(150, 0, 10, 0, 0, 0), tx: -50, ty: -50 }
  ]
};
export default example;
