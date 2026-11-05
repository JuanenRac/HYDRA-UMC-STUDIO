// =============================================================================
// HYDRA-UMC STUDIO - Playback of the trajectory of one robot: hooks/usePlayback.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Play and stop (with the optional preview of the path before Play), the speed and acceleration buffers, the scroll to
// the step being played and the correction of the joints during playback. The server's playback engine is the only
// driver of the motion: this hook sends the commands and renders what comes back. Moved out of the robot screen unchanged.
// =============================================================================
import { useEffect, useLayoutEffect, useState } from 'react';
import type { CommandResult } from '../lib/commandResult';
import type { RobotState } from '../store';
import { resolveTargetJoints } from '../examples/robotKinematicsDispatch';
import { analyzeTrajectory, previewEnabled, savePreviewEnabled, type PreviewReport } from '../lib/trajectoryPreview';
import { currentPlaybackStep } from '../lib/playbackStep';
import { withCartesian, browserStorage } from '../lib/robotDetailHelpers';

export interface PlaybackOptions {
  robot: RobotState;
  sendRobotCommand: (
    id: number,
    command: string,
    params?: Record<string, unknown>,
    localMutate?: (robot: RobotState) => Partial<RobotState>,
    affectedIds?: number[],
  ) => Promise<CommandResult>;
  updateRobot: (id: number, updates: Partial<RobotState>) => void;
}

/** The playback state of a robot with the given fields changed, as the optimistic update of a command. */
export const playbackMutation = (changes: Record<string, unknown>) =>
  (r: RobotState): Partial<RobotState> => ({ playbackState: { ...(r.playbackState || {}), ...changes } as RobotState['playbackState'] });

/** Whether the joints shown during playback must be derived again from the Cartesian target of the point. */
export function playbackJointsNeedCorrection(resolved: Record<string, number | undefined>, joints: Record<string, number | undefined>): boolean {
  return (['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).some((k) => Math.abs((resolved[k] ?? 0) - (joints[k] ?? 0)) > 0.01);
}

export function usePlayback({ robot, sendRobotCommand, updateRobot }: PlaybackOptions) {
  // stop/play fire the atomic command (the server fans it out to combinedWith itself) with a matching optimistic
  // update covering self + combinedWith, mirroring what the server's own "stop"/"play" case does (isFinished reset
  // included) so the optimistic mutation and the real delta that follows agree.
  const handleStop = () => {
    sendRobotCommand(
      robot.id,
      'stop',
      undefined,
      playbackMutation({ isPlaying: false, activeStep: -1, isPaused: false, paused: false, isFinished: false }),
      [robot.id, ...(robot.combinedWith || [])],
    );
  };

  // With the check switched on (Config tab, off by default) Play first shows the path and what is wrong with it.
  const [previewOn, setPreviewOn] = useState<boolean>(() => previewEnabled(browserStorage()));
  const [pendingPreview, setPendingPreview] = useState<PreviewReport | null>(null);
  const changePreviewOn = (on: boolean) => setPreviewOn(savePreviewEnabled(browserStorage(), on));
  const handlePlay = async () => {
    if (robot.recordedPoints.length === 0) return;
    if (previewOn) {
      setPendingPreview(analyzeTrajectory(robot.recordedPoints, robot.model));
      return;
    }
    startPlay();
  };
  const runPendingPreview = () => {
    setPendingPreview(null);
    startPlay();
  };
  const cancelPreview = () => setPendingPreview(null);
  // Only this robot is updated optimistically; a combined sibling's playback state arrives with its own delta (the
  // server fans "play" out to combinedWith). The server's playback engine replays the recorded points itself.
  const startPlay = () => {
    sendRobotCommand(
      robot.id,
      'play',
      undefined,
      playbackMutation({ isPlaying: true, activeStep: 0, isPaused: false, paused: false, isFinished: false }),
    );
  };

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(robot.playbackState?.speed || 100);
  const [playbackAcceleration, setPlaybackAcceleration] = useState<number>(robot.playbackState?.acceleration || 100);

  // "Adjust state during render": the buffers are optimistic (set ahead of the server round-trip) but also pick up a
  // value that arrived from elsewhere once robot.playbackState catches up, which also covers a robot switch.
  if (robot.playbackState?.speed !== undefined && robot.playbackState.speed !== playbackSpeed) {
    setPlaybackSpeed(robot.playbackState.speed);
  }
  if (robot.playbackState?.acceleration !== undefined && robot.playbackState.acceleration !== playbackAcceleration) {
    setPlaybackAcceleration(robot.playbackState.acceleration);
  }

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    sendRobotCommand(robot.id, 'speed', { speed: newSpeed }, playbackMutation({ speed: newSpeed }));
  };

  // Same 10-500% scale as speed.
  const handleAccelerationChange = (newAcceleration: number) => {
    setPlaybackAcceleration(newAcceleration);
    sendRobotCommand(robot.id, 'speed', { acceleration: newAcceleration }, playbackMutation({ acceleration: newAcceleration }));
  };

  // The step being played is kept in view.
  useEffect(() => {
    const current = currentPlaybackStep(robot.playbackState?.activeStep);
    if (robot.playbackState?.isPlaying && current >= 0) {
      const el = document.getElementById(`step-${robot.id}-${current}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [robot.playbackState?.activeStep, robot.playbackState?.isPlaying, robot.id]);

  // The server's playback broadcasts each recorded point's {j1..j6} as they are, which is right only for the generic
  // model. For a model with its own kinematics the joints are solved again from the Cartesian target of the point, here
  // on the client, so every connected client shows the real pose. Only during active playback, so that a direct joint
  // edit (which never touches robot.pos) is not fought with a stale derivation. A layout effect: the correction lands
  // in the next commit instead of one visible frame of the wrong pose.
  const playbackTrajectoryMode = (robot.playbackState as any)?.trajectoryMode;
  useLayoutEffect(() => {
    if (!robot.playbackState?.isPlaying) return;
    if (playbackTrajectoryMode === 'model-joints') return;
    const target = playbackTrajectoryMode === 'legacy-generic'
      ? withCartesian(robot.joints)
      : robot.pos;
    if (typeof target?.x !== 'number') return;
    const resolved = resolveTargetJoints(
      robot.model, target.x, target.y, target.z,
      target.a ?? 0, target.b ?? 0, target.c ?? 0,
      robot.joints,
      robot.joints,
    );
    if (playbackJointsNeedCorrection(resolved, robot.joints)) {
      updateRobot(robot.id, { joints: resolved });
    }
  }, [
    robot.pos, robot.pos?.x, robot.pos?.y, robot.pos?.z, robot.pos?.a, robot.pos?.b, robot.pos?.c,
    robot.joints, robot.playbackState?.isPlaying, robot.model, robot.id, updateRobot,
    playbackTrajectoryMode,
  ]);

  return {
    handleStop, handlePlay, previewOn, changePreviewOn, pendingPreview, runPendingPreview, cancelPreview,
    playbackSpeed, playbackAcceleration, handleSpeedChange, handleAccelerationChange,
  };
}
