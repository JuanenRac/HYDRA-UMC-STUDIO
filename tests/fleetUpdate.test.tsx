// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/fleetUpdate.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The section "Programs installed on this machine" of Configuration, Updates, against a simulated server: the look, the check-only default, the confirmation that names the
// programs, each program with its step and state, a program that fails and is put back, a run that is cut and taken up again, little disk, and above all the restart of the
// server at the end of its own update (refused connections, 502, answers that are not the file): the screen keeps asking, says it is waiting, ends with the result or with a
// message after a long silence, and reloads when the server was updated. Evidence: simulator; the real update of the CM5 is not proved here.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { FleetUpdatePanel } from '../src/components/config/FleetUpdatePanel';
import { resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';
import {
  applyFleet, diskLowForServer, errorKey, followFleet, parseFleetReport, parseFleetStatus, reasonKey, readFleet, resumable, resumeFleet, runActive, stepProgress, updatable,
  type FleetRead, type FleetRow,
} from '../src/lib/fleetUpdate';

const row = (name: string, patch: Record<string, unknown> = {}) => ({
  name, kind: name === 'studio' ? 'frontend' : 'svc', repo: `HYDRA-UMC-${name.toUpperCase()}`, installed: '0.1.0', latest: 'v0.2.0', action: 'update', reason: '', state: 'waiting', step: '', substep: '', substeps: 0,
  detail: '', error: '', order: 0, elapsedS: 0, freeMb: null, needMb: null, unitRestored: null, log: [], ...patch,
});
const report = (state: string, rows: unknown[], extra: Record<string, unknown> = {}) => ({
  schema: 'hydra-fleet-update/1', id: '1', mode: state === 'planned' ? 'plan' : 'run', state, updatedAt: '2030-01-01T00:00:00Z', error: '', stoppedAt: '', requireSignedTags: false,
  disk: { rootFreeMb: 9000, workspaceFreeMb: 9000 }, services: rows, ...extra,
});
const planned = () => report('planned', [row('datalake'), row('twin', { action: 'current', installed: '0.2.0' }), row('server', { latest: 'v1.0.0' }), row('studio', { action: 'update', reason: 'goes_with_server' })]);
const status = (body: unknown, extra: Record<string, unknown> = {}) => ({ applyEnabled: true, busy: false, report: body, ...extra });

type Reply = { status: number; body?: unknown } | 'network';
function serve(routes: Record<string, Reply[]>) {
  const seen: Array<{ url: string; method: string; body: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : '' });
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((route) => url.includes(route));
    const list = key ? routes[key] : [{ status: 404 } as Reply];
    const reply = list.length > 1 ? (list.shift() as Reply) : list[0];
    if (reply === 'network') throw new TypeError('Failed to fetch');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body ?? {} } as unknown as Response;
  }));
  return seen;
}

