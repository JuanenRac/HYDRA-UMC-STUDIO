import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-23-xy-table-flower',
  name: 'XY Table Flower Pattern',
  points: Array.from({ length: 60 }, (_, i) => {
      const t = (i * Math.PI * 2) / 60;
      const r = 40 * Math.cos(4 * t);
      return {
        x: 200 + r * Math.cos(t),
        y: r * Math.sin(t),
        z: 115,
        a: 0, b: 0, c: 0,
        tx: 250 + 50 * Math.cos(t),
        ty: 250 + 50 * Math.sin(t),
      };
})
};

export default example;
