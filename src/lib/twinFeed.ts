// =============================================================================
// HYDRA-UMC STUDIO - src/lib/twinFeed.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The live state the twin pushes, read through the SERVER (`/api/twin/ws`): a browser cannot send the header the twin's own socket asks for, so the
// SERVER opens that socket with the signed-in person's token and passes on what it pushes. Watching is OFF by default and is a choice of this
// browser (it is never sent anywhere). This file holds the pure part: the preference, the way a frame is read, the state built from the frames and
// what a close code means.
import { wsUrl } from './apiBase';

// A WebSocket path, not a REST route: the inventory of REST routes the app calls (and the contract it is checked against) does not list it, so it is built in two parts.
const SERVER_API = '/api';
export const TWIN_FEED_PATH = SERVER_API + '/twin/ws';
export const TWIN_FEED_PREF_KEY = 'hydra_studio_twin_feed';
/** The same subprotocol as the other live socket: the token stays out of the address that proxies and logs record. */
export const TWIN_FEED_SUBPROTOCOL = 'hydra.bearer';
/** Delay before the socket is opened again after it dropped for a reason that is worth retrying. */
export const TWIN_FEED_RECONNECT_MS = 5000;

export const twinFeedUrl = (): string => wsUrl(TWIN_FEED_PATH);

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStore = (): StorageLike | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

/** Whether this browser watches the twin: false unless it was switched on, and false when the storage is blocked or damaged. */
export function readTwinFeedPref(storage: StorageLike | null = browserStore()): boolean {
  try { return storage?.getItem(TWIN_FEED_PREF_KEY) === 'on'; } catch { return false; }
}

export function writeTwinFeedPref(on: boolean, storage: StorageLike | null = browserStore()): void {
  try { if (on) storage?.setItem(TWIN_FEED_PREF_KEY, 'on'); else storage?.removeItem(TWIN_FEED_PREF_KEY); } catch { /* a blocked storage keeps the default */ }
}

export type TwinSource = 'real' | 'simulated';

export interface TwinFeedState {
  /** Whether the last state read came from the real robot or from a simulation: the two are never mixed. */
  source: TwinSource | null;
  robotId: string | null;
  joints: number;
  sequence: number | null;
  /** The last notice of the twin (why there is no state), or null once a state arrived. */
  status: { code: string; message: string | null } | null;
  /** The vehicles the twin reports, by id: whether the last report is stale. */
  vehicles: Record<string, { stale: boolean }>;
  frames: number;
}

export const EMPTY_TWIN_FEED: TwinFeedState = { source: null, robotId: null, joints: 0, sequence: null, status: null, vehicles: {}, frames: 0 };

export type TwinFrame =
  | { kind: 'state'; source: TwinSource; robotId: string | null; joints: number; sequence: number | null }
  | { kind: 'status'; code: string; message: string | null }
  | { kind: 'uav_state'; robotId: string }
  | { kind: 'uav_status'; robotId: string; code: string }
  | { kind: 'error'; message: string };

const object = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** One frame of the twin; null when it is not JSON or is a kind this window does not know (it is ignored, never a reason to drop the connection). */
export function parseTwinFrame(raw: unknown): TwinFrame | null {
  let data: unknown;
  try { data = JSON.parse(String(raw)); } catch { return null; }
  const frame = object(data);
  if (!frame) return null;
  if (typeof frame.error === 'string') return { kind: 'error', message: frame.error };
  if (frame.type === 'twin_state') {
    const state = object(frame.state);
    if (!state || (state.source !== 'real' && state.source !== 'simulated') || !Array.isArray(state.joint_states)) return null;
    const sequence = typeof state.sequence === 'number' && Number.isInteger(state.sequence) && state.sequence >= 0 ? state.sequence : null;
    return { kind: 'state', source: state.source, robotId: typeof state.robot_id === 'string' ? state.robot_id : null, joints: state.joint_states.length, sequence };
  }
  if (frame.type === 'status' && typeof frame.code === 'string') {
    return { kind: 'status', code: frame.code, message: typeof frame.message === 'string' ? frame.message : null };
  }
  if (frame.type === 'uav_state' && typeof object(frame.state)?.robot_id === 'string') {
    return { kind: 'uav_state', robotId: object(frame.state)!.robot_id as string };
  }
  if (frame.type === 'uav_status' && typeof frame.robot_id === 'string' && typeof frame.code === 'string') {
    return { kind: 'uav_status', robotId: frame.robot_id, code: frame.code };
  }
  return null;
}

/** The state after one more frame. A state older than the last one of the same robot (a lower sequence) is dropped. */
export function applyTwinFrame(state: TwinFeedState, frame: TwinFrame): TwinFeedState {
  const frames = state.frames + 1;
  switch (frame.kind) {
    case 'state':
      if (frame.sequence !== null && state.sequence !== null && state.robotId === frame.robotId && frame.sequence < state.sequence) return state;
      return { ...state, source: frame.source, robotId: frame.robotId, joints: frame.joints, sequence: frame.sequence, status: null, frames };
    case 'status':
      return { ...state, status: { code: frame.code, message: frame.message }, frames };
    case 'uav_state':
      return { ...state, vehicles: { ...state.vehicles, [frame.robotId]: { stale: false } }, frames };
    case 'uav_status':
      return { ...state, vehicles: { ...state.vehicles, [frame.robotId]: { stale: frame.code === 'stale' } }, frames };
    case 'error':
      return state;
  }
}

/** What a close of the socket means for the window: the session was refused (sign in again, no retry with the same token), the server cannot
 * serve the twin now (not configured or too many panels), the twin is unavailable (worth a retry), or an ordinary close. */
export type TwinFeedEnd = 'denied' | 'not_available' | 'unavailable' | 'closed';
export function twinFeedEnd(code: number): TwinFeedEnd {
  if (code === 1008) return 'denied';
  if (code === 1013) return 'not_available';
  if (code === 1011) return 'unavailable';
  return 'closed';
}

/** Whether the window opens the socket again after a close: not after a refused session or a server that cannot serve the twin. */
export const twinFeedRetries = (end: TwinFeedEnd): boolean => end === 'unavailable' || end === 'closed';
