// =============================================================================
// HYDRA-UMC STUDIO - Robot detail helpers: robotDetailHelpers.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Pure helpers of the robot detail screen, kept apart from the component so
// they can be tested and reused on their own.
// =============================================================================

import type { RobotState, RobotModel } from '../store';
import { PAROL6_HOME_POSE } from '../examples/parol6Kinematics';
import { FAZE4_HOME_POSE } from '../examples/faze4Kinematics';
import { AR3_HOME_POSE } from '../examples/ar3Kinematics';
import { AR4_HOME_POSE } from '../examples/ar4Kinematics';
import { UR3E_HOME_POSE } from '../examples/ur3eKinematics';
import { UR5E_HOME_POSE } from '../examples/ur5eKinematics';
import { UR10E_HOME_POSE } from '../examples/ur10eKinematics';
import { UR16E_HOME_POSE } from '../examples/ur16eKinematics';
import { UR20_HOME_POSE } from '../examples/ur20Kinematics';
import { XARM6_HOME_POSE } from '../examples/xarm6Kinematics';
import { LITE6_HOME_POSE } from '../examples/lite6Kinematics';
import { EDO_HOME_POSE } from '../examples/edoKinematics';
import { GEN3LITE_HOME_POSE } from '../examples/gen3LiteKinematics';
import { M710IC_HOME_POSE } from '../examples/m710icKinematics';
import { SOARM100_HOME_POSE } from '../examples/soArm100Kinematics';
import { GEN2_HOME_POSE } from '../examples/gen2Kinematics';
import { PIPER_HOME_POSE } from '../examples/piperKinematics';
import { Z1_HOME_POSE } from '../examples/z1Kinematics';
import { VX300S_HOME_POSE } from '../examples/vx300sKinematics';
import { WX250S_HOME_POSE } from '../examples/wx250sKinematics';
import { KOCH_HOME_POSE } from '../examples/kochKinematics';
import { UR3CLASSIC_HOME_POSE } from '../examples/ur3ClassicKinematics';
import { UR5CLASSIC_HOME_POSE } from '../examples/ur5ClassicKinematics';
import { UR10CLASSIC_HOME_POSE } from '../examples/ur10ClassicKinematics';
import { convertToCartesian } from '../examples/utils';
import { jointsToCartesianForModel, resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { positionResidualMm } from './reachCheck';

// Stable identity for a recordedPoints[] row, keyed off object reference rather
// than array index. Reorder (ArrowUp/ArrowDown) and delete swap/splice the SAME
// point objects in place, so identity survives a reorder even though position
// doesn't - unlike `key={i}`/an index-based "currently editing" state, which
// silently re-points at whatever object now occupies that index after a
// reorder/delete and can merge one point's edit into a different point's data.
const pointKeyMap = new WeakMap<object, number>();
let pointKeySeq = 0;
export function pointKeyFor(pt: object): number {
  let k = pointKeyMap.get(pt);
  if (k === undefined) {
    k = ++pointKeySeq;
    pointKeyMap.set(pt, k);
  }
  return k;
}

// Generic home pose (j2:-45,j3:45,j5:90) is fine for the shared-convention rigs, but
// robots with their own real kinematics need their own reachable, sensible pose instead.
export function homePoseFor(model: RobotModel) {
  if (model === 'Parol6 (6-DOF)') return { ...PAROL6_HOME_POSE };
  if (model === 'Faze4 (6-DOF)') return { ...FAZE4_HOME_POSE };
  if (model === 'AR3 (6-DOF)') return { ...AR3_HOME_POSE };
  if (model === 'AR4 (6-DOF)') return { ...AR4_HOME_POSE };
  if (model === 'UR3e (6-DOF)') return { ...UR3E_HOME_POSE };
  if (model === 'UR5e (6-DOF)') return { ...UR5E_HOME_POSE };
  if (model === 'UR10e (6-DOF)') return { ...UR10E_HOME_POSE };
  if (model === 'UR16e (6-DOF)') return { ...UR16E_HOME_POSE };
  if (model === 'UR20 (6-DOF)') return { ...UR20_HOME_POSE };
  if (model === 'xArm6 (6-DOF)') return { ...XARM6_HOME_POSE };
  if (model === 'Lite 6 (6-DOF)') return { ...LITE6_HOME_POSE };
  if (model === 'e.DO (6-DOF)') return { ...EDO_HOME_POSE };
  if (model === 'Gen3 Lite (6-DOF)') return { ...GEN3LITE_HOME_POSE };
  if (model === 'M-710iC (6-DOF)') return { ...M710IC_HOME_POSE };
  if (model === 'SO-ARM100 (5-DOF)') return { ...SOARM100_HOME_POSE };
  if (model === 'Gen2 (6-DOF)') return { ...GEN2_HOME_POSE };
  if (model === 'PiPER (6-DOF)') return { ...PIPER_HOME_POSE };
  if (model === 'Z1 (6-DOF)') return { ...Z1_HOME_POSE };
  if (model === 'ViperX 300 (6-DOF)') return { ...VX300S_HOME_POSE };
  if (model === 'WidowX 250 (6-DOF)') return { ...WX250S_HOME_POSE };
  if (model === 'Koch v1.1 (5-DOF)') return { ...KOCH_HOME_POSE };
  if (model === 'UR3 (6-DOF)') return { ...UR3CLASSIC_HOME_POSE };
  if (model === 'UR5 (6-DOF)') return { ...UR5CLASSIC_HOME_POSE };
  if (model === 'UR10 (6-DOF)') return { ...UR10CLASSIC_HOME_POSE };
  return { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 };
}

// jointLimitsFor moved to robotKinematicsDispatch.ts (imported above) so
// GamepadController.tsx's own per-joint jog can reuse the exact same
// clamping instead of duplicating this ternary chain a second time.

// resolveTargetJoints moved to robotKinematicsDispatch.ts (imported above) so
// GamepadController.tsx's own Cartesian XYZ jog can reuse the exact same
// per-model inverse-kinematics dispatch instead of duplicating this
// 23-branch chain a second time - same reasoning as jointLimitsFor's own
// move there (see that function's comment in robotKinematicsDispatch.ts).

// Stock examples (examples/list/*.ts) always store {j1..j6} computed against the SHARED
// generic 160mm/200mm formula (examples/utils.ts's cartesianToJoints), regardless of which
// robot ends up loading them - those numbers are only meaningful when read back through
// that SAME formula's forward kinematics (convertToCartesian), not as literal per-robot
// joint angles. Stamping the resulting Cartesian x/y/z/a/b/c onto each point once, here at
// load time, means every downstream consumer (PathVisualizer's drawn path, this file's own
// own playback loop below) can just use pt.x/y/z directly instead of re-guessing which
// formula a stored {j1..j6} was meant for - see robotKinematicsDispatch.ts's header comment
// for the full reasoning. j1..j6 are kept alongside (unused by the 4 real-kinematics robots
// once x is present, but still what the Generic model's own playback/UI reads).
export function withCartesian(pt: any) {
  if (pt.x !== undefined) return pt;
  const c = convertToCartesian(pt);
  return { ...pt, x: c.x, y: c.y, z: c.z, a: c.a, b: c.b, c: c.c };
}

export function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// A Work library is intentionally portable: legacy files contain generic
// {j1..j6} values generated by examples/utils.ts, while compact arrays are
// already native joints from a specific robot. Before either reaches Server,
// resolve it into one explicit, model-native trajectory. This is the boundary
// that prevents the same Work from making Faze4 and Parol6 follow unrelated
// joint paths merely because their folders contain files with the same name.
export function normalizeTrajectoryForRobot(rawPoints: unknown, targetRobot: Pick<RobotState, 'model' | 'joints'>, residuals?: Array<number | null>) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    throw new Error('A trajectory must contain at least one point');
  }

  return rawPoints.map((rawPoint, index) => {
    if (Array.isArray(rawPoint)) {
      if (rawPoint.length < 3 || !rawPoint.slice(0, 3).every((value) => typeof value === 'number' && Number.isFinite(value))) {
        throw new Error(`Compact trajectory point ${index + 1} requires finite j1, j2 and j3 values`);
      }
      residuals?.push(null);
      const joints = {
        j1: rawPoint[0], j2: rawPoint[1], j3: rawPoint[2],
        j4: targetRobot.joints.j4 ?? 0, j5: targetRobot.joints.j5 ?? 0, j6: targetRobot.joints.j6 ?? 0,
      };
      return {
        motionType: 'model-joints',
        ...joints,
        ...jointsToCartesianForModel(targetRobot.model, joints),
      };
    }

    if (!rawPoint || typeof rawPoint !== 'object') {
      throw new Error(`Trajectory point ${index + 1} must be an object or a compact joint triplet`);
    }

    const source = rawPoint as Record<string, unknown>;
    if (source.motionType === 'model-joints') {
      const nativeFields = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'];
      if (!nativeFields.every((field) => typeof source[field] === 'number' && Number.isFinite(source[field] as number))) {
        throw new Error(`Native trajectory point ${index + 1} requires finite j1 through j6 values`);
      }
      residuals?.push(null);
      const joints = {
        j1: source.j1 as number, j2: source.j2 as number, j3: source.j3 as number,
        j4: source.j4 as number, j5: source.j5 as number, j6: source.j6 as number,
      };
      const { motionType: _motionType, ...metadata } = source;
      return {
        ...metadata,
        motionType: 'model-joints',
        ...joints,
        ...jointsToCartesianForModel(targetRobot.model, joints),
      };
    }

    // No `motionType` means portable/generic authoring data. Its stored
    // joints must first be read through the generic FK before resolving the
    // resulting Cartesian pose for the selected robot model.
    const cartesian = withCartesian(source);
    if (![cartesian.x, cartesian.y, cartesian.z].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error(`Trajectory point ${index + 1} has no valid Cartesian position`);
    }
    const fallback = {
      j1: typeof source.j1 === 'number' ? source.j1 : targetRobot.joints.j1,
      j2: typeof source.j2 === 'number' ? source.j2 : targetRobot.joints.j2,
      j3: typeof source.j3 === 'number' ? source.j3 : targetRobot.joints.j3,
      j4: typeof source.j4 === 'number' ? source.j4 : targetRobot.joints.j4,
      j5: typeof source.j5 === 'number' ? source.j5 : targetRobot.joints.j5,
      j6: typeof source.j6 === 'number' ? source.j6 : targetRobot.joints.j6,
    };
    const joints = resolveTargetJoints(
      targetRobot.model,
      cartesian.x, cartesian.y, cartesian.z,
      cartesian.a ?? 0, cartesian.b ?? 0, cartesian.c ?? 0,
      fallback,
    );
    // How far the closest pose the arm can take is from the pose the Work asks for.
    const achieved = jointsToCartesianForModel(targetRobot.model, joints as any) as { x: number; y: number; z: number };
    residuals?.push(positionResidualMm({ x: cartesian.x, y: cartesian.y, z: cartesian.z }, achieved));
    const { j1: _j1, j2: _j2, j3: _j3, j4: _j4, j5: _j5, j6: _j6,
      x: _x, y: _y, z: _z, a: _a, b: _b, c: _c, motionType: _motionType, ...metadata } = source;
    return {
      ...metadata,
      motionType: 'model-joints',
      ...joints,
      x: cartesian.x, y: cartesian.y, z: cartesian.z,
      a: cartesian.a ?? 0, b: cartesian.b ?? 0, c: cartesian.c ?? 0,
    };
  });
}
