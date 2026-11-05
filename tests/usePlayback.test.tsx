// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/usePlayback.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The playback part of the robot screen: Play and Stop and the optimistic update each sends, the preview before Play,
// the speed and acceleration buffers, the scroll to the step being played and the correction of the joints.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { playbackJointsNeedCorrection, playbackMutation, usePlayback } from '../src/hooks/usePlayback';
import { defaultControllers, type RobotState } from '../src/store';

const point = (n: number) => ({ id: n, name: `P${n}`, joints: { j1: n, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 }, pos: { x: n, y: 0, z: 0, a: 0, b: 0, c: 0 } });
const okResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };

function robotWith(over: Partial<RobotState> = {}): RobotState {
  return { ...(defaultControllers[0].robots[0] as RobotState), recordedPoints: [point(1), point(2)], ...over } as RobotState;
}

function setup(over: Partial<RobotState> = {}) {
  const sendRobotCommand = vi.fn(async () => okResult);
  const updateRobot = vi.fn();
  const view = renderHook(({ robot }: { robot: RobotState }) => usePlayback({ robot, sendRobotCommand: sendRobotCommand as never, updateRobot }), { initialProps: { robot: robotWith(over) } });
  return { sendRobotCommand, updateRobot, ...view };
}

beforeEach(() => { try { window.localStorage.clear(); } catch { /* storage may be unavailable */ } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the optimistic update of a playback command', () => {
  it('merges the changes into the playback state the robot already has', () => {
    const r = robotWith({ playbackState: { isPlaying: false, activeStep: 4, speed: 80 } as never });
    expect(playbackMutation({ isPlaying: true })(r)).toEqual({ playbackState: { isPlaying: true, activeStep: 4, speed: 80 } });
  });

  it('starts from nothing when the robot has no playback state', () => {
    const r = robotWith({ playbackState: undefined as never });
    expect(playbackMutation({ speed: 120 })(r)).toEqual({ playbackState: { speed: 120 } });
  });
});

describe('when the joints are corrected during playback', () => {
  it('needs a correction only above 0.01 degrees on some joint', () => {
    expect(playbackJointsNeedCorrection({ j1: 1.005 }, { j1: 1 })).toBe(false);
    expect(playbackJointsNeedCorrection({ j1: 1.02 }, { j1: 1 })).toBe(true);
    expect(playbackJointsNeedCorrection({ j6: -5 }, { j6: 0 })).toBe(true);
    expect(playbackJointsNeedCorrection({}, {})).toBe(false);
  });
});

describe('Play and Stop', () => {
  it('Stop sends the stop command with the combined robots and clears the playback flags', () => {
    const { sendRobotCommand, result } = setup({ combinedWith: [3, 4] });
    act(() => result.current.handleStop());
    const [id, command, params, mutate, ids] = sendRobotCommand.mock.calls[0] as unknown as [number, string, unknown, (r: RobotState) => Partial<RobotState>, number[]];
    expect(id).toBe(robotWith().id);
    expect(command).toBe('stop');
    expect(params).toBeUndefined();
    expect(ids).toEqual([id, 3, 4]);
    expect(mutate(robotWith({ playbackState: { isPlaying: true, activeStep: 5, speed: 90 } as never }))).toEqual({
      playbackState: { isPlaying: false, activeStep: -1, speed: 90, isPaused: false, paused: false, isFinished: false },
    });
  });

  it('Play sends the play command for this robot only', async () => {
    const { sendRobotCommand, result } = setup();
    await act(async () => { await result.current.handlePlay(); });
    const [id, command, , mutate, ids] = sendRobotCommand.mock.calls[0] as unknown as [number, string, unknown, (r: RobotState) => Partial<RobotState>, number[] | undefined];
    expect(command).toBe('play');
    expect(id).toBe(robotWith().id);
    expect(ids).toBeUndefined();
    expect(mutate(robotWith()).playbackState).toMatchObject({ isPlaying: true, activeStep: 0, isPaused: false, isFinished: false });
  });

  it('Play does nothing without recorded points', async () => {
    const { sendRobotCommand, result } = setup({ recordedPoints: [] });
    await act(async () => { await result.current.handlePlay(); });
    expect(sendRobotCommand).not.toHaveBeenCalled();
  });
});

