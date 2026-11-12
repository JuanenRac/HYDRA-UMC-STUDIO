// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/robotDetailParts.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The pieces the robot detail screen is made of (the confirmation dialogs, the action row, the controls over the 3D view): what each shows,
// what it sends to the screen and that nothing happens without the operator's click. Component tests with a real DOM.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { RobotDetailDialogs } from '../src/components/robotDetail/RobotDetailDialogs';
import { ActionRow } from '../src/components/robotDetail/ActionRow';
import { CameraLayer, ViewportActionOverlay, ViewportToolbars } from '../src/components/robotDetail/ViewportControls';
import type { RobotState } from '../src/store';

vi.mock('../src/components/robotDetail/CameraPIP', () => ({
  CameraPIP: ({ label }: { label: string }) => <div data-testid="pip">{label}</div>,
}));

afterEach(cleanup);

// The pieces translate through `t(key, fallback)`: echo the fallback (or the key) so the tests read like the screen.
const t = (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key);

function robotWith(extra: Record<string, unknown> = {}): RobotState {
  return { id: 7, name: 'Arm', model: 'Parol6 (6-DOF)', recordedPoints: [{}], playbackState: { isPlaying: false }, combinedWith: [], ...extra } as unknown as RobotState;
}

function dialogProps(extra: Record<string, unknown> = {}) {
  return {
    t: t as never, robotModel: 'Parol6 (6-DOF)',
    pendingAction: null, setPendingAction: vi.fn(), runPendingAction: vi.fn(),
    pendingPreview: null, runPendingPreview: vi.fn(), cancelPreview: vi.fn(),
    pendingReach: null, runPendingReach: vi.fn(), cancelPendingReach: vi.fn(),
    pendingTool: null, setPendingTool: vi.fn(), runPendingTool: vi.fn(),
    pendingModel: null, setPendingModel: vi.fn(), runPendingModel: vi.fn(),
    ...extra,
  };
}

