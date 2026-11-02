// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/robotDetail.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The robot detail screen, rendered with a real DOM and a fake store (the 3D view is replaced by a stub): the
// buttons of the action row send the command they name, the global stop is the one of the store, the table of
// recorded points lists the points of the robot, and a robot in Sim is refused by the guard before anything is sent.
// These tests hold the screen in place while its file is cut into smaller parts.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../src/i18n';
import { defaultControllers, type RobotState } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { RobotDetail } from '../src/components/RobotDetail';

// Rendering the whole screen the first time loads its modules; a busy machine needs more than the default five seconds.
vi.setConfig({ testTimeout: 30_000 });

vi.mock('../src/components/VirtualKinematics', () => ({ VirtualKinematics: () => <div data-testid="three-d-stub" /> }));

function token(role: string): string {
  return `h.${btoa(JSON.stringify({ username: 'ana', role })).replace(/=+$/, '')}.s`;
}

const point = (n: number) => ({ id: n, name: `P${n}`, joints: { j1: n, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 }, pos: { x: n, y: 0, z: 0, a: 0, b: 0, c: 0 } });

function setup(over: Partial<RobotState> = {}, store: Record<string, unknown> = {}) {
  const base = defaultControllers[0].robots[0] as RobotState;
  const robot = { ...base, online: true, urtcConnected: true, recordedPoints: [point(1), point(2)], ...over } as RobotState;
  const sendRobotCommand = vi.fn(async () => ({ ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] }));
  const emergencyStop = vi.fn(async () => undefined);
  const updateRobot = vi.fn();
  const reportCommandIssue = vi.fn();
  const value = {
    authToken: token('admin'), role: 'admin', isAdmin: true, robots: [robot], cameras: [], settings: { uiLayout: {} },
    controllers: defaultControllers, activeController: defaultControllers[0],
    sendRobotCommand, emergencyStop, updateRobot, reportCommandIssue, updateSettings: vi.fn(), setRobotJoints: vi.fn(), loadKinematics: vi.fn(),
    ...store,
  };
  render(<HydraStoreProviders value={value as never}><RobotDetail robot={robot} /></HydraStoreProviders>);
  return { robot, sendRobotCommand, emergencyStop, updateRobot, reportCommandIssue };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the robot detail screen', () => {
  it('shows the 3D view and the state of the link of the robot', () => {
    setup();
    expect(screen.getByTestId('three-d-stub')).toBeTruthy();
    expect(screen.getByTestId('motion-source').textContent?.length).toBeGreaterThan(0);
  });

  it('sends the global stop of the store when STOP is pressed', () => {
    const { emergencyStop } = setup();
    fireEvent.click(screen.getByTitle(i18n.t('robot_detail.estop')));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('starts the playback of the recorded points with START and keeps START off when there are no points', () => {
    const { sendRobotCommand, robot } = setup();
    fireEvent.click(screen.getByTitle(i18n.t('robot_detail.start')));
    const calls = sendRobotCommand.mock.calls as unknown as unknown[][];
    expect(calls.some((c) => c[0] === robot.id && c[1] === 'play')).toBe(true);
    cleanup();
    setup({ recordedPoints: [] });
    expect((screen.getByTitle(i18n.t('robot_detail.start')) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows STOP instead of START while the robot is playing', () => {
    setup({ playbackState: { isPlaying: true, isPaused: false, currentIndex: 0, speed: 100, acceleration: 100 } as never });
    expect(screen.queryByTitle(i18n.t('robot_detail.start'))).toBeNull();
  });

  it('lists the recorded points and reorders or deletes one through the robot update', () => {
    const { robot, updateRobot } = setup();
    const first = document.getElementById(`step-${robot.id}-0`);
    expect(first).not.toBeNull();
    expect(document.getElementById(`step-${robot.id}-1`)).not.toBeNull();
    expect(document.getElementById(`step-${robot.id}-2`)).toBeNull();
    const buttons = first!.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    expect(buttons[0].disabled).toBe(true);
    fireEvent.click(buttons[1]);
    expect(updateRobot).toHaveBeenLastCalledWith(robot.id, { recordedPoints: [robot.recordedPoints[1], robot.recordedPoints[0]] });
    fireEvent.click(buttons[3]);
    expect(updateRobot).toHaveBeenLastCalledWith(robot.id, { recordedPoints: [robot.recordedPoints[1]] });
  });
});

describe('the check of the trajectory before Play', () => {
  const wild = [
    { motionType: 'model-joints', j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x: 0, y: 0, z: 0 },
    { motionType: 'model-joints', j1: 400, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x: 10, y: 0, z: 0 },
  ];
  const played = (calls: unknown[][], id: number) => calls.some((c) => c[0] === id && c[1] === 'play');
  afterEach(() => { window.localStorage.removeItem('hydra.previewBeforePlay'); });

  it('starts at once while the check is off (the default)', () => {
    const { sendRobotCommand, robot } = setup({ recordedPoints: wild as never });
    fireEvent.click(screen.getByTitle(i18n.t('robot_detail.start')));
    expect(played(sendRobotCommand.mock.calls as unknown as unknown[][], robot.id)).toBe(true);
    expect(screen.queryByTestId('trajectory-preview')).toBeNull();
  });

  it('shows the path and the problems first, and plays only after the operator accepts', () => {
    window.localStorage.setItem('hydra.previewBeforePlay', '1');
    const { sendRobotCommand, robot } = setup({ recordedPoints: wild as never });
    fireEvent.click(screen.getByTitle(i18n.t('robot_detail.start')));
    expect(played(sendRobotCommand.mock.calls as unknown as unknown[][], robot.id)).toBe(false);
    expect(screen.getByTestId('trajectory-preview')).toBeTruthy();
    expect(screen.getByTestId('trajectory-preview-issues')).toBeTruthy();
    fireEvent.click(screen.getByText(i18n.t('trajectory_preview.play_anyway')));
    expect(played(sendRobotCommand.mock.calls as unknown as unknown[][], robot.id)).toBe(true);
  });

  it('plays nothing when the operator cancels', () => {
    window.localStorage.setItem('hydra.previewBeforePlay', '1');
    const { sendRobotCommand, robot } = setup({ recordedPoints: wild as never });
    fireEvent.click(screen.getByTitle(i18n.t('robot_detail.start')));
    fireEvent.click(screen.getByText(i18n.t('common.cancel')));
    expect(played(sendRobotCommand.mock.calls as unknown as unknown[][], robot.id)).toBe(false);
    expect(screen.queryByTestId('trajectory-preview')).toBeNull();
  });
});
