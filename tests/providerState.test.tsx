// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/providerState.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The parts of the state provider that moved out of it: the shared default configuration, how a server answer becomes
// the state of the window, the routing of the socket frames, the socket hook and the deferred save of the tree.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { defaultSystemSettings } from '../src/lib/defaultSettings';
import { controllersFromServer, currentHost, hostIntegrations, normalizeControllers, pickActiveControllerId, seedControllers } from '../src/lib/serverState';
import { routeSocketFrame, WS_AUTH_REJECTED, WS_RECONNECT_MS, type SocketHandlers } from '../src/lib/settingsSocket';
import { useSettingsSocket } from '../src/hooks/useSettingsSocket';
import { SETTINGS_SAVE_DEBOUNCE_MS, useDeferredSettingsSave, type DeferredSaveOptions } from '../src/hooks/useDeferredSettingsSave';
import { defaultControllers } from '../src/store';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('the default configuration', () => {
  it('returns an independent copy every time', () => {
    const a = defaultSystemSettings();
    const b = defaultSystemSettings();
    expect(a).toEqual(b);
    a.integrations.ros2.port = 1;
    a.visibleModules.push('x');
    expect(b.integrations.ros2.port).toBe(8000);
    expect(b.visibleModules).not.toContain('x');
  });

  it('starts closed: nothing enabled, the standard layout and English', () => {
    const s = defaultSystemSettings();
    expect(s.language).toBe('en');
    expect(s.autoConnectRobots).toBe(false);
    expect(Object.values(s.integrations).every((i) => i.enabled === false)).toBe(true);
    expect(s.uiLayout).toEqual({ rightPanelWidth: 320, pointsTableHeight: 300 });
    expect(s.canOta?.transport).toBe('mock');
  });
});

describe('what the server sent becomes the state of the window', () => {
  it('points the integrations of a fresh install at the host', () => {
    const i = hostIntegrations('10.0.0.5');
    expect(i.openPnP.ip).toBe('10.0.0.5');
    expect(i.ros2).toEqual({ enabled: false, ip: '10.0.0.5', port: 8000 });
    expect(i.cnc.software).toBe('LinuxCNC');
  });

  it('seeds exactly one controller, rewritten to the host, without touching the demo array', () => {
    const before = JSON.stringify(defaultControllers);
    const seed = seedControllers('10.0.0.5');
    expect(seed).toHaveLength(1);
    expect(seed[0].id).toBe('10.0.0.5');
    expect(seed[0].ip).toBe('10.0.0.5');
    expect(JSON.stringify(defaultControllers)).toBe(before);
  });

  it('corrects a controller saved from a cloud address and gives idle playback to a robot without it', () => {
    const saved: any[] = [
      { id: 'abc.run.app', ip: 'abc.run.app', name: 'x', robots: [{ id: 1 }, { id: 2, playbackState: { isPlaying: true, activeStep: 3, speed: 50 } }] },
      { id: '192.168.0.9', robots: [] },
    ];
    const out = normalizeControllers(saved, 'h.local');
    expect(out).toBe(saved);
    expect(out[0]).toMatchObject({ id: 'h.local', ip: 'h.local', name: 'HYDRA-UMC (h.local)' });
    expect(out[0].robots[0].playbackState).toEqual({ isPlaying: false, activeStep: 0, speed: 100 });
    expect(out[0].robots[1].playbackState.isPlaying).toBe(true);
    expect(out[1].id).toBe('192.168.0.9');
  });

  it('uses the saved controllers when there are some and the seed when there are none', () => {
    expect(controllersFromServer({ controllers: [{ id: 'a', robots: [] }] }, 'h')).toEqual([{ id: 'a', robots: [] }]);
    expect(controllersFromServer({ controllers: [] }, 'h')).toHaveLength(1);
    expect(controllersFromServer({}, 'h')[0].id).toBe('h');
    expect(controllersFromServer(null, 'h')[0].id).toBe('h');
  });

  it('keeps the active controller the server names, else the first, else the host', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect(pickActiveControllerId('b', list, 'h')).toBe('b');
    expect(pickActiveControllerId('zzz', list, 'h')).toBe('a');
    expect(pickActiveControllerId(undefined, list, 'h')).toBe('a');
    expect(pickActiveControllerId(undefined, [{ id: 'h' }], 'h')).toBe('h');
    expect(pickActiveControllerId('x', [], 'h')).toBe('h');
  });

  it('reads the host of the page', () => {
    expect(currentHost()).toBe(window.location.hostname || '192.168.1.100');
  });
});