beforeEach(() => { try { window.localStorage.clear(); } catch { /* storage may be blocked */ } resetStudioPrefs(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('fleetUpdate parsing', () => {
  it('reads the file and drops what is not valid', () => {
    const parsed = parseFleetReport(planned());
    expect(parsed?.services.map((r) => r.name)).toEqual(['datalake', 'twin', 'server', 'studio']);
    expect(parsed?.rootFreeMb).toBe(9000);
    expect(parseFleetReport(null)).toBeNull();
    expect(parseFleetReport({ state: 'exploded', services: [] })).toBeNull();
    expect(parseFleetReport({ state: 'planned', services: 'no' })).toBeNull();
    expect(parseFleetReport({ state: 'planned', services: [{ action: 'update' }, { name: 'a', action: 'odd', state: 'odd' }] })?.services[0]).toMatchObject({ action: 'skip', state: 'waiting' });
    expect(parseFleetStatus({ applyEnabled: 1, busy: 'x', report: null })).toEqual({ applyEnabled: false, busy: false, report: null });
  });

  it('tells what can be updated, taken up, and how far a program is', () => {
    const parsed = parseFleetReport(planned());
    expect(updatable(parsed).map((r) => r.name)).toEqual(['datalake', 'server']);
    const cases: Array<[string, boolean]> = [['interrupted', true], ['failed', true], ['rolled_back', true], ['blocked', true], ['done', false], ['running', false], ['waiting', false], ['skipped', false]];
    for (const [state, expected] of cases) expect(resumable({ ...(parsed!.services[0] as FleetRow), state: state as FleetRow['state'] })).toBe(expected);
    const base = parsed!.services[0];
    expect(stepProgress({ ...base, state: 'done' })).toBe(1);
    expect(stepProgress({ ...base, state: 'running', step: 'disk' })).toBe(0);
    expect(stepProgress({ ...base, state: 'running', step: 'installing' })).toBeCloseTo(4 / 6);
    expect(stepProgress({ ...base, state: 'running', step: 'nothing' })).toBe(0);
    expect(runActive(parseFleetReport(report('running', [])))).toBe(true);
    expect(runActive(null)).toBe(false);
  });

  it('has a sentence for each error and reason, and a general one for the rest', () => {
    expect(errorKey('low_disk')).toBe('fleet.err_low_disk');
    expect(errorKey('sdk_not_importable')).toBe('fleet.err_sdk_not_importable');
    expect(errorKey('something new')).toBe('fleet.err_unexpected');
    expect(reasonKey('repo_dirty')).toBe('fleet.reason_repo_dirty');
    for (const reason of ['migrated_needs_packages', 'migrated_no_package', 'own_package']) expect(reasonKey(reason)).toBe(`fleet.reason_${reason}`);
    expect(reasonKey('')).toBeNull();
    expect(reasonKey('weird')).toBeNull();
  });

  it('warns about the disk only when the server is to be updated and little is free', () => {
    expect(diskLowForServer(parseFleetReport(planned()))).toBe(false);
    expect(diskLowForServer(parseFleetReport({ ...planned(), disk: { rootFreeMb: 1200, workspaceFreeMb: 9000 } }))).toBe(true);
    expect(diskLowForServer(parseFleetReport({ ...planned(), disk: { rootFreeMb: 9000, workspaceFreeMb: 900 } }))).toBe(true);
    expect(diskLowForServer(parseFleetReport(report('planned', [row('server', { action: 'current' })], { disk: { rootFreeMb: 100, workspaceFreeMb: 100 } })))).toBe(false);
    expect(diskLowForServer(null)).toBe(false);
  });
});

describe('talking to the server', () => {
  it('sends the programs with the confirmation and tells why it could not start', async () => {
    const seen = serve({ '/api/admin/fleet-update/apply': [{ status: 200, body: status(report('running', [])) }] });
    expect((await applyFleet(['datalake'])).ok).toBe(true);
    expect(JSON.parse(seen[0].body)).toEqual({ services: ['datalake'], confirm: true });
    for (const [code, reason] of [[404, 'disabled'], [403, 'forbidden'], [401, 'forbidden'], [409, 'busy'], [400, 'refused'], [502, 'refused']] as const) {
      serve({ '/api/admin/fleet-update/apply': [{ status: code }] });
      expect(await applyFleet(['x'])).toMatchObject({ ok: false, reason });
    }
    serve({ '/api/admin/fleet-update/resume': ['network'] });
    expect(await resumeFleet('datalake')).toMatchObject({ ok: false, reason: 'network' });
  });

  it('reads the progress and takes an absent server for "wait", never for "failed"', async () => {
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(planned()) }] });
    expect(await readFleet()).toMatchObject({ kind: 'status' });
    for (const code of [404, 500, 502, 503, 504]) { serve({ '/api/admin/fleet-update': [{ status: code }] }); expect(await readFleet()).toEqual({ kind: 'wait' }); }
    serve({ '/api/admin/fleet-update': ['network'] });
    expect(await readFleet()).toEqual({ kind: 'wait' });
    serve({ '/api/admin/fleet-update': [{ status: 200, body: 'junk' }] });
    expect(await readFleet()).toEqual({ kind: 'wait' });
    serve({ '/api/admin/fleet-update': [{ status: 403 }] });
    expect(await readFleet()).toEqual({ kind: 'stop' });
  });
});

