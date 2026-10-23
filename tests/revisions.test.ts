// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONDITIONAL_MODE_KEY,
  createRevisionTracker,
  ifMatchHeader,
  isConditional,
  loadConditionalMode,
  revisionOf,
  robotRevisions,
  saveConditionalMode,
} from '../src/lib/revisions';
import { claimRobot, fetchRobot, releaseRobot } from '../src/lib/accessApi';
import { interpretCommandResponse } from '../src/lib/commandResult';

describe('which commands carry If-Match', () => {
  it('STOP never does, whatever the mode', () => {
    for (const mode of ['off', 'standard', 'strict'] as const) expect(isConditional(mode, 'stop')).toBe(false);
  });

  it('standard leaves out the commands that repeat many times a second', () => {
    expect(isConditional('standard', 'jog')).toBe(false);
    expect(isConditional('standard', 'speed')).toBe(false);
    expect(isConditional('standard', 'table')).toBe(true);
    expect(isConditional('standard', 'claim')).toBe(true);
    expect(isConditional('standard', 'valve')).toBe(true);
  });

  it('strict checks everything but STOP and off checks nothing', () => {
    expect(isConditional('strict', 'jog')).toBe(true);
    expect(isConditional('off', 'table')).toBe(false);
  });
});

describe('the revision in an answer', () => {
  it('is read from the body and nothing else', () => {
    expect(revisionOf({ revision: 'abc123' })).toBe('abc123');
    expect(revisionOf({ revision: 12 })).toBeNull();
    expect(revisionOf({ revision: 'has space' })).toBeNull();
    expect(revisionOf(null)).toBeNull();
    expect(interpretCommandResponse(200, true, { success: true, revision: 'r1' }).revision).toBe('r1');
  });

  it('a 412 is its own failure and carries the current revision', () => {
    const result = interpretCommandResponse(412, false, { error: 'changed', code: 'revision-mismatch', revision: 'now' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('revision_changed');
    expect(result.revision).toBe('now');
    expect(interpretCommandResponse(412, false, { error: 'changed' }).code).toBe('revision_changed');
  });

  it('quotes the header like an ETag', () => {
    expect(ifMatchHeader('abc')).toBe('"abc"');
  });
});

describe('the tracker', () => {
  it('sends nothing until a revision is known, then sends the last one', () => {
    const tracker = createRevisionTracker('standard');
    const first = tracker.begin(1, 'valve');
    expect(first.ifMatch).toBeNull();
    tracker.finish(1, first.seq, 'r1');
    expect(tracker.known(1)).toBe('r1');
    const second = tracker.begin(1, 'valve');
    expect(second.ifMatch).toBe('"r1"');
  });

  it('does not send while another write to the same robot is on its way', () => {
    const tracker = createRevisionTracker('strict');
    tracker.learn(1, 'r1');
    const a = tracker.begin(1, 'table');
    const b = tracker.begin(1, 'table');
    expect(a.ifMatch).toBe('"r1"');
    expect(b.ifMatch).toBeNull();
    tracker.finish(1, a.seq, 'r2');
    tracker.finish(1, b.seq, 'r3');
    expect(tracker.known(1)).toBe('r3');
  });

  it('keeps the revision of the newest write when the answers come back out of order', () => {
    const tracker = createRevisionTracker('strict');
    const a = tracker.begin(1, 'valve');
    const b = tracker.begin(1, 'valve');
    tracker.finish(1, b.seq, 'newer');
    tracker.finish(1, a.seq, 'older');
    expect(tracker.known(1)).toBe('newer');
  });

  it('forgets a revision when an answer brings none (a refusal, an older server)', () => {
    const tracker = createRevisionTracker('standard');
    tracker.learn(1, 'r1');
    const t = tracker.begin(1, 'valve');
    tracker.finish(1, t.seq, null);
    expect(tracker.known(1)).toBeNull();
  });

  it('forgets everything after the whole tree was saved', () => {
    const tracker = createRevisionTracker('standard');
    tracker.learn(1, 'r1');
    tracker.learn(2, 'r2');
    tracker.forget();
    expect(tracker.known(1)).toBeNull();
    expect(tracker.known(2)).toBeNull();
  });

  it('the robots are independent', () => {
    const tracker = createRevisionTracker('standard');
    tracker.learn(1, 'r1');
    expect(tracker.begin(2, 'valve').ifMatch).toBeNull();
    expect(tracker.begin(1, 'valve').ifMatch).toBe('"r1"');
  });

  it('off never sends', () => {
    const tracker = createRevisionTracker('off');
    tracker.learn(1, 'r1');
    expect(tracker.begin(1, 'table').ifMatch).toBeNull();
  });
});

describe('the mode of this browser', () => {
  it('defaults to standard and survives a blocked storage', () => {
    expect(loadConditionalMode(null)).toBe('standard');
    expect(loadConditionalMode({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe('standard');
    expect(loadConditionalMode({ getItem: () => 'nonsense', setItem: () => {} })).toBe('standard');
  });

  it('keeps what was chosen', () => {
    const data: Record<string, string> = {};
    const storage = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; } };
    saveConditionalMode(storage, 'strict');
    expect(data[CONDITIONAL_MODE_KEY]).toBe('strict');
    expect(loadConditionalMode(storage)).toBe('strict');
    expect(() => saveConditionalMode({ getItem: () => null, setItem: () => { throw new Error('full'); } }, 'off')).not.toThrow();
  });
});

describe('the reservation calls with If-Match', () => {
  type Call = { url: string; init: RequestInit };
  let calls: Call[] = [];
  const answer = (status: number, body: unknown) => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
    }));
  };
  const header = (call: Call, name: string) => new Headers(call.init.headers).get(name);

  beforeEach(() => { calls = []; robotRevisions.setMode('standard'); robotRevisions.forget(); });
  afterEach(() => { vi.unstubAllGlobals(); robotRevisions.forget(); });

  it('the first claim sends none, learns the revision, and the release sends it back', async () => {
    answer(200, { success: true, revision: 'after-claim' });
    await claimRobot(5);
    expect(header(calls[0], 'If-Match')).toBeNull();
    expect(robotRevisions.known(5)).toBe('after-claim');
    await releaseRobot(5);
    expect(header(calls[1], 'If-Match')).toBe('"after-claim"');
  });

  it('a renewal and a take-over are never conditional', async () => {
    robotRevisions.learn(5, 'old');
    answer(200, { success: true, revision: 'r2' });
    await claimRobot(5, { unconditional: true });
    await claimRobot(5, { force: true });
    expect(header(calls[0], 'If-Match')).toBeNull();
    expect(header(calls[1], 'If-Match')).toBeNull();
    expect(JSON.parse(String(calls[0].init.body)).unconditional).toBeUndefined();
  });

  it('a 412 is reported as a changed robot and keeps the revision the server gave', async () => {
    robotRevisions.learn(5, 'stale');
    answer(412, { error: 'changed', code: 'revision-mismatch', revision: 'current' });
    const result = await releaseRobot(5);
    expect(result.code).toBe('revision_changed');
    expect(robotRevisions.known(5)).toBe('current');
  });

  it('reads one robot with its revision and keeps it', async () => {
    answer(200, { robot: { id: 5, name: 'Arm' }, revision: 'rev9', cellId: 'cell-1' });
    const read = await fetchRobot(5);
    expect(read?.robot.name).toBe('Arm');
    expect(read?.cellId).toBe('cell-1');
    expect(robotRevisions.known(5)).toBe('rev9');
  });

  it('an older server without the route gives null', async () => {
    answer(404, { error: 'not found' });
    expect(await fetchRobot(5)).toBeNull();
  });
});
