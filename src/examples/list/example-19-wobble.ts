import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-19-wobble',
  name: 'Joint Wobble Test',
  points: Array.from({ length: 30 }, (_, i) => ({
      x: 200, y: 0, z: 130,
      a: 45 * Math.sin(i * 0.5),
      b: 45 * Math.cos(i * 0.5),
      c: 90 * Math.sin(i * 0.2),
}))
};

export default example;
