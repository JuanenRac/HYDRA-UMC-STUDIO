// =============================================================================
// HYDRA-UMC STUDIO - robotKinematicsDispatch.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Single source of truth for "given a robot MODEL and a set of joint angles
// {j1..j6} that are already THAT ROBOT's OWN native joint values (not the
// shared generic 160mm/200mm formula's output), where does its tool tip end
// up in Cartesian space". Used by both PathVisualizer.tsx (drawing the 3D
// path/step line) and RobotDetail.tsx (recording a point's Cartesian
// position at the moment it's captured) - kept centralized here rather than
// duplicated between the two, like resolveTargetJoints()/homePoseFor() already are.
//
// IMPORTANT: this only makes sense for joint values in THIS robot's own
// native semantics. Parol6/Faze4/AR3/AR4 (RobotDetail.tsx's jog sliders
// write directly to robot.joints, which these 4 models' own *Arm.tsx render
// via their real URDF-driven FK) - so live-jogged/recorded points naturally
// qualify. A stock example's points do NOT (they're generated once against
// the shared generic formula, regardless of which robot later loads them) -
// those must be converted through convertToCartesian()'s generic FK instead,
// at load time (see RobotDetail.tsx's loadExample/loadExampleForRobot), so
// that by the time a point reaches this dispatcher it's already in the
// right frame.
// =============================================================================

import type { RobotModel } from '../store';
import { parol6JointsToCartesian, PAROL6_JOINT_LIMITS_DEG } from './parol6Kinematics';
import { faze4JointsToCartesian } from './faze4Kinematics';
import { ar3JointsToCartesian } from './ar3Kinematics';
import { ar4JointsToCartesian, AR4_JOINT_LIMITS_DEG } from './ar4Kinematics';
import { ur3eJointsToCartesian, UR3E_JOINT_LIMITS_DEG } from './ur3eKinematics';
import { ur5eJointsToCartesian, UR5E_JOINT_LIMITS_DEG } from './ur5eKinematics';
import { ur10eJointsToCartesian, UR10E_JOINT_LIMITS_DEG } from './ur10eKinematics';
import { ur16eJointsToCartesian, UR16E_JOINT_LIMITS_DEG } from './ur16eKinematics';
import { ur20JointsToCartesian, UR20_JOINT_LIMITS_DEG } from './ur20Kinematics';
import { xarm6JointsToCartesian, XARM6_JOINT_LIMITS_DEG } from './xarm6Kinematics';
import { lite6JointsToCartesian, LITE6_JOINT_LIMITS_DEG } from './lite6Kinematics';
import { edoJointsToCartesian } from './edoKinematics';
import { gen3LiteJointsToCartesian, GEN3LITE_JOINT_LIMITS_DEG } from './gen3LiteKinematics';
import { m710icJointsToCartesian } from './m710icKinematics';
import { soArm100JointsToCartesian } from './soArm100Kinematics';
import { gen2JointsToCartesian, GEN2_JOINT_LIMITS_DEG } from './gen2Kinematics';
import { piperJointsToCartesian, PIPER_JOINT_LIMITS_DEG } from './piperKinematics';
import { z1JointsToCartesian } from './z1Kinematics';
import { vx300sJointsToCartesian } from './vx300sKinematics';
import { wx250sJointsToCartesian } from './wx250sKinematics';
import { kochJointsToCartesian } from './kochKinematics';
import { ur3ClassicJointsToCartesian } from './ur3ClassicKinematics';
import { ur5ClassicJointsToCartesian } from './ur5ClassicKinematics';
import { ur10ClassicJointsToCartesian } from './ur10ClassicKinematics';
import type { KinematicsPoint } from './utils';

