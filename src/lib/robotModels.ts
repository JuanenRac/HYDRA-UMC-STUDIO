// =============================================================================
// HYDRA-UMC STUDIO - src/lib/robotModels.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The robot models the catalog offers, their manufacturers and degrees of freedom, and the rule for which of them a picker shows.
// Moved out of store.ts unchanged; store.ts re-exports every name, so no import elsewhere changes.

/** Type definition representing  robot model configurations or states. */
export type RobotModel =
  | 'Parol6 (6-DOF)' | 'Faze4 (6-DOF)' | 'AR3 (6-DOF)' | 'AR4 (6-DOF)' | 'Generic (6-DOF)'
  | 'UR3e (6-DOF)' | 'UR5e (6-DOF)' | 'UR10e (6-DOF)' | 'UR16e (6-DOF)' | 'UR20 (6-DOF)'
  | 'xArm6 (6-DOF)' | 'Lite 6 (6-DOF)' | 'e.DO (6-DOF)'
  | 'Gen3 Lite (6-DOF)' | 'M-710iC (6-DOF)'
  | 'SO-ARM100 (5-DOF)'
  | 'Gen2 (6-DOF)' | 'PiPER (6-DOF)' | 'Z1 (6-DOF)' | 'ViperX 300 (6-DOF)' | 'WidowX 250 (6-DOF)'
  | 'Koch v1.1 (5-DOF)'
  | 'UR3 (6-DOF)' | 'UR5 (6-DOF)' | 'UR10 (6-DOF)';

/**
 * Manufacturer grouping for the model picker (RobotDetail.tsx's Config tab) -
 * purely a UI label, doesn't affect kinematics/rendering dispatch (that
 * still keys off the RobotModel string itself, same as before). Real
 * manufacturer per ATTRIBUTION.txt in each model's own public/models/
 * folder - Source Robotics (Parol6/Faze4), Annin Robotics (AR3/AR4, same
 * design lineage even though AR3 predates the Annin Robotics brand itself
 * - see public/models/ar3/ATTRIBUTION.txt), Universal Robots (UR3e/UR5e/
 * UR10e/UR16e/UR20, official github.com/UniversalRobots/
 * Universal_Robots_ROS2_Description meshes, BSD-3-Clause).
 */
export const ROBOT_MANUFACTURERS: Record<RobotModel, string> = {
  'Parol6 (6-DOF)': 'Source Robotics',
  'Faze4 (6-DOF)': 'Source Robotics',
  'AR3 (6-DOF)': 'Annin Robotics',
  'AR4 (6-DOF)': 'Annin Robotics',
  'Generic (6-DOF)': 'Generic',
  'UR3e (6-DOF)': 'Universal Robots',
  'UR5e (6-DOF)': 'Universal Robots',
  'UR10e (6-DOF)': 'Universal Robots',
  'UR16e (6-DOF)': 'Universal Robots',
  'UR20 (6-DOF)': 'Universal Robots',
  'xArm6 (6-DOF)': 'UFACTORY',
  'Lite 6 (6-DOF)': 'UFACTORY',
  'e.DO (6-DOF)': 'Comau',
  'Gen3 Lite (6-DOF)': 'Kinova',
  'M-710iC (6-DOF)': 'FANUC',
  'SO-ARM100 (5-DOF)': 'The Robot Studio',
  'Gen2 (6-DOF)': 'Kinova',
  'PiPER (6-DOF)': 'AgileX',
  'Z1 (6-DOF)': 'Unitree',
  'ViperX 300 (6-DOF)': 'Trossen Robotics',
  'WidowX 250 (6-DOF)': 'Trossen Robotics',
  'Koch v1.1 (5-DOF)': 'Koch / Low-Cost Robot Arm',
  'UR3 (6-DOF)': 'Universal Robots (classic)',
  'UR5 (6-DOF)': 'Universal Robots (classic)',
  'UR10 (6-DOF)': 'Universal Robots (classic)',
};

/** Every real robot model this ecosystem has kinematics/mesh support for
 * (ROBOT_MANUFACTURERS' own keys), excluding the "Generic" placeholder -
 * used by the Robots catalog panel and the Config tab's own model picker.
 * DOF is parsed straight out of each model's own name string (every one
 * already ends in "(N-DOF)") rather than duplicated in a second map. */
export const REAL_ROBOT_MODELS: RobotModel[] = (Object.keys(ROBOT_MANUFACTURERS) as RobotModel[]).filter(m => m !== 'Generic (6-DOF)');

export function robotModelDof(model: RobotModel): number {
  const match = model.match(/\((\d+)-DOF\)/);
  return match ? Number(match[1]) : 6;
}

/** Whether `model` should appear as a choosable option in the Config
 * tab's model picker - true if it's the robot's own CURRENT model
 * (never hide an already-assigned model out from under a robot just
 * because it was later deactivated in the Robots catalog panel), or if
 * the Robots catalog panel hasn't deactivated it. Undefined/missing
 * `enabledRobotModels` (no catalog panel visit yet, or a settings.json
 * saved before this feature existed) reads as "everything enabled",
 * matching this ecosystem's own "old settings.json keeps working
 * unchanged" convention for every other optional settings field. */
export function isModelSelectable(model: RobotModel, currentModel: RobotModel, enabledRobotModels: Record<string, boolean> | undefined): boolean {
  if (model === currentModel) return true;
  return enabledRobotModels?.[model] !== false;
}
