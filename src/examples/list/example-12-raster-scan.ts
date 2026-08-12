import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-12-raster-scan',
  name: 'Dense Raster Scan',
  points: generateRaster(100, 80, 5)
};

export default example;
