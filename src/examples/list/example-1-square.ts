import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-1-square',
  name: 'Square Trajectory',
  points: [
      { x: 180, y: -45, z: 100, a: 0, b: 0, c: 0 },
      { x: 270, y: -45, z: 100, a: 0, b: 0, c: 0 },
      { x: 270, y: 45, z: 100, a: 0, b: 0, c: 0 },
      { x: 180, y: 45, z: 100, a: 0, b: 0, c: 0 },
      { x: 180, y: -45, z: 100, a: 0, b: 0, c: 0 },
]
};

export default example;
