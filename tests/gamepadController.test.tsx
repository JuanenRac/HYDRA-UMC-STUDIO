// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/gamepadController.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The gamepad mode in a real DOM, against a made-up Gamepad API (navigator.getGamepads), a hand-driven animation frame and a hand-driven
// clock: off until armed, a reservation needed, STOP first, a lost pad as a dead-man stop, no events without focus, the arming panel.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { defaultControllers, type RobotState } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { GamepadController } from '../src/components/GamepadController';
import { GamepadConfig } from '../src/components/GamepadConfig';
import { armGamepad, disarmGamepad, getGamepadSession, resetGamepadSession } from '../src/lib/gamepadSession';
import { publishClaimsEvent, resetClaimsFeed } from '../src/lib/claimsFeed';
import { getControllerId } from '../src/lib/controllerSession';
import { setSelectedRobotId } from '../src/lib/selectedRobot';

const robot = defaultControllers[0].robots[0] as RobotState;

function token(username: string): string {
  return `h.${btoa(JSON.stringify({ username, role: 'operator' })).replace(/=+$/, '')}.s`;
}

// --- the made-up browser: a pad, a frame queue, a clock, the focus ---------------------------------------------------------------
let currentPad: Gamepad | null = null;
let hasFocus = true;
let hidden = false;
let now = 1000;
let frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;
const cancelled = new Set<number>();

function makePad(down: number[] = [], axes: number[] = [0, 0, 0, 0]): Gamepad {
  return {
    id: 'Fake Pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, hapticActuators: [],
    buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: down.includes(i), touched: down.includes(i), value: down.includes(i) ? 1 : 0 })),
    axes,
  } as unknown as Gamepad;
}

/** Runs one animation frame at the given time. */
function frame(pad: Gamepad | null, at: number = now + 200): void {
  currentPad = pad;
  now = at;
  const queued = [...frames.entries()];
  frames = new Map();
  act(() => { queued.forEach(([id, cb]) => { if (!cancelled.has(id)) cb(now); }); });
}

beforeEach(() => {
  currentPad = null; hasFocus = true; hidden = false; now = 1000; frames = new Map(); nextFrameId = 1; cancelled.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextFrameId++; frames.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); cancelled.add(id); });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [currentPad] });
  vi.spyOn(document, 'hasFocus').mockImplementation(() => hasFocus);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  setSelectedRobotId(robot.id);
  resetGamepadSession();
  resetClaimsFeed();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  disarmGamepad();
});

const MAPPING = { B0: 'E-STOP', B6: 'X+', B1: 'START', AXIS_0_POS: 'X+' };

function mount(over: { settings?: Record<string, unknown>; claim?: 'mine' | 'other' | 'none' } = {}) {
  const sendRobotCommand = vi.fn(async () => ({ ok: true, status: 200, code: null, detail: null, warnings: [] }));
  const emergencyStop = vi.fn(async () => {});
  const reportCommandIssue = vi.fn();
  const claim = over.claim ?? 'mine';
  if (claim !== 'none') {
    publishClaimsEvent({
      type: 'claims',
      claims: [{ robotId: robot.id, ownerUsername: claim === 'mine' ? 'ana' : 'bob', controllerId: claim === 'mine' ? getControllerId() : 'other-window', expiresAt: Date.now() + 600_000 }],
    });
  }
  const value = {
    authToken: token('ana'), isAdmin: false,
    settings: { gamepadEnabled: true, gamepadMapping: MAPPING, gamepadMode: { heldIntervalMs: 30, maxSpeedPercent: 100 }, ...over.settings },
    updateSettings: vi.fn(), activeController: { ...defaultControllers[0], robots: [robot] }, robots: [robot],
    sendRobotCommand, emergencyStop, reportCommandIssue, updateRobot: vi.fn(),
  };
  const ui = render(
    <HydraStoreProviders value={value as never}>
      <GamepadController />
      <GamepadConfig />
    </HydraStoreProviders>,
  );
  return { ...ui, sendRobotCommand, emergencyStop, reportCommandIssue };
}

/** Arms the mode and lets one neutral frame go by, as the operator would. */
function armAndSettle() {
  act(() => armGamepad());
  frame(makePad());
}

