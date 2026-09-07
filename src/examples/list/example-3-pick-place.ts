// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-3-pick-place.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

const example: KinematicsExample = {
  id: 'example-3-pick-place',
  name: 'Pick and Place',
  points: [
      cartesianToJoints(200, -50, 50, 0, 0, 0), // Approach pick
      cartesianToJoints(200, -50, 0, 0, 0, 0),  // Pick
      cartesianToJoints(200, -50, 50, 0, 0, 0), // Retreat pick
      cartesianToJoints(200, 50, 50, 0, 0, 0),  // Approach place
      cartesianToJoints(200, 50, 0, 0, 0, 0),   // Place
      cartesianToJoints(200, 50, 50, 0, 0, 0)   // Retreat place
  ]
};
export default example;
