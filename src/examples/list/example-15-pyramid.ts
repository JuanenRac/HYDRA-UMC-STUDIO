import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
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
]
};

export default example;
