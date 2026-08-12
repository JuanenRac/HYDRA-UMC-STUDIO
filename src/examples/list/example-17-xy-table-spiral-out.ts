import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-17-xy-table-spiral-out',
  name: 'XY Table Spiral Out',
  points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return {
        x: 200, y: 0, z: 110 + t * 40,
        a: 0, b: 0, c: t * 360,
        tx: 250 + t * 150 * Math.cos(t * Math.PI * 6),
        ty: 250 + t * 150 * Math.sin(t * Math.PI * 6),
      }
})
};

export default example;
