// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/robotAccess.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The access bar of a robot (Live or Sim, reservation, arming of the jog) and the administration screen of the
// safety limits, rendered with a real DOM against a fake server.
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraContext, defaultControllers, type RobotState } from '../src/store';
import { RobotAccessBar } from '../src/components/RobotAccessBar';
import { AdminSafety } from '../src/components/AdminSafety';
import { getControllerId } from '../src/lib/controllerSession';
import { getModeState, getSafetyState, resetAccessStores } from '../src/lib/accessStore';
import { FALLBACK_LIMITS } from '../src/lib/safetyLimits';

const robot = defaultControllers[0].robots[0] as RobotState;

function token(username: string, role: string): string {
  return `h.${btoa(JSON.stringify({ username, role })).replace(/=+$/, '')}.s`;
}

function context(over: Record<string, unknown> = {}) {
  const reportCommandIssue = vi.fn();
  const value = { authToken: token('ana', 'operator'), isAdmin: false, robots: [robot], reportCommandIssue, ...over };
  return { reportCommandIssue, wrapper: ({ children }: { children: React.ReactNode }) => <HydraContext.Provider value={value as never}>{children}</HydraContext.Provider> };
}

interface FakeServer { claims: unknown[]; limits: Record<string, unknown>; armedUntil: number | null; calls: Array<{ url: string; method: string; body: any }>; reply: Map<string, { status: number; body: unknown }> }

function startServer(over: Partial<FakeServer> = {}): FakeServer {
  const server: FakeServer = { claims: [], limits: {}, armedUntil: null, calls: [], reply: new Map(), ...over };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : null;
    server.calls.push({ url: String(url), method, body });
    const forced = server.reply.get(`${method} ${String(url).split('?')[0]}`);
    let status = 200;
    let data: unknown = { success: true };
    if (forced) { status = forced.status; data = forced.body; }
    else if (String(url).startsWith('/api/claims')) data = { claims: server.claims };
    else if (String(url).startsWith('/api/safety-limits')) data = { limits: server.limits, robot: { id: robot.id, jogArmedUntil: server.armedUntil } };
    else if (String(url).endsWith('/jog-arm')) {
      server.armedUntil = body?.armed ? Date.now() + 60_000 : null;
      data = { success: true, armed: body?.armed, expiresAt: server.armedUntil };
    }
    return { ok: status < 300, status, json: async () => data } as Response;
  }));
  return server;
}

