// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/typedReaders.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The readers that go through the typed client with the token they are handed: the camera status poll, the log read of the administrator panel (query and
// token), the list of the proposals of the watchdog, and the way a refusal or an answer that is not JSON is told apart.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { AdminLogs } from '../src/components/AdminLogs';
import { useCameraTools } from '../src/hooks/useCameraTools';
import { opsProposalsApi } from '../src/lib/opsProposals';

type Call = { url: string; init: RequestInit | undefined };
let calls: Call[] = [];

function serve(handler: (url: string) => { status?: number; body: unknown; plain?: boolean } | 'network'): void {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const reply = handler(url);
    if (reply === 'network') throw new TypeError('network');
    const status = reply.status ?? 200;
    return { ok: status < 300, status, json: async () => { if (reply.plain) throw new SyntaxError('not JSON'); return reply.body; }, headers: new Headers() } as Response;
  }));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('the camera status poll', () => {
  it('reads with the token it is handed and keeps what it got', async () => {
    serve(() => ({ body: { '1:2': { status: 'running', lastError: null } } }));
    const { result } = renderHook(() => useCameraTools(true, 'tok-9', vi.fn() as never));
    await waitFor(() => expect(result.current.cameraStatus['1:2']?.status).toBe('running'));
    expect(calls[0].url).toMatch(/\/api\/cameras\/status$/);
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBe('Bearer tok-9');
  });

  it('keeps the status already shown when a poll is refused, is not JSON or loses the network', async () => {
    serve(() => ({ status: 500, body: {} }));
    const refused = renderHook(() => useCameraTools(true, null, vi.fn() as never));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(refused.result.current.cameraStatus).toEqual({});
    expect((calls[0].init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
    serve(() => ({ body: null, plain: true }));
    const plain = renderHook(() => useCameraTools(true, null, vi.fn() as never));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(plain.result.current.cameraStatus).toEqual({});
    serve(() => 'network');
    const down = renderHook(() => useCameraTools(true, null, vi.fn() as never));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(down.result.current.cameraStatus).toEqual({});
  });
});

describe('the USB scan and the RTSP discovery', () => {
  it('an answer that is not JSON is an error, not an empty success', async () => {
    serve(() => ({ body: null, plain: true }));
    const { result } = renderHook(() => useCameraTools(false, 't', vi.fn() as never));
    await act(async () => { await result.current.discoverUsbDevices(); });
    expect(result.current.usbDiscoverPhase).toBe('error');
    await act(async () => { await result.current.discoverRtspPath(1, 'cam', 554, '', ''); });
    expect(result.current.rtspDiscoverStates[1]).toEqual({ phase: 'error' });
  });

  it('a refusal of the discovery is told as not found, never as found', async () => {
    serve(() => ({ status: 403, body: { ok: true, paths: ['/x'], triedPaths: ['/y'] } }));
    const updateCamera = vi.fn();
    const { result } = renderHook(() => useCameraTools(false, 't', updateCamera as never));
    await act(async () => { await result.current.discoverRtspPath(1, 'cam', 554, '', ''); });
    expect(result.current.rtspDiscoverStates[1]).toEqual({ phase: 'not-found', message: '/y' });
    expect(updateCamera).not.toHaveBeenCalled();
  });
});

describe('the log read of the administrator panel', () => {
  const show = (value: Record<string, unknown> = {}) =>
    render(<HydraStoreProviders value={{ authToken: 'adm-token', isAdmin: true, logsClearedAt: null, setLogsClearedAt: vi.fn(), ...value } as never}><AdminLogs /></HydraStoreProviders>);

  it('asks for the last lines with the token of the account and shows them', async () => {
    serve(() => ({ body: { lines: ['[Server] up and running'] } }));
    show();
    await screen.findByText(/up and running/);
    expect(calls[0].url).toMatch(/\/api\/admin\/logs\?lines=\d+$/);
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBe('Bearer adm-token');
  });

  it('shows the message of the server when it refuses', async () => {
    serve(() => ({ status: 403, body: { error: 'Admin only' } }));
    show();
    await screen.findByText('Admin only');
  });

  it('shows the generic failure when the answer is not JSON', async () => {
    serve(() => ({ body: null, plain: true }));
    show();
    await screen.findByText(/Could not load/i);
  });
});

describe('the list of the proposals of the watchdog', () => {
  it('reads through the typed client and keeps the failures apart', async () => {
    serve(() => ({ body: { pending: [], decided: [] } }));
    expect(await opsProposalsApi.list()).toEqual({ ok: true, value: { pending: [], decided: [] } });
    expect(calls[0].url).toMatch(/\/api\/ops-agent\/proposals$/);
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await opsProposalsApi.list()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 404, body: {}, plain: true }));
    expect(await opsProposalsApi.list()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 500, body: { error: 'boom' } }));
    expect(await opsProposalsApi.list()).toMatchObject({ ok: false, failure: 'http', status: 500, reason: 'boom' });
    serve(() => 'network');
    expect(await opsProposalsApi.list()).toEqual({ ok: false, failure: 'network' });
  });
});
