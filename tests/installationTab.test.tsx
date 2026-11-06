// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/installationTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The first-run checklist: which steps are done, which is next, and that a server that cannot be read leaves the steps unknown instead of
// telling the person to do what may already be done.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { InstallationTab } from '../src/components/config/InstallationTab';
import { doneCount, installSteps, nextStep } from '../src/lib/installationView';
import { parseServerInfo } from '../src/lib/updatesView';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function serve(routes: Record<string, { status: number; body: unknown }>): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(routes).find(([route]) => url.includes(route));
    const reply = hit ? hit[1] : { status: 404, body: {} };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  }));
}

describe('installationView', () => {
  it('orders the steps and finds the first one still to do', () => {
    const steps = installSteps(parseServerInfo({ controllerCount: 1, robotCount: 0 }), false);
    expect(steps.map((step) => [step.id, step.state])).toEqual([['server', 'done'], ['controller', 'done'], ['robot', 'todo'], ['second_factor', 'todo']]);
    expect(nextStep(steps)?.id).toBe('robot');
    expect(doneCount(steps)).toBe(2);
  });

  it('has no next step when everything is done', () => {
    const steps = installSteps(parseServerInfo({ controllerCount: 2, robotCount: 3 }), true);
    expect(nextStep(steps)).toBeNull();
    expect(doneCount(steps)).toBe(4);
  });

  it('leaves the steps unknown when the server could not be read', () => {
    const steps = installSteps(null, null);
    expect(steps.map((step) => step.state)).toEqual(['todo', 'unknown', 'unknown', 'unknown']);
    expect(nextStep(steps)?.id).toBe('server');
  });
});

describe('InstallationTab', () => {
  it('shows the progress, the next step and that nothing here installs', async () => {
    serve({
      '/api/hydra-info': { status: 200, body: { appVersion: '0.8.2.6', hostname: 'cm5', controllerCount: 1, robotCount: 0, uptimeSeconds: 120 } },
      '/api/totp/status': { status: 200, body: { enabled: false, recoveryLeft: 0 } },
    });
    render(<InstallationTab />);
    await waitFor(() => expect(screen.getByTestId('installation-step-controller').dataset.state).toBe('done'));
    expect(screen.getByTestId('installation-step-robot').dataset.state).toBe('todo');
    expect(screen.getByTestId('installation-step-second_factor').dataset.state).toBe('todo');
    expect(screen.getByTestId('installation-progress').textContent).toContain('2 of 4');
    expect(screen.getByTestId('installation-next').textContent).toContain('A robot is set up');
    expect(screen.getByTestId('installation-host').textContent).toContain('cm5');
    expect(screen.getByTestId('installation-no-installer').textContent).toContain('no route');
  });

  it('says all steps are done', async () => {
    serve({
      '/api/hydra-info': { status: 200, body: { controllerCount: 1, robotCount: 2 } },
      '/api/totp/status': { status: 200, body: { enabled: true, recoveryLeft: 8 } },
    });
    render(<InstallationTab />);
    await waitFor(() => expect(screen.getByTestId('installation-next').textContent).toContain('All the steps are done'));
  });

  it('does not tell what to do when the server cannot be read', async () => {
    serve({});
    render(<InstallationTab />);
    await waitFor(() => expect(screen.getByTestId('installation-error')).toBeTruthy());
    expect(screen.getByTestId('installation-step-robot').dataset.state).toBe('unknown');
    expect(screen.getByTestId('installation-next').textContent).toContain('The server answers');
  });
});
