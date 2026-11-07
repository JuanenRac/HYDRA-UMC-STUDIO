// =============================================================================
// HYDRA-UMC STUDIO - src/lib/detectionHef.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The switch of the loaded-model reports of the DETECTION-HEF service (the `detectionHef` block of GET/PUT /api/admin/server-config), OFF by
// default. The SERVER writes a settings file that the service re-reads while it runs; this screen only changes the switch. Turning it on
// carries `confirm: true`; turning it off never does. The reading is defensive: an answer without the block means a SERVER that predates it.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export type DetectionHefSource = 'env' | 'config' | 'default';
export interface DetectionHefState {
  acceptLoadedReports: { value: boolean; source: DetectionHefSource };
}
export type DetectionHefFailure = 'unsupported' | 'forbidden' | 'network' | 'http';
export type DetectionHefResult<T> = { ok: true; value: T } | { ok: false; failure: DetectionHefFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The `detectionHef` block of the answer; null when it does not have the shape (a SERVER that predates it). */
export function parseDetectionHef(data: unknown): DetectionHefState | null {
  const item = object(object(object(data).detectionHef).acceptLoadedReports);
  if (typeof item.value !== 'boolean' || (item.source !== 'env' && item.source !== 'config' && item.source !== 'default')) return null;
  return { acceptLoadedReports: { value: item.value, source: item.source } };
}

/** The body of the change. Turning the switch on carries `confirm: true`; turning it off never does. */
export function detectionHefBody(enabled: boolean): { detectionHef: { acceptLoadedReports: boolean; confirm?: true } } {
  return { detectionHef: enabled ? { acceptLoadedReports: true, confirm: true } : { acceptLoadedReports: false } };
}

/** Turning the switch on is the change that needs the operator's confirmation on screen. */
export const detectionHefNeedsConfirmation = (current: boolean, wanted: boolean): boolean => wanted && !current;

function failure(res: Response, data: unknown): DetectionHefResult<never> | null {
  if (res.status === 404) return { ok: false, failure: 'unsupported' };
  if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
  if (!res.ok) {
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
  }
  return null;
}

async function read(): Promise<DetectionHefResult<DetectionHefState>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/server-config'));
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    const state = parseDetectionHef(data);
    return state ? { ok: true, value: state } : { ok: false, failure: 'unsupported', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

async function write(enabled: boolean): Promise<DetectionHefResult<DetectionHefState>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(detectionHefBody(enabled)) });
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    return read();
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const detectionHefApi = { read, write };