describe('followFleet', () => {
  const clock = () => { let t = 0; return { now: () => t, sleep: async (ms: number) => { t += ms; } }; };
  const st = (state: string) => parseFleetStatus(status(report(state, [row('server', { state: state === 'running' ? 'running' : 'done' })])));

  it('keeps asking through the restart and ends with the run that ends', async () => {
    const reads: FleetRead[] = [{ kind: 'status', status: st('running') }, { kind: 'wait' }, { kind: 'wait' }, { kind: 'status', status: st('running') }, { kind: 'status', status: st('done') }];
    const waits: number[] = [];
    const { now, sleep } = clock();
    const end = await followFleet({ read: async () => reads.shift() as FleetRead, onStatus: () => {}, onWaiting: (s) => waits.push(s), now, sleep, intervalMs: 1000 });
    expect(end).toMatchObject({ kind: 'ended' });
    expect(waits).toEqual([1, 2]);
  });

  it('gives up with a message only after the limit of silence, counted from the last answer', async () => {
    const { now, sleep } = clock();
    const reads: FleetRead[] = [{ kind: 'status', status: st('running') }];
    const end = await followFleet({ read: async () => reads.shift() ?? { kind: 'wait' }, onStatus: () => {}, onWaiting: () => {}, now, sleep, intervalMs: 1000, silenceLimitMs: 20_000 });
    expect(end).toEqual({ kind: 'silent', seconds: 20 });
  });

  it('stops when the session is refused or when it is cancelled', async () => {
    const { now, sleep } = clock();
    expect(await followFleet({ read: async () => ({ kind: 'stop' }), onStatus: () => {}, onWaiting: () => {}, now, sleep })).toEqual({ kind: 'stopped', reason: 'forbidden' });
    expect(await followFleet({ read: async () => ({ kind: 'wait' }), onStatus: () => {}, onWaiting: () => {}, now, sleep, cancelled: () => true })).toEqual({ kind: 'stopped', reason: 'cancelled' });
  });
});

