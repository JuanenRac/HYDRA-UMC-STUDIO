// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/opsProposals.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The proposals of the node watchdog that wait for a person: how the lists are read, what body a decision sends (a confirmation only to
// approve, never a name) and the screen: a confirmation before approving, rejecting at once, nothing shown when the server has no channel.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { OpsProposalsPanel } from '../src/components/OpsProposalsPanel';
import { decisionBody, decisionNeedsConfirmation, opsProposalsApi, parseProposals } from '../src/lib/opsProposals';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const incident = { incidentId: 'inc-1', sourceNode: 'cm5-a', detectedAt: '2026-01-01T00:00:00Z', severity: 'high', component: 'hydra-umc-server.service', symptom: 'the unit keeps restarting' };
const listing = { pending: [{ incident, receivedAt: 'r' }], decided: [{ incidentId: 'old', decision: 'rejected', by: 'root', decidedAt: 'd' }] };

function serve(handler: (url: string, init: RequestInit | undefined) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(String(input), init);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const posts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

describe('the reading and the body', () => {
  it('reads the pending and the decided lists and drops what is not an entry', () => {
    const parsed = parseProposals({ pending: [{ incident, receivedAt: 'r' }, 5, { incident: {} }], decided: [{ incidentId: 'x', decision: 'maybe' }, listing.decided[0]] });
    expect(parsed?.pending.map(p => p.incidentId)).toEqual(['inc-1']);
    expect(parsed?.decided.map(d => d.incidentId)).toEqual(['old']);
    expect(parseProposals({})).toBeNull();
    expect(parseProposals(null)).toBeNull();
  });
  it('sends the confirmation only to approve and never a name', () => {
    expect(decisionBody('a', 'approved')).toEqual({ incidentId: 'a', decision: 'approved', confirm: true });
    expect(decisionBody('a', 'rejected')).toEqual({ incidentId: 'a', decision: 'rejected' });
    expect(decisionNeedsConfirmation('approved')).toBe(true);
    expect(decisionNeedsConfirmation('rejected')).toBe(false);
  });
  it('tells a missing route, a channel not set up, a refused account and a proposal no longer pending apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await opsProposalsApi.list()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 503, body: { available: false } }));
    expect(await opsProposalsApi.list()).toEqual({ ok: false, failure: 'not_configured' });
    serve(() => ({ status: 403, body: {} }));
    expect(await opsProposalsApi.list()).toMatchObject({ ok: false, failure: 'forbidden' });
    serve(() => ({ status: 404, body: { code: 'operation-failed', reason: 'not-pending' } }));
    expect(await opsProposalsApi.decide('a', 'rejected')).toMatchObject({ ok: false, failure: 'not_pending' });
  });
});

describe('OpsProposalsPanel', () => {
  it('lists the pending proposals and the last decisions', async () => {
    serve(() => ({ status: 200, body: listing }));
    render(<OpsProposalsPanel />);
    await waitFor(() => expect(screen.getAllByTestId('ops-proposal')).toHaveLength(1));
    expect(screen.getByText('hydra-umc-server.service')).toBeTruthy();
    expect(screen.getByTestId('ops-proposals-decided').textContent).toContain('old');
  });

  it('asks for a confirmation before approving and sends confirm: true only after it', async () => {
    const spy = serve((url, init) => (init?.method === 'POST' ? { status: 200, body: { incidentId: 'inc-1', decision: 'approved', by: 'root' } } : { status: 200, body: listing }));
    render(<OpsProposalsPanel />);
    await waitFor(() => expect(screen.getByTestId('ops-proposal-approve')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ops-proposal-approve'));
    expect(screen.getByText('Approve this proposal?')).toBeTruthy();
    expect(posts(spy)).toHaveLength(0);
    fireEvent.click(screen.getAllByText('Approve').find(el => el.tagName === 'BUTTON' && el.closest('[role="dialog"]')) ?? screen.getAllByText('Approve').at(-1)!);
    await waitFor(() => expect(posts(spy)).toHaveLength(1));
    expect(JSON.parse(String((posts(spy)[0][1] as RequestInit).body))).toEqual({ incidentId: 'inc-1', decision: 'approved', confirm: true });
  });

  it('rejects at once, without a confirmation and without confirm in the body', async () => {
    const spy = serve((url, init) => (init?.method === 'POST' ? { status: 200, body: { incidentId: 'inc-1', decision: 'rejected', by: 'root' } } : { status: 200, body: listing }));
    render(<OpsProposalsPanel />);
    await waitFor(() => expect(screen.getByTestId('ops-proposal-reject')).toBeTruthy());
    fireEvent.click(screen.getByTestId('ops-proposal-reject'));
    await waitFor(() => expect(posts(spy)).toHaveLength(1));
    expect(JSON.parse(String((posts(spy)[0][1] as RequestInit).body))).toEqual({ incidentId: 'inc-1', decision: 'rejected' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Rejected: inc-1'));
  });

  it('shows nothing when the server has no channel to the watchdog', async () => {
    serve(() => ({ status: 503, body: { available: false } }));
    const { container } = render(<OpsProposalsPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="ops-proposals-panel"]')).toBeNull();
  });
});
