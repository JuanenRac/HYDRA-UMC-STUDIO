import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-25-calibration-routine',
  name: 'Calibration Routine',
  points: [
      { x: 250, y: 50, z: 150, a: 45, b: 45, c: 45 },
      { x: 150, y: 50, z: 150, a: -45, b: -45, c: -45 },
      { x: 150, y: -50, z: 100, a: -45, b: -45, c: -45 },
      { x: 250, y: -50, z: 100, a: 45, b: 45, c: 45 },
      { x: 200, y: 0, z: 145, a: 0, b: 0, c: 0 },
]
};

export default example;
