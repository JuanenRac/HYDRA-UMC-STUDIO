import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-6-spiral',
  name: '3D Spiral',
  points: generateSpiral(3, 48, 60, 60, 180)
};

export default example;
