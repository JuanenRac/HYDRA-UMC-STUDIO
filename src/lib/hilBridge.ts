// =============================================================================
// HYDRA-UMC STUDIO - src/lib/hilBridge.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The one switch of the HIL bridge that STUDIO edits: whether a real command needs a pass verdict of the twin for its trajectory
// (`require_twin_pass`, OFF by default). It goes through the SERVER (GET and POST /api/hil-bridge/settings), which carries the
// administrator's own token to the bridge; the bridge keeps the switch, checks who asked and may refuse (locked on, no twin key or robot,
// no file to keep it). A change in either direction carries `confirm: true`. The reading is defensive: a server without the route (404) or
// without the bridge configured (503, available false) is told apart from an account that may not use it (401/403).
import { ServerHttpError, serverClient } from './serverClient';

export interface HilBridgeSettings {
  /** Whether a real command needs a pass verdict of the twin (off by default). */
  requireTwinPass: boolean;
  /** The bridge was started with the switch locked on: it cannot be turned off while it runs. */
  locked: boolean;
  /** The bridge keeps the value in a file across restarts. */
  persisted: boolean;
  /** The twin key and the robot are set, so the switch can be turned on. */
  ready: boolean;
  /** The bridge has the identity key of the server, so a change can be made from here. */
  canChange: boolean;
}

export type HilBridgeFailure = 'unsupported' | 'not_configured' | 'forbidden' | 'network' | 'http';
export type HilBridgeResult<T> = { ok: true; value: T } | { ok: false; failure: HilBridgeFailure; status?: number; reason?: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The settings in an answer of the route; null when the answer does not hold the switch as a boolean. */
export function parseHilBridge(data: unknown): HilBridgeSettings | null {
  const r = object(data);
  if (typeof r.requireTwinPass !== 'boolean') return null;
  return { requireTwinPass: r.requireTwinPass, locked: r.locked === true, persisted: r.persisted === true, ready: r.ready === true, canChange: r.canChange === true };
}

/** The body of the change: both directions carry the confirmation. */
export const hilBridgeBody = (require: boolean): { requireTwinPass: boolean; confirm: true } => ({ requireTwinPass: require, confirm: true });

/** Every change is confirmed on screen. */
export const hilBridgeChangeNeedsConfirmation = (current: boolean, wanted: boolean): boolean => current !== wanted;

/** Why the bridge would refuse the change in the state it reported (empty when it would accept it). */
export function hilBridgeBlockedReason(current: HilBridgeSettings, wanted: boolean): '' | 'locked' | 'not_ready' | 'no_identity' {
  if (wanted === current.requireTwinPass) return '';
  if (!current.canChange) return 'no_identity';
  if (!wanted && current.locked) return 'locked';
  if (wanted && !current.ready) return 'not_ready';
  return '';
}

async function call(run: () => Promise<unknown>): Promise<HilBridgeResult<HilBridgeSettings>> {
  try {
    // the typed client throws the refusal of the server with its status and the body it sent
    let data: unknown = {};
    let status = 200;
    try {
      data = (await run()) ?? {};
    } catch (error) {
      if (!(error instanceof ServerHttpError)) throw error;
      data = error.body ?? {};
      status = error.status;
    }
    if (status === 404) return { ok: false, failure: 'unsupported' };
    if (status === 503 && object(data).available === false) return { ok: false, failure: 'not_configured' };
    if (status === 401 || status === 403) return { ok: false, failure: 'forbidden', status };
    const reason = typeof object(data).error === 'string' ? (object(data).error as string).slice(0, 300) : undefined;
    if (status >= 300) return { ok: false, failure: 'http', status, ...(reason ? { reason } : {}) };
    const settings = parseHilBridge(data);
    return settings ? { ok: true, value: settings } : { ok: false, failure: 'http', status };
  } catch {
    return { ok: false, failure: 'network' };
  }
}

export const hilBridgeApi = {
  read: () => call(() => serverClient.getHilBridgeSettings()),
  write: (require: boolean) => call(() => serverClient.postHilBridgeSettings({ body: hilBridgeBody(require) })),
};
