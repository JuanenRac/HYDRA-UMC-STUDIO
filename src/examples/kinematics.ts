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

const generateCircle = (radius: number, points: number, z: number) => {
  return Array.from({ length: points }, (_, i) => ({
    x: radius * Math.cos((i * Math.PI * 2) / points),
    y: radius * Math.sin((i * Math.PI * 2) / points),
    z,
    a: 0, b: 0, c: (i * 360) / points,
  }));
};

const generateSpiral = (revolutions: number, points: number, maxRadius: number, zStart: number, zEnd: number) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const r = maxRadius * t;
    const angle = revolutions * Math.PI * 2 * t;
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: zStart + (zEnd - zStart) * t,
      a: 0, b: 0, c: angle * (180 / Math.PI),
    };
  });
};

const generateWave = (points: number, length: number, amplitude: number, frequency: number) => {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const x = -length / 2 + length * t;
    return {
      x,
      y: amplitude * Math.sin(frequency * Math.PI * 2 * t),
      z: 20,
      a: 0, b: 0, c: 0,
    };
  });
};

const generateStar = (radius: number, innerRadius: number, points: number) => {
  const pts = [];
  const steps = points * 2;
  for (let i = 0; i <= steps; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (i * Math.PI * 2) / steps;
    pts.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      z: 10,
      a: 0, b: 0, c: 0,
    });
  }
  return pts;
};

const generateRaster = (width: number, height: number, lines: number) => {
  const pts = [];
  for (let i = 0; i <= lines; i++) {
    const y = -height / 2 + (height * i) / lines;
    pts.push({ x: -width / 2, y, z: 5, a: 0, b: 0, c: 0 });
    pts.push({ x: width / 2, y, z: 5, a: 0, b: 0, c: 0 });
    // zig zag connection
    if (i < lines) {
      const nextY = -height / 2 + (height * (i + 1)) / lines;
      pts.push({ x: width / 2, y: nextY, z: 5, a: 0, b: 0, c: 0 });
    }
  }
  return pts;
};

