import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-8-star',
  name: '5-Point Star',
  points: generateStar(60, 25, 5)
};

export default example;
