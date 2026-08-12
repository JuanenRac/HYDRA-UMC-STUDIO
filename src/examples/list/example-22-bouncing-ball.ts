import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-22-bouncing-ball',
  name: 'Bouncing Ball',
  points: Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return {
        x: 200 + t * 100 - 50,
        y: 0,
        z: 100 + Math.abs(Math.sin(t * Math.PI * 4)) * 50,
        a: 0, b: 0, c: 0,
      }
})
};

export default example;
