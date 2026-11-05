// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/serviceIdentity.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The identity the server presents to the services: how the answers are read, what body a change sends, and the screen: off by default,
// a confirmation before turning it on, a warning when turning it off, the services that take it and the safe order, nothing shown when
// the server has no such route.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { ServiceIdentityPanel } from '../src/components/ServiceIdentityPanel';
import { parseServiceIdentity, serviceIdentityApi, serviceIdentityBody, serviceIdentityNeedsConfirmation, servicesBySupport } from '../src/lib/serviceIdentity';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const off = {
  enabled: false, source: 'default', locked: false, key: 'usable', state: 'off',
  services: [{ name: 'datalake', support: 'accepts' }, { name: 'twin', support: 'accepts' }, { name: 'connector-hub', support: 'own_verifier' }, { name: 'voice-ui', support: 'not_yet' }],
  order: ['server_first', 'then_one_by_one', 'enable_in_root', 'restart_unit', 'check_status'],
};
const on = { ...off, enabled: true, source: 'config', state: 'presenting' };

function serve(handler: (init: RequestInit | undefined, url: string) => { status: number; body: unknown }): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const reply = handler(init, String(input));
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}
const puts = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');

describe('the reading and the body', () => {
  it('reads the state and drops what it does not know', () => {
    expect(parseServiceIdentity(off)).toEqual(off);
    expect(parseServiceIdentity({ ...off, services: [...off.services, { name: 'x', support: 'weird' }, { support: 'accepts' }], order: ['server_first', 'bogus'] })).toMatchObject({ order: ['server_first'] });
    expect(parseServiceIdentity({ ...off, state: 'weird' })).toBeNull();
    expect(parseServiceIdentity({ enabled: 'yes' })).toBeNull();
    expect(parseServiceIdentity(null)).toBeNull();
  });
  it('sends the confirmation only when turning the switch on', () => {
    expect(serviceIdentityBody(true)).toEqual({ auth: { serviceIdentity: { enabled: true, confirm: true } } });
    expect(serviceIdentityBody(false)).toEqual({ auth: { serviceIdentity: { enabled: false } } });
    expect(serviceIdentityNeedsConfirmation(false, true)).toBe(true);
    expect(serviceIdentityNeedsConfirmation(true, false)).toBe(false);
  });
  it('groups the services by how they take the identity', () => {
    const status = parseServiceIdentity(off)!;
    expect(servicesBySupport(status, 'accepts')).toEqual(['datalake', 'twin']);
    expect(servicesBySupport(status, 'own_verifier')).toEqual(['connector-hub']);
    expect(servicesBySupport(status, 'not_yet')).toEqual(['voice-ui']);
  });
  it('tells a missing route and a refused account apart', async () => {
    serve(() => ({ status: 404, body: {} }));
    expect(await serviceIdentityApi.read()).toEqual({ ok: false, failure: 'unsupported' });
    serve(() => ({ status: 403, body: {} }));
    expect(await serviceIdentityApi.read()).toMatchObject({ ok: false, failure: 'forbidden' });
  });
});

describe('ServiceIdentityPanel', () => {
  it('shows the switch off by default, the services by support level and the safe order', async () => {
    serve(() => ({ status: 200, body: off }));
    render(<ServiceIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('service-identity-state')).toBeTruthy());
    expect(screen.getByTestId('service-identity-state').textContent).toContain('Off');
    expect((screen.getByTestId('service-identity-enabled') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('service-identity-save') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('service-identity-accepts').textContent).toContain('datalake, twin');
    expect(screen.getByTestId('service-identity-own_verifier').textContent).toContain('connector-hub');
    expect(screen.getByTestId('service-identity-not_yet').textContent).toContain('voice-ui');
    expect(screen.getByTestId('service-identity-order').textContent).toContain('Turn this switch on first');
  });

  it('asks for a confirmation before turning it on and sends confirm: true only after it', async () => {
    let enabled = false;
    const spy = serve((init) => {
      if (init?.method === 'PUT') { enabled = true; return { status: 200, body: { success: true } }; }
      return { status: 200, body: enabled ? on : off };
    });
    render(<ServiceIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('service-identity-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('service-identity-enabled'));
    fireEvent.click(screen.getByTestId('service-identity-save'));
    expect(screen.getByText('Turn on the identity of the server?')).toBeTruthy();
    expect(puts(spy)).toHaveLength(0);
    fireEvent.click(screen.getByText('Turn on'));
    await waitFor(() => expect(screen.getByTestId('service-identity-state').textContent).toContain('On'));
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ auth: { serviceIdentity: { enabled: true, confirm: true } } });
  });

  it('turning it off needs no confirmation but warns that a service with its key on will refuse the server', async () => {
    let enabled = true;
    const spy = serve((init) => {
      if (init?.method === 'PUT') { enabled = false; return { status: 200, body: { success: true } }; }
      return { status: 200, body: enabled ? on : off };
    });
    render(<ServiceIdentityPanel />);
    await waitFor(() => expect((screen.getByTestId('service-identity-enabled') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByTestId('service-identity-enabled'));
    fireEvent.click(screen.getByTestId('service-identity-save'));
    await waitFor(() => expect(screen.getByTestId('service-identity-off-warning')).toBeTruthy());
    expect(screen.getByTestId('service-identity-off-warning').textContent).toContain('will refuse this server');
    expect(JSON.parse(String((puts(spy)[0][1] as RequestInit).body))).toEqual({ auth: { serviceIdentity: { enabled: false } } });
  });

  it('says so when the key cannot sign, and locks the switch when the environment sets it', async () => {
    serve(() => ({ status: 200, body: { ...on, key: 'unusable', state: 'idle_no_key', locked: true, source: 'env' } }));
    render(<ServiceIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('service-identity-state')).toBeTruthy());
    expect(screen.getByTestId('service-identity-state').textContent).toContain('JWT_SECRET');
    expect((screen.getByTestId('service-identity-enabled') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('service-identity-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the reason when the server refuses the change', async () => {
    serve((init) => (init?.method === 'PUT' ? { status: 409, body: { error: 'HYDRA_UMC_SERVICE_IDENTITY is set' } } : { status: 200, body: off }));
    render(<ServiceIdentityPanel />);
    await waitFor(() => expect(screen.getByTestId('service-identity-enabled')).toBeTruthy());
    fireEvent.click(screen.getByTestId('service-identity-enabled'));
    fireEvent.click(screen.getByTestId('service-identity-save'));
    fireEvent.click(screen.getByText('Turn on'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HYDRA_UMC_SERVICE_IDENTITY is set'));
  });

  it('shows nothing when the server has no such route', async () => {
    serve(() => ({ status: 404, body: {} }));
    const { container } = render(<ServiceIdentityPanel />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="service-identity-panel"]')).toBeNull();
  });
});
