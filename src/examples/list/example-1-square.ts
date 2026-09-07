// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-1-square.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-1-square',
  name: 'Square Trajectory',
  points: [
      cartesianToJoints(200 - 50, -50, 10, 0, 0, 0),
      cartesianToJoints(200 + 50, -50, 10, 0, 0, 0),
      cartesianToJoints(200 + 50, 50, 10, 0, 0, 0),
      cartesianToJoints(200 - 50, 50, 10, 0, 0, 0),
      cartesianToJoints(200 - 50, -50, 10, 0, 0, 0)
  ]
};
export default example;
