import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-18-xy-table-snake',
  name: 'XY Table Snake Pattern',
  points: Array.from({ length: 25 }, (_, i) => ({
      x: 200 + (i % 2 === 0 ? 20 : -20),
      y: 0, z: 105, a: 0, b: 0, c: 0,
      tx: 100 + (i % 5) * 50,
      ty: 100 + Math.floor(i / 5) * 50,
}))
};

export default example;
