import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-16-xy-table-diagonal-sweep',
  name: 'XY Table Diagonal Sweep',
  points: Array.from({ length: 20 }, (_, i) => ({
      x: 200 + 20 * Math.sin(i),
      y: 20 * Math.cos(i),
      z: 115,
      a: 0, b: 0, c: 0,
      tx: i * 20,
      ty: i * 20,
}))
};

export default example;