export function jointsToCartesianForModel(model: RobotModel | undefined, pt: KinematicsPoint): { x: number; y: number; z: number; a: number; b: number; c: number } {
  if (model === 'Parol6 (6-DOF)') return parol6JointsToCartesian(pt);
  if (model === 'Faze4 (6-DOF)') return faze4JointsToCartesian(pt);
  if (model === 'AR3 (6-DOF)') return ar3JointsToCartesian(pt);
  if (model === 'AR4 (6-DOF)') return ar4JointsToCartesian(pt);
  if (model === 'UR3e (6-DOF)') return ur3eJointsToCartesian(pt);
  if (model === 'UR5e (6-DOF)') return ur5eJointsToCartesian(pt);
  if (model === 'UR10e (6-DOF)') return ur10eJointsToCartesian(pt);
  if (model === 'UR16e (6-DOF)') return ur16eJointsToCartesian(pt);
  if (model === 'UR20 (6-DOF)') return ur20JointsToCartesian(pt);
  if (model === 'xArm6 (6-DOF)') return xarm6JointsToCartesian(pt);
  if (model === 'Lite 6 (6-DOF)') return lite6JointsToCartesian(pt);
  if (model === 'e.DO (6-DOF)') return edoJointsToCartesian(pt);
  if (model === 'Gen3 Lite (6-DOF)') return gen3LiteJointsToCartesian(pt);
  if (model === 'M-710iC (6-DOF)') return m710icJointsToCartesian(pt);
  if (model === 'SO-ARM100 (5-DOF)') return soArm100JointsToCartesian(pt);
  if (model === 'Gen2 (6-DOF)') return gen2JointsToCartesian(pt);
  if (model === 'PiPER (6-DOF)') return piperJointsToCartesian(pt);
  if (model === 'Z1 (6-DOF)') return z1JointsToCartesian(pt);
  if (model === 'ViperX 300 (6-DOF)') return vx300sJointsToCartesian(pt);
  if (model === 'WidowX 250 (6-DOF)') return wx250sJointsToCartesian(pt);
  if (model === 'Koch v1.1 (5-DOF)') return kochJointsToCartesian(pt);
  if (model === 'UR3 (6-DOF)') return ur3ClassicJointsToCartesian(pt);
  if (model === 'UR5 (6-DOF)') return ur5ClassicJointsToCartesian(pt);
  if (model === 'UR10 (6-DOF)') return ur10ClassicJointsToCartesian(pt);

  const j1Rad = (pt.j1 || 0) * (Math.PI / 180);
  const j2Rad = (pt.j2 || 0) * (Math.PI / 180);
  const j3Rad = (pt.j3 || 0) * (Math.PI / 180);
  const theta1_rad = -j2Rad;
  const R2 = 160 * Math.sin(theta1_rad) + 200 * Math.sin(theta1_rad + j3Rad);
  const Z2 = 160 * Math.cos(theta1_rad) + 200 * Math.cos(theta1_rad + j3Rad);
  return {
    x: R2 * Math.cos(j1Rad),
    y: R2 * Math.sin(j1Rad),
    z: Z2 + 195,
    // Same formula as utils.ts's own convertToCartesian() for this exact
    // fallback rig - b couples to j2/j3 because the generic 2-link arm's
    // wrist orientation isn't independent of shoulder/elbow the way a's
    // and c's are, so a plain `pt.j5` here (without the compensation)
    // silently disagreed with what a point recorded via jog (which goes
    // through convertToCartesian) actually shows, by up to a full
    // quarter-turn depending on the pose.
    a: pt.j4 || 0, b: (pt.j5 || 0) + (pt.j2 || 0) - (pt.j3 || 0) + 180, c: pt.j6 || 0,
  };
}

// Parol6/AR4/the real UR/xArm/Lite6/Gen3Lite/Gen2/PiPER rigs have real,
// narrower per-joint limits (from their own URDF/config) than the generic
// +/-180 range every other model uses. Moved here (was originally local
// to RobotDetail.tsx) so GamepadController.tsx's own per-joint jog can
// clamp identically without either duplicating this ternary chain or
// re-importing all 12 *_JOINT_LIMITS_DEG constants a second time - same
// "single source of truth" reasoning as jointsToCartesianForModel above.
export function jointLimitsFor(model: RobotModel, j: 'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6'): [number, number] {
  if (model === 'Parol6 (6-DOF)') return PAROL6_JOINT_LIMITS_DEG[j];
  if (model === 'AR4 (6-DOF)') return AR4_JOINT_LIMITS_DEG[j];
  if (model === 'UR3e (6-DOF)') return UR3E_JOINT_LIMITS_DEG[j];
  if (model === 'UR5e (6-DOF)') return UR5E_JOINT_LIMITS_DEG[j];
  if (model === 'UR10e (6-DOF)') return UR10E_JOINT_LIMITS_DEG[j];
  if (model === 'UR16e (6-DOF)') return UR16E_JOINT_LIMITS_DEG[j];
  if (model === 'UR20 (6-DOF)') return UR20_JOINT_LIMITS_DEG[j];
  if (model === 'xArm6 (6-DOF)') return XARM6_JOINT_LIMITS_DEG[j];
  if (model === 'Lite 6 (6-DOF)') return LITE6_JOINT_LIMITS_DEG[j];
  if (model === 'Gen3 Lite (6-DOF)') return GEN3LITE_JOINT_LIMITS_DEG[j];
  if (model === 'Gen2 (6-DOF)') return GEN2_JOINT_LIMITS_DEG[j];
  if (model === 'PiPER (6-DOF)') return PIPER_JOINT_LIMITS_DEG[j];
  return [-180, 180];
}
