import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  estimateRul, formatDuration, loadEta, parseEta, parsePlanRequest, parseRul, parseRulPoints, parseSimulation, parseTrainPlan,
  probeWindowStatistics, simulatePlan,
} from '../src/lib/planningApi';

// The planning view: what it reads from the relay of the server, and how it refuses what it should not show.

const ACCEPTED = { verdict: 'accepted', executable: false, executed: false, violations: [], timeline: [{ step_id: 'a', index: 0, robot: 'r1', primitive: 'MOVE_TO', start_ms: 0, end_ms: 1000 }], makespan_ms: 1000, simulated_clock_ms: 1000 };

function answerWith(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body, headers: new Headers() })));
}

afterEach(() => vi.unstubAllGlobals());

describe('the dry run of a plan', () => {
  it('reads a request only when it is an object with a list of steps', () => {
    expect(parsePlanRequest('{"steps":[{"primitive":"WAIT"}]}')).not.toBeNull();
    for (const bad of ['', '{', '[]', '{"steps":[]}', '{"steps":"x"}', '{"constraints":{}}', 'null']) expect(parsePlanRequest(bad), bad).toBeNull();
  });

  it('reads the verdict, the violations and the timeline', () => {
    const rejected = parseSimulation({ ...ACCEPTED, verdict: 'rejected', violations: [{ rule: 'workspace_limit', step_id: 'b', message: 'out', suggestion: { x: 1 } }, { nope: 1 }] });
    expect(rejected?.verdict).toBe('rejected');
    expect(rejected?.violations).toEqual([{ rule: 'workspace_limit', stepId: 'b', message: 'out', suggestion: '{"x":1}' }]);
    expect(parseSimulation(ACCEPTED)?.timeline).toEqual([{ stepId: 'a', robot: 'r1', primitive: 'MOVE_TO', startMs: 0, endMs: 1000 }]);
  });

  it('never shows an answer that claims to have executed or to be executable, or an accepted plan that lists a violation', () => {
    expect(parseSimulation({ ...ACCEPTED, executed: true })).toBeNull();
    expect(parseSimulation({ ...ACCEPTED, executable: true })).toBeNull();
    expect(parseSimulation({ ...ACCEPTED, executable: undefined })).toBeNull();
    expect(parseSimulation({ ...ACCEPTED, verdict: 'maybe' })).toBeNull();
    expect(parseSimulation({ ...ACCEPTED, violations: [{ rule: 'x', message: '' }] })).toBeNull();
    expect(parseSimulation('x')).toBeNull();
  });

  it('says why it could not answer: switched off, not allowed, not reachable, refused, malformed', async () => {
    for (const [status, failure] of [[404, 'off'], [403, 'forbidden'], [401, 'forbidden'], [503, 'unreachable'], [500, 'http']] as const) {
      answerWith(status, {});
      expect(await simulatePlan({ steps: [{}] })).toMatchObject({ ok: false, failure });
    }
    answerWith(400, { error: 'steps must be a list' });
    expect(await simulatePlan({ steps: [{}] })).toEqual({ ok: false, failure: 'invalid', status: 400, message: 'steps must be a list' });
    answerWith(200, { verdict: 'accepted', executed: true, executable: false });
    expect(await simulatePlan({ steps: [{}] })).toMatchObject({ ok: false, failure: 'malformed' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await simulatePlan({ steps: [{}] })).toEqual({ ok: false, failure: 'network' });
    answerWith(200, ACCEPTED);
    const ok = await simulatePlan({ steps: [{}] });
    expect(ok.ok && ok.value.verdict).toBe('accepted');
  });

  it('posts to the relay of the planner and to nothing else', async () => {
    answerWith(200, ACCEPTED);
    await simulatePlan({ steps: [{}] });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/api/ai/semantic-planner/plan/simulate');
    expect(call[1].method).toBe('POST');
  });
});

describe('the estimates of the dispatcher', () => {
  const eta = {
    generatedAtMs: 1760000000000, drainMs: 1760000180000,
    jobs: [
      { jobId: 'weld-42', status: 'assigned', estimated: true, robotId: 'arm-3', startMs: 1, endMs: 61001, durationMs: 61000, endLowMs: 50001, endHighMs: 80001 },
      { jobId: 'weld-44', status: 'pending', estimated: false, reason: 'no_robot_with_required_tool' },
      { status: 'pending' },
    ],
  };

  it('reads the jobs, the ranges and the reason there is no estimate, and drops a damaged row', () => {
    const value = parseEta(eta);
    expect(value?.jobs.map(j => j.jobId)).toEqual(['weld-42', 'weld-44']);
    expect(value?.jobs[0]).toMatchObject({ estimated: true, lowMs: 50001, highMs: 80001, durationMs: 61000 });
    expect(value?.jobs[1]).toMatchObject({ estimated: false, reason: 'no_robot_with_required_tool', startMs: null });
    expect(parseEta({ jobs: [] })).toBeNull();
    expect(parseEta(null)).toBeNull();
  });

  it('answers off when the dispatcher has the estimates switched off', async () => {
    answerWith(404, {});
    expect(await loadEta()).toMatchObject({ ok: false, failure: 'off' });
    answerWith(200, eta);
    expect((await loadEta()).ok).toBe(true);
  });

  it('writes a duration', () => {
    expect(formatDuration(5000)).toBe('5 s');
    expect(formatDuration(200000)).toBe('3 min 20 s');
    expect(formatDuration(7260000)).toBe('2 h 1 min');
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(-1)).toBe('-');
  });
});

