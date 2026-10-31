// =============================================================================
// HYDRA-UMC STUDIO - tests/connectionsApi.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The reading of the list of clients and the history of sign-ins that the server offers, and the header that names this app.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ago, clientHeader, connectionsApi, isFailure, parseClient, parseClients, parseEvent, parseEvents } from '../src/lib/connectionsApi';

const client = {
  schema_version: '1.0', id: '0123456789abcdef', kind: 'android', user: 'ana', app_version: '0.7.4', origin: 'local', two_factor: true,
  first_seen_utc: '2026-01-01T00:00:00.000Z', last_seen_utc: '2026-01-02T00:00:00.000Z', last_failure_utc: '2026-01-01T12:00:00.000Z',
  active_sessions: 2, logins_ok: 5, logins_failed: 1,
};
const event = { schema_version: '1.0', id: 7, at_utc: '2026-01-02T00:00:00.000Z', action: 'login_failed', client_kind: 'studio', client_id: '0123456789abcdef', user: 'ana', app_version: '0.8.1' };

afterEach(() => vi.unstubAllGlobals());

function answer(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as unknown as Response));
}

describe('reading the answers', () => {
  it('reads a client in the shape of the contract', () => {
    expect(parseClient(client)).toEqual({
      id: '0123456789abcdef', kind: 'android', user: 'ana', appVersion: '0.7.4', origin: 'local', twoFactor: true,
      firstSeen: client.first_seen_utc, lastSeen: client.last_seen_utc, lastFailure: client.last_failure_utc, activeSessions: 2, loginsOk: 5, loginsFailed: 1,
    });
  });

  it('turns a kind it does not know into other and refuses a client with a bad identifier or date', () => {
    expect(parseClient({ ...client, kind: 'toaster' })?.kind).toBe('other');
    expect(parseClient({ ...client, id: 'nope' })).toBeNull();
    expect(parseClient({ ...client, last_seen_utc: 'yesterday' })).toBeNull();
    expect(parseClient(null)).toBeNull();
  });

  it('reads an event and refuses an action it does not know', () => {
    expect(parseEvent(event)).toEqual({ id: 7, at: event.at_utc, action: 'login_failed', kind: 'studio', clientId: event.client_id, user: 'ana', appVersion: '0.8.1' });
    expect(parseEvent({ ...event, action: 'format_disk' })).toBeNull();
    expect(parseEvent({ ...event, id: 0 })).toBeNull();
  });

  it('keeps only what it can read from a list and survives a body that is not a list', () => {
    expect(parseClients({ clients: [client, { junk: true }] })).toHaveLength(1);
    expect(parseEvents({ events: [event, 5, null] })).toHaveLength(1);
    expect(parseClients({})).toEqual([]);
    expect(parseEvents('x')).toEqual([]);
  });

  it('keeps the address and agent only when they come', () => {
    expect(parseClient(client)?.ip).toBeUndefined();
    expect(parseClient({ ...client, ip: '192.168.0.9', agent: 'okhttp' })).toMatchObject({ ip: '192.168.0.9', agent: 'okhttp' });
  });
});

describe('small helpers', () => {
  it('writes how long ago in a short form', () => {
    const now = Date.parse('2026-01-02T00:00:00Z');
    expect(ago('2026-01-01T23:59:30Z', now)).toBe('30s');
    expect(ago('2026-01-01T23:48:00Z', now)).toBe('12m');
    expect(ago('2026-01-01T20:56:00Z', now)).toBe('3h 4m');
    expect(ago('2025-12-30T00:00:00Z', now)).toBe('3d');
    expect(ago('not a date', now)).toBe('-');
  });

  it('paints only refused sign-ins as failures', () => {
    expect(isFailure('login_failed')).toBe(true);
    expect(isFailure('second_factor_failed')).toBe(true);
    expect(isFailure('login')).toBe(false);
    expect(isFailure('session_expired')).toBe(false);
  });

  it('names this app in the header with a version the server accepts', () => {
    expect(clientHeader('0.7.3')).toEqual({ 'X-Hydra-Client': 'studio/0.7.3' });
    expect(clientHeader('a b/c')).toEqual({ 'X-Hydra-Client': 'studio/0' });
  });
});

describe('the calls', () => {
  it('returns the clients', async () => {
    answer(200, { clients: [client] });
    const result = await connectionsApi.clients();
    expect(result.ok && result.value[0].user).toBe('ana');
  });

  it('asks for a bounded number of events', async () => {
    answer(200, { events: [event] });
    await connectionsApi.events(100000);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('limit=500');
  });

  it('says so when the server does not offer the routes, refuses, fails or is unreachable', async () => {
    answer(404, {});
    expect(await connectionsApi.clients()).toEqual({ ok: false, failure: 'unsupported' });
    answer(403, {});
    expect(await connectionsApi.events()).toMatchObject({ ok: false, failure: 'forbidden' });
    answer(500, {});
    expect(await connectionsApi.clients()).toMatchObject({ ok: false, failure: 'http', status: 500 });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await connectionsApi.clients()).toEqual({ ok: false, failure: 'network' });
  });
});