describe('the gamepad mode is off until armed', () => {
  it('moves nothing and stops nothing while it is not armed, whatever the pad does', () => {
    const { sendRobotCommand, emergencyStop } = mount();
    frame(makePad([6, 0]));
    frame(makePad([6, 0]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    expect(emergencyStop).not.toHaveBeenCalled();
    expect(getGamepadSession().armed).toBe(false);
  });

  it('refuses to arm without a reservation of the selected robot, and says why', () => {
    mount({ claim: 'none' });
    frame(makePad());
    fireEvent.click(screen.getByTestId('gamepad-arm'));
    expect(screen.getByTestId('gamepad-arm-refusal').textContent).toContain('Reserve');
    expect(getGamepadSession().armed).toBe(false);
  });

  it('refuses to arm a robot held by someone else', () => {
    mount({ claim: 'other' });
    frame(makePad());
    fireEvent.click(screen.getByTestId('gamepad-arm'));
    expect(screen.getByTestId('gamepad-arm-refusal')).toBeTruthy();
    expect(getGamepadSession().armed).toBe(false);
  });

  it('refuses to arm with no pad', () => {
    mount();
    frame(null);
    fireEvent.click(screen.getByTestId('gamepad-arm'));
    expect(screen.getByTestId('gamepad-arm-refusal').textContent).toContain('No gamepad');
  });

  it('asks for an explicit confirmation, and arms only when it is given', () => {
    mount();
    frame(makePad());
    fireEvent.click(screen.getByTestId('gamepad-arm'));
    expect(getGamepadSession().armed).toBe(false);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent === 'Arm control mode' && dialog.contains(b))!);
    expect(getGamepadSession().armed).toBe(true);
  });

  it('cancelling the confirmation leaves it off', () => {
    mount();
    frame(makePad());
    fireEvent.click(screen.getByTestId('gamepad-arm'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getGamepadSession().armed).toBe(false);
  });
});

describe('when armed', () => {
  it('moves the selected robot with the mapped input, in steps limited by the speed limit', () => {
    const { sendRobotCommand } = mount({ settings: { gamepadMode: { heldIntervalMs: 30, maxSpeedPercent: 50 } } });
    armAndSettle();
    frame(makePad([6]));
    expect(sendRobotCommand).toHaveBeenCalled();
    const call = (sendRobotCommand.mock.calls as unknown as Array<[number, string, { axis: string; amount: number }]>)[0];
    expect(call[0]).toBe(robot.id);
    expect(call[1]).toBe('jog');
    expect(call[2].axis).toBe('x');
    expect(Math.abs(call[2].amount)).toBeCloseTo(1, 5); // 2 mm at half the speed
  });

  it('uses the dead zone from the settings: a small push does nothing, a large one moves', () => {
    const { sendRobotCommand } = mount({ settings: { gamepadMode: { heldIntervalMs: 30, maxSpeedPercent: 100, deadzone: 0.5 } } });
    armAndSettle();
    frame(makePad([], [0.4, 0, 0, 0]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    frame(makePad([], [0.9, 0, 0, 0]));
    expect(sendRobotCommand).toHaveBeenCalled();
  });

  it('STOP is the global stop, comes alone, and no move is sent in the same frame', () => {
    const { sendRobotCommand, emergencyStop } = mount();
    armAndSettle();
    frame(makePad([0, 6, 1]));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
    expect(sendRobotCommand).not.toHaveBeenCalled();
    frame(makePad([0, 6]));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('STOP works when the window has lost its reservation, while moves are held back', () => {
    const { sendRobotCommand, emergencyStop } = mount();
    armAndSettle();
    act(() => { publishClaimsEvent({ type: 'claims', claims: [] }); });
    frame(makePad([6]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    frame(makePad([0]));
    expect(emergencyStop).toHaveBeenCalledTimes(1);
  });

  it('a pad that disappears stops every robot, switches the mode off and leaves a notice', () => {
    const { sendRobotCommand, emergencyStop } = mount();
    armAndSettle();
    frame(makePad([6]));
    const sent = sendRobotCommand.mock.calls.length;
    frame(null);
    expect(emergencyStop).toHaveBeenCalledTimes(1);
    expect(getGamepadSession().armed).toBe(false);
    expect(screen.getByTestId('gamepad-notice').textContent).toContain('disconnected');
    frame(makePad([6]));
    frame(makePad([6]));
    expect(sendRobotCommand.mock.calls.length).toBe(sent);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('gamepad-notice')).toBeNull();
  });

  it('sends no event while the tab has no focus, or is hidden', () => {
    const { sendRobotCommand, emergencyStop } = mount();
    armAndSettle();
    hasFocus = false;
    frame(makePad([6, 0]));
    frame(makePad([6, 0]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    expect(emergencyStop).not.toHaveBeenCalled();
    hasFocus = true; hidden = true;
    frame(makePad([6, 0]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    expect(emergencyStop).not.toHaveBeenCalled();
  });

  it('after the focus returns, a button still down moves nothing until it is let go', () => {
    const { sendRobotCommand } = mount();
    armAndSettle();
    hasFocus = false;
    frame(makePad([6]));
    hasFocus = true;
    frame(makePad([6]));
    expect(sendRobotCommand).not.toHaveBeenCalled();
    frame(makePad());
    frame(makePad([6]));
    expect(sendRobotCommand).toHaveBeenCalled();
  });

  it('with the switch for the reservation off, a robot nobody holds can be moved', () => {
    const { sendRobotCommand } = mount({ claim: 'none', settings: { gamepadMode: { heldIntervalMs: 30, requireClaim: false } } });
    armAndSettle();
    frame(makePad([6]));
    expect(sendRobotCommand).toHaveBeenCalled();
  });

  it('switching the gamepad off in the settings switches the mode off', () => {
    const { rerender } = mount();
    armAndSettle();
    expect(getGamepadSession().armed).toBe(true);
    const value = {
      authToken: token('ana'), isAdmin: false, settings: { gamepadEnabled: false, gamepadMapping: MAPPING },
      updateSettings: vi.fn(), activeController: { ...defaultControllers[0], robots: [robot] }, robots: [robot],
      sendRobotCommand: vi.fn(), emergencyStop: vi.fn(), reportCommandIssue: vi.fn(), updateRobot: vi.fn(),
    };
    rerender(<HydraStoreProviders value={value as never}><GamepadController /></HydraStoreProviders>);
    expect(getGamepadSession().armed).toBe(false);
  });
});

describe('the panel', () => {
  it('shows the live inputs with how hard they are pushed and the action each one has', () => {
    mount();
    frame(makePad([6], [0.6, 0, 0, 0]));
    const preview = screen.getByTestId('gamepad-preview');
    expect(preview.textContent).toContain('100 %');
    expect(preview.textContent).toContain('50 %');
    expect(preview.textContent).toContain('X +');
  });

  it('says nothing is pushed when the pad is at rest', () => {
    mount();
    frame(makePad());
    expect(screen.getByTestId('gamepad-preview').textContent).toContain('Nothing is pushed');
  });
});
