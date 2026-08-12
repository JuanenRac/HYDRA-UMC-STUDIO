import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-4-xy-table-scan',
  name: 'XY Table Area Scan',
  points: [
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 0 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 0 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 50 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 50 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 0, ty: 100 },
      { x: 200, y: 0, z: 100, a: 0, b: 90, c: 0, tx: 200, ty: 100 },
]
};

export default example;
