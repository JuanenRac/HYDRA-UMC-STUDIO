// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-25-calibration-routine.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-25-calibration-routine',
  name: 'Calibration Routine',
  points: [
      cartesianToJoints(250, 50, -20, 45, 0, 45),
      cartesianToJoints(150, 50, 50, -45, 0, -45),
      cartesianToJoints(150, -50, 50, -45, 0, -45),
      cartesianToJoints(250, -50, -20, 45, 0, 45),
      cartesianToJoints(200, 0, 10, 0, 0, 0)
  ]
};
export default example;
