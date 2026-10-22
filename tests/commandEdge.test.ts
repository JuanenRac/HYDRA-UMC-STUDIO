// =============================================================================
// HYDRA-UMC STUDIO - tests/commandEdge.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Edge cases of the command and STOP layer: answers that are not what the
// contract promises, the order in which failures are reported, the dead-man
// timer of the jog repeater, and the files an operator can import.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failureCodeForStatus, interpretCommandResponse, networkFailure, summarizeBulk } from '../src/lib/commandResult';
import type { CommandResult } from '../src/lib/commandResult';
import { createJogRepeater } from '../src/lib/jogRepeater';
import { MAX_IMPORTED_POINTS, MAX_IMPORTED_ROBOTS, validateSceneRobots, validateTrajectoryPoints } from '../src/lib/importValidation';
import {
  interpretStopAllResponse, isStopAllShortcut, parseStopAllBody, reportNeedsAttention, requestStopAll, requestStopAllWithRetry,
} from '../src/lib/stopAll';

const failed = (status: number, detail: string | null = null): CommandResult => ({ ok: false, status, code: failureCodeForStatus(status), detail, serverCode: null, warnings: [] });
const accepted: CommandResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };

describe('failureCodeForStatus', () => {
  it('maps every status class the server uses', () => {
    const table: Array<[number, string]> = [[0, 'network'], [401, 'session_expired'], [403, 'forbidden'], [404, 'not_found'], [409, 'claimed'], [400, 'rejected'], [413, 'rejected'], [422, 'rejected'], [429, 'rejected'], [500, 'server'], [502, 'server'], [503, 'server'], [599, 'server']];
    for (const [status, code] of table) expect(failureCodeForStatus(status), String(status)).toBe(code);
  });
});

describe('interpretCommandResponse', () => {
  it('reads warnings given as objects with a message or as plain text, drops the empty ones, and bounds each', () => {
    const result = interpretCommandResponse(200, true, { warnings: [{ message: ' speed too low ' }, 'plain', '', '   ', { message: '' }, { other: 1 }, null, 5, 'x'.repeat(500)] });
    expect(result.warnings[0]).toBe('speed too low');
    expect(result.warnings[1]).toBe('plain');
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings[2]).toHaveLength(300);
  });

  it('ignores warnings that are not a list and an error that is not text', () => {
    expect(interpretCommandResponse(200, true, { warnings: 'careful' }).warnings).toEqual([]);
    expect(interpretCommandResponse(409, false, { error: { nested: true } }).detail).toBeNull();
    expect(interpretCommandResponse(409, false, { error: '   ' }).detail).toBeNull();
  });

  it('never reports detail or a code for an accepted command', () => {
    const result = interpretCommandResponse(200, true, { error: 'ignored' });
    expect(result).toEqual({ ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] });
  });

  it('uses the status, not the body, to name a refusal', () => {
    expect(interpretCommandResponse(409, false, { error: 'robot is claimed by bob' })).toMatchObject({ ok: false, code: 'claimed', detail: 'robot is claimed by bob' });
    expect(interpretCommandResponse(500, false, null)).toMatchObject({ ok: false, code: 'server', detail: null });
  });

  it('treats an array body like no body', () => {
    expect(interpretCommandResponse(400, false, ['error'])).toMatchObject({ code: 'rejected', detail: null });
  });
});

describe('networkFailure', () => {
  it('has status 0, the network code and a bounded detail', () => {
    expect(networkFailure()).toEqual({ ok: false, status: 0, code: 'network', detail: null, serverCode: null, warnings: [] });
    expect(networkFailure('x'.repeat(400)).detail).toHaveLength(300);
  });
});

describe('summarizeBulk', () => {
  it('names the most serious cause when several kinds of failure are mixed', () => {
    const results = [
      { robotId: 1, result: failed(404) },
      { robotId: 2, result: failed(409) },
      { robotId: 3, result: failed(500) },
      { robotId: 4, result: accepted },
      { robotId: 5, result: failed(401) },
    ];
    expect(summarizeBulk(results)).toMatchObject({ failed: [1, 2, 3, 5], code: 'session_expired' });
  });

  it('puts a lost connection above everything else', () => {
    expect(summarizeBulk([{ robotId: 1, result: failed(403) }, { robotId: 2, result: networkFailure('down') }])).toMatchObject({ code: 'network', detail: 'down' });
  });

  it('takes the detail from a robot that has the chosen code', () => {
    const summary = summarizeBulk([{ robotId: 1, result: failed(409, 'claimed by bob') }, { robotId: 2, result: failed(404, 'unknown robot') }]);
    expect(summary.code).toBe('claimed');
    expect(summary.detail).toBe('claimed by bob');
  });

  it('is empty when there are no results', () => {
    expect(summarizeBulk([])).toEqual({ failed: [], code: null, detail: null });
  });
});

