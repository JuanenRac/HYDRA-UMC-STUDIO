// =============================================================================
// HYDRA-UMC STUDIO - src/lib/connectionsApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The list of clients that connect to the server and the history of their sign-ins (SERVER routes
// GET /api/connections/clients and /api/connections/events), read defensively: a server that predates the routes answers 404 and the
// screen says so instead of breaking. The answers hold no password, token or cookie; the address and user agent only come for an
// administrator and only when the server was told to keep them.
import { apiUrl } from './apiBase';
import { authFetch } from './session';
import {
  CLIENT_KINDS,
  CONNECTION_ACTIONS,
  ago,
  clientHeader as kitClientHeader,
  isFailure,
  parseClient,
  parseClients,
  parseEvent,
  parseEvents,
  type ClientKind,
  type ConnectionAction,
  type ConnectionClient,
  type ConnectionEvent,
  type ConnectionsResult,
} from 'hydra-umc-studio-kit';

// The shapes, the reading of the answers and the small helpers are the ones of the shared kit.
export { CLIENT_KINDS, CONNECTION_ACTIONS, ago, isFailure, parseClient, parseClients, parseEvent, parseEvents };
export type { ClientKind, ConnectionAction, ConnectionClient, ConnectionEvent, ConnectionsResult };

/** The header that tells the server which application this is (informative; it never gives more rights). */
export function clientHeader(version: string): Record<string, string> {
  return kitClientHeader('studio', version);
}

async function load<T>(route: string, parse: (data: unknown) => T): Promise<ConnectionsResult<T>> {
  try {
    const res = await authFetch(apiUrl(route));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status };
    return { ok: true, value: parse(await res.json().catch(() => ({}))) };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const connectionsApi = {
  clients: () => load('/api/connections/clients', parseClients),
  events: (limit = 50) => load(`/api/connections/events?limit=${Math.min(Math.max(Math.trunc(limit), 1), 500)}`, parseEvents),
};