describe('the remaining useful life', () => {
  it('reads points one per line', () => {
    expect(parseRulPoints('0, 0.1\n86400 0.2;\n172800\t0.4\n\n')).toEqual([{ t: 0, score: 0.1 }, { t: 86400, score: 0.2 }, { t: 172800, score: 0.4 }]);
    for (const bad of ['', '1', '1,2,3', 'a,b', '1,NaN', '1,Infinity']) expect(parseRulPoints(bad), bad).toBeNull();
    expect(parseRulPoints(Array.from({ length: 1001 }, (_, i) => `${i},1`).join('\n'))).toBeNull();
    expect(parseRulPoints(Array.from({ length: 1000 }, (_, i) => `${i},1`).join('\n'))).toHaveLength(1000);
  });

  it('reads the estimate and refuses another status', () => {
    expect(parseRul({ status: 'estimated', points: 10, slopePerDay: 0.1, currentValue: 0.5, daysToLimit: 12.5, daysLow: 8, daysHigh: null })).toMatchObject({ status: 'estimated', daysToLimit: 12.5, daysHigh: null });
    expect(parseRul({ status: 'insufficient_data', points: 3 })?.daysToLimit).toBeNull();
    expect(parseRul({ status: 'doomed' })).toBeNull();
  });

  it('asks the relay of the detector and maps what it answers', async () => {
    answerWith(200, { status: 'not_rising', points: 9 });
    const done = await estimateRul([{ t: 0, score: 1 }], 5);
    expect(done.ok && done.value.status).toBe('not_rising');
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/api/ai/anomaly-detector/rul');
    expect(JSON.parse(call[1].body)).toEqual({ points: [{ t: 0, score: 1 }], limit: 5 });
    answerWith(403, {});
    expect(await estimateRul([{ t: 0, score: 1 }], 5)).toMatchObject({ failure: 'forbidden' });
    answerWith(404, {});
    expect(await estimateRul([{ t: 0, score: 1 }], 5)).toMatchObject({ failure: 'off' });
  });
});

describe('the switches of the data lake', () => {
  it('tells off from on by the status of a read of the window statistics', async () => {
    answerWith(404, {});
    expect(await probeWindowStatistics()).toBe('off');
    answerWith(400, {});
    expect(await probeWindowStatistics()).toBe('on');
    answerWith(200, []);
    expect(await probeWindowStatistics()).toBe('on');
    answerWith(503, {});
    expect(await probeWindowStatistics()).toBe('unknown');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await probeWindowStatistics()).toBe('unknown');
  });
});

describe('a version train as `train plan --json` wrote it', () => {
  const plan = {
    schema_version: '1.2', train: 'lote-1', ok: false, problems: ['blocked: x'],
    items: [
      { name: 'HYDRA-UMC-SDK', action: 'update', version: '0.4.5', commit: 'abc', installed_version: '0.4.4', installed_commit: 'def', reason: 'older' },
      { name: 'HYDRA-UMC-DOCS', action: 'install', version: '0.0.7', installed_version: null },
    ],
  };

  it('reads the items in order', () => {
    const value = parseTrainPlan(JSON.stringify(plan));
    expect(value?.train).toBe('lote-1');
    expect(value?.ok).toBe(false);
    expect(value?.problems).toEqual(['blocked: x']);
    expect(value?.items.map(i => [i.name, i.action, i.installedVersion])).toEqual([['HYDRA-UMC-SDK', 'update', '0.4.4'], ['HYDRA-UMC-DOCS', 'install', null]]);
  });

  it('refuses what is not the stable output: another major version, a missing key, an unknown action, text that is not JSON', () => {
    expect(parseTrainPlan(JSON.stringify({ ...plan, schema_version: '2.0' }))).toBeNull();
    expect(parseTrainPlan(JSON.stringify({ ...plan, schema_version: 1 }))).toBeNull();
    expect(parseTrainPlan(JSON.stringify({ ...plan, items: undefined }))).toBeNull();
    expect(parseTrainPlan(JSON.stringify({ ...plan, items: [{ name: 'x', action: 'format-disk', version: '1' }] }))).toBeNull();
    expect(parseTrainPlan('plan: ok')).toBeNull();
    expect(parseTrainPlan('[]')).toBeNull();
  });
});
