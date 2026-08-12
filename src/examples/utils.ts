export interface KinematicsPoint {
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
  tx?: number;
  ty?: number;
  j1?: number;
  j2?: number;
  j3?: number;
  j4?: number;
  j5?: number;
  j6?: number;
}

export interface KinematicsExample {
  id: string;
  name: string;
  points: KinematicsPoint[];
}

export const generateCircle = (radius: number, points: number, z: number, xOff = 200, yOff = 0) => {
  return Array.from({ length: points }, (_, i) => ({
    x: xOff + radius * Math.cos((i * Math.PI * 2) / points),
    y: yOff + radius * Math.sin((i * Math.PI * 2) / points),
    z,
    a: 0, b: 0, c: (i * 360) / points,
  }));
};

export const generateSpiral = (revolutions: number, points: number, maxRadius: number, zStart: number, zEnd: number, xOff = 200) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const r = maxRadius * t;
    const angle = revolutions * Math.PI * 2 * t;
    return {
      x: xOff + r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: zStart + (zEnd - zStart) * t,
      a: 0, b: 0, c: angle * (180 / Math.PI),
    };
  });
};

export const generateWave = (points: number, length: number, amplitude: number, frequency: number, xOff = 200) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const y = -length / 2 + length * t;
    return {
      x: xOff + amplitude * Math.sin(frequency * Math.PI * 2 * t),
      y,
      z: 20,
      a: 0, b: 0, c: 0,
    };
  });
};

export const generateStar = (radius: number, innerRadius: number, points: number, xOff = 200) => {
  const pts = [];
  const steps = points * 2;
  for (let i = 0; i <= steps; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (i * Math.PI * 2) / steps;
    pts.push({
      x: xOff + r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: 10,
      a: 0, b: 0, c: 0,
    });
  }
  return pts;
};

export const generateRaster = (width: number, height: number, lines: number, xOff = 200) => {
  const pts = [];
  for (let i = 0; i <= lines; i++) {
    const y = -height / 2 + (height * i) / lines;
    pts.push({ x: xOff - width / 2, y, z: 5, a: 0, b: 0, c: 0 });
    pts.push({ x: xOff + width / 2, y, z: 5, a: 0, b: 0, c: 0 });
    // zig zag connection
    if (i < lines) {
      const nextY = -height / 2 + (height * (i + 1)) / lines;
      pts.push({ x: xOff + width / 2, y: nextY, z: 5, a: 0, b: 0, c: 0 });
    }
  }
  return pts;
};

const L1 = 160;
const L2 = 200;

export function convertToJoints(pt: KinematicsPoint): KinematicsPoint {
  const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y) || 0.001;
  const zOff = pt.z - 195;
  const d = Math.sqrt(r * r + zOff * zOff);
  
  const j1 = Math.atan2(pt.y, pt.x) * (180 / Math.PI);
  
  let cosJ3 = (r * r + zOff * zOff - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  cosJ3 = Math.max(-1, Math.min(1, cosJ3));
  const j3 = Math.acos(cosJ3) * (180 / Math.PI);
  
  const phi = Math.atan2(r, zOff);
  let cosGamma = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  cosGamma = Math.max(-1, Math.min(1, cosGamma));
  const gamma = Math.acos(cosGamma);
  
  const theta1_rad = phi - gamma;
  const j2 = -theta1_rad * (180 / Math.PI);
  const j4 = pt.a || 0;
  const j5 = -j2 + j3 - 180 + (pt.b || 0); // basic mapping for examples
  const j6 = pt.c || 0;
  
  return { ...pt, j1, j2, j3, j4, j5, j6 };
}