describe('the frames of the socket', () => {
  const handlers = () => ({ applyRobotDelta: vi.fn(), applyServerData: vi.fn(), publishClaims: vi.fn(), setCanotaProgress: vi.fn() } satisfies SocketHandlers);

  beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => undefined); vi.spyOn(console, 'warn').mockImplementation(() => undefined); });

  it('sends a schema-2 delta to the robot delta', () => {
    const h = handlers();
    const msg = { type: 'delta', schema: 2, robotId: 3, patch: { a: 1 } };
    routeSocketFrame(JSON.stringify(msg), h);
    expect(h.applyRobotDelta).toHaveBeenCalledWith(msg);
    expect(h.applyServerData).not.toHaveBeenCalled();
  });

  it('applies the full tree of a settings message and of a delta without schema 2', () => {
    const h = handlers();
    routeSocketFrame(JSON.stringify({ type: 'settings', payload: { n: 1 } }), h);
    routeSocketFrame(JSON.stringify({ type: 'delta', payload: { n: 2 } }), h);
    expect(h.applyServerData.mock.calls).toEqual([[{ n: 1 }], [{ n: 2 }]]);
    expect(h.applyRobotDelta).not.toHaveBeenCalled();
  });

  it('publishes claims and keeps the flash progress', () => {
    const h = handlers();
    routeSocketFrame(JSON.stringify({ type: 'claims', robots: [] }), h);
    routeSocketFrame(JSON.stringify({ type: 'canota_progress', payload: { percent: 40 } }), h);
    expect(h.publishClaims).toHaveBeenCalledWith({ type: 'claims', robots: [] });
    expect(h.setCanotaProgress).toHaveBeenCalledWith({ percent: 40 });
  });

  it('warns about an error frame and ignores a malformed one', () => {
    const h = handlers();
    routeSocketFrame(JSON.stringify({ error: 'nope' }), h);
    expect(console.warn).toHaveBeenCalledWith('[WS] nope');
    expect(() => routeSocketFrame('{not json', h)).not.toThrow();
    routeSocketFrame(JSON.stringify({ type: 'settings' }), h);
    expect(h.applyServerData).not.toHaveBeenCalled();
  });
});