export const examples: KinematicsExample[] = [
  {
    id: 'example-1-square',
    name: 'Square Trajectory',
    points: [
      { x: 45, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 45, y: 45, z: 0, a: 0, b: 0, c: 0 },
      { x: 0, y: 45, z: 0, a: 0, b: 0, c: 0 },
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    ],
  },
  {
    id: 'example-2-circle',
    name: 'Circle Trajectory',
    points: generateCircle(30, 24, 15),
  },
  {
    id: 'example-3-pick-place',
    name: 'Pick and Place',
    points: [
      { x: 0, y: 0, z: 45, a: 0, b: 90, c: 0 }, // Approach
      { x: 0, y: 0, z: 0, a: 0, b: 90, c: 0 },  // Pick
      { x: 0, y: 0, z: 45, a: 0, b: 90, c: 0 }, // Lift
      { x: 90, y: 45, z: 45, a: 0, b: 90, c: 0 }, // Move
      { x: 90, y: 45, z: 0, a: 0, b: 90, c: 0 }, // Place
      { x: 90, y: 45, z: 45, a: 0, b: 90, c: 0 }, // Lift
    ],
  },
  {
    id: 'example-4-xy-table-scan',
    name: 'XY Table Area Scan',
    points: [
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 0, ty: 0 },
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 200, ty: 0 },
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 200, ty: 50 },
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 0, ty: 50 },
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 0, ty: 100 },
      { x: 0, y: 45, z: 0, a: 0, b: 90, c: 0, tx: 200, ty: 100 },
    ],
  },
  {
    id: 'example-5-xy-table-sync',
    name: 'Sync Robot & XY Table',
    points: [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
      { x: 45, y: -30, z: 30, a: 45, b: 0, c: 0, tx: 200, ty: 200 },
      { x: -45, y: -30, z: 30, a: -45, b: 0, c: 0, tx: 300, ty: 100 },
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
    ],
  },
  {
    id: 'example-6-spiral',
    name: '3D Spiral',
    points: generateSpiral(3, 36, 40, 0, 50),
  },
  {
    id: 'example-7-wave',
    name: 'Sine Wave Trace',
    points: generateWave(30, 80, 20, 2),
  },
  {
    id: 'example-8-star',
    name: '5-Point Star',
    points: generateStar(40, 15, 5),
  },
  {
    id: 'example-9-hexagon',
    name: 'Hexagonal Path',
    points: generateCircle(35, 6, 10).map(p => ({ ...p, c: 0 })), // no rotation
  },
  {
    id: 'example-10-figure8',
    name: 'Figure 8 (Infinity)',
    points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 40 * Math.sin(t),
        y: 40 * Math.sin(t) * Math.cos(t),
        z: 20,
        a: 0, b: 0, c: 0,
      }
    }),
  },
  {
    id: 'example-11-vertical-zig-zag',
    name: 'Vertical Zig-Zag',
    points: Array.from({ length: 10 }, (_, i) => ({
      x: -30 + i * 6,
      y: 0,
      z: i % 2 === 0 ? 0 : 40,
      a: 0, b: 0, c: 0,
    })),
  },
  {
    id: 'example-12-raster-scan',
    name: 'Dense Raster Scan',
    points: generateRaster(60, 60, 5),
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
        x: 30 * Math.cos(t * 2), // fast circle
        y: 30 * Math.sin(t * 2),
        z: 10,
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
      { x: -30, y: -30, z: 0, a: 0, b: 0, c: 0 },
      { x: 30, y: -30, z: 0, a: 0, b: 0, c: 0 },
      { x: 30, y: 30, z: 0, a: 0, b: 0, c: 0 },
      { x: -30, y: 30, z: 0, a: 0, b: 0, c: 0 },
      { x: -30, y: -30, z: 0, a: 0, b: 0, c: 0 },
      { x: -20, y: -20, z: 20, a: 0, b: 0, c: 0 },
      { x: 20, y: -20, z: 20, a: 0, b: 0, c: 0 },
      { x: 20, y: 20, z: 20, a: 0, b: 0, c: 0 },
      { x: -20, y: 20, z: 20, a: 0, b: 0, c: 0 },
      { x: -20, y: -20, z: 20, a: 0, b: 0, c: 0 },
      { x: 0, y: 0, z: 40, a: 0, b: 0, c: 0 },
    ],
  },
  {
    id: 'example-16-xy-table-diagonal-sweep',
    name: 'XY Table Diagonal Sweep',
    points: Array.from({ length: 20 }, (_, i) => ({
      x: 20 * Math.sin(i),
      y: 20 * Math.cos(i),
      z: 15,
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
        x: 0, y: 0, z: 10 + t * 20,
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
      x: i % 2 === 0 ? 20 : -20,
      y: 0, z: 5, a: 0, b: 0, c: 0,
      tx: 100 + (i % 5) * 50,
      ty: 100 + Math.floor(i / 5) * 50,
    })),
  },
  {
    id: 'example-19-wobble',
    name: 'Joint Wobble Test',
    points: Array.from({ length: 30 }, (_, i) => ({
      x: 0, y: 0, z: 30,
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
        { x: 0, y: 0, z: 40, a: 0, b: 90, c: 0, tx, ty },
        { x: 0, y: 0, z: 0, a: 0, b: 90, c: 0, tx, ty },
        { x: 0, y: 0, z: 40, a: 0, b: 90, c: 0, tx, ty },
      ];
    }).flat(),
  },
  {
    id: 'example-21-heart',
    name: 'Heart Shape Trace',
    points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 30 * Math.pow(Math.sin(t), 3),
        y: 25 * Math.cos(t) - 10 * Math.cos(2*t) - 5 * Math.cos(3*t) - 2 * Math.cos(4*t),
        z: 10,
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
        x: -50 + 100 * t,
        y: 0,
        z: Math.abs(40 * Math.sin(t * Math.PI * 3)),
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
        x: r * Math.cos(t),
        y: r * Math.sin(t),
        z: 15,
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
      x: -40 + Math.random() * 80,
      y: -40 + Math.random() * 80,
      z: Math.random() * 50,
      a: -45 + Math.random() * 90,
      b: -45 + Math.random() * 90,
      c: -180 + Math.random() * 360,
    })),
  },
  {
    id: 'example-25-calibration-routine',
    name: 'Calibration Routine (Extremes)',
    points: [
      { x: 90, y: 90, z: 90, a: 45, b: 45, c: 45 },
      { x: -90, y: 90, z: 90, a: -45, b: -45, c: -45 },
      { x: -90, y: -90, z: 0, a: -45, b: -45, c: -45 },
      { x: 90, y: -90, z: 0, a: 45, b: 45, c: 45 },
      { x: 0, y: 0, z: 45, a: 0, b: 0, c: 0 },
    ],
  },
];
