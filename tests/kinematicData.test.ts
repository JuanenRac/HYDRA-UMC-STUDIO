// =============================================================================
// HYDRA-UMC STUDIO - tests/kinematicData.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// src/data/kinematicData.json is the one table of joint ranges and home poses that this program and HYDRA-UMC-SUITE
// share. The solvers of each robot still carry their own constants; these checks keep the file and the constants
// from drifting apart, and, when the repository of SUITE sits next to this one, keep its copy of the file the same.
// =============================================================================
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import kinematicData from '../src/data/kinematicData.json';
import { ROBOT_MANUFACTURERS } from '../src/store';
import { jointLimitsFor } from '../src/examples/robotKinematicsDispatch';
import { homePoseFor } from '../src/lib/robotDetailHelpers';
import { AR3_HOME_POSE } from '../src/examples/ar3Kinematics';
import { AR4_HOME_POSE, AR4_JOINT_LIMITS_DEG } from '../src/examples/ar4Kinematics';
import { EDO_HOME_POSE } from '../src/examples/edoKinematics';
import { FAZE4_HOME_POSE } from '../src/examples/faze4Kinematics';
import { GEN2_HOME_POSE, GEN2_JOINT_LIMITS_DEG } from '../src/examples/gen2Kinematics';
import { GEN3LITE_HOME_POSE, GEN3LITE_JOINT_LIMITS_DEG } from '../src/examples/gen3LiteKinematics';
import { KOCH_HOME_POSE } from '../src/examples/kochKinematics';
import { LITE6_HOME_POSE, LITE6_JOINT_LIMITS_DEG } from '../src/examples/lite6Kinematics';
import { M710IC_HOME_POSE } from '../src/examples/m710icKinematics';
import { PAROL6_HOME_POSE, PAROL6_JOINT_LIMITS_DEG } from '../src/examples/parol6Kinematics';
import { PIPER_HOME_POSE, PIPER_JOINT_LIMITS_DEG } from '../src/examples/piperKinematics';
import { SOARM100_HOME_POSE } from '../src/examples/soArm100Kinematics';
import { UR10CLASSIC_HOME_POSE } from '../src/examples/ur10ClassicKinematics';
import { UR10E_HOME_POSE, UR10E_JOINT_LIMITS_DEG } from '../src/examples/ur10eKinematics';
import { UR16E_HOME_POSE, UR16E_JOINT_LIMITS_DEG } from '../src/examples/ur16eKinematics';
import { UR20_HOME_POSE, UR20_JOINT_LIMITS_DEG } from '../src/examples/ur20Kinematics';
import { UR3CLASSIC_HOME_POSE } from '../src/examples/ur3ClassicKinematics';
import { UR3E_HOME_POSE, UR3E_JOINT_LIMITS_DEG } from '../src/examples/ur3eKinematics';
import { UR5CLASSIC_HOME_POSE } from '../src/examples/ur5ClassicKinematics';
import { UR5E_HOME_POSE, UR5E_JOINT_LIMITS_DEG } from '../src/examples/ur5eKinematics';
import { VX300S_HOME_POSE } from '../src/examples/vx300sKinematics';
import { WX250S_HOME_POSE } from '../src/examples/wx250sKinematics';
import { XARM6_HOME_POSE, XARM6_JOINT_LIMITS_DEG } from '../src/examples/xarm6Kinematics';
import { Z1_HOME_POSE } from '../src/examples/z1Kinematics';

const JOINTS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
const models = kinematicData.models as unknown as Record<string, { limits: Record<string, [number, number]>; home: Record<string, number> }>;

