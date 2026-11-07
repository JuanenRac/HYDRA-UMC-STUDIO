// =============================================================================
// HYDRA-UMC STUDIO - src/lib/liveActivity.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The Live Activity of a robot on the lock screen of an iPhone (the `push.liveActivity` block of GET/PUT /api/admin/server-config). It is OFF by default, and
// the level is what the card may show: only the state of the robot (the default), the state and the progress, or everything of the panel. `full` is the most there
// is; the SERVER applies the level before anything leaves it. Turning the card on or raising the level shows more to whoever holds the phone, so the request
// carries `confirm: true` then; turning it off or lowering the level never does. The reading is defensive: an answer without the block is a SERVER that predates it.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export const LIVE_LEVELS = ['status', 'progress', 'full'] as const;
export type LiveLevel = (typeof LIVE_LEVELS)[number];
export type LiveSource = 'env' | 'config' | 'default';

export interface LiveActivityState {
  enabled: { value: boolean; source: LiveSource };
  level: { value: LiveLevel; source: LiveSource };
  /** The most the SERVER will ever show on a lock screen. */
  maxLevel: LiveLevel;
  /** Whether push itself is on: the card needs it. */
  pushOn: boolean;
}
export interface LiveActivityChange { enabled?: boolean; level?: LiveLevel }

export type LiveFailure = 'unsupported' | 'forbidden' | 'network' | 'http';
export type LiveResult<T> = { ok: true; value: T } | { ok: false; failure: LiveFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
export const isLiveLevel = (value: unknown): value is LiveLevel => typeof value === 'string' && (LIVE_LEVELS as readonly string[]).includes(value);
const isSource = (value: unknown): value is LiveSource => value === 'env' || value === 'config' || value === 'default';
export const liveRank = (level: LiveLevel): number => LIVE_LEVELS.indexOf(level);

/** The block in the answer; null when it does not have the shape (a SERVER that predates it). */
export function parseLiveActivity(data: unknown): LiveActivityState | null {
  const push = object(object(data).push);
  const live = object(push.liveActivity);
  const enabled = object(live.enabled);
  const level = object(live.level);
  if (typeof enabled.value !== 'boolean' || !isSource(enabled.source) || !isLiveLevel(level.value) || !isSource(level.source)) return null;
  const pushEnabled = object(push.enabled);
  return {
    enabled: { value: enabled.value, source: enabled.source },
    level: { value: level.value, source: level.source },
    maxLevel: isLiveLevel(live.maxLevel) ? live.maxLevel : 'full',
    pushOn: pushEnabled.value === true,
  };
}

/** The levels a person may pick: none above the most the SERVER allows. */
export const allowedLevels = (state: LiveActivityState): LiveLevel[] => LIVE_LEVELS.filter(level => liveRank(level) <= liveRank(state.maxLevel));

/** Turning the card on, or choosing a level above the saved one, is what shows more on a lock screen and needs the confirmation. */
export function liveNeedsConfirmation(current: LiveActivityState, change: LiveActivityChange): boolean {
  if (change.enabled === true && !current.enabled.value) return true;
  return change.level !== undefined && liveRank(change.level) > liveRank(current.level.value);
}

/** The body of the change: only what changes, and `confirm: true` exactly when the change needs it. */
export function liveBody(current: LiveActivityState, change: LiveActivityChange): { push: { liveActivity: { enabled?: boolean; level?: LiveLevel; confirm?: true } } } {
  const liveActivity: { enabled?: boolean; level?: LiveLevel; confirm?: true } = {};
  if (change.enabled !== undefined && change.enabled !== current.enabled.value) liveActivity.enabled = change.enabled;
  if (change.level !== undefined && change.level !== current.level.value) liveActivity.level = change.level;
  if (liveNeedsConfirmation(current, change)) liveActivity.confirm = true;
  return { push: { liveActivity } };
}

/** What differs from the saved state, never touching a value that the environment fixes. */
export function liveChange(current: LiveActivityState, wanted: { enabled: boolean; level: LiveLevel }): LiveActivityChange {
  const change: LiveActivityChange = {};
  if (current.enabled.source !== 'env' && wanted.enabled !== current.enabled.value) change.enabled = wanted.enabled;
  if (current.level.source !== 'env' && wanted.level !== current.level.value && liveRank(wanted.level) <= liveRank(current.maxLevel)) change.level = wanted.level;
  return change;
}

function failure(res: Response, data: unknown): LiveResult<never> | null {
  if (res.status === 404) return { ok: false, failure: 'unsupported' };
  if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status };
  if (!res.ok) {
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
  }
  return null;
}

async function read(): Promise<LiveResult<LiveActivityState>> {
  try {
    const res = await authFetch(apiUrl('/api/admin/server-config'));
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    const state = parseLiveActivity(data);
    return state ? { ok: true, value: state } : { ok: false, failure: 'unsupported', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

async function write(current: LiveActivityState, change: LiveActivityChange): Promise<LiveResult<LiveActivityState>> {
  try {
    const body = liveBody(current, change);
    if (Object.keys(body.push.liveActivity).length === 0) return { ok: true, value: current };
    const res = await authFetch(apiUrl('/api/admin/server-config'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    const bad = failure(res, data);
    if (bad) return bad;
    return read();
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const liveActivityApi = { read, write };