describe('the preview before Play', () => {
  it('is off by default and remembers the choice in the browser', () => {
    const { result } = setup();
    expect(result.current.previewOn).toBe(false);
    act(() => result.current.changePreviewOn(true));
    expect(result.current.previewOn).toBe(true);
    const again = setup();
    expect(again.result.current.previewOn).toBe(true);
  });

  it('holds Play back and shows the report, then plays on confirmation', async () => {
    const { sendRobotCommand, result } = setup();
    act(() => result.current.changePreviewOn(true));
    await act(async () => { await result.current.handlePlay(); });
    expect(sendRobotCommand).not.toHaveBeenCalled();
    expect(result.current.pendingPreview).not.toBeNull();
    expect(result.current.pendingPreview?.points).toBe(2);
    act(() => result.current.runPendingPreview());
    expect(result.current.pendingPreview).toBeNull();
    expect((sendRobotCommand.mock.calls[0] as unknown as unknown[])[1]).toBe('play');
  });

  it('drops the report without playing when it is cancelled', async () => {
    const { sendRobotCommand, result } = setup();
    act(() => result.current.changePreviewOn(true));
    await act(async () => { await result.current.handlePlay(); });
    act(() => result.current.cancelPreview());
    expect(result.current.pendingPreview).toBeNull();
    expect(sendRobotCommand).not.toHaveBeenCalled();
  });
});

describe('speed and acceleration', () => {
  it('starts from the robot values, 100 by default', () => {
    expect(setup().result.current.playbackSpeed).toBe(100);
    expect(setup({ playbackState: { isPlaying: false, activeStep: 0, speed: 60, acceleration: 40 } as never }).result.current).toMatchObject({ playbackSpeed: 60, playbackAcceleration: 40 });
  });

  it('shows a new speed at once and sends the speed command', () => {
    const { sendRobotCommand, result, rerender } = setup({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } as never });
    act(() => result.current.handleSpeedChange(250));
    // the store applies the optimistic update to the robot, which is what the screen then shows
    rerender({ robot: robotWith({ playbackState: { isPlaying: false, activeStep: 0, speed: 250 } as never }) });
    expect(result.current.playbackSpeed).toBe(250);
    const call = sendRobotCommand.mock.calls[0] as unknown as [number, string, unknown, (r: RobotState) => Partial<RobotState>];
    expect(call[1]).toBe('speed');
    expect(call[2]).toEqual({ speed: 250 });
    expect(call[3](robotWith({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } as never })).playbackState).toMatchObject({ speed: 250 });
  });

  it('sends the acceleration under the same command', () => {
    const { sendRobotCommand, result } = setup();
    act(() => result.current.handleAccelerationChange(30));
    expect(result.current.playbackAcceleration).toBe(30);
    expect((sendRobotCommand.mock.calls[0] as unknown as unknown[]).slice(1, 3)).toEqual(['speed', { acceleration: 30 }]);
  });

  it('takes the value that the server confirms for a robot', () => {
    const { result, rerender } = setup({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } as never });
    rerender({ robot: robotWith({ playbackState: { isPlaying: false, activeStep: 0, speed: 175, acceleration: 55 } as never }) });
    expect(result.current.playbackSpeed).toBe(175);
    expect(result.current.playbackAcceleration).toBe(55);
  });
});

describe('the step being played', () => {
  it('scrolls the step into view only while playing', () => {
    const el = document.createElement('div');
    const base = robotWith();
    el.id = `step-${base.id}-2`;
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    const { rerender } = setup({ playbackState: { isPlaying: false, activeStep: 3, speed: 100 } as never });
    expect(el.scrollIntoView).not.toHaveBeenCalled();
    rerender({ robot: robotWith({ playbackState: { isPlaying: true, activeStep: 3, speed: 100 } as never }) });
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    el.remove();
  });

  it('does not touch the joints when the robot is not playing', () => {
    const { updateRobot } = setup();
    expect(updateRobot).not.toHaveBeenCalled();
  });

  it('does not touch the joints when the server already plays the joints of the model', () => {
    const { updateRobot } = setup({ playbackState: { isPlaying: true, activeStep: 1, speed: 100, trajectoryMode: 'model-joints' } as never });
    expect(updateRobot).not.toHaveBeenCalled();
  });
});
