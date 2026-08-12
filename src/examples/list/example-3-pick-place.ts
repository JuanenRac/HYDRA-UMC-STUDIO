import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-3-pick-place',
  name: 'Pick and Place',
  points: [
      { x: 200, y: -50, z: 150, a: 0, b: 90, c: 0 }, // Approach
      { x: 200, y: -50, z: 60, a: 0, b: 90, c: 0 },  // Pick
      { x: 200, y: -50, z: 150, a: 0, b: 90, c: 0 }, // Lift
      { x: 200, y: 50, z: 150, a: 0, b: 90, c: 0 }, // Move
      { x: 200, y: 50, z: 60, a: 0, b: 90, c: 0 }, // Place
      { x: 200, y: 50, z: 150, a: 0, b: 90, c: 0 }, // Lift
]
};

export default example;