describe('parseStopAllBody edge cases', () => {
  it('skips entries that are not robots and keeps a robot whose id comes as text', () => {
    const report = parseStopAllBody({ robots: [null, 5, 'x', { robotId: 'abc' }, { robotId: '7', stopped: true, name: 'Seven' }, { robotId: Number.NaN }] });
    expect(report?.robots.map((r) => r.robotId)).toEqual([7]);
    expect(report?.robots[0].name).toBe('Seven');
  });

  it('only believes stopped when it is exactly true, and counts a robot that says "true" as not stopped', () => {
    const report = parseStopAllBody({ robots: [{ robotId: 1, stopped: 'true' }, { robotId: 2, stopped: 1 }, { robotId: 3, stopped: true }] });
    expect(report?.robots.map((r) => r.stopped)).toEqual([false, false, true]);
    expect(report?.stoppedCount).toBe(1);
    expect(report?.failedCount).toBe(2);
  });

  it('never reports success unless the server said so with a real true', () => {
    for (const success of ['true', 1, null, undefined, {}]) expect(parseStopAllBody({ robots: [], success })?.success).toBe(false);
    expect(parseStopAllBody({ robots: [], success: true })?.success).toBe(true);
  });

  it('keeps the counts the server gave, clamped to whole non-negative numbers', () => {
    const report = parseStopAllBody({ robots: [], stoppedCount: -3, failedCount: 2.9 });
    expect(report).toMatchObject({ stoppedCount: 0, failedCount: 2 });
    expect(parseStopAllBody({ robots: [], stoppedCount: Infinity })?.stoppedCount).toBe(0);
  });

  it('assumes the stop was saved unless the server says it was not', () => {
    expect(parseStopAllBody({ robots: [] })?.persisted).toBe(true);
    expect(parseStopAllBody({ robots: [], persisted: false })?.persisted).toBe(false);
  });

  it('bounds the text it keeps and names an unnamed robot by its id', () => {
    const report = parseStopAllBody({ robots: [{ robotId: 4, name: '   ', error: 'e'.repeat(1000), reservedBy: 'r'.repeat(1000) }] });
    expect(report?.robots[0].name).toBe('#4');
    expect(report?.robots[0].error).toHaveLength(300);
    expect(report?.robots[0].reservedBy).toHaveLength(300);
  });

  it('refuses a body that is not an object with a list of robots', () => {
    for (const body of [null, undefined, 5, 'x', [], { robots: 'all' }, { robots: {} }]) expect(parseStopAllBody(body), JSON.stringify(body)).toBeNull();
  });
});

describe('reportNeedsAttention', () => {
  const base = { success: true, stoppedCount: 1, failedCount: 0, persisted: true, robots: [], viaFallback: false };
  it('is quiet only when everything stopped and was saved', () => {
    expect(reportNeedsAttention(base)).toBe(false);
    expect(reportNeedsAttention({ ...base, failedCount: 1 })).toBe(true);
    expect(reportNeedsAttention({ ...base, persisted: false })).toBe(true);
    expect(reportNeedsAttention({ ...base, success: false })).toBe(true);
  });
});

