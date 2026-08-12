import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-14-xy-table-circle-chase',
  name: 'XY Table Circle Chase',
  points: Array.from({ length: 24 }, (_, i) => {
      const t = (i * Math.PI * 2) / 24;
      return {
        x: 200 + 30 * Math.cos(t * 2),
        y: 30 * Math.sin(t * 2),
        z: 110,
        a: 0, b: 0, c: 0,
        tx: 250 + 100 * Math.cos(t),
        ty: 250 + 100 * Math.sin(t),
      };
})
};

export default example;
