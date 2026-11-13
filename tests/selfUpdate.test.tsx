// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/selfUpdate.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The section "HYDRA-UMC updates" of Configuration, Updates, against a simulated server: what it shows, that it only looks until the switch is turned on, the
// confirmation that names the program and the versions, the steps of the job, and above all that a server which goes away while it restarts (refused
// connections, 502, answers that are not a job) never leaves the screen stuck: it keeps asking, says it is waiting, and ends with the result or with a message.
// Evidence: simulator; the real update on the CM5 is not proved here.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { SelfUpdatePanel } from '../src/components/config/SelfUpdatePanel';
import { resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';
import {
  failureKey, followJob, jobRunning, parseSelfUpdateJob, parseSelfUpdateStatus, progressIndex, readJob, startSelfUpdate,
  type PollRead, type SelfUpdateJob,
} from '../src/lib/selfUpdate';

const job = (patch: Partial<SelfUpdateJob> = {}): SelfUpdateJob => ({
  id: 'j1', action: 'apply', component: 'server', state: 'checking', fromVersion: '0.8.1.0', targetVersion: '0.9.0', startedAt: '2030-01-01T00:00:00.000Z', updatedAt: '2030-01-01T00:00:00.000Z',
  error: null, detail: '', log: [{ at: '2030-01-01T00:00:00.000Z', step: 'checking', text: 'looking' }], by: 'root', ...patch,
});
const item = (id: string, installed: string, latest: string, previous: string | null = null, state = 'behind', signedPackage = true) => ({ id, repo: `HYDRA-UMC-${id.toUpperCase()}`, installed, previous, latest, state, signedPackage });
const status = (patch: Record<string, unknown> = {}) => ({
  checkedAt: '2030-01-01T00:00:00.000Z', owner: 'JuanenRac', rateLimited: false, applyEnabled: true, job: null,
  items: [item('server', '0.8.1.0', '0.9.0', '0.8.0.0'), item('studio', '0.8.1.0', '0.8.1.0', null, 'current'), item('os-agent', '0.8.1.0', '0.9.0')], ...patch,
});

type Reply = { status: number; body?: unknown } | 'network';
/** A server that answers each route with the next reply of its list (the last one repeats). */
function serve(routes: Record<string, Reply[]>) {
  const seen: Array<{ url: string; method: string; body: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : '' });
    const key = Object.keys(routes).find((route) => url.includes(route));
    const list = key ? routes[key] : [{ status: 404 } as Reply];
    const reply = list.length > 1 ? (list.shift() as Reply) : list[0];
    if (reply === 'network') throw new TypeError('Failed to fetch');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body ?? {} } as unknown as Response;
  }));
  return seen;
}

