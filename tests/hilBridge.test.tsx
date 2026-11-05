// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/hilBridge.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the HIL bridge that requires a pass verdict of the twin: how the answers are read, what body a change sends (always with the
// confirmation), when the bridge would refuse, and the screen: off by default, a confirmation before any change, nothing shown when the server
// has no such bridge.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HilBridgePanel } from '../src/components/HilBridgePanel';
import { hilBridgeApi, hilBridgeBlockedReason, hilBridgeBody, hilBridgeChangeNeedsConfirmation, parseHilBridge } from '../src/lib/hilBridge';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const off = { requireTwinPass: false, locked: false, persisted: true, ready: true, canChange: true };

function serve(handler: (init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('the reading and the body', () => {
  it('reads the switch as a boolean and nothing else', () => {
    expect(parseHilBridge(off)).toEqual(off);
    expect(parseHilBridge({ requireTwinPass: 'yes' })).toBeNull();
    expect(parseHilBridge(null)).toBeNull();
  });
  it('sends the confirmation in both directions', () => {
    expect(hilBridgeBody(true)).toEqual({ requireTwinPass: true, confirm: true });
    expect(hilBridgeBody(false)).toEqual({ requireTwinPass: false, confirm: true });
    expect(hilBridgeChangeNeedsConfirmation(false, true)).toBe(true);
    expect(hilBridgeChangeNeedsConfirmation(true, true)).toBe(false);
  });
  it('knows what the bridge would refuse', () => {
    expect(hilBridgeBlockedReason(off, true)).toBe('');
    expect(hilBridgeBlockedReason({ ...off, ready: false }, true)).toBe('not_ready');
    expect(hilBridgeBlockedReason({ ...off, requireTwinPass: true, locked: true }, false)).toBe('locked');
    expect(hilBridgeBlockedReason({ ...off, canChange: false }, true)).toBe('no_identity');
    expect(hilBridgeBlockedReason({ ...off, ready: false }, false)).toBe('');
  });
  it('tells a missing route, a bridge not configured and a refused account apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await hilBridgeApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await hilBridgeApi.read()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 403, body: {} }));
    expect(await hilBridgeApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
  });
});

describe('HilBridgePanel', () => {
  it('shows the switch off by default and keeps Save disabled until it changes', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<HilBridgePanel />);
    await waitFor(() => expect(screen.getByTestId('hil-bridge-state')).toBeTruthy());
    expect(screen.getByTestId('hil-bridge-state').textContent).toContain('Off');
    expect((screen.getByTestId('hil-bridge-require') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('hil-bridge-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it', async () => {
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: { ...off, requireTwinPass: true, changed: true } } : { status: 200, body: off }));
    render(<HilBridgePanel />);
    await waitFor(() => expect(screen.getByTestId('hil-bridge-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('hil-bridge-require'));
    fireEvent.click(screen.getByTestId('hil-bridge-save'));
    expect(screen.getByText('Require the verdict of the twin?')).toBeTruthy();
    expect(spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByText('Require'));
    await waitFor(() => expect(screen.getByTestId('hil-bridge-state').textContent).toContain('On'));
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ requireTwinPass: true, confirm: true });
  });

  it('turning it off asks for a confirmation too', async () => {
    const on = { ...off, requireTwinPass: true };
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: off } : { status: 200, body: on }));
    render(<HilBridgePanel />);
    await waitFor(() => expect((screen.getByTestId('hil-bridge-require') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('hil-bridge-require'));
    fireEvent.click(screen.getByTestId('hil-bridge-save'));
    expect(screen.getByText('Stop requiring the verdict of the twin?')).toBeTruthy();
    expect(spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
  });

  it('does not offer a change the bridge would refuse', async () => {
    serve(() => ({ status: 200, body: { ...off, ready: false } }));
    render(<HilBridgePanel />);
    await waitFor(() => expect(screen.getByTestId('hil-bridge-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('hil-bridge-require'));
    expect(screen.getByTestId('hil-bridge-blocked')).toBeTruthy();
    expect((screen.getByTestId('hil-bridge-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows nothing when the server has no such bridge', async () => {
    serve(() => ({ status: 503, body: { available: false } }));
    const { container } = render(<HilBridgePanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="hil-bridge-panel"]')).toBeNull();
  });
});
