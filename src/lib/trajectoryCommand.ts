// =============================================================================
// HYDRA-UMC STUDIO - The command that loads a trajectory: lib/trajectoryCommand.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Loading a Work or an example sends the atomic `trajectory` command (the server stores the points, resets the cursor
// and broadcasts them as one operation) and shows the same at once: the points, and a playback that is stopped at
// no step. The three loaders of the robot screen shared this shape; it is built here once.
// =============================================================================
import type { RobotState } from '../store';
import type { CommandResult } from './commandResult';

export type TrajectorySelection = { selectedWorkFile: string } | { selectedExample: string };

/** The playback of a robot after a new trajectory was loaded: stopped, before the first step, not finished. */
export function idlePlayback(current: RobotState['playbackState'] | undefined): Record<string, unknown> {
  return {
    ...(current || {}),
    isPlaying: false, playing: false, isPaused: false, paused: false,
    activeStep: -1, isFinished: false, finished: false,
  };
}

export type SendRobotCommand = (
  id: number,
  command: string,
  params?: Record<string, unknown>,
  localMutate?: (robot: RobotState) => Partial<RobotState>,
) => Promise<CommandResult>;

/** The sender of the points of one robot with the file or example they come from. */
export function trajectorySender(send: SendRobotCommand, target: Pick<RobotState, 'id' | 'playbackState'>, selection: TrajectorySelection) {
  return (points: any[]) => send(
    target.id,
    'trajectory',
    { points, ...selection },
    () => ({
      ...selection,
      recordedPoints: points,
      playbackState: idlePlayback(target.playbackState),
    } as Partial<RobotState>),
  );
}
