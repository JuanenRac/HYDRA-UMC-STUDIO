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

console.log('======== PAROL6 ========');
{
  const base = 'public/models/parol6/base_link.STL';
  const geo = autoScale(loadSTL(base));
  const root = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const box = bboxAfter(geo, root);
  console.log('base_link bbox after root rotation:', box.min, box.max);
  console.log('center X,Z:', (box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, ' minY:', box.min.y);
}

console.log('\n======== FAZE4 ========');
{
  const base = 'public/models/faze4/base_link.STL';
  const geo = autoScale(loadSTL(base));
  // FAZE4_ROOT_QUAT: joint1 axis (0,-1,0) transformed by rpy(-1.5708,0,-1.5708), aligned to (0,1,0)
  const j1rpy = [-1.5708, 0, -1.5708];
  const j1axis = [0, -1, 0];
  const e = new THREE.Euler(j1rpy[0], j1rpy[1], j1rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1axis).applyEuler(e).normalize();
  const rootQuat = new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
  const root = new THREE.Matrix4().makeRotationFromQuaternion(rootQuat);
  const box = bboxAfter(geo, root);
  console.log('axisWorld:', axisWorld);
  console.log('base_link bbox after root rotation:', box.min, box.max);
  console.log('center X,Z:', (box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, ' minY:', box.min.y, ' maxY:', box.max.y);

  // Check overall structure direction: compute FULL chain tip at all-zero pose, see if it's above or below base_link's own span
  const CHAIN = [
    { pos: [0.075629, -0.21266, 0.050734], rpy: [-1.5708, 0, -1.5708], axis: [0, -1, 0] },
    { pos: [0, -0.20182, 0], rpy: [0, 0, -1.8111], axis: [0, 0, 1] },
    { pos: [0.32, 0, 0], rpy: [3.1416, 0, -1.1753], axis: [0, 0, -1] },
    { pos: [0, -0.0735, 0], rpy: [-0.5648, -0.78173, 1.7809], axis: [0.14804, 0.90477, 0.39934] },
    { pos: [0.037114, 0.22683, 0.10011], rpy: [2.2965, -0.74045, -0.57161], axis: [-1, 0, 0] },
    { pos: [0, 0, -0.042312], rpy: [-3.1416, 0, 0.2419], axis: [0, 0, 1] },
  ];
  function stepMatrix(pos, rpy, axisArr, angleDeg) {
    const t = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
    const av = new THREE.Vector3(...axisArr).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(av, angleDeg * Math.PI / 180);
    return t.clone().multiply(r).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
  let m = root.clone();
  for (const c of CHAIN) m = m.multiply(stepMatrix(c.pos, c.rpy, c.axis, 0));
  const tip = new THREE.Vector3(); tip.setFromMatrixPosition(m);
  console.log('all-zero pose tip position (world, after root):', tip);
}

console.log('\n======== AR3 ========');
{
  const base = 'public/models/ar3/base_link.STL';
  const geo = autoScale(loadSTL(base));
  const j1rpy = [3.1416, 0, 0];
  const j1axis = [0, 0, 1];
  const e = new THREE.Euler(j1rpy[0], j1rpy[1], j1rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1axis).applyEuler(e).normalize();
  const rootQuat = new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
  const root = new THREE.Matrix4().makeRotationFromQuaternion(rootQuat);
  const box = bboxAfter(geo, root);
  console.log('axisWorld:', axisWorld);
  console.log('base_link bbox after root rotation:', box.min, box.max);
  console.log('center X,Z:', (box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, ' minY:', box.min.y, ' maxY:', box.max.y);

  const CHAIN = [
    { pos: [0, 0, 0.003445], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
    { pos: [0, 0.064146, -0.16608], rpy: [1.5708, 0.5236, -1.5708], axis: [0, 0, -1] },
    { pos: [0.1525, -0.26414, 0], rpy: [0, 0, -1.4953816339], axis: [0, 0, -1] },
    { pos: [0, 0, 0.00675], rpy: [1.5708, -1.2554, -1.5708], axis: [0, 0, -1] },
    { pos: [0, 0, -0.22225], rpy: [3.1416, 0, -2.8262], axis: [-1, 0, 0] },
    { pos: [-0.000294, 0, 0.02117], rpy: [0, 0, 3.1416], axis: [0, 0, 1] },
  ];
  function stepMatrix(pos, rpy, axisArr, angleDeg) {
    const t = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
    const av = new THREE.Vector3(...axisArr).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(av, angleDeg * Math.PI / 180);
    return t.clone().multiply(r).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
  let m = root.clone();
  for (const c of CHAIN) m = m.multiply(stepMatrix(c.pos, c.rpy, c.axis, 0));
  const tip = new THREE.Vector3(); tip.setFromMatrixPosition(m);
  console.log('all-zero pose tip position (world, after root):', tip);

  // Also check link_1..link_6 individual bounding boxes stacked, to see overall silhouette span
  let mChain = root.clone();
  for (let i = 0; i < CHAIN.length; i++) {
    mChain = mChain.multiply(stepMatrix(CHAIN[i].pos, CHAIN[i].rpy, CHAIN[i].axis, 0));
    const linkGeo = autoScale(loadSTL(`public/models/ar3/link_${i + 1}.STL`));
    const b = bboxAfter(linkGeo, mChain);
    console.log(`  link_${i+1} bbox Y range: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}]  center X,Z: ${((b.min.x+b.max.x)/2).toFixed(3)},${((b.min.z+b.max.z)/2).toFixed(3)}`);
  }
}

console.log('\n======== AR4 ========');
{
  const base = 'public/models/ar4/base_link.STL';
  const geo = autoScale(loadSTL(base));
  const j1rpy = [3.1416, 0, 0];
  const j1axis = [0, 0, 1];
  const e = new THREE.Euler(j1rpy[0], j1rpy[1], j1rpy[2], 'XYZ');
  const axisWorld = new THREE.Vector3(...j1axis).applyEuler(e).normalize();
  const rootQuat = new THREE.Quaternion().setFromUnitVectors(axisWorld, new THREE.Vector3(0, 1, 0));
  const root = new THREE.Matrix4().makeRotationFromQuaternion(rootQuat);
  const box = bboxAfter(geo, root);
  console.log('axisWorld:', axisWorld);
  console.log('base_link bbox after root rotation:', box.min, box.max);
  console.log('center X,Z:', (box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2, ' minY:', box.min.y, ' maxY:', box.max.y);

  const CHAIN = [
    { pos: [0, 0, 0.092], rpy: [3.1416, 0, 0], axis: [0, 0, 1] },
    { pos: [0, 0.06415, -0.07778], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
    { pos: [0, -0.305, 0], rpy: [0, 0, 3.1416], axis: [0, 0, -1] },
    { pos: [0, 0, 0], rpy: [1.5708, 0, -1.5708], axis: [0, 0, -1] },
    { pos: [0, 0, -0.22294], rpy: [3.1416, 0, -1.5708], axis: [1, 0, 0] },
    { pos: [0, 0, 0.041], rpy: [0, 0, 0], axis: [0, 0, 1] },
  ];
  function stepMatrix(pos, rpy, axisArr, angleDeg) {
    const t = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]);
    const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
    const av = new THREE.Vector3(...axisArr).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(av, angleDeg * Math.PI / 180);
    return t.clone().multiply(r).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
  let mChain = root.clone();
  for (let i = 0; i < CHAIN.length; i++) {
    mChain = mChain.multiply(stepMatrix(CHAIN[i].pos, CHAIN[i].rpy, CHAIN[i].axis, 0));
    const linkGeo = autoScale(loadSTL(`public/models/ar4/link_${i + 1}.STL`));
    const b = bboxAfter(linkGeo, mChain);
    console.log(`  link_${i+1} bbox Y range: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}]  center X,Z: ${((b.min.x+b.max.x)/2).toFixed(3)},${((b.min.z+b.max.z)/2).toFixed(3)}`);
  }
}