beforeEach(() => { try { window.localStorage.clear(); } catch { /* storage may be blocked */ } resetStudioPrefs(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('selfUpdate parsing', () => {
  it('reads the status and ignores what is not valid', () => {
    const parsed = parseSelfUpdateStatus(status({ items: [item('server', '1', '2'), { id: 'kernel' }, 'junk'], job: job({ state: 'applying' }) }));
    expect(parsed.items.map((entry) => entry.id)).toEqual(['server']);
    expect(parsed.applyEnabled).toBe(true);
    expect(parsed.job?.state).toBe('applying');
    expect(parseSelfUpdateStatus(null)).toEqual({ checkedAt: null, owner: '', rateLimited: false, items: [], applyEnabled: false, job: null });
    expect(parseSelfUpdateStatus({ items: [{ id: 'server', state: 'odd' }] }).items[0].state).toBe('unknown');
  });

  it('reads a job only when it has an id, a program of the three and a known state', () => {
    expect(parseSelfUpdateJob(job())?.id).toBe('j1');
    expect(parseSelfUpdateJob({ ...job(), component: 'kernel' })).toBeNull();
    expect(parseSelfUpdateJob({ ...job(), state: 'exploded' })).toBeNull();
    expect(parseSelfUpdateJob({ ...job(), id: '' })).toBeNull();
    expect(parseSelfUpdateJob('nope')).toBeNull();
    expect(parseSelfUpdateJob({ ...job(), log: [{ step: 'nope', text: 'x' }, { step: 'done', text: 'ok', at: 'a' }] })?.log).toHaveLength(1);
  });

  it('tells a running job from a finished one and where the line of progress is', () => {
    for (const state of ['checking', 'downloading', 'verifying', 'applying', 'restarting'] as const) expect(jobRunning(job({ state }))).toBe(true);
    for (const state of ['done', 'failed'] as const) expect(jobRunning(job({ state }))).toBe(false);
    expect(jobRunning(null)).toBe(false);
    expect(progressIndex(job({ state: 'verifying' }))).toBe(2);
    expect(progressIndex(job({ state: 'done' }))).toBe(5);
    expect(progressIndex(job({ state: 'failed', log: [{ at: '', step: 'checking', text: '' }, { at: '', step: 'downloading', text: '' }, { at: '', step: 'failed', text: '' }] }))).toBe(1);
    expect(progressIndex(job({ state: 'failed', log: [] }))).toBe(-1);
  });

  it('has a sentence for every reason and a general one for the rest', () => {
    expect(failureKey('signature_invalid')).toBe('selfupdate.err_signature_invalid');
    expect(failureKey('rolled_back')).toBe('selfupdate.err_rolled_back');
    expect(failureKey('something new')).toBe('selfupdate.err_generic');
    expect(failureKey(null)).toBe('selfupdate.err_generic');
  });
});

describe('talking to the server', () => {
  it('starts a job with the confirmation and tells why it could not', async () => {
    const seen = serve({ '/api/admin/self-update/apply': [{ status: 200, body: job() }] });
    const started = await startSelfUpdate('apply', 'server');
    expect(started.ok).toBe(true);
    expect(seen[0].method).toBe('POST');
    expect(JSON.parse(seen[0].body)).toEqual({ component: 'server', confirm: true });
    for (const [code, reason] of [[404, 'disabled'], [403, 'forbidden'], [401, 'forbidden'], [409, 'busy'], [400, 'refused'], [500, 'refused']] as const) {
      serve({ '/api/admin/self-update/apply': [{ status: code }] });
      expect(await startSelfUpdate('apply', 'server')).toMatchObject({ ok: false, reason });
    }
    serve({ '/api/admin/self-update/apply': ['network'] });
    expect(await startSelfUpdate('apply', 'server')).toMatchObject({ ok: false, reason: 'network' });
    serve({ '/api/admin/self-update/apply': [{ status: 200, body: { nothing: true } }] });
    expect(await startSelfUpdate('apply', 'server')).toMatchObject({ ok: false, reason: 'refused' });
    serve({ '/api/admin/self-update/rollback': [{ status: 200, body: job({ action: 'rollback' }) }] });
    expect(await startSelfUpdate('rollback', 'server')).toMatchObject({ ok: true });
  });

  it('reads a job, and takes a server that is away for "wait", never for "failed"', async () => {
    serve({ '/jobs/j1': [{ status: 200, body: job({ state: 'applying' }) }] });
    expect(await readJob('j1')).toMatchObject({ kind: 'job' });
    serve({ '/jobs/j1': [{ status: 200, body: job({ id: 'other' }) }] });
    expect(await readJob('j1')).toEqual({ kind: 'wait' });
    for (const code of [404, 500, 502, 503, 504]) { serve({ '/jobs/j1': [{ status: code }] }); expect(await readJob('j1')).toEqual({ kind: 'wait' }); }
    serve({ '/jobs/j1': ['network'] });
    expect(await readJob('j1')).toEqual({ kind: 'wait' });
    serve({ '/jobs/j1': [{ status: 200, body: 'junk' }] });
    expect(await readJob('j1')).toEqual({ kind: 'wait' });
    for (const code of [401, 403]) { serve({ '/jobs/j1': [{ status: code }] }); expect(await readJob('j1')).toEqual({ kind: 'stop', reason: 'forbidden' }); }
  });
});

describe('followJob', () => {
  const clock = () => { let t = 0; return { now: () => t, sleep: async (ms: number) => { t += ms; } }; };

  it('keeps asking through the restart and ends with the job that ends', async () => {
    const reads: PollRead[] = [
      { kind: 'job', job: job({ state: 'applying' }) }, { kind: 'wait' }, { kind: 'wait' }, { kind: 'wait' },
      { kind: 'job', job: job({ state: 'restarting' }) }, { kind: 'job', job: job({ state: 'done' }) },
    ];
    const waits: number[] = [];
    const states: string[] = [];
    const { now, sleep } = clock();
    const end = await followJob({ id: 'j1', read: async () => reads.shift() as PollRead, onJob: (next) => states.push(next.state), onWaiting: (s) => waits.push(s), now, sleep, intervalMs: 1000 });
    expect(end).toMatchObject({ kind: 'ended', job: { state: 'done' } });
    expect(states).toEqual(['applying', 'restarting', 'done']);
    expect(waits).toEqual([1, 2, 3]);
  });

  it('ends with the failure the job reports, as a result and not as a silence', async () => {
    const { now, sleep } = clock();
    const end = await followJob({ id: 'j1', read: async () => ({ kind: 'job', job: job({ state: 'failed', error: 'rolled_back' }) }), onJob: () => {}, onWaiting: () => {}, now, sleep });
    expect(end).toMatchObject({ kind: 'ended', job: { state: 'failed', error: 'rolled_back' } });
  });

  it('gives up with a message only after the limit of silence, counted from the last answer', async () => {
    const { now, sleep } = clock();
    const reads: PollRead[] = [{ kind: 'job', job: job({ state: 'applying' }) }];
    let asked = 0;
    const end = await followJob({
      id: 'j1', read: async () => { asked += 1; return reads.shift() ?? { kind: 'wait' }; }, onJob: () => {}, onWaiting: () => {}, now, sleep, intervalMs: 1000, silenceLimitMs: 30_000,
    });
    expect(end).toEqual({ kind: 'silent', seconds: 30 });
    expect(asked).toBe(31);
  });

  it('stops when the session is refused or when it is cancelled', async () => {
    const { now, sleep } = clock();
    expect(await followJob({ id: 'j1', read: async () => ({ kind: 'stop', reason: 'forbidden' }), onJob: () => {}, onWaiting: () => {}, now, sleep })).toEqual({ kind: 'stopped', reason: 'forbidden' });
    expect(await followJob({ id: 'j1', read: async () => ({ kind: 'wait' }), onJob: () => {}, onWaiting: () => {}, now, sleep, cancelled: () => true })).toEqual({ kind: 'stopped', reason: 'cancelled' });
  });
});

describe('SelfUpdatePanel', () => {
  const rows = () => screen.getAllByTestId('selfupdate-row');
  const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

  it('shows the three programs against the newest signed release and only looks by default', async () => {
    serve({ '/api/admin/self-update': [{ status: 200, body: status() }] });
    render(<SelfUpdatePanel />);
    expect(await screen.findAllByTestId('selfupdate-row')).toHaveLength(3);
    expect(rows()[0].textContent).toContain('0.8.1.0');
    expect(rows()[0].textContent).toContain('0.9.0');
    expect(screen.getByTestId('selfupdate-state-server').textContent).toBe('update available');
    expect(screen.getByTestId('selfupdate-state-studio').textContent).toBe('up to date');
    expect((screen.getByTestId('selfupdate-switch') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('selfupdate-apply-server') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('selfupdate-rollback-server') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('selfupdate-mode').textContent).toContain('Check only');
  });

  it('says plainly when the server has the look switched off or the answer is refused', async () => {
    serve({ '/api/admin/self-update': [{ status: 404 }] });
    render(<SelfUpdatePanel />);
    expect((await screen.findByTestId('selfupdate-error')).textContent).toContain('does not offer');
    cleanup();
    serve({ '/api/admin/self-update': [{ status: 403 }] });
    render(<SelfUpdatePanel />);
    expect((await screen.findByTestId('selfupdate-error')).textContent).toBeTruthy();
  });

  it('keeps the buttons off when the server has applying switched off, whatever Studio says', async () => {
    setStudioPrefs({ selfUpdateApply: true });
    serve({ '/api/admin/self-update': [{ status: 200, body: status({ applyEnabled: false }) }] });
    render(<SelfUpdatePanel />);
    await screen.findAllByTestId('selfupdate-row');
    expect((screen.getByTestId('selfupdate-apply-server') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('selfupdate-mode').textContent).toContain('switched off');
  });

  it('turns the buttons on with the switch; an up-to-date program or one without a signed package cannot be updated, one without an earlier release cannot go back', async () => {
    serve({ '/api/admin/self-update': [{ status: 200, body: status({ items: [item('server', '0.8.1.0', '0.9.0', '0.8.0.0'), item('studio', '0.8.1.0', '0.8.1.0', null, 'current'), item('os-agent', '0.8.1.0', '0.9.0', null, 'behind', false)] }) }] });
    render(<SelfUpdatePanel />);
    await screen.findAllByTestId('selfupdate-row');
    fireEvent.click(screen.getByTestId('selfupdate-switch'));
    expect((screen.getByTestId('selfupdate-apply-server') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTestId('selfupdate-rollback-server') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTestId('selfupdate-apply-studio') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('selfupdate-rollback-studio') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('selfupdate-apply-os-agent') as HTMLButtonElement).disabled).toBe(true);
    expect(rows()[2].textContent).toContain('no signed package');
  });

  it('asks first, naming the program and the versions, and starts nothing when it is cancelled', async () => {
    setStudioPrefs({ selfUpdateApply: true });
    const seen = serve({ '/api/admin/self-update': [{ status: 200, body: status() }] });
    render(<SelfUpdatePanel />);
    await screen.findAllByTestId('selfupdate-row');
    fireEvent.click(screen.getByTestId('selfupdate-apply-server'));
    expect(screen.getByTestId('selfupdate-confirm').textContent).toContain('0.8.1.0 -> 0.9.0');
    fireEvent.click(screen.getByTestId('selfupdate-confirm-no'));
    expect(screen.queryByTestId('selfupdate-confirm')).toBeNull();
    expect(seen.some((call) => call.method === 'POST')).toBe(false);
    fireEvent.click(screen.getByTestId('selfupdate-rollback-server'));
    expect(screen.getByTestId('selfupdate-confirm').textContent).toContain('0.8.1.0 -> 0.8.0.0');
  });

  it('walks the steps through a restart of the server that cuts the connection, and ends done with the new version', async () => {
    vi.useFakeTimers();
    setStudioPrefs({ selfUpdateApply: true });
    const seen = serve({
      '/api/admin/self-update/apply': [{ status: 200, body: job() }],
      '/api/admin/self-update/jobs/j1': [
        { status: 200, body: job({ state: 'downloading' }) }, { status: 200, body: job({ state: 'applying' }) },
        'network', { status: 502 }, 'network', { status: 503 },
        { status: 200, body: job({ state: 'restarting' }) },
        { status: 200, body: job({ state: 'done', log: [{ at: '2030-01-01T00:01:00.000Z', step: 'done', text: '0.9.0 is in use' }] }) },
      ],
      '/api/admin/self-update': [{ status: 200, body: status() }, { status: 200, body: status() }, { status: 200, body: status({ items: [item('server', '0.9.0', '0.9.0', '0.8.1.0', 'current'), item('studio', '0.8.1.0', '0.8.1.0', null, 'current'), item('os-agent', '0.8.1.0', '0.9.0')] }) }],
    });
    render(<SelfUpdatePanel />);
    await settle();
    expect(screen.getAllByTestId('selfupdate-row')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('selfupdate-apply-server'));
    fireEvent.click(screen.getByTestId('selfupdate-confirm-yes'));
    await settle();
    expect(seen.find((call) => call.method === 'POST')?.body).toContain('"confirm":true');
    expect(screen.getByTestId('selfupdate-job')).toBeTruthy();
    await settle(1500);
    expect(screen.getByTestId('selfupdate-step-downloading').getAttribute('data-mark')).toBe('now');
    await settle(1500);
    expect(screen.getByTestId('selfupdate-step-applying').getAttribute('data-mark')).toBe('now');
    expect((screen.getByTestId('selfupdate-apply-server') as HTMLButtonElement).disabled).toBe(true);
    // the server goes away: the screen says it is waiting and keeps asking
    await settle(1500);
    expect(screen.getByTestId('selfupdate-waiting').textContent).toContain('restarting');
    await settle(4500);
    expect(screen.queryByTestId('selfupdate-gaveup')).toBeNull();
    // and comes back with the new version
    await settle(3000);
    expect(screen.getByTestId('selfupdate-done').textContent).toContain('0.9.0');
    expect(screen.queryByTestId('selfupdate-waiting')).toBeNull();
    expect(screen.getByTestId('selfupdate-step-restarting').getAttribute('data-mark')).toBe('done');
    expect(rows()[0].textContent).toContain('up to date');
  });

  it('after a long silence it says so and offers to look again, which finds the result', async () => {
    vi.useFakeTimers();
    setStudioPrefs({ selfUpdateApply: true });
    serve({
      '/api/admin/self-update/apply': [{ status: 200, body: job() }],
      '/api/admin/self-update/jobs/j1': [{ status: 200, body: job({ state: 'applying' }) }, 'network'],
      '/api/admin/self-update': [{ status: 200, body: status() }],
    });
    render(<SelfUpdatePanel />);
    await settle();
    fireEvent.click(screen.getByTestId('selfupdate-apply-server'));
    fireEvent.click(screen.getByTestId('selfupdate-confirm-yes'));
    await settle(1500);
    await settle(250_000);
    expect(screen.getByTestId('selfupdate-gaveup')).toBeTruthy();
    expect(screen.queryByTestId('selfupdate-waiting')).toBeNull();
    serve({
      '/api/admin/self-update/jobs/j1': [{ status: 200, body: job({ state: 'done' }) }],
      '/api/admin/self-update': [{ status: 200, body: status() }],
    });
    fireEvent.click(screen.getByTestId('selfupdate-again'));
    await settle(1500);
    expect(screen.getByTestId('selfupdate-done')).toBeTruthy();
    expect(screen.queryByTestId('selfupdate-gaveup')).toBeNull();
  });

  it('tells why a job failed, in words, and what was put back', async () => {
    vi.useFakeTimers();
    setStudioPrefs({ selfUpdateApply: true });
    serve({
      '/api/admin/self-update/apply': [{ status: 200, body: job() }],
      '/api/admin/self-update/jobs/j1': [{ status: 200, body: job({ state: 'failed', error: 'rolled_back', detail: 'server did not pass the health check', log: [{ at: '', step: 'applying', text: 'x' }, { at: '', step: 'failed', text: 'x' }] }) }],
      '/api/admin/self-update': [{ status: 200, body: status() }],
    });
    render(<SelfUpdatePanel />);
    await settle();
    fireEvent.click(screen.getByTestId('selfupdate-apply-server'));
    fireEvent.click(screen.getByTestId('selfupdate-confirm-yes'));
    await settle(1500);
    expect(screen.getByTestId('selfupdate-failed').textContent).toContain('earlier one was put back');
    expect(screen.getByTestId('selfupdate-failed').textContent).toContain('health check');
    expect(screen.getByTestId('selfupdate-step-restarting').getAttribute('data-mark')).toBe('failed');
  });

  it('says why it could not start (another job, session ended, switch off)', async () => {
    vi.useFakeTimers();
    setStudioPrefs({ selfUpdateApply: true });
    serve({ '/api/admin/self-update/apply': [{ status: 409 }], '/api/admin/self-update': [{ status: 200, body: status() }] });
    render(<SelfUpdatePanel />);
    await settle();
    fireEvent.click(screen.getByTestId('selfupdate-apply-server'));
    fireEvent.click(screen.getByTestId('selfupdate-confirm-yes'));
    await settle();
    expect(screen.getByTestId('selfupdate-message').textContent).toContain('Another update');
    expect(screen.queryByTestId('selfupdate-job')).toBeNull();
  });

  it('picks up a job that was going on when the page opened, and reloads Studio once its own update is done', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    serve({
      '/api/admin/self-update/jobs/j1': [{ status: 200, body: job({ component: 'studio', state: 'done' }) }],
      '/api/admin/self-update': [{ status: 200, body: status({ job: job({ component: 'studio', state: 'applying' }) }) }],
    });
    render(<SelfUpdatePanel />);
    await settle();
    expect(screen.getByTestId('selfupdate-job')).toBeTruthy();
    await settle(1500);
    expect(screen.getByTestId('selfupdate-done')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    await settle(4500);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
