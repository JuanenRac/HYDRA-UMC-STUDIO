// =============================================================================
// HYDRA-UMC STUDIO - src/lib/notificationsView.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
// =============================================================================
// The state of the push notifications the server sends to registered phones (SERVER route GET /api/admin/push, administrators only):
// whether the service is on, whether its credentials are usable, how many phones are registered and which events it announces. It
// never carries the credentials or the device tokens. The switches themselves are read by the server from its security file, so this
// reading is all there is to show.
import { asCount, asObject, asText } from './panelApi';

export interface PushState {
  enabled: boolean;
  configured: boolean;
  /** Why the credentials are not usable, when they are not. */
  problem: string | null;
  devices: number;
  sandbox: boolean;
  /** Each event the server announces, with whether it is on. */
  events: Array<{ id: string; on: boolean }>;
}

export function parsePush(data: unknown): PushState {
  const body = asObject(data);
  const events = Object.entries(asObject(body.events))
    .filter(([, value]) => typeof value === 'boolean')
    .map(([id, value]) => ({ id, on: value === true }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { enabled: body.enabled === true, configured: body.configured === true, problem: asText(body.problem), devices: asCount(body.devices), sandbox: body.sandbox === true, events };
}

export type PushVerdict = 'off' | 'needs_credentials' | 'ready';

/** What the state means for a person: off, on but unable to send, or sending. */
export function pushVerdict(state: PushState): PushVerdict {
  if (!state.enabled) return 'off';
  return state.configured ? 'ready' : 'needs_credentials';
}

/** The events the server announces, as the keys of the texts that name them (an event this STUDIO does not know is shown by its own id). */
export const KNOWN_EVENTS = ['jobFinished', 'globalStop', 'operatorHeartbeatLost'] as const;
export const isKnownEvent = (id: string): id is (typeof KNOWN_EVENTS)[number] => (KNOWN_EVENTS as readonly string[]).includes(id);
