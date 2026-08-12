// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-24-chaotic-nodes.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-24-chaotic-nodes',
  name: 'Chaotic Nodes',
  points: Array.from({ length: 20 }, () => cartesianToJoints(
      200 - 40 + Math.random() * 80,
      -40 + Math.random() * 80,
      100 + Math.random() * 50,
      -45 + Math.random() * 90,
      -45 + Math.random() * 90,
      -180 + Math.random() * 360
  ))
};

export default example;
