import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-20-xy-table-pnp-matrix',
  name: 'XY Table PnP Matrix',
  points: Array.from({ length: 9 }, (_, i) => {
      const tx = 100 + (i % 3) * 100;
      const ty = 100 + Math.floor(i / 3) * 100;
      return [
        { x: 200, y: 0, z: 140, a: 0, b: 90, c: 0, tx, ty },
        { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx, ty },
        { x: 200, y: 0, z: 140, a: 0, b: 90, c: 0, tx, ty },
      ];
}).flat()
};

export default example;
