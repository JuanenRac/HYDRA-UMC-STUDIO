// =============================================================================
// HYDRA-UMC STUDIO - React Component: example-9-hexagon.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

import type { KinematicsExample } from '../utils';
import { generateCircle } from '../utils';

// generateCircle(radius, points, z) places `points` vertices at
// i*360/points degrees for i = 0..points-1 - it never repeats the first
// vertex at the end (unlike example-1-square.ts's own explicit 5th
// point, or example-8-star.ts's own <=steps loop), so the last edge back
// to 0deg was missing here: with only 6 vertices, that's 1/6 of the
// hexagon's own perimeter left untraced, leaving an open "C" instead of
// a closed hexagon. Appending the first point again closes it, same as
// every other closed-polygon example in this folder does.
const hexPoints = generateCircle(50, 6, 120).map(p => ({ ...p, c: 0 }));

/** Stores the Example configuration or state data. */
const example: KinematicsExample = {
  id: 'example-9-hexagon',
  name: 'Hexagonal Path',
  points: [...hexPoints, hexPoints[0]]
};

export default example;
