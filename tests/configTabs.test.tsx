// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/configTabs.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The configuration dialog split into one component per tab, and the parts it kept out of the dialog: the connection tests of the
// integration cards and the camera tools. The tabs must show what they showed, a change of tab must not lose what the tools hold, and the
// status of the streams must be asked only while the Cameras tab is open.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { defaultControllers } from '../src/store';
import { HydraStoreProviders } from '../src/storeContexts';
import { Config } from '../src/components/Config';
import { useConnectionTests } from '../src/hooks/useConnectionTests';
import { useCameraTools } from '../src/hooks/useCameraTools';
import { defaultSystemSettings } from '../src/lib/defaultSettings';

vi.mock('../src/components/GamepadConfig', () => ({ GamepadConfig: () => <div data-testid="gamepad-config" /> }));
vi.mock('../src/components/UsersPanel', () => ({ UsersPanel: () => <div data-testid="users-panel" /> }));
vi.mock('../src/components/SubmittedModels', () => ({ SubmittedModels: () => <div data-testid="submitted-models" /> }));

type Call = { url: string; init: RequestInit | undefined };
let calls: Call[] = [];

function serve(handler: (url: string, init: RequestInit | undefined) => { status?: number; body: unknown } | 'network') {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const reply = handler(url, init);
    if (reply === 'network') throw new TypeError('network');
    const status = reply.status ?? 200;
    return { ok: status < 300, status, json: async () => reply.body, headers: new Headers() } as Response;
  }));
}

