import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-5-xy-table-sync',
  name: 'Sync Robot & XY Table',
  points: [
      { x: 200, y: 0, z: 120, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
      { x: 250, y: -50, z: 160, a: 45, b: 0, c: 0, tx: 200, ty: 200 },
      { x: 250, y: 50, z: 160, a: -45, b: 0, c: 0, tx: 300, ty: 100 },
      { x: 200, y: 0, z: 120, a: 0, b: 0, c: 0, tx: 100, ty: 100 },
]
};

export default example;
