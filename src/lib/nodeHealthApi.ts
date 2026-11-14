// =============================================================================
// HYDRA-UMC STUDIO - src/lib/nodeHealthApi.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The last health frame that the kinematic brain heard from each controller board (SERVER route GET /api/ecosystem/node-health?slot=N), read defensively: a server that
// predates the route, or one where an administrator did not turn it on, answers 404 and the panel stays out of the way. Read only.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const NODE_HEALTH_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
export const NODE_HEALTH_FLAGS = ['estop_latched', 'bus_off_seen', 'watchdog_reset_at_start', 'setup_failed_at_start', 'application_confirmed', 'drivers_enabled', 'setup_failed_safe_state'] as const;

export interface NodeHealth {
  online: boolean;
  slot: number;
  heard: boolean | null;
  ageMs: number | null;
  sequence: number | null;
  flagNames: string[];
  txErrors: number | null;
  rxErrors: number | null;
  stalls: number | null;
  uptimeS: number | null;
}

export type NodeHealthResult = { ok: true; value: NodeHealth } | { ok: false; failure: 'unsupported' | 'forbidden' | 'http' | 'malformed' | 'network'; status?: number };

const isInt = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** The answer of the server for `slot` in the shape the panel uses, or null when it is not a health answer of that slot. */
export function parseNodeHealth(raw: unknown, slot: number): NodeHealth | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  if (body.slot !== slot || typeof body.online !== 'boolean') return null;
  const empty: NodeHealth = { online: body.online, slot, heard: null, ageMs: null, sequence: null, flagNames: [], txErrors: null, rxErrors: null, stalls: null, uptimeS: null };
  if (!body.online) return empty;
  if (body.heard === false) return { ...empty, heard: false };
  if (body.heard !== true) return null;
  const names = Array.isArray(body.flagNames) && body.flagNames.length <= 16 && body.flagNames.every(name => typeof name === 'string' && name.length <= 64) ? (body.flagNames as string[]) : null;
  if (!isInt(body.ageMs, 0, 25400) || !isInt(body.sequence, 0, 255) || names === null || !isInt(body.txErrors, 0, 255) || !isInt(body.rxErrors, 0, 255) || !isInt(body.stalls, 0, 255) || !isInt(body.uptimeS, 0, 4080)) return null;
  return { ...empty, heard: true, ageMs: body.ageMs, sequence: body.sequence, flagNames: [...names], txErrors: body.txErrors, rxErrors: body.rxErrors, stalls: body.stalls, uptimeS: body.uptimeS };
}

export type SlotState = 'heard' | 'never' | 'silent';

/** What the panel says about a slot: a frame was heard, none ever was, or the brain did not answer. */
export function slotState(health: NodeHealth): SlotState {
  if (!health.online) return 'silent';
  return health.heard ? 'heard' : 'never';
}

export async function loadNodeHealth(slot: number): Promise<NodeHealthResult> {
  try {
    const res = await authFetch(apiUrl(`/api/ecosystem/node-health?slot=${slot}`));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status };
    const value = parseNodeHealth(await res.json().catch(() => null), slot);
    return value ? { ok: true, value } : { ok: false, failure: 'malformed' };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

/** The eight slots, one request each. */
export async function loadAllNodeHealth(): Promise<NodeHealthResult[]> {
  return Promise.all(NODE_HEALTH_SLOTS.map(slot => loadNodeHealth(slot)));
}

/** True unless the server offers the panel: the route is off, the account may not read it, the answers cannot be trusted or the network is down. A server that answers 5xx (the bridge is silent) still shows it, with "no reading". */
export function panelIsHidden(results: NodeHealthResult[]): boolean {
  return !results.some(result => result.ok || result.failure === 'http');
}
