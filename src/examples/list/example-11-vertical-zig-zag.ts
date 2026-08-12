import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-11-vertical-zig-zag',
  name: 'Vertical Zig-Zag',
  points: Array.from({ length: 10 }, (_, i) => ({
      x: 200,
      y: -50 + i * 11,
      z: i % 2 === 0 ? 110 : 180,
      a: 0, b: 0, c: 0,
}))
};

export default example;