const HOME_CONSTANTS: Array<[string, object]> = [
  ['Parol6 (6-DOF)', PAROL6_HOME_POSE],
  ['Faze4 (6-DOF)', FAZE4_HOME_POSE],
  ['AR3 (6-DOF)', AR3_HOME_POSE],
  ['AR4 (6-DOF)', AR4_HOME_POSE],
  ['UR3e (6-DOF)', UR3E_HOME_POSE],
  ['UR5e (6-DOF)', UR5E_HOME_POSE],
  ['UR10e (6-DOF)', UR10E_HOME_POSE],
  ['UR16e (6-DOF)', UR16E_HOME_POSE],
  ['UR20 (6-DOF)', UR20_HOME_POSE],
  ['xArm6 (6-DOF)', XARM6_HOME_POSE],
  ['Lite 6 (6-DOF)', LITE6_HOME_POSE],
  ['e.DO (6-DOF)', EDO_HOME_POSE],
  ['Gen3 Lite (6-DOF)', GEN3LITE_HOME_POSE],
  ['M-710iC (6-DOF)', M710IC_HOME_POSE],
  ['SO-ARM100 (5-DOF)', SOARM100_HOME_POSE],
  ['Gen2 (6-DOF)', GEN2_HOME_POSE],
  ['PiPER (6-DOF)', PIPER_HOME_POSE],
  ['Z1 (6-DOF)', Z1_HOME_POSE],
  ['ViperX 300 (6-DOF)', VX300S_HOME_POSE],
  ['WidowX 250 (6-DOF)', WX250S_HOME_POSE],
  ['Koch v1.1 (5-DOF)', KOCH_HOME_POSE],
  ['UR3 (6-DOF)', UR3CLASSIC_HOME_POSE],
  ['UR5 (6-DOF)', UR5CLASSIC_HOME_POSE],
  ['UR10 (6-DOF)', UR10CLASSIC_HOME_POSE],
];

const LIMIT_CONSTANTS: Array<[string, Record<string, [number, number]>]> = [
  ['Parol6 (6-DOF)', PAROL6_JOINT_LIMITS_DEG],
  ['AR4 (6-DOF)', AR4_JOINT_LIMITS_DEG],
  ['UR3e (6-DOF)', UR3E_JOINT_LIMITS_DEG],
  ['UR5e (6-DOF)', UR5E_JOINT_LIMITS_DEG],
  ['UR10e (6-DOF)', UR10E_JOINT_LIMITS_DEG],
  ['UR16e (6-DOF)', UR16E_JOINT_LIMITS_DEG],
  ['UR20 (6-DOF)', UR20_JOINT_LIMITS_DEG],
  ['xArm6 (6-DOF)', XARM6_JOINT_LIMITS_DEG],
  ['Lite 6 (6-DOF)', LITE6_JOINT_LIMITS_DEG],
  ['Gen3 Lite (6-DOF)', GEN3LITE_JOINT_LIMITS_DEG],
  ['Gen2 (6-DOF)', GEN2_JOINT_LIMITS_DEG],
  ['PiPER (6-DOF)', PIPER_JOINT_LIMITS_DEG],
];

describe('the shared table of joint ranges and home poses', () => {
  it('lists every robot model but the generic one, with six ranges that go up', () => {
    const expected = Object.keys(ROBOT_MANUFACTURERS).filter((m) => !m.startsWith('Generic')).sort();
    expect(Object.keys(models).sort()).toEqual(expected);
    for (const entry of Object.values(models)) {
      expect(Object.keys(entry.limits).sort()).toEqual([...JOINTS]);
      for (const [low, high] of Object.values(entry.limits)) expect(low).toBeLessThan(high);
    }
  });

  it('gives the home pose the constants of each model give', () => {
    for (const [model, constant] of HOME_CONSTANTS) expect(homePoseFor(model as never), model).toEqual(constant);
  });

  it('gives the generic pose and the generic range to a model that is not listed', () => {
    expect(homePoseFor('Generic (6-DOF)' as never)).toEqual({ j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 });
    for (const joint of JOINTS) expect(jointLimitsFor('Generic (6-DOF)' as never, joint)).toEqual([-180, 180]);
  });

  it('has the ranges the constants of each model have', () => {
    for (const [model, constant] of LIMIT_CONSTANTS) for (const joint of JOINTS) expect(models[model].limits[joint], `${model} ${joint}`).toEqual(constant[joint]);
  });

  it('is the same file HYDRA-UMC-SUITE reads, when that repository is next to this one', () => {
    const sibling = path.resolve(__dirname, '../../HYDRA-UMC-SUITE/assets/kinematic_data.json');
    if (!existsSync(sibling)) return;
    expect(JSON.parse(readFileSync(sibling, 'utf8'))).toEqual(kinematicData);
  });
});
