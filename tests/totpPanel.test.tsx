// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/totpPanel.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The screen of the second factor, rendered with a real DOM against a fake server: turning it on (password, key and QR
// code, first code, recovery codes) and turning it off.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { TotpPanel } from '../src/components/TotpPanel';

interface Call { url: string; method: string; body: any }

function fakeServer(initial: { enabled: boolean }, rejectPassword = false) {
  const state = { enabled: initial.enabled, calls: [] as Call[] };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : null;
    state.calls.push({ url: String(url), method, body });
    let status = 200;
    let data: unknown = { success: true };
    if (url.endsWith('/status')) data = { enabled: state.enabled, recoveryLeft: 10 };
    else if (url.endsWith('/begin')) {
      if (rejectPassword) { status = 401; data = { error: 'Invalid credentials' }; }
      else data = { success: true, secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://totp/HYDRA-UMC:admin?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=HYDRA-UMC' };
    } else if (url.endsWith('/confirm')) {
      if (body.code !== '123456') { status = 400; data = { error: 'no' }; }
      else { state.enabled = true; data = { success: true, recoveryCodes: ['0a1b2-c3d4e', 'ffeed-00112'] }; }
    } else if (url.endsWith('/disable')) { state.enabled = false; }
    return { ok: status < 300, status, json: async () => data, headers: { get: () => null } } as unknown as Response;
  }));
  return state;
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the two-step sign-in screen', () => {
  it('walks through turning it on: password, key with QR code, code, recovery codes', async () => {
    const server = fakeServer({ enabled: false });
    render(<TotpPanel />);
    const password = await screen.findByLabelText('Your password');
    fireEvent.change(password, { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Start setup'));
    expect((await screen.findByTestId('totp-key')).textContent).toBe('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
    expect(screen.getByRole('img').querySelector('path')?.getAttribute('d')).toContain('h1v1h-1z');
    fireEvent.change(screen.getByLabelText('Code shown by the app (6 digits)'), { target: { value: '000 000' } });
    fireEvent.click(screen.getByText('Confirm and turn on'));
    expect((await screen.findByRole('alert')).textContent).toBe('That code is not right.');
    fireEvent.change(screen.getByLabelText('Code shown by the app (6 digits)'), { target: { value: '123 456' } });
    fireEvent.click(screen.getByText('Confirm and turn on'));
    const list = await screen.findByTestId('totp-recovery');
    expect(list.textContent).toContain('0a1b2-c3d4e');
    expect(server.calls.find(call => call.url.endsWith('/begin'))?.body).toEqual({ password: 'secret' });
    fireEvent.click(screen.getByText('I have saved them'));
    await waitFor(() => expect(screen.getByText('On for your account. Recovery codes left: 10.')).toBeTruthy());
  });

  it('says so when the password is wrong and does not start the setup', async () => {
    fakeServer({ enabled: false }, true);
    render(<TotpPanel />);
    fireEvent.change(await screen.findByLabelText('Your password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByText('Start setup'));
    expect((await screen.findByRole('alert')).textContent).toBe('The password is not right.');
    expect(screen.queryByTestId('totp-key')).toBeNull();
  });

  it('turns it off with the password and a code', async () => {
    const server = fakeServer({ enabled: true });
    render(<TotpPanel />);
    fireEvent.change(await screen.findByLabelText('Your password'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText('Current code or an unused recovery code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Turn off'));
    await waitFor(() => expect(screen.getByText('Two-step sign-in is off.')).toBeTruthy());
    expect(server.calls.find(call => call.url.endsWith('/disable'))?.body).toEqual({ password: 'secret', code: '123456' });
  });

  it('says plainly when the server does not have the routes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}), headers: { get: () => null } }) as unknown as Response));
    render(<TotpPanel />);
    expect((await screen.findAllByText('This server does not offer two-step sign-in.')).length).toBeGreaterThan(0);
  });
});
