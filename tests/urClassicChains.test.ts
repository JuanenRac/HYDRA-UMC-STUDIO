// =============================================================================
// HYDRA-UMC STUDIO - tests/urClassicChains.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The UR3, UR5 and UR10 (classic generation) against the official Universal Robots DH tables, and against the values
// HYDRA-UMC-SUITE draws and computes for the same robots.
//
// The lateral offset d4 of a UR arm is split in the URDF between the shoulder joint, the elbow joint and the step from
// wrist_1 to wrist_2; STUDIO used to put d4 itself in that last step as well, which moved the wrist 27 mm (UR3), 16 mm (UR5)
// and 49 mm (UR10) sideways from where the real robot and the SUITE have it. SUITE tests/verify_batch6_kinematics.py holds
// the same reference poses and the same structural check: if either program changes a chain, one of the two fails.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { UR3CLASSIC_CHAIN, UR3CLASSIC_DH, ur3ClassicJointsToCartesian } from '../src/examples/ur3ClassicKinematics';
import { UR5CLASSIC_CHAIN, UR5CLASSIC_DH, ur5ClassicJointsToCartesian } from '../src/examples/ur5ClassicKinematics';
import { UR10CLASSIC_CHAIN, UR10CLASSIC_DH, ur10ClassicJointsToCartesian } from '../src/examples/ur10ClassicKinematics';
import type { UrClassicChain } from '../src/examples/urClassicKinematics';
import type { KinematicsPoint } from '../src/examples/utils';

// the first three joints at three poses: x, y, z in mm, the same numbers as SUITE's verify_batch6_kinematics.py
const POSES: KinematicsPoint[] = [
  { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
  { j1: 30, j2: -40, j3: 25, j4: 0, j5: 0, j6: 0 },
  { j1: -60, j2: 20, j3: -30, j4: 0, j5: 0, j6: 0 },
];

const MODELS = [
  {
    name: 'UR3',
    chain: UR3CLASSIC_CHAIN,
    dh: UR3CLASSIC_DH,
    forward: ur3ClassicJointsToCartesian,
    reference: [
      [456.90000000000003, -112.34999999999997, 0],
      [302.98358938083527, -304.65826237597304, 214.71659319446582],
      [324.19157028928794, 336.81627112658344, -45.00607575341835],
    ],
  },
  {
    name: 'UR5',
    chain: UR5CLASSIC_CHAIN,
    dh: UR5CLASSIC_DH,
    forward: ur5ClassicJointsToCartesian,
    reference: [
      [817.25, -109.14999999999998, 0],
      [576.7146652231306, -459.0019309762745, 377.93162509998274],
      [495.57467530768383, 640.0605165773575, -75.80711704616138],
    ],
  },
  {
    name: 'UR10',
    chain: UR10CLASSIC_CHAIN,
    dh: UR10CLASSIC_DH,
    forward: ur10ClassicJointsToCartesian,
    reference: [
      [1184.3, -163.94099999999995, 0],
      [828.7105624409988, -667.7590272680294, 545.4505385386893],
      [721.3712982847879, 921.5697397511759, -108.17973266003773],
    ],
  },
] as const;

const lateral = (chain: UrClassicChain) => chain.reduce((sum, step) => sum + step.pos[1], 0);

describe.each(MODELS)('$name classic chain', ({ chain, dh, forward, reference }) => {
  it('carries the official link lengths of the DH table', () => {
    expect(chain[0].pos[2]).toBeCloseTo(dh.d1, 9);
    expect(chain[2].pos[2]).toBeCloseTo(-dh.a2, 9);
    expect(chain[3].pos[2]).toBeCloseTo(-dh.a3, 9);
    expect(chain[5].pos[2]).toBeCloseTo(dh.d5, 9);
  });

  it('adds up the lateral offset to d4 exactly once, not to d4 plus the shoulder and elbow offsets', () => {
    expect(chain[1].pos[1]).toBeCloseTo(dh.shoulderOffset, 9);
    expect(chain[2].pos[1]).toBeCloseTo(dh.elbowOffset, 9);
    expect(lateral(chain)).toBeCloseTo(dh.d4, 9);
  });

  it('puts the tool where the SUITE puts it', () => {
    POSES.forEach((pose, index) => {
      const cartesian = forward(pose);
      expect(cartesian.x).toBeCloseTo(reference[index][0], 6);
      expect(cartesian.y).toBeCloseTo(reference[index][1], 6);
      expect(cartesian.z).toBeCloseTo(reference[index][2], 6);
    });
  });
});
