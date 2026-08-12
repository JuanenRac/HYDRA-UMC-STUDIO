import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-9-hexagon',
  name: 'Hexagonal Path',
  points: generateCircle(50, 6, 120).map(p => ({ ...p, c: 0 }))
};

export default example;
