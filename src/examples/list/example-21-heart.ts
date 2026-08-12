import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-21-heart',
  name: 'Heart Shape Trace',
  points: Array.from({ length: 40 }, (_, i) => {
      const t = (i * Math.PI * 2) / 40;
      return {
        x: 200 + 40 * Math.pow(Math.sin(t), 3),
        y: 35 * Math.cos(t) - 10 * Math.cos(2*t) - 5 * Math.cos(3*t) - 2 * Math.cos(4*t),
        z: 110,
        a: 0, b: 0, c: 0,
      }
})
};

export default example;