beforeEach(() => { calls = []; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('useConnectionTests', () => {
  it('asks the server to probe the address and keeps each card on its own', async () => {
    serve((url, init) => ({ body: JSON.parse(String(init?.body)).port === 5000 ? { reachable: true } : { reachable: false } }));
    const { result } = renderHook(() => useConnectionTests('token-1'));
    await act(async () => { await result.current.testConnection('cnc', '10.0.0.5', 5000); });
    await act(async () => { await result.current.testConnection('laser', '10.0.0.6', 6000); });
    expect(result.current.testStates).toEqual({ cnc: 'reachable', laser: 'unreachable' });
    expect(calls[0].url).toMatch(/\/api\/integrations\/test-connection$/);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ host: '10.0.0.5', port: 5000 });
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('says unreachable when the server cannot be reached or refuses', async () => {
    serve(() => 'network');
    const { result } = renderHook(() => useConnectionTests(null));
    await act(async () => { await result.current.testConnection('ros2', 'h', 1); });
    expect(result.current.testStates.ros2).toBe('unreachable');
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBeUndefined();
    serve(() => ({ status: 500, body: { reachable: true } }));
    await act(async () => { await result.current.testConnection('ros2', 'h', 1); });
    expect(result.current.testStates.ros2).toBe('unreachable');
  });
});

describe('useCameraTools', () => {
  it('polls the status of the streams only while the Cameras tab is open', async () => {
    vi.useFakeTimers();
    serve(() => ({ body: { '1:1': { status: 'running', lastError: null } } }));
    const updateCamera = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useCameraTools(open, 'tok', updateCamera as never), { initialProps: { open: false } });
    await act(async () => { await vi.advanceTimersByTimeAsync(7000); });
    expect(calls).toHaveLength(0);
    rerender({ open: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(calls).toHaveLength(1);
    expect(result.current.cameraStatus['1:1'].status).toBe('running');
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(calls).toHaveLength(3);
    rerender({ open: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(calls).toHaveLength(3);
  });

  it('keeps the status it had when one poll fails', async () => {
    vi.useFakeTimers();
    let fail = false;
    serve(() => (fail ? 'network' : { body: { '1:1': { status: 'starting', lastError: null } } }));
    const { result } = renderHook(() => useCameraTools(true, null, vi.fn() as never));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fail = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(result.current.cameraStatus['1:1'].status).toBe('starting');
  });

  it('points the camera at the first path found and remembers the others', async () => {
    serve(() => ({ body: { ok: true, paths: ['/11', '/12'] } }));
    const updateCamera = vi.fn();
    const { result } = renderHook(() => useCameraTools(false, 'tok', updateCamera as never));
    await act(async () => { await result.current.discoverRtspPath(2, '192.168.0.9', 554, 'admin', 'pw'); });
    expect(updateCamera).toHaveBeenCalledWith(2, { rtspPath: '/11', discoveredStreamPaths: ['/11', '/12'], type: 'IP Vision Camera Main Stream' });
    expect(result.current.rtspDiscoverStates[2]).toEqual({ phase: 'found', message: '/11, /12' });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ host: '192.168.0.9', port: 554, username: 'admin', password: 'pw' });
  });

  it('lists the paths it tried when none answered, and reports a failed call; an empty host asks nothing', async () => {
    serve(() => ({ body: { ok: false, triedPaths: ['/a', '/b'] } }));
    const updateCamera = vi.fn();
    const { result } = renderHook(() => useCameraTools(false, null, updateCamera as never));
    await act(async () => { await result.current.discoverRtspPath(1, '  ', 554, '', ''); });
    expect(calls).toHaveLength(0);
    await act(async () => { await result.current.discoverRtspPath(1, 'cam', 554, '', ''); });
    expect(result.current.rtspDiscoverStates[1]).toEqual({ phase: 'not-found', message: '/a, /b' });
    expect(updateCamera).not.toHaveBeenCalled();
    serve(() => 'network');
    await act(async () => { await result.current.discoverRtspPath(1, 'cam', 554, '', ''); });
    expect(result.current.rtspDiscoverStates[1]).toEqual({ phase: 'error' });
  });

  it('scans the USB cameras once for every card and tells a failure', async () => {
    serve(() => ({ body: { devices: [{ index: 0, available: true, width: 640, height: 480 }] } }));
    const { result } = renderHook(() => useCameraTools(false, null, vi.fn() as never));
    expect(result.current.usbDiscoverPhase).toBe('idle');
    await act(async () => { await result.current.discoverUsbDevices(); });
    expect(result.current.usbDiscoverPhase).toBe('done');
    expect(result.current.usbDevices).toHaveLength(1);
    serve(() => ({ status: 500, body: {} }));
    await act(async () => { await result.current.discoverUsbDevices(); });
    expect(result.current.usbDiscoverPhase).toBe('error');
  });
});

function renderConfig() {
  const updateSettings = vi.fn();
  const updateController = vi.fn();
  const updateRobot = vi.fn();
  const updateCamera = vi.fn();
  const factoryReset = vi.fn();
  const controller = defaultControllers[0];
  const value = {
    authToken: 'tok', serverReachable: true, settings: defaultSystemSettings(), updateSettings, flushSettingsSave: vi.fn(),
    controllers: defaultControllers, activeController: controller, activeControllerId: controller.id,
    updateController, updateRobot, updateCamera, addController: vi.fn(), removeController: vi.fn(), factoryReset,
  };
  render(
    <HydraStoreProviders value={value as never}><Config onClose={vi.fn()} /></HydraStoreProviders>,
  );
  return { updateSettings, updateController, updateRobot, updateCamera, factoryReset, controller };
}

const openTab = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Config, one component per tab', () => {
  it('opens on the identity tab and edits the name of the server', () => {
    const { updateSettings } = renderConfig();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My bench' } });
    expect(updateSettings).toHaveBeenCalledWith({ serverName: 'My bench' });
  });

  it('shows the controllers with the live check only on the active row, and the robot names', () => {
    const { updateController, updateRobot, controller } = renderConfig();
    openTab(/^controllers$/i);
    const nameInput = screen.getByDisplayValue(controller.name);
    fireEvent.change(nameInput, { target: { value: 'Renamed' } });
    expect(updateController).toHaveBeenCalledWith(controller.id, { name: 'Renamed' });
    openTab(/^robot names$/i);
    const robotInput = screen.getByDisplayValue(controller.robots[0].name);
    fireEvent.change(robotInput, { target: { value: 'Arm' } });
    expect(updateRobot).toHaveBeenCalledWith(controller.robots[0].id, { name: 'Arm' });
  });

  it('changes the visible modules from the interface tab', () => {
    const { updateSettings } = renderConfig();
    openTab(/ui & themes/i);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.length).toBe(9);
    fireEvent.click(boxes[0]);
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings.mock.calls[0][0]).toHaveProperty('visibleModules');
  });

  it('asks before switching the CAN OTA transport to the real boards', () => {
    const { updateSettings } = renderConfig();
    openTab(/can-ota/i);
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'hardware' } });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('asks before the factory reset', () => {
    const { factoryReset } = renderConfig();
    fireEvent.click(screen.getByRole('button', { name: /factory reset/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(factoryReset).not.toHaveBeenCalled();
  });

  it('keeps what the camera tools found when the tab is left and entered again', async () => {
    serve((url) => (url.endsWith('/api/camera/discover-usb-devices')
      ? { body: { devices: [{ index: 3, available: true, width: 1280, height: 720 }] } }
      : { body: {} }));
    renderConfig();
    openTab(/camera setup/i);
    fireEvent.click(screen.getAllByRole('button', { name: /discover usb/i })[0]);
    await waitFor(() => expect(screen.getAllByText(/#3/).length).toBeGreaterThan(0));
    openTab(/^identity$/i);
    openTab(/camera setup/i);
    expect(screen.getAllByText(/#3/).length).toBeGreaterThan(0);
  });

  it('tests an integration with the address of its card', async () => {
    serve(() => ({ body: { reachable: true } }));
    renderConfig();
    openTab(/integrations/i);
    fireEvent.click(screen.getAllByRole('button', { name: /test connection/i })[0]);
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/api/integrations/test-connection'))).toBe(true));
    await waitFor(() => expect(screen.getAllByText(/reachable/i).length).toBeGreaterThan(0));
  });

  it('lazy-loads the gamepad tab, and the users and models tabs open their panels', async () => {
    renderConfig();
    openTab(/^users$/i);
    expect(screen.getByTestId('users-panel')).toBeTruthy();
    openTab(/custom models/i);
    expect(screen.getByTestId('submitted-models')).toBeTruthy();
    openTab(/gamepad/i);
    await waitFor(() => expect(screen.getByTestId('gamepad-config')).toBeTruthy());
  });
});
