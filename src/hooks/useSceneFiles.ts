// =============================================================================
// HYDRA-UMC STUDIO - Save and load of the trajectory and the scene: hooks/useSceneFiles.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The files an operator saves and loads from the robot screen (recorded points of a robot, the whole scene), moved out
// of the provider unchanged. What they need from the provider is passed in.
// =============================================================================
import type React from 'react';
import type { CommandIssue } from '../lib/commandResult';
import { downloadJson, kinematicsFileName, readSceneFile, readTrajectoryFile } from '../lib/sceneFiles';
import type { RobotState } from '../store';

export interface SceneFilesDeps {
  robots: RobotState[];
  worksPaths: Record<number, string> | undefined;
  activeControllerId: string;
  sendRobotCommand: (id: number, command: string, params?: Record<string, unknown>, localMutate?: (robot: RobotState) => Partial<RobotState>) => Promise<unknown>;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
  updateController: (id: string, updates: { robots: RobotState[] }) => void;
  reportCommandIssue: (issue: Omit<CommandIssue, 'id'>) => void;
}

export function useSceneFiles(deps: SceneFilesDeps) {
  const { robots, worksPaths, activeControllerId, sendRobotCommand, updateRobot, updateController, reportCommandIssue } = deps;

  const saveKinematics = (id: number) => {
    const robot = robots.find(r => r.id === id);
    if (!robot || robot.recordedPoints.length === 0) return;
    downloadJson(kinematicsFileName(robot.name, worksPaths?.[robot.id]), robot.recordedPoints);
  };

  const loadKinematics = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const read = readTrajectoryFile(String(event.target?.result ?? ''));
      if (read.kind === 'points') {
        // The atomic trajectory command: the server stores the points and resets the playback cursor, so the Play
        // that follows plays THESE points (a plain settings edit reached it half a second later, or not at all).
        void sendRobotCommand(
          id,
          'trajectory',
          { points: read.points },
          () => ({ recordedPoints: read.points as RobotState['recordedPoints'] }),
        );
      } else if (read.kind === 'pose') {
        updateRobot(id, { pos: read.pose as unknown as RobotState['pos'] });
      } else {
        reportCommandIssue({ code: 'import_invalid', command: 'trajectory', robotIds: [id], detail: read.detail });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportScene = () => {
    downloadJson('hydra_scene.json', robots);
  };

  const importScene = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const read = readSceneFile(String(event.target?.result ?? ''));
      if (!read.ok) {
        reportCommandIssue({ code: 'import_invalid', command: 'scene', robotIds: [], detail: read.detail });
        return;
      }
      updateController(activeControllerId, { robots: read.robots as unknown as RobotState[] });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return { saveKinematics, loadKinematics, exportScene, importScene };
}
