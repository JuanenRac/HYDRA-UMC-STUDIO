import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-10-figure8',
  name: 'Figure 8 (Infinity)',
  points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 200 + 60 * Math.sin(t),
        y: 60 * Math.sin(t) * Math.cos(t),
        z: 130,
        a: 0, b: 0, c: 0,
      }
})
};

export default example;
