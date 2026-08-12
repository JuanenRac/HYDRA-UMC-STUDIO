// =============================================================================
// HYDRA-UMC STUDIO - Example kinematics pattern: example-19-wobble.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { cartesianToJoints } from '../utils';

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-19-wobble',
  name: 'Joint Wobble Test',
  points: Array.from({ length: 30 }, (_, i) => cartesianToJoints(
      200, 0, 130,
      45 * Math.sin(i * 0.5),
      45 * Math.cos(i * 0.5),
      90 * Math.sin(i * 0.2)
  ))
};

export default example;
