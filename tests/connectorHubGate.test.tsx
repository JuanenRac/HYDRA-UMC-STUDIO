// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/connectorHubGate.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the connector hub gate that answers a caller without identity: how the answers are read, what body a change sends,
// and the screen: off by default, a confirmation before turning it on, nothing shown when the server has no such gate.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { ConnectorHubGatePanel } from '../src/components/ConnectorHubGatePanel';
import { connectorHubGateApi, gateChangeAllowed, gateChangeNeedsConfirmation, gateSettingsBody, parseGateSettings } from '../src/lib/connectorHubGate';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const off = { allowLoopbackNoIdentity: false, loopbackSwitchAllowed: true, verifiesTokens: true, persisted: true };

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
    expect(parseGateSettings(off)).toEqual(off);
    expect(parseGateSettings({ allowLoopbackNoIdentity: 'yes' })).toBeNull();
    expect(parseGateSettings(null)).toBeNull();
  });
  it('sends the confirmation only when turning the switch on', () => {
    expect(gateSettingsBody(true)).toEqual({ allowLoopbackNoIdentity: true, confirm: true });
    expect(gateSettingsBody(false)).toEqual({ allowLoopbackNoIdentity: false });
    expect(gateChangeNeedsConfirmation(false, true)).toBe(true);
    expect(gateChangeNeedsConfirmation(true, false)).toBe(false);
  });
  it('knows which changes the hub would refuse', () => {
    expect(gateChangeAllowed({ ...off, loopbackSwitchAllowed: false }, true)).toBe(false);
    expect(gateChangeAllowed({ ...off, allowLoopbackNoIdentity: true, verifiesTokens: false }, false)).toBe(false);
    expect(gateChangeAllowed(off, true)).toBe(true);
  });
  it('tells a missing route, a gate not configured and a refused account apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await connectorHubGateApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await connectorHubGateApi.read()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 403, body: {} }));
    expect(await connectorHubGateApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
  });
});

describe('ConnectorHubGatePanel', () => {
  it('shows the switch off by default and keeps Save disabled until it changes', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<ConnectorHubGatePanel />);
    await waitFor(() => expect(screen.getByTestId('hub-gate-state')).toBeTruthy());
    expect(screen.getByTestId('hub-gate-state').textContent).toContain('Off');
    expect((screen.getByTestId('hub-gate-allow') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('hub-gate-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it', async () => {
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: { ...off, allowLoopbackNoIdentity: true, changed: true } } : { status: 200, body: off }));
    render(<ConnectorHubGatePanel />);
    await waitFor(() => expect(screen.getByTestId('hub-gate-allow')).toBeTruthy());
    fireEvent.click(screen.getByTestId('hub-gate-allow'));
    fireEvent.click(screen.getByTestId('hub-gate-save'));
    expect(screen.getByText('Turn on answers without identity?')).toBeTruthy();
    expect(spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByText('Turn on'));
    await waitFor(() => expect(screen.getByTestId('hub-gate-state').textContent).toContain('On'));
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ allowLoopbackNoIdentity: true, confirm: true });
  });

  it('turning it off needs no confirmation', async () => {
    const on = { ...off, allowLoopbackNoIdentity: true };
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: off } : { status: 200, body: on }));
    render(<ConnectorHubGatePanel />);
    await waitFor(() => expect((screen.getByTestId('hub-gate-allow') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('hub-gate-allow'));
    fireEvent.click(screen.getByTestId('hub-gate-save'));
    await waitFor(() => expect(screen.getByTestId('hub-gate-state').textContent).toContain('Off'));
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ allowLoopbackNoIdentity: false });
  });

  it('shows nothing when the server has no such gate', async () => {
    serve(() => ({ status: 503, body: { available: false } }));
    const { container } = render(<ConnectorHubGatePanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="hub-gate-panel"]')).toBeNull();
  });
});
