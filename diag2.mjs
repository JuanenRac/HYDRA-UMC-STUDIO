import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import fs from 'fs';

const loader = new STLLoader();
function loadSTL(path) {
  const buf = fs.readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return loader.parse(ab);
}
function autoScale(geo) {
  const g = geo.clone();
  g.computeBoundingBox();
  const box = g.boundingBox;
  const maxDim = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
  if (maxDim > 2) g.scale(0.001, 0.001, 0.001);
  return g;
}
function bboxAfter(geo, matrix) {
  const g = geo.clone();
  g.applyMatrix4(matrix);
  g.computeBoundingBox();
  return g.boundingBox;
}
function stepMatrix(pos, rpy, axisArr, angleDeg) {
  const t = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
  const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
  const av = new THREE.Vector3(...axisArr).normalize();
  const q = new THREE.Quaternion().setFromAxisAngle(av, angleDeg * Math.PI / 180);
  return t.clone().multiply(r).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
}

function analyze(name, chain, meshPrefix, meshNames) {
  console.log(`\n======== ${name} (root target -Y, flipped) ========`);
  const j1 = chain[0];
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  const rootQuat = new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, -1, 0));
  const root = new THREE.Matrix4().makeRotationFromQuaternion(rootQuat);
  console.log('root euler (deg):', new THREE.Euler().setFromQuaternion(rootQuat).toArray().map(v => typeof v === 'number' ? (v * 180 / Math.PI).toFixed(2) : v));

  let m = root.clone();
  let overallMinY = Infinity, overallMaxY = -Infinity;
  let baseBox = null;
  for (let i = 0; i < meshNames.length; i++) {
    if (i > 0) m = m.multiply(stepMatrix(chain[i - 1].pos, chain[i - 1].rpy, chain[i - 1].axis, 0));
    const geo = autoScale(loadSTL(`${meshPrefix}/${meshNames[i]}.STL`));
    const b = bboxAfter(geo, m);
    if (i === 0) baseBox = b;
    overallMinY = Math.min(overallMinY, b.min.y);
    overallMaxY = Math.max(overallMaxY, b.max.y);
    console.log(`  ${meshNames[i]} bbox Y:[${b.min.y.toFixed(3)},${b.max.y.toFixed(3)}] X,Z center:${((b.min.x+b.max.x)/2).toFixed(3)},${((b.min.z+b.max.z)/2).toFixed(3)}`);
  }
  console.log(`overall Y span: [${overallMinY.toFixed(3)}, ${overallMaxY.toFixed(3)}]  (want mostly positive if 'builds upward')`);
  console.log(`base_link centering offset needed: offsetX=${(-(baseBox.min.x+baseBox.max.x)/2).toFixed(4)} offsetZ=${(-(baseBox.min.z+baseBox.max.z)/2).toFixed(4)} offsetY=${(-baseBox.min.y).toFixed(4)}`);
  return { rootEulerDeg: new THREE.Euler().setFromQuaternion(rootQuat).toArray() };
}

analyze('AR3', [
  { pos: [0, 0, 0.003445], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.064146, -0.16608], rpy: [1.5708, 0.5236, -1.5708], axis: [0, 0, -1] },
  { pos: [0.1525, -0.26414, 0], rpy: [0, 0, -1.4953816339], axis: [0, 0, -1] },
  { pos: [0, 0, 0.00675], rpy: [1.5708, -1.2554, -1.5708], axis: [0, 0, -1] },
  { pos: [0, 0, -0.22225], rpy: [3.1416, 0, -2.8262], axis: [-1, 0, 0] },
  { pos: [-0.000294, 0, 0.02117], rpy: [0, 0, 3.1416], axis: [0, 0, 1] },
], 'public/models/ar3', ['base_link', 'link_1', 'link_2', 'link_3', 'link_4', 'link_5', 'link_6']);

analyze('AR4', [
  { pos: [0, 0, 0.092], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
  { pos: [0, 0.06415, -0.07778], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
  { pos: [0, -0.305, 0], rpy: [0, 0, 3.1416], axis: [0, 0, -1] },
  { pos: [0, 0, 0], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
  { pos: [0, 0, -0.22294], rpy: [3.1416, 0, -1.5708], axis: [1, 0, 0] },
  { pos: [0, 0, 0.041], rpy: [0, 0, 0], axis: [0, 0, 1] },
], 'public/models/ar4', ['base_link', 'link_1', 'link_2', 'link_3', 'link_4', 'link_5', 'link_6']);

// Faze4: keep root at target +Y (arm builds upward correctly there), just need base_link's own offset
console.log('\n======== FAZE4 (root target +Y, unchanged - only need base_link offset) ========');
{
  const j1 = { pos: [0.075629, -0.21266, 0.050734], rpy: [-1.5708, 0, -1.5708], axis: [0, -1, 0] };
  const e = new THREE.Euler(j1.rpy[0], j1.rpy[1], j1.rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1.axis).applyEuler(e).normalize();
  const rootQuat = new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
  const root = new THREE.Matrix4().makeRotationFromQuaternion(rootQuat);
  const geo = autoScale(loadSTL('public/models/faze4/base_link.STL'));
  const b = bboxAfter(geo, root);
  console.log(`base_link bbox Y:[${b.min.y.toFixed(3)},${b.max.y.toFixed(3)}] X,Z center:${((b.min.x+b.max.x)/2).toFixed(3)},${((b.min.z+b.max.z)/2).toFixed(3)}`);
  console.log(`base_link centering offset needed: offsetX=${(-(b.min.x+b.max.x)/2).toFixed(4)} offsetZ=${(-(b.min.z+b.max.z)/2).toFixed(4)} offsetY=${(-b.min.y).toFixed(4)}`);
}

// Parol6: root already correct (-90 about X), just need base_link's own centering offset
console.log('\n======== PAROL6 (root unchanged, only need base_link offset) ========');
{
  const root = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const geo = autoScale(loadSTL('public/models/parol6/base_link.STL'));
  const b = bboxAfter(geo, root);
  console.log(`base_link bbox Y:[${b.min.y.toFixed(3)},${b.max.y.toFixed(3)}] X,Z center:${((b.min.x+b.max.x)/2).toFixed(3)},${((b.min.z+b.max.z)/2).toFixed(3)}`);
  console.log(`base_link centering offset needed: offsetX=${(-(b.min.x+b.max.x)/2).toFixed(4)} offsetZ=${(-(b.min.z+b.max.z)/2).toFixed(4)} offsetY=${(-b.min.y).toFixed(4)}`);
}
