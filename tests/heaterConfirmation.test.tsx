// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/heaterConfirmation.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The heater of the bed switches 230 V mains: switching it on asks first (both screens that have the switch),
// switching it off never does, and the endstops of the Kinematic Brain Stage are shown as the inputs they are
// instead of buttons that write them.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { HydraContext, createDefaultKinematicBrainStage, defaultControllers } from '../src/store';
import { KinematicBrainStage } from '../src/components/KinematicBrainStage';
import { HeatedBedConfig } from '../src/components/HeatedBedConfig';

vi.mock('@react-three/fiber', () => ({ Canvas: () => null }));
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }));
vi.mock('../src/components/3d/Shared3DEnvironment', () => ({ Shared3DEnvironment: () => null }));
vi.mock('../src/components/3d/SharedModule3DView', () => ({ default: () => null }));

afterEach(cleanup);

function brainContext(ssrActive: boolean) {
  const updateController = vi.fn();
  const controller = { ...defaultControllers[0], kinematicBrainStage: { ...createDefaultKinematicBrainStage(), heatedBed: { ...createDefaultKinematicBrainStage().heatedBed, ssrActive } } };
  const value = { activeController: controller, updateController };
  return { updateController, wrapper: ({ children }: { children: React.ReactNode }) => <HydraContext.Provider value={value as never}>{children}</HydraContext.Provider> };
}

describe('the heater of the Kinematic Brain Stage', () => {
  it('asks before switching on, and only switches on when confirmed', () => {
    const { updateController, wrapper } = brainContext(false);
    render(<KinematicBrainStage />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^off$/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(updateController).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(updateController).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^off$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^on$/i }));
    expect(updateController).toHaveBeenCalledTimes(1);
    expect(updateController.mock.calls[0][1].kinematicBrainStage.heatedBed.ssrActive).toBe(true);
  });

  it('switches off at once, without a question', () => {
    const { updateController, wrapper } = brainContext(true);
    render(<KinematicBrainStage />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /^on$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(updateController.mock.calls[0][1].kinematicBrainStage.heatedBed.ssrActive).toBe(false);
  });

  it('shows the endstops as status, not as buttons that write them', () => {
    const { updateController, wrapper } = brainContext(false);
    render(<KinematicBrainStage />, { wrapper });
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(12);
    expect(screen.queryByRole('button', { name: /x min/i })).toBeNull();
    fireEvent.click(screen.getAllByRole('status')[0]);
    expect(updateController).not.toHaveBeenCalled();
  });
});

describe('the heater of the heated bed screen', () => {
  function bedContext(ssrActive: boolean) {
    const updateRobot = vi.fn();
    const robot = { ...defaultControllers[0].robots[0], id: 1, model: 'Parol6 (6-DOF)', heatedBed: { enabled: true, modelId: '200x200x5', size: { width: 200, length: 200 }, targetTemp: 60, currentTemp1: 25, currentTemp2: 25, ssrActive, worldPos: { x: 0, y: 0 }, worldRot: 0, renderScale: 1 } };
    const value = { robots: [robot], updateRobot };
    return { updateRobot, wrapper: ({ children }: { children: React.ReactNode }) => <HydraContext.Provider value={value as never}>{children}</HydraContext.Provider> };
  }

  it('asks before switching on', () => {
    const { updateRobot, wrapper } = bedContext(false);
    render(<HeatedBedConfig />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /ssr off/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(updateRobot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^on$/i }));
    expect(updateRobot).toHaveBeenCalledTimes(1);
    expect(updateRobot.mock.calls[0][1].heatedBed.ssrActive).toBe(true);
  });

  it('switches off at once', () => {
    const { updateRobot, wrapper } = bedContext(true);
    render(<HeatedBedConfig />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /ssr on/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(updateRobot.mock.calls[0][1].heatedBed.ssrActive).toBe(false);
  });
});
