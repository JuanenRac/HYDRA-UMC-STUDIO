// =============================================================================
// HYDRA-UMC STUDIO - src/lib/connectorHubGate.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The one switch of the connector hub's decision gate that STUDIO edits: whether a caller on the hub's own machine is answered without a
// signed token (`allowLoopbackNoIdentity`, OFF by default). It goes through the SERVER (GET and POST /api/connector-hub/gate/settings),
// which carries the administrator's own token to the hub; the hub keeps the switch, writes it to its settings file and records who changed
// it. The reading is defensive: a server without the route (404) or without the gate configured (503, available false) is told apart from
// an account that may not use it (401/403), and the screen says so instead of breaking.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface GateSettings {
  /** Whether a caller on the hub's machine is answered without a token. */
  allowLoopbackNoIdentity: boolean;
  /** Whether the hub listens on a loopback address, the only place the switch may be on. */
  loopbackSwitchAllowed: boolean;
  /** Whether something verifies tokens in the hub (without it the switch could not be turned off). */
  verifiesTokens: boolean;
  /** Whether the hub has a settings file to keep the change across restarts. */
  persisted: boolean;
}

export type GateFailure = 'unsupported' | 'not_configured' | 'forbidden' | 'network' | 'http';
export type GateResult<T> = { ok: true; value: T } | { ok: false; failure: GateFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The settings in an answer of the route; null when the answer does not hold the switch as a boolean. */
export function parseGateSettings(data: unknown): GateSettings | null {
  const r = object(data);
  if (typeof r.allowLoopbackNoIdentity !== 'boolean') return null;
  return {
    allowLoopbackNoIdentity: r.allowLoopbackNoIdentity,
    loopbackSwitchAllowed: r.loopbackSwitchAllowed === true,
    verifiesTokens: r.verifiesTokens === true,
    persisted: r.persisted === true,
  };
}

/** The body of the change. Turning the switch on carries `confirm: true`; turning it off never does. */
export function gateSettingsBody(allow: boolean): { allowLoopbackNoIdentity: boolean; confirm?: true } {
  return allow ? { allowLoopbackNoIdentity: true, confirm: true } : { allowLoopbackNoIdentity: false };
}

/** Turning the switch on is the change that needs the operator's explicit confirmation on screen. */
export const gateChangeNeedsConfirmation = (current: boolean, wanted: boolean): boolean => wanted && !current;

/** Whether the switch may be set to the wanted value in the state the hub reported (the hub refuses the others as well). */
export function gateChangeAllowed(current: GateSettings, wanted: boolean): boolean {
  if (wanted === current.allowLoopbackNoIdentity) return true;
  return wanted ? current.loopbackSwitchAllowed : current.verifiesTokens;
}

async function call(method: 'GET' | 'POST', body?: unknown): Promise<GateResult<GateSettings>> {
  try {
    const res = await authFetch(apiUrl('/api/connector-hub/gate/settings'), method === 'GET' ? undefined : {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 503 && object(data).available === false) return { ok: false, failure: 'not_configured' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    if (!res.ok) return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
    const settings = parseGateSettings(data);
    return settings ? { ok: true, value: settings } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const connectorHubGateApi = {
  read: () => call('GET'),
  write: (allow: boolean) => call('POST', gateSettingsBody(allow)),
};
