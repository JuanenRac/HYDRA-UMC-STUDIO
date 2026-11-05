// =============================================================================
// HYDRA-UMC STUDIO - src/lib/serviceIdentity.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The identity the SERVER presents to the services it calls (GET /api/admin/service-identity, and the switch `auth.serviceIdentity.enabled`
// of PUT /api/admin/server-config, OFF by default). Giving each service the key to verify that token is done by the operator of the machine
// (provisioning/service_identity.py of HYDRA-UMC-OS, as root); this screen only shows the state and changes the switch of the SERVER. The
// reading is defensive: a server without the route (404) and an account that may not use it (401/403) are told apart from a failure.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export type IdentitySupport = 'accepts' | 'own_verifier' | 'not_yet';
export type IdentityState = 'presenting' | 'idle_no_key' | 'off';
export type IdentityStep = 'server_first' | 'then_one_by_one' | 'enable_in_root' | 'restart_unit' | 'check_status';

export interface ServiceIdentityStatus {
  enabled: boolean;
  source: 'env' | 'config' | 'default';
  /** True when the switch comes from the environment of the server and cannot be changed here. */
  locked: boolean;
  key: 'usable' | 'unusable';
  state: IdentityState;
  services: { name: string; support: IdentitySupport }[];
  order: IdentityStep[];
}

export type IdentityFailure = 'unsupported' | 'forbidden' | 'network' | 'http';
export type IdentityResult<T> = { ok: true; value: T } | { ok: false; failure: IdentityFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const SOURCES = ['env', 'config', 'default'];
const STATES = ['presenting', 'idle_no_key', 'off'];
const SUPPORTS = ['accepts', 'own_verifier', 'not_yet'];
const STEPS = ['server_first', 'then_one_by_one', 'enable_in_root', 'restart_unit', 'check_status'];

/** The status in an answer of the route; null when the answer does not have the shape (an unknown support or step is dropped, never guessed). */
export function parseServiceIdentity(data: unknown): ServiceIdentityStatus | null {
  const r = object(data);
  if (typeof r.enabled !== 'boolean' || typeof r.source !== 'string' || !SOURCES.includes(r.source) || typeof r.state !== 'string' || !STATES.includes(r.state)) return null;
  const services = (Array.isArray(r.services) ? r.services : [])
    .map(object)
    .filter((s): s is { name: string; support: IdentitySupport } => typeof s.name === 'string' && s.name !== '' && typeof s.support === 'string' && SUPPORTS.includes(s.support));
  const order = (Array.isArray(r.order) ? r.order : []).filter((s): s is IdentityStep => typeof s === 'string' && STEPS.includes(s));
  return {
    enabled: r.enabled,
    source: r.source as ServiceIdentityStatus['source'],
    locked: r.locked === true,
    key: r.key === 'usable' ? 'usable' : 'unusable',
    state: r.state as IdentityState,
    services: services.map((s) => ({ name: s.name, support: s.support })),
    order,
  };
}

/** The body of the change. Turning the switch on carries `confirm: true`; turning it off never does. */
export function serviceIdentityBody(enabled: boolean): { auth: { serviceIdentity: { enabled: boolean; confirm?: true } } } {
  return { auth: { serviceIdentity: enabled ? { enabled: true, confirm: true } : { enabled: false } } };
}

/** Turning the switch on is the change that needs the operator's explicit confirmation on screen. */
export const serviceIdentityNeedsConfirmation = (current: boolean, wanted: boolean): boolean => wanted && !current;

/** The services of a support level, in the order the server listed them. */
export const servicesBySupport = (status: ServiceIdentityStatus, support: IdentitySupport): string[] => status.services.filter((s) => s.support === support).map((s) => s.name);

function failure(res: Response, data: unknown): IdentityResult<never> | null {
  if (res.status === 404) return { ok: false, failure: 'unsupported' };
  if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
  if (!res.ok) {
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
  }
  return null;
}

async function read(): Promise<IdentityResult<ServiceIdentityStatus>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/service-identity'));
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    const status = parseServiceIdentity(data);
    return status ? { ok: true, value: status } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

async function write(enabled: boolean): Promise<IdentityResult<ServiceIdentityStatus>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serviceIdentityBody(enabled)) });
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    return read();
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const serviceIdentityApi = { read, write };
