// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/updateNotice.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The notice of a newer release of STUDIO: it only tells (a link to the releases page, nothing is requested to install), is on by default, can be hidden for a
// version and turned off, and stays silent for a strange or missing answer. Evidence: simulator.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { UpdateNotice } from '../src/components/UpdateNotice';
import { SelfUpdatePanel } from '../src/components/config/SelfUpdatePanel';
import { STUDIO_DEFAULTS, getStudioPrefs, resetStudioPrefs, setStudioPrefs } from '../src/lib/studioPrefs';
import { parseSelfUpdateStatus } from '../src/lib/selfUpdate';
import { studioNotice } from '../src/lib/updateNotice';

const row = (id: string, installed: string, latest: string, state: string) => ({ id, repo: `HYDRA-UMC-${id.toUpperCase()}`, installed, previous: null, latest, state, signedPackage: true });
const body = (studio: ReturnType<typeof row>, owner = 'JuanenRac') => ({ checkedAt: '2030-01-01T00:00:00.000Z', owner, rateLimited: false, applyEnabled: false, job: null, items: [row('server', '1.0.0', '1.0.0', 'current'), studio] });

type Reply = { status: number; body?: unknown } | 'network';

function serve(reply: Reply) {
  const urls: string[] = [];
  const methods: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    methods.push(init?.method ?? 'GET');
    if (reply === 'network') throw new TypeError('Failed to fetch');
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body ?? {} } as unknown as Response;
  }));
  return { urls, methods };
}

beforeEach(() => { try { window.localStorage.clear(); } catch { /* storage may be blocked */ } resetStudioPrefs(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('studioNotice', () => {
  it('names the newer release and the page to download it from', () => {
    const status = parseSelfUpdateStatus(body(row('studio', '0.8.0', '0.9.0', 'behind')));
    expect(studioNotice(status, '')).toEqual({ installed: '0.8.0', latest: '0.9.0', url: 'https://github.com/JuanenRac/HYDRA-UMC-STUDIO/releases/latest' });
  });

  it('says nothing when STUDIO is current, ahead or unknown, when the version was hidden or when STUDIO is not in the answer', () => {
    for (const state of ['current', 'ahead', 'unknown']) expect(studioNotice(parseSelfUpdateStatus(body(row('studio', '0.8.0', '0.9.0', state))), '')).toBeNull();
    expect(studioNotice(parseSelfUpdateStatus(body(row('studio', '0.8.0', '0.9.0', 'behind'))), '0.9.0')).toBeNull();
    expect(studioNotice(null, '')).toBeNull();
    expect(studioNotice(parseSelfUpdateStatus({ ...body(row('server', '1', '2', 'behind')), items: [row('server', '1', '2', 'behind')] }), '')).toBeNull();
  });

  it('gives no link when the owner is not a plain name', () => {
    const odd = parseSelfUpdateStatus(body(row('studio', '0.8.0', '0.9.0', 'behind'), 'evil.example/x?'));
    expect(studioNotice(odd, '')?.url).toBeNull();
  });
});

describe('the notice bar', () => {
  it('is on by default, shows the link and installs nothing', async () => {
    expect(STUDIO_DEFAULTS.updateNotice).toBe(true);
    const calls = serve({ status: 200, body: body(row('studio', '0.8.0', '0.9.0', 'behind')) });
    render(<UpdateNotice />);
    const link = await screen.findByTestId('update-notice-link');
    expect(link.getAttribute('href')).toBe('https://github.com/JuanenRac/HYDRA-UMC-STUDIO/releases/latest');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(calls.methods.every((method) => method === 'GET')).toBe(true);
    expect(calls.urls.every((url) => url.includes('/api/admin/self-update'))).toBe(true);
  });

  it('hides for that version only, and comes back for a newer one', async () => {
    serve({ status: 200, body: body(row('studio', '0.8.0', '0.9.0', 'behind')) });
    const first = render(<UpdateNotice />);
    fireEvent.click(await screen.findByTestId('update-notice-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('update-notice')).toBeNull());
    expect(getStudioPrefs().updateNoticeDismissed).toBe('0.9.0');
    first.unmount();
    serve({ status: 200, body: body(row('studio', '0.8.0', '0.10.0', 'behind')) });
    render(<UpdateNotice />);
    expect(await screen.findByTestId('update-notice')).toBeTruthy();
  });

  it('asks nothing and shows nothing while the notice is off', async () => {
    setStudioPrefs({ updateNotice: false });
    const calls = serve({ status: 200, body: body(row('studio', '0.8.0', '0.9.0', 'behind')) });
    render(<UpdateNotice />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.urls).toHaveLength(0);
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  const silent: Reply[] = [{ status: 404 }, { status: 403 }, { status: 500, body: { error: 'x' } }, 'network', { status: 200, body: 'junk' }];
  it.each(silent)('stays silent when the server answers %j', async (reply) => {
    serve(reply);
    render(<UpdateNotice />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('has its switch in Configuration, Updates, and turning it off then on forgets the hidden version without allowing any install', async () => {
    serve({ status: 200, body: body(row('studio', '0.8.0', '0.9.0', 'behind')) });
    setStudioPrefs({ updateNoticeDismissed: '0.9.0' });
    render(<SelfUpdatePanel />);
    const toggle = (await screen.findByTestId('selfupdate-notice-switch')) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(getStudioPrefs().updateNotice).toBe(false);
    fireEvent.click(toggle);
    expect(getStudioPrefs()).toMatchObject({ updateNotice: true, updateNoticeDismissed: '' });
    expect(getStudioPrefs().selfUpdateApply).toBe(false);
  });
});
