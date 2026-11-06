// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/securityTab.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The security tab: the checks drawn from the second factor and the signing algorithm, the public state of the keys, and the rotation,
// which needs its switch (off every time the tab opens) and a confirmation before anything is sent.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { HydraStoreProviders } from '../src/storeContexts';
import { SecurityTab } from '../src/components/config/SecurityTab';
import { activeKey, parseKeys, rotateKey, securityChecks } from '../src/lib/securityView';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const keysBody = {
  algorithm: 'EdDSA',
  keys: [
    { kid: 'new-key', createdAt: 1_700_000_100, retiredAt: null, active: true, acceptedUntil: null },
    { kid: 'old-key', createdAt: 1_700_000_000, retiredAt: 1_700_000_100, active: false, acceptedUntil: 1_700_086_500 },
  ],
};

type Reply = { status: number; body: unknown };
function serve(routes: Record<string, Reply | ((init?: RequestInit) => Reply)>): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const hit = Object.entries(routes).find(([route]) => url.includes(route));
    const reply = hit ? (typeof hit[1] === 'function' ? hit[1](init) : hit[1]) : { status: 404, body: {} };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

function renderTab(isAdmin: boolean) {
  const value = { authToken: 'tok', isAdmin, role: isAdmin ? 'admin' : 'operator' };
  render(<HydraStoreProviders value={value as never}><SecurityTab /></HydraStoreProviders>);
}

describe('securityView', () => {
  it('reads only the public state of the keys', () => {
    const state = parseKeys({ ...keysBody, keys: [...keysBody.keys, { kid: '', createdAt: 1 }, { kid: 'x' }, 'junk'] });
    expect(state.algorithm).toBe('EdDSA');
    expect(state.keys.map((key) => key.kid)).toEqual(['new-key', 'old-key']);
    expect(activeKey(state.keys)?.kid).toBe('new-key');
    expect(parseKeys(null)).toEqual({ algorithm: null, keys: [] });
  });

  it('draws the checks, and leaves a check unknown when the server did not say', () => {
    expect(securityChecks(true, 'EdDSA')).toEqual([{ id: 'second_factor', ok: true }, { id: 'asymmetric_keys', ok: true }]);
    expect(securityChecks(false, 'HS256')).toEqual([{ id: 'second_factor', ok: false }, { id: 'asymmetric_keys', ok: false }]);
    expect(securityChecks(null, null)).toEqual([{ id: 'second_factor', ok: null }, { id: 'asymmetric_keys', ok: null }]);
  });

  it('tells why a rotation did not happen', async () => {
    const answer = (status: number, body: unknown) => (async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response);
    expect(await rotateKey(answer(409, {}))).toEqual({ ok: false, failure: 'asymmetric_off' });
    expect(await rotateKey(answer(500, {}))).toEqual({ ok: false, failure: 'file' });
    expect(await rotateKey(answer(403, {}))).toEqual({ ok: false, failure: 'forbidden' });
    expect(await rotateKey(answer(404, {}))).toEqual({ ok: false, failure: 'unsupported' });
    expect(await rotateKey(async () => { throw new Error('down'); })).toEqual({ ok: false, failure: 'network' });
    const done = await rotateKey(answer(200, { success: true, kid: 'k2', ...keysBody }));
    expect(done.ok && done.kid).toBe('k2');
  });
});

describe('SecurityTab', () => {
  it('shows the checks and the keys to an administrator', async () => {
    serve({ '/api/totp/status': { status: 200, body: { enabled: true, recoveryLeft: 8 } }, '/api/admin/jwt-keys': { status: 200, body: keysBody } });
    renderTab(true);
    await waitFor(() => expect(screen.getAllByTestId('security-key-row')).toHaveLength(2));
    expect(screen.getByTestId('security-algorithm').textContent).toBe('EdDSA');
    expect(screen.getByTestId('security-active-kid').textContent).toBe('new-key');
    await waitFor(() => expect(screen.getByTestId('security-check-second_factor').dataset.state).toBe('ok'));
    expect(screen.getByTestId('security-check-asymmetric_keys').dataset.state).toBe('ok');
    expect(screen.getAllByTestId('security-key-row')[1].textContent).toContain('retired, accepted until');
  });

  it('does not show the keys, and does not ask for them, to an account that is not an administrator', async () => {
    const spy = serve({ '/api/totp/status': { status: 200, body: { enabled: false, recoveryLeft: 0 } } });
    renderTab(false);
    await waitFor(() => expect(screen.getByTestId('security-check-second_factor').dataset.state).toBe('warn'));
    expect(screen.getByTestId('security-admin-only')).toBeTruthy();
    expect(screen.queryByTestId('security-keys')).toBeNull();
    expect(spy.mock.calls.some(([url]) => String(url).includes('/api/admin/jwt-keys'))).toBe(false);
  });

  it('keeps the rotation off until its switch is on, and asks before sending it', async () => {
    const spy = serve({
      '/api/totp/status': { status: 200, body: { enabled: false, recoveryLeft: 0 } },
      '/api/admin/jwt-keys/rotate': { status: 200, body: { success: true, kid: 'fresh', ...keysBody } },
      '/api/admin/jwt-keys': { status: 200, body: keysBody },
    });
    renderTab(true);
    await waitFor(() => expect(screen.getAllByTestId('security-key-row')).toHaveLength(2));
    const rotate = screen.getByTestId('security-rotate') as HTMLButtonElement;
    expect(rotate.disabled).toBe(true);
    expect((screen.getByTestId('security-allow-rotation') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByTestId('security-allow-rotation'));
    expect(rotate.disabled).toBe(false);
    fireEvent.click(rotate);
    expect(spy.mock.calls.some(([url]) => String(url).endsWith('/rotate'))).toBe(false);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(screen.getByTestId('security-notice').textContent).toContain('fresh'));
    expect(spy.mock.calls.filter(([url]) => String(url).endsWith('/rotate'))).toHaveLength(1);
    expect((screen.getByTestId('security-allow-rotation') as HTMLInputElement).checked).toBe(false);
  });

  it('says plainly when the server signs with a shared secret', async () => {
    serve({
      '/api/totp/status': { status: 200, body: { enabled: false, recoveryLeft: 0 } },
      '/api/admin/jwt-keys/rotate': { status: 409, body: { code: 'JWT_ASYMMETRIC_OFF' } },
      '/api/admin/jwt-keys': { status: 200, body: { algorithm: 'HS256', keys: [] } },
    });
    renderTab(true);
    await waitFor(() => expect(screen.getByTestId('security-algorithm').textContent).toBe('HS256'));
    expect(screen.getByTestId('security-check-asymmetric_keys').dataset.state).toBe('warn');
    fireEvent.click(screen.getByTestId('security-allow-rotation'));
    fireEvent.click(screen.getByTestId('security-rotate'));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(screen.getByTestId('security-notice').textContent).toContain('shared secret'));
  });
});
