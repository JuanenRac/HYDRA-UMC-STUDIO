// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/fleetIntegration.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The panel "Programs installed on this machine" against a FAKE SERVER over real HTTP on a real port: it answers the routes of /api/admin/fleet-update the way HYDRA-UMC-SERVER
// does, runs a scripted update program after program, and at its end RESTARTS ITSELF in the middle of the run (it closes its socket, refuses connections for a while and comes
// back). Nothing is stubbed between the panel and the server except the address. What it proves: the panel keeps asking while the server is away, says it is waiting, ends with
// the result as soon as the server answers, reloads when the server was updated, says so after a long silence and finds the result when looked at again, shows a run that was cut
// as interrupted and takes the program up again, and stops at a failure. Evidence: simulator (the server and the device are doubles).
// =============================================================================
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { FleetUpdatePanel } from '../src/components/config/FleetUpdatePanel';
import { resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';

const realFetch = globalThis.fetch;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Row = Record<string, unknown>;
const row = (name: string, patch: Row = {}): Row => ({
  name, kind: name === 'studio' ? 'frontend' : 'svc', repo: `HYDRA-UMC-${name.toUpperCase()}`, installed: '0.1.0', latest: 'v0.2.0', action: 'update', reason: '', state: 'waiting', step: '', substep: '', substeps: 0,
  detail: '', error: '', order: 0, elapsedS: 0, freeMb: null, needMb: null, unitRestored: null, log: [], ...patch,
});

interface Script { restartAfter?: string; outageMs: number; cutAtRestart?: boolean; failAt?: string; stepMs: number }

/** The server of the device in one object: the progress file, the routes, the scripted run and its own restart. */
class FakeServer {
  readonly http = http.createServer((req, res) => void this.handle(req, res));
  port = 0;
  report: Record<string, unknown> | null = null;
  script: Script = { outageMs: 200, stepMs: 15 };
  applyEnabled = true;
  private running = false;
  readonly posts: Array<{ url: string; body: unknown }> = [];

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.http.listen(this.port, '127.0.0.1', () => resolve()));
    this.port = (this.http.address() as AddressInfo).port;
  }

  private dead = false;

  private async halt(): Promise<void> {
    this.http.closeAllConnections();
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  /** The end of the test: the server goes away for good, and a run that is still going does not bring it back. */
  async stop(): Promise<void> {
    this.dead = true;
    await this.halt();
  }

  /** The restart: the socket closes, connections are refused for `ms`, then it listens again on the same port. */
  async restart(ms: number): Promise<void> {
    await this.halt();
    await sleep(ms);
    if (!this.dead) await this.start();
  }

  private set(state: string, rows: Row[], extra: Row = {}): void {
    this.report = { schema: 'hydra-fleet-update/1', id: '1', mode: state === 'planned' ? 'plan' : 'run', state, updatedAt: '2030-01-01T00:00:00Z', error: '', stoppedAt: '', requireSignedTags: false, disk: { rootFreeMb: 9000, workspaceFreeMb: 9000 }, services: rows, ...extra };
  }

  rows(): Row[] { return (this.report?.services as Row[]) ?? []; }

  plan(): void {
    this.set('planned', [row('datalake'), row('twin', { action: 'current', installed: '0.2.0' }), row('server', { latest: 'v1.0.0' }), row('studio', { reason: 'goes_with_server' })]);
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    const body = text ? JSON.parse(text) : {};
    const send = (status: number, payload: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
    const url = req.url ?? '';
    if (req.method === 'POST') this.posts.push({ url, body });
    const status = () => ({ applyEnabled: this.applyEnabled, busy: this.running, report: this.report });
    if (req.method === 'GET' && url === '/api/admin/fleet-update') return send(200, status());
    if (req.method === 'POST' && url === '/api/admin/fleet-update/plan') { this.plan(); return send(200, status()); }
    if (req.method === 'POST' && (url === '/api/admin/fleet-update/apply' || url === '/api/admin/fleet-update/resume')) {
      if (body.confirm !== true) return send(400, { error: 'needs confirm' });
      if (this.running) return send(409, { error: 'Another look or update is going on' });
      const names: string[] = url.endsWith('/apply') ? body.services : [body.service];
      void this.run(names);
      return send(200, { applyEnabled: true, busy: true, report: { ...this.report, state: 'running' } });
    }
    return send(404, { error: 'Not found' });
  }

  /** The device: program after program through its steps; the server last, and its installer restarts this very server. */
  private async run(names: string[]): Promise<void> {
    this.running = true;
    const rows = this.rows().filter((r) => names.includes(String(r.name)));
    this.set('running', this.rows(), { mode: 'run' });
    const steps = ['disk', 'fetching', 'backup', 'building', 'installing', 'verifying'];
    for (const target of rows) {
      const live = this.rows().find((r) => r.name === target.name)!;
      Object.assign(live, { state: 'running', error: '', detail: '' });
      for (const stepName of steps) {
        live.step = stepName;
        if (stepName === 'building' && live.name === 'server') { live.substep = 'npm ci'; live.substeps = 3; live.detail = 'added 400 packages'; }
        await sleep(this.script.stepMs);
        if (stepName === 'installing' && live.name === this.script.failAt) {
          Object.assign(live, { state: 'rolled_back', error: 'installer_failed', detail: 'DEPLOY=FAIL did not pass the health check', unitRestored: true });
          this.report = { ...this.report, state: 'failed', stoppedAt: live.name, error: live.name };
          for (const rest of this.rows()) if (rest.state === 'waiting' && names.includes(String(rest.name)) && rest !== live) Object.assign(rest, { state: 'skipped', detail: `stopped after ${live.name}` });
          this.running = false;
          return;
        }
        if (stepName === 'installing' && live.name === this.script.restartAfter) {
          if (this.script.cutAtRestart) {
            // the tool died with the unit: when the server is back, its file says running with a heartbeat that stopped, which it reports as interrupted
            this.report = { ...this.report, state: 'interrupted', error: 'interrupted' };
            Object.assign(live, { state: 'interrupted', error: 'interrupted', detail: 'cut at the step installing' });
            this.running = false;
            await this.restart(this.script.outageMs);
            return;
          }
          this.running = false;
          await this.restart(this.script.outageMs);
          this.running = true;
        }
      }
      Object.assign(live, { state: 'done', step: 'done', installed: String(live.latest).replace(/^v/, '') });
      if (live.name === 'server') { const studio = this.rows().find((r) => r.name === 'studio'); if (studio) Object.assign(studio, { state: 'done' }); }
    }
    this.report = { ...this.report, state: 'done' };
    this.running = false;
  }
}

let server: FakeServer;

beforeEach(async () => {
  try { window.localStorage.clear(); } catch { /* storage may be blocked */ }
  resetStudioPrefs();
  setStudioPrefs({ selfUpdateApply: true });
  server = new FakeServer();
  await server.start();
  server.plan();
  // the only thing between the panel and the server: the address
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), 'http://placeholder');
    return realFetch(`http://127.0.0.1:${server.port}${parsed.pathname}${parsed.search}`, init);
  });
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await server.stop().catch(() => undefined);
});

