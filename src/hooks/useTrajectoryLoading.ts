// =============================================================================
// HYDRA-UMC STUDIO - Loading a trajectory into a robot: hooks/useTrajectoryLoading.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Loading a saved Work (GET <folder>/<file>), loading one of the built-in examples into the robot shown or into
// another robot of a combined group, and uploading a Work file (POST /api/upload-work). Every load resolves the points
// into the joints of the target robot and goes through the reach gate before the atomic trajectory command is sent.
// Moved out of RobotDetail unchanged.
// =============================================================================
import type { ChangeEvent, RefObject } from 'react';
import { apiUrl } from '../lib/apiBase';
import { examples } from '../examples/kinematics';
import type { RobotState } from '../store';
import { trajectorySender } from '../lib/trajectoryCommand';
import type { SendRobotCommand } from '../lib/trajectoryCommand';
import { withCartesian, normalizeTrajectoryForRobot } from '../lib/robotDetailHelpers';

type ReachSender = (
  residuals: Array<number | null>,
  decline: () => void,
  send: () => Promise<unknown>,
  scaling?: { raw: unknown[]; target: RobotState; sendPoints: (points: any[]) => Promise<unknown> },
) => Promise<void>;

export interface UseTrajectoryLoadingInput {
  robot: RobotState;
  robots: RobotState[];
  worksPaths: Record<number, string> | undefined;
  authToken: string | null;
  sendRobotCommand: SendRobotCommand;
  updateRobot: (id: number, changes: Partial<RobotState>) => void;
  sendUnlessUnreachable: ReachSender;
  fetchWorks: () => Promise<unknown>;
  setSelectedWorkFile: (name: string) => void;
  setSelectedExample: (id: string) => void;
  uploadWorkFileRef: RefObject<HTMLInputElement | null>;
}

/** The folder of the Works of a robot: the configured one, or WORKS/<name without blanks>. */
export function worksFolderFor(robot: Pick<RobotState, 'id' | 'name'>, worksPaths: Record<number, string> | undefined): string {
  return worksPaths?.[robot.id] || `WORKS/${robot.name.replace(/\s+/g, '')}`;
}

export function useTrajectoryLoading(input: UseTrajectoryLoadingInput) {
  const { robot, robots, worksPaths, authToken, sendRobotCommand, updateRobot, sendUnlessUnreachable, fetchWorks, setSelectedWorkFile, setSelectedExample, uploadWorkFileRef } = input;

  const handleUploadWorkFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = JSON.parse(ev.target?.result as string);
        const folderPath = worksFolderFor(robot, worksPaths);

        // Same bearer-token requirement as handleSaveWorkFile above.
        const res = await fetch(apiUrl('/api/upload-work'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({
            folderPath,
            fileName: file.name,
            content
          })
        });

        if (res.ok) {
          await fetchWorks();
          void loadWorkFile(file.name);
        } else {
          console.error('Failed to upload work file');
        }
      } catch (err) {
        console.error('Error parsing or uploading file', err);
      }
    };
    reader.readAsText(file);
    if (uploadWorkFileRef.current) uploadWorkFileRef.current.value = '';
  };

  const loadWorkFile = async (fileName: string) => {
    setSelectedWorkFile(fileName);
    if (!fileName) {
      updateRobot(robot.id, { selectedWorkFile: fileName });
      return;
    }
    try {
      const folderPath = worksFolderFor(robot, worksPaths);
      const res = await fetch(apiUrl(`/${folderPath}/${fileName}`));
      if (res.ok) {
        const rawPoints = await res.json();
        // Resolve every portable Work into this robot's actual joints before
        // it enters state or Server. Legacy generic files and compact native
        // joint files therefore share one explicit, testable loading path.
        const residuals: Array<number | null> = [];
        const points = normalizeTrajectoryForRobot(rawPoints, robot, residuals);
        // A Work must reach Server before the operator can press Play. The
        // former updateRobot() path waited for the general 500 ms settings
        // debounce, so Server often replayed the previous Work even though
        // this panel already displayed the newly loaded points. The atomic
        // trajectory command persists, resets the cursor and broadcasts the
        // same points as one operation.
        const sendPoints = trajectorySender(sendRobotCommand, robot, { selectedWorkFile: fileName });
        await sendUnlessUnreachable(residuals, () => setSelectedWorkFile(robot.selectedWorkFile || ''), () => sendPoints(points), { raw: rawPoints as unknown[], target: robot, sendPoints });
      } else {
        updateRobot(robot.id, { selectedWorkFile: fileName });
      }
    } catch (e) {
      console.error(e);
      updateRobot(robot.id, { selectedWorkFile: fileName });
    }
  };

  const loadExample = async (id: string) => {
    console.log("Loading example:", id);
    setSelectedExample(id);
    const ex = examples.find(e => e.id === id);
    if (!ex) {
      updateRobot(robot.id, { selectedExample: id });
      return;
    }
    try {
      const residuals: Array<number | null> = [];
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), robot, residuals);
      const sendPoints = trajectorySender(sendRobotCommand, robot, { selectedExample: id });
      await sendUnlessUnreachable(residuals, () => setSelectedExample(robot.selectedExample || ''), () => sendPoints(points), { raw: ex.points.map(withCartesian), target: robot, sendPoints });
    } catch (error) {
      console.error('Unable to prepare example trajectory', error);
      updateRobot(robot.id, { selectedExample: id });
    }
  };

  const loadExampleForRobot = async (botId: number, exId: string) => {
    const ex = examples.find(e => e.id === exId);
    const targetRobot = robots.find((candidate) => candidate.id === botId);
    if (!ex || !targetRobot) return;
    try {
      const residuals: Array<number | null> = [];
      const points = normalizeTrajectoryForRobot(ex.points.map(withCartesian), targetRobot, residuals);
      const sendPoints = trajectorySender(sendRobotCommand, targetRobot, { selectedExample: exId });
      await sendUnlessUnreachable(residuals, () => undefined, () => sendPoints(points), { raw: ex.points.map(withCartesian), target: targetRobot, sendPoints });
    } catch (error) {
      console.error('Unable to prepare combined robot example trajectory', error);
    }
  };

  return { handleUploadWorkFile, loadWorkFile, loadExample, loadExampleForRobot };
}
