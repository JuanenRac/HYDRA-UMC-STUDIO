// =============================================================================
// HYDRA-UMC STUDIO - tests/serverConfigTyped.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The calls that read and change the configuration of the server, the safety limits and the plan of the data lake go through the typed client: the route and the
// method that leave, the body of a change, and the status and the reason of a refusal reaching the screens as before.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { putSafetyLimits } from '../src/lib/accessApi';
import { detectionHefApi } from '../src/lib/detectionHef';
import { loadPlan } from '../src/lib/downsamplePlan';
import { settle, ServerHttpError } from '../src/lib/serverClient';
import { serviceIdentityApi } from '../src/lib/serviceIdentity';

afterEach(() => { vi.unstubAllGlobals(); });

type Call = { url: string; init: RequestInit };

function serve(handler: (call: Call) => { status: number; body: unknown }): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    const reply = handler(call);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  }));
  return calls;
}

describe('settle', () => {
  it('delivers the body of a success as 200 and the status and body of a refusal', async () => {
    expect(await settle(async () => ({ a: 1 }))).toEqual({ status: 200, data: { a: 1 } });
    expect(await settle(async () => undefined)).toEqual({ status: 200, data: null });
    expect(await settle(async () => { throw new ServerHttpError(409, { error: 'busy' }); })).toEqual({ status: 409, data: { error: 'busy' } });
    expect(await settle(async () => { throw new ServerHttpError(500); })).toEqual({ status: 500, data: null });
  });
  it('lets a lost network through', async () => {
    await expect(settle(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  });
});

describe('the configuration of the server through the typed client', () => {
  it('reads the switch with GET and changes it with PUT on the same route', async () => {
    const state = { detectionHef: { acceptLoadedReports: { value: false, source: 'default' } } };
    const calls = serve(() => ({ status: 200, body: state }));
    expect(await detectionHefApi.write(true)).toMatchObject({ ok: true });
    expect(calls.map((c) => [c.init.method, c.url])).toEqual([['PUT', '/api/admin/server-config'], ['GET', '/api/admin/server-config']]);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ detectionHef: { acceptLoadedReports: true, confirm: true } });
  });

  it('tells a missing route, a refused account and a refusal with its reason apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await detectionHefApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 403, body: {} }));
    expect(await serviceIdentityApi.write(true)).toEqual({ ok: false, failure: 'forbidden', status: 403 });
    serve(() => ({ status: 422, body: { error: 'no state file' } }));
    expect(await detectionHefApi.write(true)).toEqual({ ok: false, failure: 'http', status: 422, reason: 'no state file' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await detectionHefApi.read()).toEqual({ ok: false, failure: 'network' });
  });
});

describe('the safety limits and the plan of the data lake through the typed client', () => {
  it('saves the limits with PUT and keeps the refusal text', async () => {
    const calls = serve((c) => c.init.method === 'PUT' && String(c.init.body).includes('armTtlMs') ? { status: 400, body: { error: 'out of range' } } : { status: 200, body: { success: true, limits: {} } });
    const refused = await putSafetyLimits({ jog: { armTtlMs: 1 } });
    expect(refused.result.ok).toBe(false);
    expect(refused.result.detail).toBe('out of range');
    expect(refused.state).toBeNull();
    expect(calls[0].url).toBe('/api/admin/safety-limits');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ jog: { armTtlMs: 1 } });
  });

  it('reads the plan from its route and reports a lost network', async () => {
    const calls = serve(() => ({ status: 404, body: null }));
    expect(await loadPlan()).toMatchObject({ ok: false, failure: 'off', status: 404 });
    expect(calls[0].url).toBe('/api/telemetry/downsample-plan');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await loadPlan()).toEqual({ ok: false, failure: 'network' });
  });
});