describe('RobotDetailDialogs', () => {
  it('shows no dialog while nothing is pending', () => {
    render(<RobotDetailDialogs {...dialogProps()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks before a pose action and sends nothing until the operator confirms', () => {
    const props = dialogProps({ pendingAction: 'home' });
    render(<RobotDetailDialogs {...props} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(props.runPendingAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(props.setPendingAction).toHaveBeenCalledWith(null);
    expect(props.runPendingAction).not.toHaveBeenCalled();
  });

  it('runs the pending tool, and the pending model, only on their own confirmation', () => {
    const tool = dialogProps({ pendingTool: 'gripper' });
    const { unmount } = render(<RobotDetailDialogs {...tool} />);
    fireEvent.click(screen.getAllByRole('button').find((b) => !/cancel/i.test(b.textContent ?? ''))!);
    expect(tool.runPendingTool).toHaveBeenCalledTimes(1);
    expect(tool.runPendingModel).not.toHaveBeenCalled();
    unmount();
    const model = dialogProps({ pendingModel: 'Parol6 (6-DOF)' });
    render(<RobotDetailDialogs {...model} />);
    fireEvent.click(screen.getAllByRole('button').find((b) => !/cancel/i.test(b.textContent ?? ''))!);
    expect(model.runPendingModel).toHaveBeenCalledTimes(1);
    expect(model.runPendingTool).not.toHaveBeenCalled();
  });

  it('names the reach offenders of a rejected trajectory and offers only the refusal when it cannot be scaled', () => {
    const props = dialogProps({
      pendingReach: { report: { count: 2, worstMm: 12.4, toleranceMm: 5, offenders: [{ index: 0, mm: 12.4 }, { index: 3, mm: 7.1 }] }, sendScaled: false, fit: null },
    });
    render(<RobotDetailDialogs {...props} />);
    expect(screen.getByTestId('reach-offenders').querySelectorAll('li')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(props.cancelPendingReach).toHaveBeenCalledTimes(1);
    expect(props.runPendingReach).not.toHaveBeenCalled();
  });
});

function rowProps(extra: Record<string, unknown> = {}) {
  return {
    t: t as never, robot: robotWith(), isStartAll: false, isAndroidApp: false, fileInputRef: { current: null }, loadKinematics: vi.fn() as never,
    handleEmergencyStop: vi.fn(), handlePlay: vi.fn(), handleStop: vi.fn(), handleHome: vi.fn(), handleResetXY: vi.fn() as never,
    handleReset: vi.fn(), handleReset3D: vi.fn() as never, handleAddPoint: vi.fn() as never, setPendingAction: vi.fn(),
    sendRobotCommand: vi.fn() as never, updateRobot: vi.fn() as never,
    ...extra,
  };
}

describe('ActionRow', () => {
  it('sends the global stop on one click and plays only when there are points', () => {
    const props = rowProps();
    render(<ActionRow {...props} />);
    fireEvent.click(screen.getByTitle('STOP'));
    expect(props.handleEmergencyStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('START'));
    expect(props.handlePlay).toHaveBeenCalledTimes(1);
  });

  it('cannot play an empty trajectory', () => {
    const props = rowProps({ robot: robotWith({ recordedPoints: [] }) });
    render(<ActionRow {...props} />);
    expect((screen.getByTitle('START') as HTMLButtonElement).disabled).toBe(true);
  });

  it('turns START into STOP while playing and says ALL for a combined group', () => {
    const props = rowProps({ robot: robotWith({ playbackState: { isPlaying: true } }), isStartAll: true });
    render(<ActionRow {...props} />);
    fireEvent.click(screen.getByTitle('STOP ALL'));
    expect(props.handleStop).toHaveBeenCalledTimes(1);
    expect(screen.queryByTitle('START ALL')).toBeNull();
  });

  it('pauses through the atomic pause command for the whole group, and only while playing', () => {
    const idle = rowProps();
    const { unmount } = render(<ActionRow {...idle} />);
    expect((screen.getByTitle('PAUSE') as HTMLButtonElement).disabled).toBe(true);
    unmount();
    const playing = rowProps({ robot: robotWith({ playbackState: { isPlaying: true }, combinedWith: [8] }), isStartAll: true });
    render(<ActionRow {...playing} />);
    fireEvent.click(screen.getByTitle('PAUSE ALL'));
    const call = (playing.sendRobotCommand as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call.slice(0, 3)).toEqual([7, 'pause', { paused: true }]);
    expect(call[4]).toEqual([7, 8]);
  });

  it('asks before HOME and before deleting the points, and hides HOME XY without an XY table', () => {
    const props = rowProps();
    render(<ActionRow {...props} />);
    fireEvent.click(screen.getByTitle('robot_detail.home'));
    expect(props.handleHome).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Delete points'));
    expect(props.setPendingAction).toHaveBeenCalledWith('delete_points');
    expect(screen.queryByTitle('robot_detail.home_xy')).toBeNull();
  });

  it('shows HOME XY for a robot with an XY table', () => {
    const props = rowProps({ robot: robotWith({ hasXYTable: true }) });
    render(<ActionRow {...props} />);
    fireEvent.click(screen.getByTitle('robot_detail.home_xy'));
    expect(props.handleResetXY).toHaveBeenCalledTimes(1);
  });

  it('toggles REPEAT keeping the rest of the playback state', () => {
    const props = rowProps({ robot: robotWith({ playbackState: { isPlaying: false, activeStep: 3, speed: 50, isLooping: false } }) });
    render(<ActionRow {...props} />);
    fireEvent.click(screen.getByTitle('Repeat'));
    expect(props.updateRobot).toHaveBeenCalledWith(7, { playbackState: { isPlaying: false, activeStep: 3, speed: 50, isLooping: true } });
  });

  it('drops the text labels on the Android app and keeps the buttons', () => {
    const props = rowProps({ isAndroidApp: true });
    render(<ActionRow {...props} />);
    expect(screen.getByTitle('STOP').textContent?.trim()).toBe('');
    fireEvent.click(screen.getByTitle('STOP'));
    expect(props.handleEmergencyStop).toHaveBeenCalledTimes(1);
  });
});

describe('ViewportActionOverlay', () => {
  it('has the STOP, START and PAUSE controls and sends the global stop', () => {
    const props = rowProps();
    const { fileInputRef: _f, loadKinematics: _l, isAndroidApp: _a, ...overlay } = props;
    render(<ViewportActionOverlay {...overlay} />);
    fireEvent.click(screen.getByTitle('STOP'));
    expect(props.handleEmergencyStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('START'));
    expect(props.handlePlay).toHaveBeenCalledTimes(1);
    expect((screen.getByTitle('PAUSE') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('ViewportToolbars', () => {
  function mount(controlMode: 'translate' | 'rotate' | 'scale' | 'none' = 'none') {
    const props = { t: t as never, robotId: 7, controlMode, toggleControl: vi.fn(), isFullscreen: false, setIsFullscreen: vi.fn(), updateRobot: vi.fn() as never };
    render(<ViewportToolbars {...props} />);
    return props;
  }

  it('toggles the three control modes', () => {
    const props = mount();
    fireEvent.click(screen.getByTitle('Move'));
    fireEvent.click(screen.getByTitle('Rotate'));
    fireEvent.click(screen.getByTitle('Resize'));
    expect(props.toggleControl.mock.calls).toEqual([['translate'], ['rotate'], ['scale']]);
  });

  it('marks the active mode', () => {
    mount('rotate');
    expect(screen.getByTitle('Rotate').className).toContain('border-sky-500');
    expect(screen.getByTitle('Move').className).not.toContain('border-sky-500');
  });

  it('centres the view of this robot only', () => {
    const props = mount();
    fireEvent.click(screen.getByTitle('Center View'));
    const call = (props.updateRobot as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe(7);
    expect(call[1].cameraView).toBeUndefined();
    expect(typeof call[1].centerCameraTrigger).toBe('number');
  });
});

describe('CameraLayer', () => {
  const settings = { uiLayout: { cameraPips: { 7: { isOpen: false } } } };

  it('shows the window of an online robot whose camera is active, and nothing for one whose camera is not', () => {
    const active = robotWith({ online: true });
    const props = { t: t as never, robot: active, combinedBotsInfo: [], isVisionActive: () => true, settings: { uiLayout: {} } as never, updateSettings: vi.fn() as never };
    const { unmount } = render(<CameraLayer {...props} />);
    expect(screen.getAllByTestId('pip')).toHaveLength(1);
    unmount();
    render(<CameraLayer {...props} isVisionActive={() => false} />);
    expect(screen.queryByTestId('pip')).toBeNull();
  });

  it('offers a button that reopens a closed window and writes the layout', () => {
    const updateSettings = vi.fn();
    render(<CameraLayer t={t as never} robot={robotWith({ online: false })} combinedBotsInfo={[]} isVisionActive={() => true} settings={settings as never} updateSettings={updateSettings as never} />);
    fireEvent.click(screen.getByTitle('robot_detail.show_camera'));
    expect(updateSettings).toHaveBeenCalledWith({ uiLayout: { cameraPips: { 7: { isOpen: true } } } });
  });

  it('adds a window for each combined robot that is online with an active camera', () => {
    const second = { id: 8, name: 'Second', online: true };
    render(<CameraLayer t={t as never} robot={robotWith({ online: true })} combinedBotsInfo={[second as never]} isVisionActive={() => true} settings={{ uiLayout: {} } as never} updateSettings={vi.fn() as never} />);
    expect(screen.getAllByTestId('pip').map((p) => p.textContent)).toEqual(['Arm', 'Second']);
  });
});
