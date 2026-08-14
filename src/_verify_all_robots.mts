import { ur5eJointsToCartesian } from './examples/ur5eKinematics';
import { parol6JointsToCartesian } from './examples/parol6Kinematics';
import { faze4JointsToCartesian } from './examples/faze4Kinematics';
import { ar3JointsToCartesian } from './examples/ar3Kinematics';
import { ar4JointsToCartesian } from './examples/ar4Kinematics';

const poses = [
  { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
  { j1: 30, j2: -40, j3: 25, j4: 0, j5: 0, j6: 0 },
  { j1: -60, j2: 20, j3: -30, j4: 0, j5: 0, j6: 0 },
];

console.log('UR5E');
for (const p of poses) console.log(JSON.stringify(ur5eJointsToCartesian(p as any)));

console.log('PAROL6');
for (const p of poses) console.log(JSON.stringify(parol6JointsToCartesian(p as any)));

console.log('FAZE4');
for (const p of poses) console.log(JSON.stringify(faze4JointsToCartesian(p as any)));

console.log('AR3');
for (const p of poses) console.log(JSON.stringify(ar3JointsToCartesian(p as any)));

console.log('AR4');
for (const p of poses) console.log(JSON.stringify(ar4JointsToCartesian(p as any)));
