// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { armJog, claimRobot, fetchClaims, fetchSafetyLimits, putSafetyLimits, releaseRobot } from '../src/lib/accessApi';
import { getControllerId } from '../src/lib/controllerSession';
import { failureCodeFor, interpretCommandResponse } from '../src/lib/commandResult';

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }));
}

beforeEach(() => { calls = []; });
afterEach(() => { vi.unstubAllGlobals(); });

const bodyOf = (call: Call) => JSON.parse(String(call.init.body));

describe('the calls of contract v2 block 1', () => {
  it('claim, release and jog-arm carry the controller id of this window in the body', async () => {
    answer(200, { success: true, expiresAt: 123 });
    await claimRobot(7, { ttlMs: 60000, reason: 'bench' });
    await releaseRobot(7);
    const armed = await armJog(7, true);
    expect(calls.map((c) => c.url)).toEqual(['/api/robot/7/claim', '/api/robot/7/release', '/api/robot/7/jog-arm']);
    for (const call of calls) expect(bodyOf(call).controllerId).toBe(getControllerId());
    expect(bodyOf(calls[0])).toMatchObject({ ttlMs: 60000, reason: 'bench' });
    expect(bodyOf(calls[2])).toMatchObject({ armed: true });
    expect(armed.expiresAt).toBe(123);
  });

  it('a force claim is only sent when asked for', async () => {
    answer(200, { success: true });
    await claimRobot(1);
    await claimRobot(1, { force: true });
    expect(bodyOf(calls[0]).force).toBeUndefined();
    expect(bodyOf(calls[1]).force).toBe(true);
  });

  it('tells the three refusals of a claim apart', async () => {
    for (const [code, expected] of [['other-account', 'claim_other_account'], ['other-controller', 'claim_other_controller'], ['controller-id-required', 'claim_controller_required']] as const) {
      answer(409, { error: 'held', code });
      const result = await claimRobot(1);
      expect(result.ok).toBe(false);
      expect(result.code).toBe(expected);
      expect(result.serverCode).toBe(code);
    }
  });

  it('a 409 without a code from an older server stays the generic "claimed"', async () => {
    answer(409, { error: 'held' });
    expect((await claimRobot(1)).code).toBe('claimed');
  });

  it('a jog that was not armed is its own failure', () => {
    const result = interpretCommandResponse(403, false, { error: 'not armed', code: 'jog-not-armed' });
    expect(result.code).toBe('jog_not_armed');
    expect(failureCodeFor(403, null)).toBe('forbidden');
    expect(failureCodeFor(400, 'controller-id-required')).toBe('claim_controller_required');
  });

  it('answers a network failure as a result, never as an exception', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await claimRobot(1)).code).toBe('network');
    expect((await armJog(1, false)).result.code).toBe('network');
    expect(await fetchClaims()).toBeNull();
    expect(await fetchSafetyLimits()).toBeNull();
    expect((await putSafetyLimits({})).state).toBeNull();
  });

  it('lists the reservations and reads the limits, with the arming of a robot', async () => {
    answer(200, { claims: [{ robotId: 2, ownerUsername: 'ana', controllerId: 'w' }] });
    expect(await fetchClaims()).toHaveLength(1);
    expect(calls[0].url).toBe('/api/claims');
    answer(200, { limits: { jog: { armRequired: true } }, robot: { id: 2, jogArmedUntil: 99 } });
    const read = await fetchSafetyLimits(2);
    expect(calls[1].url).toBe('/api/safety-limits?robotId=2');
    expect(read?.state.limits.jog.armRequired).toBe(true);
    expect(read?.jogArmedUntil).toBe(99);
    answer(404, { error: 'no' });
    expect(await fetchClaims()).toBeNull();
  });

  it('saves the limits with PUT and gives back what the server now holds', async () => {
    answer(200, { success: true, limits: { claims: { requireControllerId: true } } });
    const saved = await putSafetyLimits({ claims: { requireControllerId: true } });
    expect(calls[0].url).toBe('/api/admin/safety-limits');
    expect(calls[0].init.method).toBe('PUT');
    expect(saved.result.ok).toBe(true);
    expect(saved.state?.limits.claims.requireControllerId).toBe(true);
    answer(400, { error: 'jog.armTtlMs out of range' });
    const refused = await putSafetyLimits({});
    expect(refused.result.ok).toBe(false);
    expect(refused.result.detail).toBe('jog.armTtlMs out of range');
    expect(refused.state).toBeNull();
  });
});