describe('FleetUpdatePanel', () => {
  const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
  const allowApplying = () => setStudioPrefs({ selfUpdateApply: true });

  it('shows every program with the version it has, the newest and what will happen, and only looks by default', async () => {
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(planned()) }] });
    render(<FleetUpdatePanel />);
    expect(await screen.findAllByTestId('fleet-row')).toHaveLength(4);
    expect(screen.getAllByTestId('fleet-row')[0].textContent).toContain('datalake');
    expect(screen.getAllByTestId('fleet-row')[0].textContent).toContain('Will be updated');
    expect(screen.getAllByTestId('fleet-row')[1].textContent).toContain('Up to date');
    expect(screen.getAllByTestId('fleet-row')[3].textContent).toContain('built together with the server');
    expect((screen.getByTestId('fleet-update-all') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('fleet-mode').textContent).toContain('Check only');
    expect(screen.getByTestId('fleet-disk').textContent).toContain('9000');
  });

  it('says plainly that the server does not offer it, and asks for a look when there is no plan yet', async () => {
    serve({ '/api/admin/fleet-update': [{ status: 404 }] });
    render(<FleetUpdatePanel />);
    expect((await screen.findByTestId('fleet-error')).textContent).toContain('does not offer');
    cleanup();
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(null) }] });
    render(<FleetUpdatePanel />);
    expect((await screen.findByTestId('fleet-run-state')).textContent).toContain('Nothing has been looked at');
  });

  it('looks at the device when asked', async () => {
    const seen = serve({ '/api/admin/fleet-update/plan': [{ status: 200, body: status(planned()) }], '/api/admin/fleet-update': [{ status: 200, body: status(null) }] });
    render(<FleetUpdatePanel />);
    fireEvent.click(await screen.findByTestId('fleet-look'));
    expect(await screen.findAllByTestId('fleet-row')).toHaveLength(4);
    expect(seen.some((call) => call.url.endsWith('/plan') && call.method === 'POST')).toBe(true);
  });

  it('warns about the disk before the server is built on the device', async () => {
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status({ ...planned(), disk: { rootFreeMb: 1500, workspaceFreeMb: 9000 } }) }] });
    render(<FleetUpdatePanel />);
    expect((await screen.findByTestId('fleet-disk-low')).textContent).toContain('2500');
  });

  it('asks first, naming the programs and warning about the restart of the server, and starts nothing when it is cancelled', async () => {
    allowApplying();
    const seen = serve({ '/api/admin/fleet-update': [{ status: 200, body: status(planned()) }] });
    render(<FleetUpdatePanel />);
    await screen.findAllByTestId('fleet-row');
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    expect(screen.getByTestId('fleet-confirm').textContent).toContain('datalake, server');
    expect(screen.getByTestId('fleet-confirm-server')).toBeTruthy();
    fireEvent.click(screen.getByTestId('fleet-confirm-no'));
    expect(screen.queryByTestId('fleet-confirm')).toBeNull();
    expect(seen.some((call) => call.method === 'POST')).toBe(false);
  });

  it('shows each program with its step through the restart of the server, then reloads the page', async () => {
    vi.useFakeTimers();
    allowApplying();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const running = (datalake: Record<string, unknown>, server: Record<string, unknown>) => status(report('running', [row('datalake', datalake), row('server', server), row('studio', { state: 'waiting' })], { mode: 'run' }));
    const seen = serve({
      '/api/admin/fleet-update/apply': [{ status: 200, body: running({ state: 'running', step: 'disk' }, {}) }],
      '/api/admin/fleet-update': [
        { status: 200, body: status(planned()) },
        { status: 200, body: running({ state: 'running', step: 'installing', detail: 'compiling', elapsedS: 42 }, {}) },
        { status: 200, body: running({ state: 'done', step: 'done' }, { state: 'running', step: 'building', substep: 'npm ci', substeps: 3, detail: 'added 400 packages' }) },
        'network', { status: 502 }, 'network',
        { status: 200, body: status(report('done', [row('datalake', { state: 'done', step: 'done' }), row('server', { state: 'done', step: 'done', installed: '1.0.0' }), row('studio', { state: 'done' })], { mode: 'run' })) },
      ],
    });
    render(<FleetUpdatePanel />);
    await settle();
    expect(screen.getAllByTestId('fleet-row')).toHaveLength(4);
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await settle();
    expect(JSON.parse(seen.find((call) => call.method === 'POST')!.body)).toEqual({ services: ['datalake', 'server'], confirm: true });
    // the first look comes at once, the next ones every two seconds
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('installing and restarting the unit');
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('42 s');
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('compiling');
    await settle(2000);
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('done');
    expect(screen.getByTestId('fleet-progress-server').textContent).toContain('building on the device');
    expect(screen.getByTestId('fleet-progress-server').textContent).toContain('npm ci');
    // the server restarts at the end of its own update: the screen waits and keeps asking
    await settle(2000);
    expect(screen.getByTestId('fleet-waiting').textContent).toContain('restarting');
    await settle(4000);
    expect(screen.queryByTestId('fleet-gaveup')).toBeNull();
    await settle(2000);
    expect(screen.queryByTestId('fleet-waiting')).toBeNull();
    expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated');
    expect(screen.getByTestId('fleet-reloading')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    await settle(5000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('tells which program failed, why, that the earlier one was put back, and offers to take it up again', async () => {
    vi.useFakeTimers();
    allowApplying();
    const failed = report('failed', [
      row('datalake', { state: 'rolled_back', step: 'verifying', error: 'journal_errors', detail: 'ModuleNotFoundError: hydra_umc_sdk', unitRestored: false }),
      row('server', { state: 'skipped', detail: 'stopped after datalake' }),
    ], { mode: 'run', stoppedAt: 'datalake', error: 'datalake' });
    const seen = serve({ '/api/admin/fleet-update/resume': [{ status: 200, body: status(report('running', [row('datalake', { state: 'running', step: 'disk' })], { mode: 'run' })) }], '/api/admin/fleet-update': [{ status: 200, body: status(failed) }] });
    render(<FleetUpdatePanel />);
    await settle();
    expect(screen.getByTestId('fleet-run-state').textContent).toContain('Stopped at datalake');
    const cell = screen.getByTestId('fleet-progress-datalake').textContent!;
    expect(cell).toContain('import error');
    expect(cell).toContain('ModuleNotFoundError');
    expect(screen.getByTestId('fleet-unit-datalake').textContent).toContain('unit files are not as they were');
    expect(screen.getAllByTestId('fleet-row')[1].getAttribute('data-state')).toBe('skipped');
    fireEvent.click(screen.getByTestId('fleet-resume-datalake'));
    await settle();
    expect(JSON.parse(seen.find((call) => call.url.endsWith('/resume'))!.body)).toEqual({ service: 'datalake', confirm: true });
  });

  it('says a program was cut and offers to take it up, with the number of MB when the disk blocked it', async () => {
    vi.useFakeTimers();
    allowApplying();
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(report('interrupted', [row('datalake', { state: 'interrupted', step: 'installing', error: 'interrupted', detail: 'cut at the step installing' }), row('server', { state: 'blocked', error: 'low_disk', freeMb: 900, needMb: 2500 })], { mode: 'run' })) }] });
    render(<FleetUpdatePanel />);
    await settle();
    expect(screen.getByTestId('fleet-interrupted')).toBeTruthy();
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('was cut');
    expect(screen.getByTestId('fleet-progress-server').textContent).toContain('900 MB free, 2500 MB needed');
    expect((screen.getByTestId('fleet-resume-datalake') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTestId('fleet-resume-server') as HTMLButtonElement).disabled).toBe(false);
  });

  it('after a long silence it says so and offers to look again, which finds the result', async () => {
    vi.useFakeTimers();
    allowApplying();
    const running = status(report('running', [row('server', { state: 'running', step: 'installing' })], { mode: 'run' }));
    serve({ '/api/admin/fleet-update/apply': [{ status: 200, body: running }], '/api/admin/fleet-update': [{ status: 200, body: status(planned()) }, { status: 200, body: running }, 'network'] });
    render(<FleetUpdatePanel />);
    await settle();
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await settle(2000);
    await settle(320_000);
    expect(screen.getByTestId('fleet-gaveup')).toBeTruthy();
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(report('done', [row('server', { state: 'done' })], { mode: 'run' })) }] });
    fireEvent.click(screen.getByTestId('fleet-again'));
    await settle(100);
    expect(screen.queryByTestId('fleet-gaveup')).toBeNull();
    expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated');
  });

  it('says why it could not start', async () => {
    vi.useFakeTimers();
    allowApplying();
    serve({ '/api/admin/fleet-update/apply': [{ status: 409 }], '/api/admin/fleet-update': [{ status: 200, body: status(planned()) }] });
    render(<FleetUpdatePanel />);
    await settle();
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await settle();
    expect(screen.getByTestId('fleet-message').textContent).toContain('Another look or update');
  });

  it('keeps the buttons off when the server has applying switched off, whatever Studio says', async () => {
    allowApplying();
    serve({ '/api/admin/fleet-update': [{ status: 200, body: status(planned(), { applyEnabled: false }) }] });
    render(<FleetUpdatePanel />);
    await screen.findAllByTestId('fleet-row');
    expect((screen.getByTestId('fleet-update-all') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('fleet-mode').textContent).toContain('switched off');
  });
});