describe('interpretStopAllResponse edge cases', () => {
  it('falls back on 404 and 429 whatever the body says, and on no other refusal', () => {
    for (const status of [404, 429]) expect(interpretStopAllResponse(status, false, { error: 'x' })).toEqual({ kind: 'fallback', status });
    for (const status of [400, 401, 403, 405, 409, 500, 502, 503]) expect(interpretStopAllResponse(status, false, null).kind, String(status)).toBe('failed');
  });

  it('asks for a new session on a 401 and on a 403 that says the token is bad, not on a plain 403', () => {
    expect(interpretStopAllResponse(401, false, null)).toMatchObject({ kind: 'failed', sessionExpired: true });
    expect(interpretStopAllResponse(403, false, { code: 'TOKEN_EXPIRED' })).toMatchObject({ sessionExpired: true });
    expect(interpretStopAllResponse(403, false, { code: 'TOKEN_INVALID' })).toMatchObject({ sessionExpired: true });
    expect(interpretStopAllResponse(403, false, { code: 'ROLE' })).toMatchObject({ sessionExpired: false });
    expect(interpretStopAllResponse(500, false, { code: 'TOKEN_EXPIRED' })).toMatchObject({ sessionExpired: false });
  });

  it('is not confirmed when an ok answer has no usable body, even with a success flag', () => {
    expect(interpretStopAllResponse(200, true, { success: true })).toMatchObject({ kind: 'failed', code: 'rejected' });
    expect(interpretStopAllResponse(204, true, null)).toMatchObject({ kind: 'failed' });
  });
});

describe('requestStopAll', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('reads an answer that has no JSON body as a refusal of that status, not as a crash', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad gateway', { status: 502 })) as unknown as typeof fetch;
    const attempt = await requestStopAll({ fetchImpl, headers: () => ({}) });
    expect(attempt).toMatchObject({ kind: 'failed', status: 502, code: 'server', detail: null });
  });

  it('does not retry a refusal and does not retry a timeout answer twice', async () => {
    const refusing = vi.fn(async () => new Response(JSON.stringify({ error: 'no' }), { status: 403 })) as unknown as typeof fetch;
    const attempt = await requestStopAllWithRetry({ fetchImpl: refusing, headers: () => ({}), retryDelayMs: 0 });
    expect(attempt.kind).toBe('failed');
    expect(refusing).toHaveBeenCalledTimes(1);
    const dead = vi.fn(async () => { throw new TypeError('offline'); }) as unknown as typeof fetch;
    const second = await requestStopAllWithRetry({ fetchImpl: dead, headers: () => ({}), retryDelayMs: 0 });
    expect(second).toMatchObject({ kind: 'failed', status: 0, code: 'network' });
    expect(dead).toHaveBeenCalledTimes(2);
  });

  it('is the second try that counts when the first had no network and the second works', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('offline');
      return new Response(JSON.stringify({ success: true, stoppedCount: 1, failedCount: 0, persisted: true, robots: [{ robotId: 1, stopped: true }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const attempt = await requestStopAllWithRetry({ fetchImpl, headers: () => ({}), retryDelayMs: 0 });
    expect(attempt.kind).toBe('report');
  });

  it('aborts the request that outlives the timeout', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); });
    })) as unknown as typeof fetch;
    const pending = requestStopAll({ fetchImpl, headers: () => ({}), timeoutMs: 1500 });
    await vi.advanceTimersByTimeAsync(1499);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(aborted).toBe(true);
    expect(await pending).toMatchObject({ kind: 'failed', status: 0, code: 'network' });
  });
});

describe('isStopAllShortcut', () => {
  const chord = { code: 'Space', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, repeat: false };
  it('needs exactly Ctrl and Shift and Space, once', () => {
    expect(isStopAllShortcut(chord)).toBe(true);
    expect(isStopAllShortcut({ ...chord, ctrlKey: false })).toBe(false);
    expect(isStopAllShortcut({ ...chord, shiftKey: false })).toBe(false);
    expect(isStopAllShortcut({ ...chord, altKey: true })).toBe(false);
    expect(isStopAllShortcut({ ...chord, metaKey: true })).toBe(false);
    expect(isStopAllShortcut({ ...chord, repeat: true })).toBe(false);
    expect(isStopAllShortcut({ ...chord, code: 'Enter' })).toBe(false);
  });
});

