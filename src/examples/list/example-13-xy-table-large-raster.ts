import type { KinematicsExample } from '../utils';
import { generateCircle, generateSpiral, generateWave, generateStar, generateRaster } from '../utils';

const example: KinematicsExample = {
  id: 'example-13-xy-table-large-raster',
  name: 'XY Table Large Raster',
  points: generateRaster(20, 20, 3).map((p, i) => ({
      ...p,
      tx: 100 + (i * 20) % 300,
      ty: 100 + Math.floor(i / 5) * 50,
}))
};

export default example;