beforeEach(() => { resetAccessStores(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the access bar of a robot', () => {
  it('starts in Live, and Sim is one click away and blocks the robot panel commands', async () => {
    startServer();
    const { wrapper } = context();
    render(<RobotAccessBar robot={robot} />, { wrapper });
    expect(screen.getByTestId('mode-live').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('sim-notice')).toBeNull();
    fireEvent.click(screen.getByTestId('mode-sim'));
    expect(screen.getByTestId('mode-sim').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('sim-notice')).toBeTruthy();
    expect(getModeState().modes[robot.id]).toBe('sim');
    fireEvent.click(screen.getByTestId('mode-live'));
    expect(getModeState().modes[robot.id]).toBe('live');
  });

  it('reserves a free robot for this window and sends its controller id', async () => {
    const server = startServer();
    const { wrapper } = context();
    render(<RobotAccessBar robot={robot} />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('claim-badge').textContent).toMatch(/not reserved/i));
    fireEvent.click(screen.getByRole('button', { name: /^reserve$/i }));
    await waitFor(() => expect(server.calls.some((c) => c.url.endsWith('/claim'))).toBe(true));
    const claim = server.calls.find((c) => c.url.endsWith('/claim'));
    expect(claim?.method).toBe('POST');
    expect(claim?.body.controllerId).toBe(getControllerId());
  });

  it('shows a reservation of this window and releases it', async () => {
    const server = startServer({ claims: [{ robotId: robot.id, robotName: robot.name, cellId: 'c', ownerId: 'u', ownerUsername: 'ana', controllerId: getControllerId(), claimedAt: Date.now(), expiresAt: Date.now() + 300_000 }] });
    const { wrapper } = context();
    render(<RobotAccessBar robot={robot} />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('claim-badge').textContent).toMatch(/reserved by you/i));
    fireEvent.click(screen.getByRole('button', { name: /^release$/i }));
    await waitFor(() => expect(server.calls.some((c) => c.url.endsWith('/release'))).toBe(true));
  });

  it('says when the same account holds the robot from another window, and when another account does', async () => {
    startServer({ claims: [{ robotId: robot.id, ownerUsername: 'ana', controllerId: 'other-window', expiresAt: Date.now() + 60_000 }] });
    const first = context();
    const view = render(<RobotAccessBar robot={robot} />, { wrapper: first.wrapper });
    await waitFor(() => expect(screen.getByTestId('claim-badge').textContent).toMatch(/by you elsewhere/i));
    expect(screen.queryByRole('button', { name: /^reserve$/i })).toBeNull();
    view.unmount();

    startServer({ claims: [{ robotId: robot.id, ownerUsername: 'bob', controllerId: 'x', expiresAt: Date.now() + 60_000 }] });
    const second = context();
    render(<RobotAccessBar robot={robot} />, { wrapper: second.wrapper });
    await waitFor(() => expect(screen.getByTestId('claim-badge').textContent).toMatch(/reserved by bob/i));
    expect(screen.queryByRole('button', { name: /take over/i })).toBeNull();
  });

  it('lets an administrator take over a robot held by someone else, after confirming', async () => {
    const server = startServer({ claims: [{ robotId: robot.id, ownerUsername: 'bob', controllerId: 'x', expiresAt: Date.now() + 60_000 }] });
    const { wrapper } = context({ isAdmin: true, authToken: token('root', 'admin') });
    render(<RobotAccessBar robot={robot} />, { wrapper });
    await waitFor(() => screen.getByRole('button', { name: /take over/i }));
    fireEvent.click(screen.getByRole('button', { name: /take over/i }));
    expect(server.calls.some((c) => c.url.endsWith('/claim'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(server.calls.find((c) => c.url.endsWith('/claim'))?.body.force).toBe(true));
  });

  it('reports a refusal of the server with its code instead of swallowing it', async () => {
    const server = startServer();
    server.reply.set('POST /api/robot/' + robot.id + '/claim', { status: 409, body: { error: 'held', code: 'other-controller' } });
    const { wrapper, reportCommandIssue } = context();
    render(<RobotAccessBar robot={robot} />, { wrapper });
    await waitFor(() => screen.getByRole('button', { name: /^reserve$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^reserve$/i }));
    await waitFor(() => expect(reportCommandIssue).toHaveBeenCalled());
    expect(reportCommandIssue.mock.calls[0][0]).toMatchObject({ code: 'claim_other_controller', command: 'claim', robotIds: [robot.id] });
  });

  it('offers no arming while the administrator does not require it, and arms and disarms when they do', async () => {
    const off = startServer();
    const first = context();
    const view = render(<RobotAccessBar robot={robot} />, { wrapper: first.wrapper });
    await waitFor(() => expect(off.calls.some((c) => c.url.startsWith('/api/safety-limits'))).toBe(true));
    expect(screen.queryByTestId('jog-arm')).toBeNull();
    view.unmount();

    const server = startServer({ limits: { jog: { ...FALLBACK_LIMITS.jog, armRequired: true } } });
    const second = context();
    render(<RobotAccessBar robot={robot} />, { wrapper: second.wrapper });
    await waitFor(() => screen.getByTestId('jog-arm'));
    expect(getSafetyState().limits.jog.armRequired).toBe(true);
    fireEvent.click(screen.getByTestId('jog-arm'));
    await waitFor(() => expect(server.calls.some((c) => c.url.endsWith('/jog-arm') && c.body.armed === true)).toBe(true));
    expect(server.calls.find((c) => c.url.endsWith('/jog-arm'))?.body.controllerId).toBe(getControllerId());
    await waitFor(() => expect(screen.getByTestId('jog-arm').textContent).toMatch(/disarm/i));
    fireEvent.click(screen.getByTestId('jog-arm'));
    await waitFor(() => expect(server.calls.some((c) => c.url.endsWith('/jog-arm') && c.body.armed === false)).toBe(true));
  });

  it('lists every reservation', async () => {
    startServer({ claims: [
      { robotId: 1, robotName: 'Arm 1', ownerUsername: 'ana', controllerId: 'w1', expiresAt: Date.now() + 120_000 },
      { robotId: 2, robotName: 'Arm 2', ownerUsername: 'bob', controllerId: null, expiresAt: Date.now() + 60_000 },
    ] });
    const { wrapper } = context();
    render(<RobotAccessBar robot={robot} />, { wrapper });
    await waitFor(() => expect(screen.getByRole('button', { name: /reservations \(2\)/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reservations \(2\)/i }));
    const table = screen.getByTestId('claims-list');
    expect(table.textContent).toContain('Arm 1');
    expect(table.textContent).toContain('bob');
  });
});

describe('the safety limits screen', () => {
  it('is only for administrators', () => {
    startServer();
    const { wrapper } = context();
    render(<AdminSafety />, { wrapper });
    expect(screen.queryByTestId('admin-safety')).toBeNull();
    expect(screen.getByText(/only administrators/i)).toBeTruthy();
  });

  it('shows what the server holds, saves a change with PUT and refuses a value over the ceiling without calling the server', async () => {
    const server = startServer({ limits: FALLBACK_LIMITS as unknown as Record<string, unknown> });
    server.reply.set('PUT /api/admin/safety-limits', { status: 200, body: { success: true, limits: { ...FALLBACK_LIMITS, claims: { requireControllerId: true } } } });
    const { wrapper } = context({ isAdmin: true, authToken: token('root', 'admin') });
    render(<AdminSafety />, { wrapper });
    await waitFor(() => expect((screen.getByTestId('default-amount') as HTMLInputElement).value).toBe('100'));

    fireEvent.change(screen.getByTestId('default-amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByTestId('safety-save'));
    expect(screen.getByRole('alert').textContent).toMatch(/out of range/i);
    expect(server.calls.some((c) => c.method === 'PUT')).toBe(false);

    fireEvent.change(screen.getByTestId('default-amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByTestId('require-controller'));
    fireEvent.click(screen.getByTestId('arm-required'));
    fireEvent.click(screen.getByTestId('safety-save'));
    await waitFor(() => expect(server.calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = server.calls.find((c) => c.method === 'PUT');
    expect(put?.body.jog.default.maxAmount).toBe(50);
    expect(put?.body.jog.armRequired).toBe(true);
    expect(put?.body.claims.requireControllerId).toBe(true);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/saved/i));
    expect(getSafetyState().limits.claims.requireControllerId).toBe(true);
  });

  it('adds a model row, and the server refuses a duplicate row locally', async () => {
    startServer({ limits: FALLBACK_LIMITS as unknown as Record<string, unknown> });
    const { wrapper } = context({ isAdmin: true, authToken: token('root', 'admin') });
    render(<AdminSafety />, { wrapper });
    await waitFor(() => screen.getByTestId('default-amount'));
    const field = screen.getByPlaceholderText(/model name/i);
    fireEvent.change(field, { target: { value: 'Parol6 (6-DOF)' } });
    fireEvent.click(screen.getByRole('button', { name: /add model/i }));
    expect(screen.getByText('parol6')).toBeTruthy();
    fireEvent.change(field, { target: { value: 'parol6' } });
    fireEvent.click(screen.getByRole('button', { name: /add model/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/already in the table/i);
  });
});
