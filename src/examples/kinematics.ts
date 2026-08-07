export interface KinematicsPoint {
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
  tx?: number;
  ty?: number;
}

export interface KinematicsExample {
  id: string;
  name: string;
  points: KinematicsPoint[];
}

const generateCircle = (radius: number, points: number, z: number, xOff = 200, yOff = 0) => {
  return Array.from({ length: points }, (_, i) => ({
    x: xOff + radius * Math.cos((i * Math.PI * 2) / points),
    y: yOff + radius * Math.sin((i * Math.PI * 2) / points),
    z,
    a: 0, b: 0, c: (i * 360) / points,
  }));
};

const generateSpiral = (revolutions: number, points: number, maxRadius: number, zStart: number, zEnd: number, xOff = 200) => {
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

const generateWave = (points: number, length: number, amplitude: number, frequency: number, xOff = 200) => {
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

const generateStar = (radius: number, innerRadius: number, points: number, xOff = 200) => {
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

const generateRaster = (width: number, height: number, lines: number, xOff = 200) => {
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

export const examples: KinematicsExample[] = [
  {
    id: 'example-1-square',
    name: 'Square Trajectory',
    points: [
      { x: 180, y: -45, z: 100, a: 0, b: 0, c: 0 },
      { x: 270, y: -45, z: 100, a: 0, b: 0, c: 0 },
      { x: 270, y: 45, z: 100, a: 0, b: 0, c: 0 },
      { x: 180, y: 45, z: 100, a: 0, b: 0, c: 0 },
      { x: 180, y: -45, z: 100, a: 0, b: 0, c: 0 },
    ],
  },
  {
    id: 'example-2-circle',
    name: 'Circle Trajectory',
    points: generateCircle(60, 36, 120),
  },
  {
    id: 'example-3-pick-place',
    name: 'Pick and Place',
    points: [
      { x: 200, y: -50, z: 150, a: 0, b: 90, c: 0 }, // Approach
      { x: 200, y: -50, z: 60, a: 0, b: 90, c: 0 },  // Pick
      { x: 200, y: -50, z: 150, a: 0, b: 90, c: 0 }, // Lift
      { x: 200, y: 50, z: 150, a: 0, b: 90, c: 0 }, // Move
      { x: 200, y: 50, z: 60, a: 0, b: 90, c: 0 }, // Place
      { x: 200, y: 50, z: 150, a: 0, b: 90, c: 0 }, // Lift
    ],
  },
  {
    id: 'example-4-xy-table-scan',
    name: 'XY Table Area Scan',
    points: [
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 0 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 0 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 50 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 50 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 100 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 100 },
    ],
  },
  {
    id: 'example-5-xy-table-sync',
    name: 'Sync Robot & XY Table',
    points: [
      { x: 200, y: 0, z: 120, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
      { x: 250, y: -50, z: 160, a: 45, b: 0, c: 0, tx: 200, ty: 200 },
      { x: 250, y: 50, z: 160, a: -45, b: 0, c: 0, tx: 300, ty: 100 },
      { x: 200, y: 0, z: 120, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
    ],
  },
  {
    id: 'example-6-spiral',
    name: '3D Spiral',
    points: generateSpiral(3, 48, 60, 60, 180),
  },
  {
    id: 'example-7-wave',
    name: 'Sine Wave Trace',
    points: generateWave(36, 120, 40, 2),
  },
  {
    id: 'example-8-star',
    name: '5-Point Star',
    points: generateStar(60, 25, 5),
  },
  {
    id: 'example-9-hexagon',
    name: 'Hexagonal Path',
    points: generateCircle(50, 6, 120).map(p => ({ ...p, c: 0 })), // no rotation
  },
  {
    id: 'example-10-figure8',
    name: 'Figure 8 (Infinity)',
    points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 200 + 60 * Math.sin(t),
        y: 60 * Math.sin(t) * Math.cos(t),
        z: 130,
        a: 0, b: 0, c: 0,
      }
    }),
  },
  {
    id: 'example-11-vertical-zig-zag',
    name: 'Vertical Zig-Zag',
    points: Array.from({ length: 10 }, (_, i) => ({
      x: 200,
      y: -50 + i * 11,
      z: i % 2 === 0 ? 110 : 180,
      a: 0, b: 0, c: 0,
    })),
  },
  {
    id: 'example-12-raster-scan',
    name: 'Dense Raster Scan',
    points: generateRaster(100, 80, 5),
  },
  {
    id: 'example-13-xy-table-large-raster',
    name: 'XY Table Large Raster',
    points: generateRaster(20, 20, 3).map((p, i) => ({
      ...p,
      tx: 100 + (i * 20) % 300,
      ty: 100 + Math.floor(i / 5) * 50,
    })),
  },
  {
    id: 'example-14-xy-table-circle-chase',
    name: 'XY Table Circle Chase',
    points: Array.from({ length: 24 }, (_, i) => {
      const t = (i * Math.PI * 2) / 24;
      return {
        x: 200 + 30 * Math.cos(t * 2), // fast circle
        y: 30 * Math.sin(t * 2),
        z: 110,
        a: 0, b: 0, c: 0,
        tx: 250 + 100 * Math.cos(t), // slow circle on table
        ty: 250 + 100 * Math.sin(t),
      };
    }),
  },
  {
    id: 'example-15-pyramid',
    name: 'Pyramid Contour',
    points: [
      { x: 170, y: -30, z: 100, a: 0, b: 0, c: 0 },
      { x: 230, y: -30, z: 100, a: 0, b: 0, c: 0 },
      { x: 230, y: 30, z: 100, a: 0, b: 0, c: 0 },
      { x: 170, y: 30, z: 100, a: 0, b: 0, c: 0 },
      { x: 170, y: -30, z: 100, a: 0, b: 0, c: 0 },
      { x: 180, y: -20, z: 140, a: 0, b: 0, c: 0 },
      { x: 220, y: -20, z: 140, a: 0, b: 0, c: 0 },
      { x: 220, y: 20, z: 140, a: 0, b: 0, c: 0 },
      { x: 180, y: 20, z: 140, a: 0, b: 0, c: 0 },
      { x: 180, y: -20, z: 140, a: 0, b: 0, c: 0 },
      { x: 200, y: 0, z: 180, a: 0, b: 0, c: 0 },
    ],
  },
  {
    id: 'example-16-xy-table-diagonal-sweep',
    name: 'XY Table Diagonal Sweep',
    points: Array.from({ length: 20 }, (_, i) => ({
      x: 200 + 20 * Math.sin(i),
      y: 20 * Math.cos(i),
      z: 115,
      a: 0, b: 0, c: 0,
      tx: i * 20,
      ty: i * 20,
    })),
  },
  {
    id: 'example-17-xy-table-spiral-out',
    name: 'XY Table Spiral Out',
    points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return {
        x: 200, y: 0, z: 110 + t * 40,
        a: 0, b: 0, c: t * 360,
        tx: 250 + t * 150 * Math.cos(t * Math.PI * 6),
        ty: 250 + t * 150 * Math.sin(t * Math.PI * 6),
      }
    }),
  },
  {
    id: 'example-18-xy-table-snake',
    name: 'XY Table Snake Pattern',
    points: Array.from({ length: 25 }, (_, i) => ({
      x: 200 + (i % 2 === 0 ? 20 : -20),
      y: 0, z: 105, a: 0, b: 0, c: 0,
      tx: 100 + (i % 5) * 50,
      ty: 100 + Math.floor(i / 5) * 50,
    })),
  },
  {
    id: 'example-19-wobble',
    name: 'Joint Wobble Test',
    points: Array.from({ length: 30 }, (_, i) => ({
      x: 200, y: 0, z: 130,
      a: 45 * Math.sin(i * 0.5),
      b: 45 * Math.cos(i * 0.5),
      c: 90 * Math.sin(i * 0.2),
    })),
  },
  {
    id: 'example-20-xy-table-pnp-matrix',
    name: 'XY Table PnP Matrix',
    points: Array.from({ length: 9 }, (_, i) => {
      const tx = 100 + (i % 3) * 100;
      const ty = 100 + Math.floor(i / 3) * 100;
      return [
        { x: 200, y: 0, z: 140, a: 0, b: 90, c: 0, tx, ty },
        { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx, ty },
        { x: 200, y: 0, z: 140, a: 0, b: 90, c: 0, tx, ty },
      ];
    }).flat(),
  },
  {
    id: 'example-21-heart',
    name: 'Heart Shape Trace',
    points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 200 + 40 * Math.pow(Math.sin(t), 3),
        y: 35 * Math.cos(t) - 10 * Math.cos(2*t) - 5 * Math.cos(3*t) - 2 * Math.cos(4*t),
        z: 110,
        a: 0, b: 0, c: 0,
      }
    }),
  },
  {
    id: 'example-22-bouncing-ball',
    name: 'Bouncing Ball',
    points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return {
        x: 200 + t * 100 - 50,
        y: 0,
        z: 100 + Math.abs(Math.sin(t * Math.PI * 4)) * 50,
        a: 0, b: 0, c: 0,
      }
    }),
  },
  {
    id: 'example-23-xy-table-flower',
    name: 'XY Table Flower Pattern',
    points: Array.from({ length: 60 }, (_, i) => {
      const t = (i * Math.PI * 2) / 60;
      const r = 40 * Math.cos(4 * t); // 4-petal flower on robot
      return {
        x: 200 + r * Math.cos(t),
        y: r * Math.sin(t),
        z: 115,
        a: 0, b: 0, c: 0,
        tx: 250 + 50 * Math.cos(t), // slow circle on table
        ty: 250 + 50 * Math.sin(t),
      };
    }),
  },
  {
    id: 'example-24-chaotic-nodes',
    name: 'Chaotic Nodes',
    points: Array.from({ length: 20 }, () => ({
      x: 200 - 40 + Math.random() * 80,
      y: -40 + Math.random() * 80,
      z: 100 + Math.random() * 50,
      a: -45 + Math.random() * 90,
      b: -45 + Math.random() * 90,
      c: -180 + Math.random() * 360,
    })),
  },
  {
    id: 'example-25-calibration-routine',
    name: 'Calibration Routine (Extremes)',
    points: [
      { x: 250, y: 50, z: 150, a: 45, b: 45, c: 45 },
      { x: 150, y: 50, z: 150, a: -45, b: -45, c: -45 },
      { x: 150, y: -50, z: 100, a: -45, b: -45, c: -45 },
      { x: 250, y: -50, z: 100, a: 45, b: 45, c: 45 },
      { x: 200, y: 0, z: 145, a: 0, b: 0, c: 0 },
    ],
  },
];
