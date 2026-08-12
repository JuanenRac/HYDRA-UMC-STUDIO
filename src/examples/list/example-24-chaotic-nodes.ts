import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-24-chaotic-nodes',
  name: 'Chaotic Nodes',
  points: Array.from({ length: 20 }, () => ({
      x: 200 - 40 + Math.random() * 80,
      y: -40 + Math.random() * 80,
      z: 100 + Math.random() * 50,
      a: -45 + Math.random() * 90,
      b: -45 + Math.random() * 90,
      c: -180 + Math.random() * 360,
}))
};

export default example;
