// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/updatesTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The installed versions the server reports (its own, and the programs next to it), read defensively, and the plain message that this
// server has nothing to say about newer versions.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { UpdatesTab, STUDIO_VERSION } from '../src/components/config/UpdatesTab';
import { parseInstalled, parseServerInfo, uptimeText, versionedCount } from '../src/lib/updatesView';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function serve(routes: Record<string, { status: number; body: unknown }>): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(routes).find(([route]) => url.includes(route));
    const reply = hit ? hit[1] : { status: 404, body: {} };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  }));
}

describe('updatesView', () => {
  it('reads the server info and ignores what is not valid', () => {
    expect(parseServerInfo({ appVersion: '0.8.2.6', remoteApiVersion: 7, hostname: 'cm5', controllerCount: 2, robotCount: 5, uptimeSeconds: 90 }))
      .toEqual({ appVersion: '0.8.2.6', remoteApiVersion: 7, hostname: 'cm5', controllerCount: 2, robotCount: 5, uptimeSeconds: 90 });
    expect(parseServerInfo('nope')).toEqual({ appVersion: null, remoteApiVersion: null, hostname: null, controllerCount: 0, robotCount: 0, uptimeSeconds: 0 });
    expect(parseServerInfo({ controllerCount: -3, robotCount: 'x' }).controllerCount).toBe(0);
  });

  it('lists the projects with a name, in alphabetical order, and counts those that report a version', () => {
    const projects = parseInstalled({ projects: [{ name: 'B-APP', version: '1.0.0', family: 'x' }, { name: 'A-APP', version: null }, { version: '9' }, 'junk'] });
    expect(projects.map((p) => p.name)).toEqual(['A-APP', 'B-APP']);
    expect(versionedCount(projects)).toBe(1);
    expect(parseInstalled({})).toEqual([]);
    expect(parseInstalled(null)).toEqual([]);
  });

  it('writes the uptime the way a person reads it', () => {
    expect(uptimeText(90)).toBe('1 min');
    expect(uptimeText(3 * 3600 + 5 * 60)).toBe('3 h 5 min');
    expect(uptimeText(2 * 86400 + 4 * 3600)).toBe('2 d 4 h');
  });
});

describe('UpdatesTab', () => {
  it('shows the versions and says that the server cannot tell the newest one', async () => {
    serve({
      '/api/hydra-info': { status: 200, body: { appVersion: '0.8.2.6', uptimeSeconds: 7200 } },
      '/api/ecosystem/status': { status: 200, body: { projects: [{ name: 'HYDRA-UMC-DSI', family: 'app', version: '0.5.0' }, { name: 'HYDRA-UMC-TWIN', version: null }] } },
    });
    render(<UpdatesTab />);
    await waitFor(() => expect(screen.getAllByTestId('updates-row')).toHaveLength(2));
    expect(screen.getByTestId('updates-studio').textContent).toBe(STUDIO_VERSION);
    expect(screen.getByTestId('updates-server').textContent).toBe('0.8.2.6');
    expect(screen.getAllByTestId('updates-row')[0].textContent).toContain('0.5.0');
    expect(screen.getAllByTestId('updates-row')[1].textContent).toContain('not reported');
    expect(screen.getByTestId('updates-count').textContent).toContain('1 of 2');
    expect(screen.getByTestId('updates-no-source').textContent).toContain('no route');
    expect(screen.queryByTestId('updates-error')).toBeNull();
  });

  it('says plainly when the server does not offer the information', async () => {
    serve({});
    render(<UpdatesTab />);
    await waitFor(() => expect(screen.getByTestId('updates-error')).toBeTruthy());
    expect(screen.getByTestId('updates-error').textContent).toContain('does not offer');
    expect(screen.getByTestId('updates-server').textContent).toBe('unknown');
  });

  it('tells a refused session from a broken connection', async () => {
    serve({ '/api/hydra-info': { status: 200, body: {} }, '/api/ecosystem/status': { status: 403, body: {} } });
    render(<UpdatesTab />);
    await waitFor(() => expect(screen.getByTestId('updates-error').textContent).toContain('not allowed'));
  });
});
