// =============================================================================
// HYDRA-UMC STUDIO - React Component: utils.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================

/** Defines the data structure and expected properties for  kinematics point entities. */
export interface KinematicsPoint {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
  tx?: number;
  ty?: number;
  trz?: number;
}

/** Defines the data structure and expected properties for  kinematics example entities. */
export interface KinematicsExample {
  id: string;
  name: string;
  points: KinematicsPoint[];
}

/**
 * Executes the Convert to cartesian logic. 
 * This function handles the necessary computations and state updates.
 */
export function convertToCartesian(pt: KinematicsPoint): {x: number, y: number, z: number, a: number, b: number, c: number} {
  const j1Rad = (pt.j1 || 0) * (Math.PI / 180);
  const j2Rad = (pt.j2 || 0) * (Math.PI / 180);
  const j3Rad = (pt.j3 || 0) * (Math.PI / 180);
  
  const theta1_rad = -j2Rad;
  const R2 = 160 * Math.sin(theta1_rad) + 200 * Math.sin(theta1_rad + j3Rad);
  const Z2 = 160 * Math.cos(theta1_rad) + 200 * Math.cos(theta1_rad + j3Rad);
  
  const x = R2 * Math.cos(j1Rad);
  const y = R2 * Math.sin(j1Rad);
  const z = Z2 + 195;
  
  const a = pt.j4 || 0;
  const b = (pt.j5 || 0) + (pt.j2 || 0) - (pt.j3 || 0) + 180;
  const c = pt.j6 || 0;
  return { x, y, z, a, b, c };
}

/**
 * Executes the Cartesian to joints logic. 
 * This function handles the necessary computations and state updates.
 */
export function cartesianToJoints(x: number, y: number, z: number, a: number, b: number, c: number): KinematicsPoint {
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

/**
 * Renders the Generate circle component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const generateCircle = (radius: number, points: number, z: number, xOff = 200, yOff = 0) => {
  return Array.from({ length: points }, (_, i) => cartesianToJoints(
    xOff + radius * Math.cos((i * Math.PI * 2) / points),
    yOff + radius * Math.sin((i * Math.PI * 2) / points),
    z,
    0, 0, (i * 360) / points
  ));
};

/**
 * Renders the Generate spiral component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const generateSpiral = (revolutions: number, points: number, maxRadius: number, zStart: number, zEnd: number, xOff = 200) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const r = maxRadius * t;
    const angle = revolutions * Math.PI * 2 * t;
    return cartesianToJoints(
      xOff + r * Math.cos(angle),
      r * Math.sin(angle),
      zStart + (zEnd - zStart) * t,
      0, 0, angle * (180 / Math.PI)
    );
  });
};

/**
 * Renders the Generate wave component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const generateWave = (points: number, length: number, amplitude: number, frequency: number, xOff = 200) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const y = -length / 2 + length * t;
    return cartesianToJoints(
      xOff + amplitude * Math.sin(frequency * Math.PI * 2 * t),
      y,
      20,
      0, 0, 0
    );
  });
};

/**
 * Renders the Generate star component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const generateStar = (radius: number, innerRadius: number, points: number, xOff = 200) => {
  const pts = [];
  const steps = points * 2;
  for (let i = 0; i <= steps; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (i * Math.PI * 2) / steps;
    pts.push(cartesianToJoints(
      xOff + r * Math.cos(angle),
      r * Math.sin(angle),
      10,
      0, 0, 0
    ));
  }
  return pts;
};

/**
 * Renders the Generate raster component.
 * Responsible for displaying the UI elements and handling user interactions related to this feature.
 */
export const generateRaster = (width: number, height: number, lines: number, xOff = 200) => {
  const pts = [];
  for (let i = 0; i <= lines; i++) {
    const y = -height / 2 + (height * i) / lines;
    pts.push(cartesianToJoints(xOff - width / 2, y, 5, 0, 0, 0));
    pts.push(cartesianToJoints(xOff + width / 2, y, 5, 0, 0, 0));
    // zig zag connection
    if (i < lines) {
      const nextY = -height / 2 + (height * (i + 1)) / lines;
      pts.push(cartesianToJoints(xOff + width / 2, nextY, 5, 0, 0, 0));
    }
  }
  return pts;
};
