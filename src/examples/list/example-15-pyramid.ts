// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-15-pyramid.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-15-pyramid',
  name: 'Pyramid Contour',
  points: [
      // Base
      cartesianToJoints(200 - 40, -40, 0, 0, 0, 0),
      cartesianToJoints(200 + 40, -40, 0, 0, 0, 0),
      cartesianToJoints(200 + 40, 40, 0, 0, 0, 0),
      cartesianToJoints(200 - 40, 40, 0, 0, 0, 0),
      cartesianToJoints(200 - 40, -40, 0, 0, 0, 0),
      // Middle
      cartesianToJoints(200 - 20, -20, 20, 0, 0, 0),
      cartesianToJoints(200 + 20, -20, 20, 0, 0, 0),
      cartesianToJoints(200 + 20, 20, 20, 0, 0, 0),
      cartesianToJoints(200 - 20, 20, 20, 0, 0, 0),
      cartesianToJoints(200 - 20, -20, 20, 0, 0, 0),
      // Top
      cartesianToJoints(200, 0, 40, 0, 0, 0)
  ]
};
export default example;
