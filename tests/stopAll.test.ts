// =============================================================================
// HYDRA-UMC STUDIO - tests/stopAll.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The global STOP's client layer (src/lib/stopAll.ts): the request (POST, no body, bearer token), the reading of the
// answer robot by robot, the fall back to the per-robot stop on 429 / 404, the session-expired signal, the single
// retry of a network failure, and the keyboard chord that cannot fire by accident.
// =============================================================================
import { describe, expect, it, vi } from 'vitest';

import {
  STOP_ALL_SHORTCUT_LABEL,
  interpretStopAllResponse,
  isStopAllShortcut,
  parseStopAllBody,
  reportNeedsAttention,
  requestStopAll,
  requestStopAllWithRetry,
  shouldFallBackToPerRobot,
} from '../src/lib/stopAll';

const goodBody = {
  success: true,
  stoppedCount: 2,
  failedCount: 0,
  persisted: true,
  robots: [
    { robotId: 1, controllerId: 'c1', name: 'A1', stopped: true, valvesOff: 1, pumpsOff: 0 },
    { robotId: 2, controllerId: 'c1', name: 'A2', stopped: true, valvesOff: 0, pumpsOff: 2, reservedBy: 'bob' },
  ],
};

function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('parseStopAllBody', () => {
  it('reads every robot of the answer, with the reservation of another account', () => {
    const report = parseStopAllBody(goodBody)!;
    expect(report.stoppedCount).toBe(2);
    expect(report.failedCount).toBe(0);
    expect(report.persisted).toBe(true);
    expect(report.viaFallback).toBe(false);
    expect(report.robots.map((r) => r.name)).toEqual(['A1', 'A2']);
    expect(report.robots[1].pumpsOff).toBe(2);
    expect(report.robots[1].reservedBy).toBe('bob');
    expect(reportNeedsAttention(report)).toBe(false);
  });

  it('flags a robot that did not stop and a stop the server could not save', () => {
    const failed = parseStopAllBody({
      success: false, stoppedCount: 1, failedCount: 1, persisted: false,
      robots: [
        { robotId: 1, name: 'A1', stopped: true },
        { robotId: 2, name: 'A2', stopped: false, error: 'controller offline' },
      ],
    })!;
    expect(failed.robots[1].error).toBe('controller offline');
    expect(failed.persisted).toBe(false);
    expect(reportNeedsAttention(failed)).toBe(true);
    expect(reportNeedsAttention({ ...failed, failedCount: 0, success: true, persisted: false })).toBe(true);
  });

  it('answers 200 with no robots when there are none, and rejects a body that is not the contract', () => {
    expect(parseStopAllBody({ success: true, stoppedCount: 0, failedCount: 0, persisted: true, robots: [] })!.robots).toEqual([]);
    expect(parseStopAllBody({ success: true })).toBeNull();
    expect(parseStopAllBody(null)).toBeNull();
    expect(parseStopAllBody('stopped')).toBeNull();
  });
});

describe('interpretStopAllResponse', () => {
  it('turns a 200 into a report', () => {
    const attempt = interpretStopAllResponse(200, true, goodBody);
    expect(attempt.kind).toBe('report');
  });

  it('falls back to the per-robot stop on 429 (rate limit) and 404 (older server), and on nothing else', () => {
    expect(interpretStopAllResponse(429, false, { error: 'Too many requests' })).toEqual({ kind: 'fallback', status: 429 });
    expect(interpretStopAllResponse(404, false, null)).toEqual({ kind: 'fallback', status: 404 });
    expect(shouldFallBackToPerRobot(500)).toBe(false);
    expect(shouldFallBackToPerRobot(403)).toBe(false);
    expect(interpretStopAllResponse(500, false, null).kind).toBe('failed');
  });

  it('marks a 401 and an expired-token 403 as a session to renew, but not a role 403', () => {
    const unauthorized = interpretStopAllResponse(401, false, { error: 'no token' });
    expect(unauthorized).toMatchObject({ kind: 'failed', code: 'session_expired', sessionExpired: true });
    const expired = interpretStopAllResponse(403, false, { code: 'TOKEN_EXPIRED' });
    expect(expired).toMatchObject({ kind: 'failed', sessionExpired: true });
    const role = interpretStopAllResponse(403, false, { error: 'admin privileges required' });
    expect(role).toMatchObject({ kind: 'failed', code: 'forbidden', sessionExpired: false });
  });

  it('is not confirmed when a 200 carries something else than the contract', () => {
    expect(interpretStopAllResponse(200, true, { hello: 1 }).kind).toBe('failed');
  });
});

describe('requestStopAll', () => {
  it('posts with no body and the bearer token, and reads the answer', async () => {
    const fetchImpl = vi.fn(async () => answer(200, goodBody));
    const attempt = await requestStopAll({ fetchImpl: fetchImpl as unknown as typeof fetch, headers: () => ({ Authorization: 'Bearer abc' }) });
    expect(attempt.kind).toBe('report');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/stop-all$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('never throws: a network failure is a failed attempt with status 0', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const attempt = await requestStopAll({ fetchImpl: fetchImpl as unknown as typeof fetch, headers: () => ({}) });
    expect(attempt).toMatchObject({ kind: 'failed', status: 0, code: 'network' });
  });

  it('gives up on an attempt that does not answer within the timeout', async () => {
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const attempt = await requestStopAll({ fetchImpl: fetchImpl as unknown as typeof fetch, headers: () => ({}), timeoutMs: 20 });
    expect(attempt).toMatchObject({ kind: 'failed', code: 'network' });
  });

  it('retries once after a network failure, and not after an answer', async () => {
    const flaky = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(answer(200, goodBody));
    const recovered = await requestStopAllWithRetry({ fetchImpl: flaky as unknown as typeof fetch, headers: () => ({}), retryDelayMs: 1 });
    expect(recovered.kind).toBe('report');
    expect(flaky).toHaveBeenCalledTimes(2);

    const refused = vi.fn(async () => answer(429, { error: 'Too many requests' }));
    const attempt = await requestStopAllWithRetry({ fetchImpl: refused as unknown as typeof fetch, headers: () => ({}), retryDelayMs: 1 });
    expect(attempt.kind).toBe('fallback');
    expect(refused).toHaveBeenCalledTimes(1);

    const down = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const stillDown = await requestStopAllWithRetry({ fetchImpl: down as unknown as typeof fetch, headers: () => ({}), retryDelayMs: 1 });
    expect(stillDown).toMatchObject({ kind: 'failed', code: 'network' });
    expect(down).toHaveBeenCalledTimes(2);
  });
});

describe('the keyboard shortcut', () => {
  const base = { code: 'Space', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, repeat: false };

  it('is Ctrl+Shift+Space, documented by its label', () => {
    expect(STOP_ALL_SHORTCUT_LABEL).toBe('Ctrl+Shift+Space');
    expect(isStopAllShortcut(base)).toBe(true);
  });

  it('does not fire on a plain space, a single modifier, another key, or a held key', () => {
    expect(isStopAllShortcut({ ...base, ctrlKey: false })).toBe(false);
    expect(isStopAllShortcut({ ...base, shiftKey: false })).toBe(false);
    expect(isStopAllShortcut({ ...base, ctrlKey: false, shiftKey: false })).toBe(false);
    expect(isStopAllShortcut({ ...base, code: 'KeyS' })).toBe(false);
    expect(isStopAllShortcut({ ...base, altKey: true })).toBe(false);
    expect(isStopAllShortcut({ ...base, metaKey: true })).toBe(false);
    expect(isStopAllShortcut({ ...base, repeat: true })).toBe(false);
  });
});
