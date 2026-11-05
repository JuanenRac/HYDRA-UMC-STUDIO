// =============================================================================
// HYDRA-UMC STUDIO - src/lib/plannerIdentity.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The one switch of the semantic planner that STUDIO edits: whether the approval of a plan needs the person who is signed in
// (`plan_approval.require_identity`, ON by default). It goes through the SERVER (GET and POST /api/semantic-planner/settings), which
// carries the administrator's own token to the planner; the planner keeps the switch, writes it to its configuration file and prints who
// changed it. The reading is defensive: a server without the route (404) or without the planner configured (503, available false) is told
// apart from an account that may not use it (401/403), and the screen says so instead of breaking.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface PlannerIdentitySettings {
  /** Whether the approval of a plan needs the person who is signed in (the default). */
  requireIdentity: boolean;
  /** Whether the planner has the identity key (without it nothing can be changed). */
  verifiesTokens: boolean;
  /** Whether the planner has a configuration file to keep the change across restarts. */
  persisted: boolean;
}

export type PlannerFailure = 'unsupported' | 'not_configured' | 'forbidden' | 'network' | 'http';
export type PlannerResult<T> = { ok: true; value: T } | { ok: false; failure: PlannerFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The settings in an answer of the route; null when the answer does not hold the switch as a boolean. */
export function parsePlannerIdentity(data: unknown): PlannerIdentitySettings | null {
  const r = object(data);
  if (typeof r.requireIdentity !== 'boolean') return null;
  return { requireIdentity: r.requireIdentity, verifiesTokens: r.verifiesTokens === true, persisted: r.persisted === true };
}

/** The body of the change. Relaxing the switch (false) carries `confirm: true`; tightening it never does. */
export function plannerIdentityBody(require: boolean): { requireIdentity: boolean; confirm?: true } {
  return require ? { requireIdentity: true } : { requireIdentity: false, confirm: true };
}

/** Relaxing the switch is the change that needs the operator's explicit confirmation on screen. */
export const plannerChangeNeedsConfirmation = (current: boolean, wanted: boolean): boolean => current && !wanted;

/** Whether the switch may be changed in the state the planner reported (without the identity key the planner refuses any change). */
export const plannerChangeAllowed = (current: PlannerIdentitySettings, wanted: boolean): boolean => wanted === current.requireIdentity || current.verifiesTokens;

async function call(method: 'GET' | 'POST', body?: unknown): Promise<PlannerResult<PlannerIdentitySettings>> {
  try {
    const res = await authFetch(apiUrl('/api/semantic-planner/settings'), method === 'GET' ? undefined : {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 503 && object(data).available === false) return { ok: false, failure: 'not_configured' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    if (!res.ok) return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
    const settings = parsePlannerIdentity(data);
    return settings ? { ok: true, value: settings } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const plannerIdentityApi = {
  read: () => call('GET'),
  write: (require: boolean) => call('POST', plannerIdentityBody(require)),
};
