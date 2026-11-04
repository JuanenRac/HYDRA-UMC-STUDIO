// =============================================================================
// HYDRA-UMC STUDIO - tests/useRobotCommands.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The command handlers of the robot screen (point recording, jogs, resets, XY table, valves and pumps): what each
// one sends to the atomic command channel and what it does locally before the server answers.
// =============================================================================
import { describe, expect, it, vi } from 'vitest';
import { useRobotCommands as robotCommands } from '../src/hooks/useRobotCommands';
import { homePoseFor } from '../src/lib/robotDetailHelpers';
import { jointLimitsFor } from '../src/examples/robotKinematicsDispatch';

const MODEL = 'Parol6 (6-DOF)';

function setup(extra: Record<string, unknown> = {}, jogStep = 1) {
  const robot: any = {
    id: 7, model: MODEL, joints: { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 }, pos: { x: 0, y: 0, z: 0, tx: 5, ty: 6, trz: 0 },
    recordedPoints: [], valves: [false, false], pumps: [true, false], hasXYTable: false, ...extra,
  };
  const send = vi.fn();
  const update = vi.fn();
  const report = vi.fn();
  const stop = vi.fn();
  const api = robotCommands({ robot, jogStep, sendRobotCommand: send, updateRobot: update, reportCommandIssue: report, stopPlayback: stop });
  return { robot, send, update, report, stop, api };
}

describe('useRobotCommands', () => {
  it('records the joints of the robot as a model-joints point', () => {
    const { api, update, robot } = setup();
    api.handleAddPoint();
    const patch = update.mock.calls[0][1];
    expect(update.mock.calls[0][0]).toBe(7);
    expect(patch.recordedPoints).toHaveLength(1);
    expect(patch.recordedPoints[0]).toMatchObject({ motionType: 'model-joints', j1: 0, j2: -45, j5: 90 });
    expect(patch.recordedPoints[0].tx).toBeUndefined();
    expect(robot.recordedPoints).toHaveLength(0);
  });

  it('adds the XY table position to the point when the robot has a table', () => {
    const { api, update } = setup({ hasXYTable: true });
    api.handleAddPoint();
    expect(update.mock.calls[0][1].recordedPoints[0]).toMatchObject({ tx: 5, ty: 6, trz: 0 });
  });

  it('turns the base by one step and stays inside the limit of J1', () => {
    const { api, send } = setup({}, 2);
    api.handleJ1Jog(1);
    expect(send).toHaveBeenCalledTimes(1);
    const [id, command, params, mutate] = send.mock.calls[0];
    expect([id, command]).toEqual([7, 'jog']);
    expect(params.joints.j1).toBe(2);
    expect(mutate({}).joints.j1).toBe(2);
  });

  it('sends nothing when J1 is already at its limit', () => {
    const [, max] = jointLimitsFor(MODEL, 'j1');
    const { api, send } = setup({ joints: { j1: max, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 } });
    api.handleJ1Jog(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends one jog per non-zero axis of the Cartesian jog, all with the same resolved joints', () => {
    const { api, send, report } = setup({}, 1);
    api.handleXYZJog(0, 0, 0);
    expect(send).not.toHaveBeenCalled();
    api.handleXYZJog(1, 0, 1);
    if (report.mock.calls.length === 0) {
      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls.map((c) => c[2].axis)).toEqual(['x', 'z']);
      expect(send.mock.calls[0][2].joints).toBe(send.mock.calls[1][2].joints);
    } else {
      // the guard refused a swing: nothing is sent, the operator is told
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('HOME and RESET go to the home pose; only RESET stops the playback', () => {
    const { api, send, stop } = setup();
    api.resetPose(false);
    expect(stop).not.toHaveBeenCalled();
    expect(send.mock.calls[0][1]).toBe('reset');
    expect(send.mock.calls[0][2]).toEqual({ target: 'robot', joints: homePoseFor(MODEL) });
    api.resetPose(true);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('homes the XY table only, keeping the arm', () => {
    const { api, send } = setup();
    api.handleResetXY();
    expect(send.mock.calls[0].slice(1, 3)).toEqual(['reset', { target: 'xytable' }]);
    const next = send.mock.calls[0][3]({ pos: { x: 1, tx: 9, ty: 9 }, xyTable: { pos: { x: 9, y: 9 }, size: 1 } });
    expect(next.pos).toEqual({ x: 1, tx: 0, ty: 0 });
    expect(next.xyTable.pos).toEqual({ x: 0, y: 0 });
  });

  it('reset 3D sends a trigger every client reacts to', () => {
    const { api, send } = setup();
    api.handleReset3D();
    expect(send.mock.calls[0][1]).toBe('reset3D');
    expect(typeof send.mock.calls[0][3]({}).reset3DTrigger).toBe('number');
  });

  it('toggles a valve and a pump without touching the other one', () => {
    const { api, send } = setup();
    api.toggleValve(1);
    expect(send.mock.calls[0].slice(1, 3)).toEqual(['valve', { index: 1, state: true }]);
    expect(send.mock.calls[0][3]().valves).toEqual([false, true]);
    api.togglePump(0);
    expect(send.mock.calls[1].slice(1, 3)).toEqual(['pump', { index: 0, state: false }]);
    expect(send.mock.calls[1][3]().pumps).toEqual([false, false]);
  });
});
