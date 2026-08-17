// =============================================================================
// HYDRA-UMC STUDIO - Server-side Kinematics Engine
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

export interface Joints {
  j1: number; j2: number; j3: number; j4: number; j5: number; j6: number;
}

export interface Position {
  x: number; y: number; z: number; a: number; b: number; c: number;
}

/**
 * Calculates joint angles from Cartesian coordinates (Inverse Kinematics).
 * Ported from frontend src/examples/utils.ts
 */
export function calculateJoints(pos: Position): Joints {
  const { x, y, z, a, b, c } = pos;
  const r = Math.sqrt(x * x + y * y) || 0.001;
  const zOff = z - 195;
  const d = Math.sqrt(r * r + zOff * zOff);

  const j1 = Math.atan2(y, x) * (180 / Math.PI);

  let cosJ3 = (r * r + zOff * zOff - 160 * 160 - 200 * 200) / (2 * 160 * 200);
  cosJ3 = Math.max(-1, Math.min(1, cosJ3));
  const j3 = Math.acos(cosJ3) * (180 / Math.PI);

  const phi = Math.atan2(r, zOff);
  let cosGamma = (160 * 160 + d * d - 200 * 200) / (2 * 160 * d);
  cosGamma = Math.max(-1, Math.min(1, cosGamma));
  const gamma = Math.acos(cosGamma);

  const theta1_rad = phi - gamma;
  const j2 = -theta1_rad * (180 / Math.PI);
  const j4 = a || 0;
  const j5 = -j2 + j3 - 180 + (b || 0);
  const j6 = c || 0;

  return { j1, j2, j3, j4, j5, j6 };
}
