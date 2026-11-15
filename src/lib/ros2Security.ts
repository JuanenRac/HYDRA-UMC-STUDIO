// =============================================================================
// HYDRA-UMC STUDIO - src/lib/ros2Security.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The requirement of ROS 2 security (SROS2) of the ROS 2 bridge (`security.require_sros2`, OFF by default, so a machine without a keystore keeps starting).
// The bridge keeps it in its own configuration file and applies a change only when it restarts. It goes through the SERVER (GET and POST
// /api/ros2-bridge/settings), which carries the administrator's own token to the bridge; the bridge checks who asked and may refuse (started without
// allowing the change). A change in either direction carries `confirm: true`. When the server has no connection to the bridge the screen falls back to
// preparing the lines to add to the file of the bridge by hand; nothing is sent in that case.
import { apiUrl } from './apiBase';
import { authFetch } from './session';

export interface Ros2SecuritySettings {
  /** The value in the configuration file of the bridge (what applies at its next start). */
  requireSros2: boolean;
  /** The value the running bridge started with. */
  active: boolean;
  /** The file and the running bridge differ: the change applies when the bridge restarts. */
  restartNeeded: boolean;
  /** The bridge was started allowing the change. */
  canChange: boolean;
  /** The three ROS 2 security variables are set in the environment of the bridge. */
  environmentReady: boolean;
}

export type Ros2SecurityFailure = 'unsupported' | 'not_configured' | 'unreachable' | 'forbidden' | 'network' | 'http';
export type Ros2SecurityResult<T> = { ok: true; value: T } | { ok: false; failure: Ros2SecurityFailure; status?: number; reason?: string };

/** What the bridge checks in its environment when the requirement is on (ROS 2 itself reads these variables). */
export const SROS2_ENVIRONMENT: readonly string[] = [
  'ROS_SECURITY_ENABLE=true',
  'ROS_SECURITY_STRATEGY=Enforce',
  'ROS_SECURITY_KEYSTORE=<directory that holds "enclaves">',
];

export interface Sros2Preparation {
  /** The section to put in the configuration file of the bridge. */
  config: string;
  /** The environment the bridge refuses to start without. */
  environment: readonly string[];
}

/** The lines to add for the wanted value; `null` for the default (off), where there is nothing to add. */
export function sros2Preparation(required: boolean): Sros2Preparation | null {
  if (!required) return null;
  return { config: JSON.stringify({ security: { require_sros2: true } }, null, 2), environment: SROS2_ENVIRONMENT };
}

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The settings in an answer of the route; null when the answer does not hold the requirement as a boolean. */
export function parseRos2Security(data: unknown): Ros2SecuritySettings | null {
  const r = object(data);
  if (typeof r.requireSros2 !== 'boolean') return null;
  return {
    requireSros2: r.requireSros2,
    active: r.active === true,
    restartNeeded: r.restartNeeded === true,
    canChange: r.canChange === true,
    environmentReady: r.environmentReady === true,
  };
}

/** The body of the change: both directions carry the confirmation. */
export const ros2SecurityBody = (require: boolean): { requireSros2: boolean; confirm: true } => ({ requireSros2: require, confirm: true });

/** Every change is confirmed on screen. */
export const ros2SecurityChangeNeedsConfirmation = (current: boolean, wanted: boolean): boolean => current !== wanted;

/** Why the bridge would refuse the change in the state it reported (empty when it would accept it). */
export function ros2SecurityBlockedReason(current: Ros2SecuritySettings, wanted: boolean): '' | 'blocked_no_change' {
  if (wanted === current.requireSros2) return '';
  return current.canChange ? '' : 'blocked_no_change';
}

const reasonOf = (data: unknown): string | undefined => {
  const error = object(data).error;
  return typeof error === 'string' ? error.slice(0, 300) : undefined;
};

async function call(method: 'GET' | 'POST', body?: unknown): Promise<Ros2SecurityResult<Ros2SecuritySettings>> {
  try {
    const res = await authFetch(apiUrl('/api/ros2-bridge/settings'), method === 'GET' ? undefined : {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const reason = reasonOf(data);
    if (res.status === 404) return { ok: false, failure: 'unsupported' };
    if (res.status === 503) return { ok: false, failure: object(data).available === false ? 'not_configured' : 'unreachable' };
    if (res.status === 401 || res.status === 403) return { ok: false, failure: 'forbidden', status: res.status, ...(reason ? { reason } : {}) };
    if (!res.ok) return { ok: false, failure: 'http', status: res.status, ...(reason ? { reason } : {}) };
    const settings = parseRos2Security(data);
    return settings ? { ok: true, value: settings } : { ok: false, failure: 'http', status: res.status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const ros2SecurityApi = {
  read: () => call('GET'),
  write: (require: boolean) => call('POST', ros2SecurityBody(require)),
};