describe('jog repeater dead-man timer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stops at exactly the hold limit, tells the caller it was the dead-man, and sends no more steps', () => {
    const tick = vi.fn();
    const onDeadman = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 1000, onDeadman });
    repeater.start(tick);
    vi.advanceTimersByTime(999);
    expect(repeater.isRunning()).toBe(true);
    expect(onDeadman).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(repeater.isRunning()).toBe(false);
    expect(onDeadman).toHaveBeenCalledTimes(1);
    const ticks = tick.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(tick.mock.calls.length).toBe(ticks);
  });

  it('a normal release is not reported as the dead-man and cancels it for good', () => {
    const onDeadman = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 1000, onDeadman });
    repeater.start(() => undefined);
    vi.advanceTimersByTime(300);
    repeater.stop();
    vi.advanceTimersByTime(5000);
    expect(onDeadman).not.toHaveBeenCalled();
  });

  it('starting again restarts the hold limit instead of keeping the old one', () => {
    const onDeadman = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 1000, onDeadman });
    repeater.start(() => undefined);
    vi.advanceTimersByTime(800);
    repeater.start(() => undefined);
    vi.advanceTimersByTime(800);
    expect(onDeadman).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onDeadman).toHaveBeenCalledTimes(1);
  });

  it('stopping a repeater that never started is harmless', () => {
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 1000 });
    expect(() => repeater.stop()).not.toThrow();
    expect(repeater.isRunning()).toBe(false);
  });

  it('a step that throws does not leave a repeater running forever', () => {
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 500 });
    expect(() => repeater.start(() => { throw new Error('boom'); })).toThrow('boom');
    expect(repeater.isRunning()).toBe(false);
  });
});

describe('imports an operator can feed the interface', () => {
  const joints = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };
  const robot = (id: number, extra: object = {}) => ({ id, name: `R${id}`, model: 'Generic (6-DOF)', joints, pos: { x: 0, y: 0, z: 0 }, ...extra });

  it('refuses a trajectory point with a value that is not a finite number, whatever the field', () => {
    for (const bad of [Number.NaN, Infinity, '1', null, true, [], {}]) {
      for (const key of ['j1', 'j6', 'x', 'speed', 'trz']) {
        const point: Record<string, unknown> = { ...joints, [key]: bad };
        if (key.startsWith('j') && bad !== undefined) expect(validateTrajectoryPoints([point]).ok, `${key}=${String(bad)}`).toBe(false);
        else if (bad !== undefined) expect(validateTrajectoryPoints([point]).ok, `${key}=${String(bad)}`).toBe(false);
      }
    }
    expect(validateTrajectoryPoints([{ ...joints, motionType: 5 }]).ok).toBe(false);
    expect(validateTrajectoryPoints([{ ...joints, motionType: 'model-joints', x: 1, speed: 20 }]).ok).toBe(true);
  });

  it('accepts exactly the maximum number of points and refuses one more', () => {
    const points = Array.from({ length: MAX_IMPORTED_POINTS }, () => ({ ...joints }));
    expect(validateTrajectoryPoints(points).ok).toBe(true);
    expect(validateTrajectoryPoints([...points, { ...joints }]).ok).toBe(false);
  });

  it('refuses points that are arrays, null or text', () => {
    for (const point of [[], null, 'p', 5]) expect(validateTrajectoryPoints([point]).ok).toBe(false);
  });

  it('refuses a scene whose robot lacks a drawable position, a name, a model or whole-number id', () => {
    const cases: unknown[] = [
      robot(1.5), { ...robot(1), id: '1' }, { ...robot(1), name: '' }, { ...robot(1), model: 7 }, { ...robot(1), joints: null },
      { ...robot(1), pos: { x: 0, y: 0 } }, { ...robot(1), pos: { x: 0, y: 0, z: Number.NaN } }, robot(1, { recordedPoints: 'many' }),
      robot(1, { recordedPoints: [{ j1: 0 }] }),
    ];
    for (const entry of cases) expect(validateSceneRobots([entry]).ok, JSON.stringify(entry)).toBe(false);
  });

  it('refuses two robots with the same id and a scene one robot over the limit, and names the position', () => {
    expect(validateSceneRobots([robot(1), robot(1)])).toMatchObject({ ok: false, error: expect.stringContaining('twice') });
    const many = Array.from({ length: MAX_IMPORTED_ROBOTS }, (_, i) => robot(i + 1));
    expect(validateSceneRobots(many).ok).toBe(true);
    expect(validateSceneRobots([...many, robot(99)]).ok).toBe(false);
    expect(validateSceneRobots([robot(1), { ...robot(2), name: '' }])).toMatchObject({ error: expect.stringContaining('robot 2') });
  });

  it('keeps unknown extra fields out of the way instead of failing', () => {
    expect(validateSceneRobots([robot(1, { colour: 'red', extra: { nested: true } })]).ok).toBe(true);
  });
});
