import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-7-wave',
  name: 'Sine Wave Trace',
  points: generateWave(36, 120, 40, 2)
};

export default example;
