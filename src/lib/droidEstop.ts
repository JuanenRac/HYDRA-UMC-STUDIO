// =============================================================================
// HYDRA-UMC STUDIO - src/lib/droidEstop.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The switch of the safety zones service that makes it read the emergency stop of the droids (`droidEstop.enabled`, OFF by default): a cut
// droid, a lost link or a silent bridge then keeps new starts from beginning in the cell, and never stops a machine that is running. It goes
// through the SERVER (GET and POST /api/droid-estop/settings), which carries the administrator's own token to the service; the service keeps
// the switch, checks who asked and may refuse (no state file, the broker link cannot start). A change in either direction carries
// `confirm: true`. The reading is defensive: a server without the route (404) or without the service configured (503, available false) is
// told apart from an account that may not use it (401/403).
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface DroidEstopSettings {
  /** Whether the safety zones service reads the droid emergency stop (off by default). */
  enabled: boolean;
  /** The link to the droid bridge is up. */
  running: boolean;
}

export type DroidEstopFailure = 'unsupported' | 'not_configured' | 'forbidden' | 'network' | 'http';
export type DroidEstopResult<T> = { ok: true; value: T } | { ok: false; failure: DroidEstopFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The settings in an answer of the route; null when the answer does not hold the switch as a boolean. */
export function parseDroidEstop(data: unknown): DroidEstopSettings | null {
  const r = object(data);
  if (typeof r.enabled !== 'boolean') return null;
  return { enabled: r.enabled, running: r.running === true };
}

/** The body of the change: both directions carry the confirmation. */
export const droidEstopBody = (enabled: boolean): { enabled: boolean; confirm: true } => ({ enabled, confirm: true });

/** Every change is confirmed on screen. */
export const droidEstopChangeNeedsConfirmation = (current: boolean, wanted: boolean): boolean => current !== wanted;

async function call(method: 'GET' | 'POST', body?: unknown): Promise<DroidEstopResult<DroidEstopSettings>> {
  try {
    const res = await authFetch(apiUrl('/api/droid-estop/settings'), method === 'GET' ? undefined : {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 503 && object(data).available === false) return { ok: false, failure: 'not_configured' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    if (!res.ok) return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
    const settings = parseDroidEstop(data);
    return settings ? { ok: true, value: settings } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const droidEstopApi = {
  read: () => call('GET'),
  write: (enabled: boolean) => call('POST', droidEstopBody(enabled)),
};