const options = { timeout: 8000, interval: 20 };

describe('the panel against a server that restarts itself in the middle of the run', () => {
  it('goes through the whole run, waits while the server is away, ends with the result and reloads', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    server.script = { restartAfter: 'server', outageMs: 400, stepMs: 60 };
    render(<FleetUpdatePanel pollMs={30} silenceMs={5000} reloadMs={80} />);
    await screen.findAllByTestId('fleet-row');
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    expect(screen.getByTestId('fleet-confirm').textContent).toContain('datalake, server');
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await waitFor(() => expect(server.posts.find((p) => p.url.endsWith('/apply'))?.body).toEqual({ services: ['datalake', 'server'], confirm: true }), options);
    // the program in its steps is shown while the run goes on
    await waitFor(() => expect(screen.getByTestId('fleet-progress-datalake').textContent).toMatch(/fetching|copy|building|installing|checking/), options);
    // the server goes away: the screen says it is waiting and does not give up
    await waitFor(() => expect(screen.getByTestId('fleet-waiting').textContent).toContain('restarting'), options);
    expect(screen.queryByTestId('fleet-gaveup')).toBeNull();
    // and comes back: the result, the reload
    await waitFor(() => expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated'), options);
    expect(screen.queryByTestId('fleet-waiting')).toBeNull();
    expect(screen.getAllByTestId('fleet-row').find((r) => r.textContent?.includes('server'))?.getAttribute('data-state')).toBe('done');
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1), options);
  });

  it('says it after a long silence and finds the result when it looks again', async () => {
    server.script = { restartAfter: 'server', outageMs: 1200, stepMs: 20 };
    render(<FleetUpdatePanel pollMs={30} silenceMs={400} reloadMs={60000} />);
    await screen.findAllByTestId('fleet-row');
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await waitFor(() => expect(screen.getByTestId('fleet-gaveup')).toBeTruthy(), options);
    expect(screen.queryByTestId('fleet-waiting')).toBeNull();
    // the server is back and the run finished while the panel had given up
    await waitFor(() => expect(server.report?.state).toBe('done'), options);
    fireEvent.click(screen.getByTestId('fleet-again'));
    await waitFor(() => expect(screen.queryByTestId('fleet-gaveup')).toBeNull(), options);
    expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated');
  });

  it('shows a run that was cut as interrupted and takes the program up again', async () => {
    server.script = { restartAfter: 'server', outageMs: 250, stepMs: 20, cutAtRestart: true };
    render(<FleetUpdatePanel pollMs={30} silenceMs={5000} reloadMs={60000} />);
    await screen.findAllByTestId('fleet-row');
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await waitFor(() => expect(screen.getByTestId('fleet-interrupted')).toBeTruthy(), options);
    expect(screen.getByTestId('fleet-progress-server').textContent).toContain('was cut');
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('done');
    const resume = await screen.findByTestId('fleet-resume-server');
    server.script = { outageMs: 0, stepMs: 20 };
    fireEvent.click(resume);
    await waitFor(() => expect(server.posts.find((p) => p.url.endsWith('/resume'))?.body).toEqual({ service: 'server', confirm: true }), options);
    await waitFor(() => expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated'), options);
    expect(screen.queryByTestId('fleet-interrupted')).toBeNull();
  });

  it('stops at a failure, names the program and the reason, and the rest is not reached', async () => {
    server.script = { failAt: 'datalake', outageMs: 0, stepMs: 20 };
    render(<FleetUpdatePanel pollMs={30} silenceMs={5000} reloadMs={60000} />);
    await screen.findAllByTestId('fleet-row');
    fireEvent.click(screen.getByTestId('fleet-update-all'));
    fireEvent.click(screen.getByTestId('fleet-confirm-yes'));
    await waitFor(() => expect(screen.getByTestId('fleet-run-state').textContent).toContain('Stopped at datalake'), options);
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('installer failed');
    expect(screen.getByTestId('fleet-progress-datalake').textContent).toContain('DEPLOY=FAIL');
    expect(screen.getAllByTestId('fleet-row').find((r) => r.textContent?.includes('server'))?.getAttribute('data-state')).toBe('skipped');
    expect(server.http.listening).toBe(true);
    // the cause is fixed: the program is taken up and the run ends
    server.script = { outageMs: 0, stepMs: 15 };
    fireEvent.click(screen.getByTestId('fleet-resume-datalake'));
    await waitFor(() => expect(screen.getByTestId('fleet-run-state').textContent).toContain('Everything that was asked is updated'), options);
  });

  it('refuses nothing it should not: with applying switched off by the server the buttons stay off and no POST is sent', async () => {
    server.applyEnabled = false;
    render(<FleetUpdatePanel pollMs={30} silenceMs={5000} reloadMs={60000} />);
    await screen.findAllByTestId('fleet-row');
    expect((screen.getByTestId('fleet-update-all') as HTMLButtonElement).disabled).toBe(true);
    expect(server.posts).toEqual([]);
  });
});
