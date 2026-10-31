// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/connectionHistory.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The simple view of who has connected to the server, as rendered: the clients with their open sessions and refused sign-ins,
// the latest events, and the plain message when the server does not offer the history.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../src/i18n';
import { ConnectionHistory } from '../src/components/ConnectionHistory';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const client = {
  schema_version: '1.0', id: '0123456789abcdef', kind: 'android', user: 'ana', app_version: '0.7.4', origin: 'local',
  first_seen_utc: '2026-01-01T00:00:00.000Z', last_seen_utc: '2026-01-02T00:00:00.000Z', active_sessions: 2, logins_ok: 5, logins_failed: 1,
};
const events = [
  { schema_version: '1.0', id: 2, at_utc: '2026-01-02T00:00:00.000Z', action: 'login_failed', client_kind: 'android', client_id: '0123456789abcdef', user: 'ana' },
  { schema_version: '1.0', id: 1, at_utc: '2026-01-01T00:00:00.000Z', action: 'login', client_kind: 'android', client_id: '0123456789abcdef', user: 'ana' },
];

function serve(routes: Record<string, { status: number; body: unknown }>): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = Object.entries(routes).find(([route]) => url.includes(route));
    const reply = hit ? hit[1] : { status: 404, body: {} };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as unknown as Response;
  }));
}

describe('ConnectionHistory', () => {
  it('shows each client with its open sessions and each event with what happened', async () => {
    serve({ '/api/connections/clients': { status: 200, body: { clients: [client] } }, '/api/connections/events': { status: 200, body: { events } } });
    render(<ConnectionHistory />);
    await waitFor(() => expect(screen.getAllByTestId('connection-client')).toHaveLength(1));
    const card = screen.getByTestId('connection-client');
    expect(card.textContent).toContain('ana');
    expect(card.textContent).toContain('Android 0.7.4');
    expect(card.textContent).toContain('Open sessions: 2');
    expect(card.textContent).toContain('5 ok, 1 refused');
    const rows = screen.getAllByTestId('connection-event');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Sign-in refused');
    expect(rows[1].textContent).toContain('Signed in');
  });

  it('never shows an address that the server did not send', async () => {
    serve({ '/api/connections/clients': { status: 200, body: { clients: [client] } }, '/api/connections/events': { status: 200, body: { events: [] } } });
    render(<ConnectionHistory />);
    await waitFor(() => expect(screen.getAllByTestId('connection-client')).toHaveLength(1));
    expect(screen.getByTestId('connection-client').textContent).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    expect(screen.getByText('Nothing has happened yet.')).toBeTruthy();
  });

  it('says plainly when the server does not offer the history', async () => {
    serve({});
    render(<ConnectionHistory />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('This server does not offer the connection history yet.'));
  });
});
