import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-2-circle',
  name: 'Circle Trajectory',
  points: generateCircle(60, 36, 120)
};

export default example;
