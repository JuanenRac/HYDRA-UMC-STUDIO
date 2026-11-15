// =============================================================================
// HYDRA-UMC STUDIO - tests/settingsSwitches.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The five safety switches that go through the typed client of the SDK (droid emergency stop, HIL bridge, connector hub gate, semantic planner, ROS 2 bridge):
// each one asks its own route, a read sends no body, a change sends the body with the confirmation, and a refusal keeps its status and the reason.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectorHubGateApi } from '../src/lib/connectorHubGate';
import { droidEstopApi } from '../src/lib/droidEstop';
import { hilBridgeApi } from '../src/lib/hilBridge';
import { plannerIdentityApi } from '../src/lib/plannerIdentity';
import { ros2SecurityApi } from '../src/lib/ros2Security';

afterEach(() => { vi.unstubAllGlobals(); });

const answer = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as unknown as Response;

function serve(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => answer(status, body));
  vi.stubGlobal('fetch', spy);
  return spy;
}

const switches = [
  { name: 'droid emergency stop', route: '/api/droid-estop/settings', api: droidEstopApi, ok: { enabled: true, running: true }, bodyKey: 'enabled' },
  { name: 'HIL bridge', route: '/api/hil-bridge/settings', api: hilBridgeApi, ok: { requireTwinPass: true }, bodyKey: 'requireTwinPass' },
  { name: 'connector hub gate', route: '/api/connector-hub/gate/settings', api: connectorHubGateApi, ok: { allowLoopbackNoIdentity: true }, bodyKey: 'allowLoopbackNoIdentity' },
  { name: 'semantic planner', route: '/api/semantic-planner/settings', api: plannerIdentityApi, ok: { requireIdentity: true }, bodyKey: 'requireIdentity' },
  { name: 'ROS 2 bridge', route: '/api/ros2-bridge/settings', api: ros2SecurityApi, ok: { requireSros2: true, active: true, restartNeeded: false, canChange: true, environmentReady: true }, bodyKey: 'requireSros2' },
] as const;

describe.each(switches)('the $name switch through the typed client', ({ route, api, ok, bodyKey }) => {
  it('reads from its own route without a body', async () => {
    const spy = serve(200, ok);
    expect(await api.read()).toMatchObject({ ok: true });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(route);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('sends a change as JSON with the confirmation', async () => {
    const spy = serve(200, ok);
    expect(await api.write(true)).toMatchObject({ ok: true });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(route);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ [bodyKey]: true, confirm: true });
  });

  it('keeps the status and the reason of a refusal, and tells the missing route apart', async () => {
    serve(409, { error: 'locked on' });
    expect(await api.write(false)).toEqual({ ok: false, failure: 'http', status: 409, reason: 'locked on' });
    serve(404, null);
    expect(await api.read()).toEqual({ ok: false, failure: 'unsupported' });
  });
});
