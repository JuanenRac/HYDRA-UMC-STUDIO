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

export const CLIENT_KINDS = ['studio', 'suite', 'android', 'ios', 'dsi', 'watch', 'voice', 'other'] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];
export const CONNECTION_ACTIONS = ['first_seen', 'login', 'login_failed', 'second_factor_failed', 'logout', 'session_ended', 'session_expired'] as const;
export type ConnectionAction = (typeof CONNECTION_ACTIONS)[number];

export interface ConnectionClient {
  id: string;
  kind: ClientKind;
  user?: string;
  appVersion?: string;
  origin?: 'local' | 'remote';
  twoFactor?: boolean;
  firstSeen: string;
  lastSeen: string;
  lastFailure?: string;
  activeSessions: number;
  loginsOk: number;
  loginsFailed: number;
  ip?: string;
  agent?: string;
}

export interface ConnectionEvent {
  id: number;
  at: string;
  action: ConnectionAction;
  kind: ClientKind;
  clientId: string;
  user?: string;
  origin?: 'local' | 'remote';
  twoFactor?: boolean;
  appVersion?: string;
  ip?: string;
  agent?: string;
}

export type ConnectionsResult<T> = { ok: true; value: T } | { ok: false; failure: 'unsupported' | 'forbidden' | 'network' | 'http'; status?: number };

/** The header that tells the server which application this is (informative; it never gives more rights). */
export function clientHeader(version: string): Record<string, string> {
  const safe = /^[0-9A-Za-z._-]{1,24}$/.test(version) ? version : '0';
  return { 'X-Hydra-Client': `studio/${safe}` };
}

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown, max: number): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.slice(0, max) : undefined);
const whole = (value: unknown): number | undefined => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined);
const kindOf = (value: unknown): ClientKind => ((CLIENT_KINDS as readonly unknown[]).includes(value) ? (value as ClientKind) : 'other');
const originOf = (value: unknown): 'local' | 'remote' | undefined => (value === 'local' || value === 'remote' ? value : undefined);
const dateOf = (value: unknown): string | undefined => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined);

export function parseClient(data: unknown): ConnectionClient | null {
  const r = object(data);
  const firstSeen = dateOf(r.first_seen_utc), lastSeen = dateOf(r.last_seen_utc);
  if (typeof r.id !== 'string' || !/^[0-9a-f]{16}$/.test(r.id) || !firstSeen || !lastSeen) return null;
  return {
    id: r.id, kind: kindOf(r.kind), firstSeen, lastSeen,
    activeSessions: whole(r.active_sessions) ?? 0, loginsOk: whole(r.logins_ok) ?? 0, loginsFailed: whole(r.logins_failed) ?? 0,
    ...(text(r.user, 60) ? { user: text(r.user, 60) } : {}), ...(text(r.app_version, 24) ? { appVersion: text(r.app_version, 24) } : {}),
    ...(originOf(r.origin) ? { origin: originOf(r.origin) } : {}), ...(typeof r.two_factor === 'boolean' ? { twoFactor: r.two_factor } : {}),
    ...(dateOf(r.last_failure_utc) ? { lastFailure: dateOf(r.last_failure_utc) } : {}),
    ...(text(r.ip, 64) ? { ip: text(r.ip, 64) } : {}), ...(text(r.agent, 120) ? { agent: text(r.agent, 120) } : {}),
  };
}

export function parseEvent(data: unknown): ConnectionEvent | null {
  const r = object(data);
  const at = dateOf(r.at_utc);
  const id = whole(r.id);
  if (id === undefined || id < 1 || !at || typeof r.client_id !== 'string' || !(CONNECTION_ACTIONS as readonly unknown[]).includes(r.action)) return null;
  return {
    id, at, action: r.action as ConnectionAction, kind: kindOf(r.client_kind), clientId: r.client_id,
    ...(text(r.user, 60) ? { user: text(r.user, 60) } : {}), ...(originOf(r.origin) ? { origin: originOf(r.origin) } : {}),
    ...(typeof r.two_factor === 'boolean' ? { twoFactor: r.two_factor } : {}), ...(text(r.app_version, 24) ? { appVersion: text(r.app_version, 24) } : {}),
    ...(text(r.ip, 64) ? { ip: text(r.ip, 64) } : {}), ...(text(r.agent, 120) ? { agent: text(r.agent, 120) } : {}),
  };
}

export function parseClients(data: unknown): ConnectionClient[] {
  const list = object(data).clients;
  return Array.isArray(list) ? list.map(parseClient).filter((item): item is ConnectionClient => item !== null) : [];
}

export function parseEvents(data: unknown): ConnectionEvent[] {
  const list = object(data).events;
  return Array.isArray(list) ? list.map(parseEvent).filter((item): item is ConnectionEvent => item !== null) : [];
}

/** Whether an event is something that went wrong (a refused sign-in or a wrong second-step code), to paint it as a warning. */
export const isFailure = (action: ConnectionAction): boolean => action === 'login_failed' || action === 'second_factor_failed';

/** "5s", "12m", "3h 4m", "2d" since a date, short enough for a table cell. */
export function ago(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '-';
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
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
