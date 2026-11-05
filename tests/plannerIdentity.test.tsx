// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/plannerIdentity.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The switch of the semantic planner that makes the approval of a plan the act of a signed-in person: how the answers are read, what body
// a change sends, and the screen: on by default, a confirmation before relaxing it, nothing shown when the server has no such planner.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { PlannerIdentityPanel } from '../src/components/PlannerIdentityPanel';
import { parsePlannerIdentity, plannerChangeAllowed, plannerChangeNeedsConfirmation, plannerIdentityApi, plannerIdentityBody } from '../src/lib/plannerIdentity';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const on = { requireIdentity: true, verifiesTokens: true, persisted: true };

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
    expect(parsePlannerIdentity(on)).toEqual(on);
    expect(parsePlannerIdentity({ requireIdentity: 'yes' })).toBeNull();
    expect(parsePlannerIdentity(null)).toBeNull();
  });
  it('sends the confirmation only when relaxing the switch', () => {
    expect(plannerIdentityBody(false)).toEqual({ requireIdentity: false, confirm: true });
    expect(plannerIdentityBody(true)).toEqual({ requireIdentity: true });
    expect(plannerChangeNeedsConfirmation(true, false)).toBe(true);
    expect(plannerChangeNeedsConfirmation(false, true)).toBe(false);
  });
  it('knows that without the identity key the planner refuses any change', () => {
    expect(plannerChangeAllowed({ ...on, verifiesTokens: false }, false)).toBe(false);
    expect(plannerChangeAllowed({ ...on, verifiesTokens: false }, true)).toBe(true);
    expect(plannerChangeAllowed(on, false)).toBe(true);
  });
  it('tells a missing route, a planner not configured and a refused account apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await plannerIdentityApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await plannerIdentityApi.read()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 403, body: {} }));
    expect(await plannerIdentityApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
  });
});

describe('PlannerIdentityPanel', () => {
  it('shows the switch on by default and keeps Save disabled until it changes', async () => {
    serve(() => ({ status: 200, body: on }));
    render(<PlannerIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('planner-identity-state')).toBeTruthy());
    expect(screen.getByTestId('planner-identity-state').textContent).toContain('On');
    expect((screen.getByTestId('planner-identity-require') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('planner-identity-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('asks for a confirmation before relaxing it and sends confirm: true only after it', async () => {
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: { ...on, requireIdentity: false, changed: true } } : { status: 200, body: on }));
    render(<PlannerIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('planner-identity-require')).toBeTruthy());
    fireEvent.click(screen.getByTestId('planner-identity-require'));
    fireEvent.click(screen.getByTestId('planner-identity-save'));
    expect(screen.getByText('Relax the identity of the approval?')).toBeTruthy();
    expect(spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByText('Relax'));
    await waitFor(() => expect(screen.getByTestId('planner-identity-state').textContent).toContain('Off'));
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ requireIdentity: false, confirm: true });
  });

  it('tightening it again needs no confirmation', async () => {
    const off = { ...on, requireIdentity: false };
    const spy = serve((init) => (init?.method === 'POST' ? { status: 200, body: on } : { status: 200, body: off }));
    render(<PlannerIdentityPanel />);
    await waitFor(() => expect((screen.getByTestId('planner-identity-require') as HTMLInputElement).checked).toBe(false));
    fireEvent.click(screen.getByTestId('planner-identity-require'));
    fireEvent.click(screen.getByTestId('planner-identity-save'));
    await waitFor(() => expect(screen.getByTestId('planner-identity-state').textContent).toContain('On'));
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ requireIdentity: true });
  });

  it('shows nothing when the server has no such planner', async () => {
    serve(() => ({ status: 503, body: { available: false } }));
    const { container } = render(<PlannerIdentityPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="planner-identity-panel"]')).toBeNull();
  });
});