describe('the socket hook', () => {
  class FakeSocket {
    static all: FakeSocket[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;
    onclose: ((ev: { code: number; reason: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    url: string;
    protocols: string[];
    constructor(url: string, protocols: string[]) { this.url = url; this.protocols = protocols; FakeSocket.all.push(this); }
    close() { this.closed = true; }
  }

  const options = (over: Partial<Parameters<typeof useSettingsSocket>[0]> = {}) => ({
    authToken: 'tok', applyRobotDelta: vi.fn(), applyServerData: vi.fn(), publishClaims: vi.fn(), setCanotaProgress: vi.fn(),
    setServerReachable: vi.fn(), attemptTokenRefresh: vi.fn(async () => false), logout: vi.fn(), ...over,
  });

  beforeEach(() => {
    FakeSocket.all = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.useFakeTimers();
  });

  it('does not open a socket without a session', () => {
    renderHook(() => useSettingsSocket(options({ authToken: null })));
    expect(FakeSocket.all).toHaveLength(0);
  });

  it('opens it with the token as a subprotocol and reports reachability', () => {
    const o = options();
    renderHook(() => useSettingsSocket(o));
    const s = FakeSocket.all[0];
    expect(s.url).toContain('/ws?remoteApiVersion=2');
    expect(s.url).not.toContain('tok');
    expect(s.protocols).toEqual(['hydra.bearer', 'tok']);
    s.onopen!();
    expect(o.setServerReachable).toHaveBeenLastCalledWith(true);
    s.onmessage!({ data: JSON.stringify({ type: 'settings', payload: { a: 1 } }) });
    expect(o.applyServerData).toHaveBeenCalledWith({ a: 1 });
  });

  it('opens it again after the reconnect delay when it drops', () => {
    const o = options();
    renderHook(() => useSettingsSocket(o));
    FakeSocket.all[0].onclose!({ code: 1006, reason: '' });
    expect(o.setServerReachable).toHaveBeenLastCalledWith(false);
    expect(FakeSocket.all).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(WS_RECONNECT_MS); });
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('renews the session on a refused one and signs out only when that fails', async () => {
    const failing = options();
    renderHook(() => useSettingsSocket(failing));
    FakeSocket.all[0].onclose!({ code: WS_AUTH_REJECTED, reason: 'x' });
    await vi.advanceTimersByTimeAsync(0);
    expect(failing.attemptTokenRefresh).toHaveBeenCalledTimes(1);
    expect(failing.logout).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(WS_RECONNECT_MS * 2);
    expect(FakeSocket.all).toHaveLength(1);

    FakeSocket.all = [];
    const renewing = options({ attemptTokenRefresh: vi.fn(async () => true) });
    renderHook(() => useSettingsSocket(renewing));
    FakeSocket.all[0].onclose!({ code: WS_AUTH_REJECTED, reason: '' });
    await vi.advanceTimersByTimeAsync(0);
    expect(renewing.logout).not.toHaveBeenCalled();
  });

  it('closes the socket and cancels the reconnect when it unmounts', () => {
    const o = options();
    const { unmount } = renderHook(() => useSettingsSocket(o));
    const s = FakeSocket.all[0];
    s.onclose!({ code: 1006, reason: '' });
    unmount();
    vi.advanceTimersByTime(WS_RECONNECT_MS * 2);
    expect(FakeSocket.all).toHaveLength(1);
    const again = renderHook(() => useSettingsSocket(options()));
    const s2 = FakeSocket.all[1];
    again.unmount();
    expect(s2.closed).toBe(true);
  });
});

describe('the deferred save of the tree', () => {
  const make = (over: Partial<DeferredSaveOptions> = {}): DeferredSaveOptions => ({
    isLoaded: true, watch: [1], role: 'admin',
    skipNextSaveRef: { current: false }, lastPayloadJsonRef: { current: null },
    buildPayloadJson: () => '{"v":1}',
    persistTree: vi.fn(async () => ({ kind: 'saved', etag: null, body: {} }) as never),
    setOperatorEdited: vi.fn(), setSettingsSaveError: vi.fn(), reportCommandIssue: vi.fn(), ...over,
  });
  const flush = async () => { await vi.advanceTimersByTimeAsync(SETTINGS_SAVE_DEBOUNCE_MS + 1); };

  beforeEach(() => { vi.useFakeTimers(); });

  it('saves 500 ms after a change and remembers the payload as sent', async () => {
    const o = make();
    renderHook(() => useDeferredSettingsSave(o));
    expect(o.persistTree).not.toHaveBeenCalled();
    await flush();
    expect(o.persistTree).toHaveBeenCalledWith('{"v":1}', false);
    expect(o.lastPayloadJsonRef.current).toBe('{"v":1}');
    expect(o.setSettingsSaveError).toHaveBeenLastCalledWith(null);
  });

  it('saves nothing before the first read has finished', async () => {
    const o = make({ isLoaded: false });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    expect(o.persistTree).not.toHaveBeenCalled();
  });

  it('skips a change that came from a delta or a command, once', async () => {
    const o = make({ skipNextSaveRef: { current: true } });
    const { rerender } = renderHook((p: DeferredSaveOptions) => useDeferredSettingsSave(p), { initialProps: o });
    await flush();
    expect(o.persistTree).not.toHaveBeenCalled();
    expect(o.skipNextSaveRef.current).toBe(false);
    rerender({ ...o, watch: [2] });
    await flush();
    expect(o.persistTree).toHaveBeenCalledTimes(1);
  });

  it('does not send a tree the server already has', async () => {
    const o = make({ lastPayloadJsonRef: { current: '{"v":1}' } });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    expect(o.persistTree).not.toHaveBeenCalled();
  });

  it('keeps the edit of an operator in the window instead of sending it', async () => {
    const o = make({ role: 'operator' });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    expect(o.persistTree).not.toHaveBeenCalled();
    expect(o.setOperatorEdited).toHaveBeenCalledWith(true);
    expect(o.setSettingsSaveError).toHaveBeenCalledWith(null);
  });

  it('says it failed and does not mark the payload as sent', async () => {
    const o = make({ persistTree: vi.fn(async () => ({ kind: 'failed', status: 403 }) as never) });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    expect(o.lastPayloadJsonRef.current).toBeNull();
    const message = (o.setSettingsSaveError as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];
    expect(typeof message).toBe('string');
  });

  it('leaves a conflict to the code that shows the server version', async () => {
    const o = make({ persistTree: vi.fn(async () => ({ kind: 'conflict', server: {}, etag: null }) as never) });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    expect(o.lastPayloadJsonRef.current).toBeNull();
    expect(o.setSettingsSaveError).not.toHaveBeenCalled();
  });

  it('reports a lowered bed temperature that the server announced', async () => {
    const body = { warnings: [{ code: 'temperature-limit', robotId: 2, requested: 150, applied: 120 }] };
    const o = make({ persistTree: vi.fn(async () => ({ kind: 'saved', etag: null, body }) as never) });
    renderHook(() => useDeferredSettingsSave(o));
    await flush();
    const calls = (o.reportCommandIssue as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toMatchObject({ code: 'temperature_limit', robotIds: [2], detail: '150 -> 120' });
  });

  it('restarts the timer on a second change and sends the latest state once', async () => {
    let v = 1;
    const o = make({ buildPayloadJson: () => `{"v":${v}}` });
    const { rerender } = renderHook((p: DeferredSaveOptions) => useDeferredSettingsSave(p), { initialProps: o });
    await vi.advanceTimersByTimeAsync(300);
    v = 2;
    rerender({ ...o, watch: [2] });
    await vi.advanceTimersByTimeAsync(300);
    expect(o.persistTree).not.toHaveBeenCalled();
    await flush();
    expect(o.persistTree).toHaveBeenCalledTimes(1);
    expect(o.persistTree).toHaveBeenCalledWith('{"v":2}', false);
  });
});
