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
// position at the moment it's captured) - previously duplicated between the
// two, now centralized like resolveTargetJoints()/homePoseFor() already are.
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
import { parol6JointsToCartesian } from './parol6Kinematics';
import { faze4JointsToCartesian } from './faze4Kinematics';
import { ar3JointsToCartesian } from './ar3Kinematics';
import { ar4JointsToCartesian } from './ar4Kinematics';
import { ur3eJointsToCartesian } from './ur3eKinematics';
import { ur5eJointsToCartesian } from './ur5eKinematics';
import { ur10eJointsToCartesian } from './ur10eKinematics';
import { ur16eJointsToCartesian } from './ur16eKinematics';
import { ur20JointsToCartesian } from './ur20Kinematics';
import { xarm6JointsToCartesian } from './xarm6Kinematics';
import { lite6JointsToCartesian } from './lite6Kinematics';
import { edoJointsToCartesian } from './edoKinematics';
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
    a: pt.j4 || 0, b: pt.j5 || 0, c: pt.j6 || 0,
  };
}
