// =============================================================================
// HYDRA-UMC STUDIO - the one stop state: stopStateFeed.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The server pushes a `stop-state` message on the WebSocket (to the connections that asked for remoteApiVersion=2) when the physical emergency stop or the
// global stop changes, and once right after the connection opens. This is where the connection puts it and where the badge of the header reads it. The
// physical stop is the frame on identifier 0x001 as the kinematic brain holds it; `unknown` means the server does not watch it (the default) or could not
// read it, and is never shown as released. A tiny external store: no React here.
// =============================================================================

export type StopStateName = 'STOPPED' | 'READY' | 'UNKNOWN';
export type PhysicalStop = 'latched' | 'ready' | 'unknown';
export type SoftwareStop = 'stopped' | 'ready';

export interface StopStateSnapshot {
  state: StopStateName;
  physical: PhysicalStop;
  software: SoftwareStop;
  physicalLinkOk: boolean | null;
  changedAt: number;
}

type Listener = () => void;

let current: StopStateSnapshot | null = null;
const listeners = new Set<Listener>();

const STATES: readonly string[] = ['STOPPED', 'READY', 'UNKNOWN'];
const PHYSICALS: readonly string[] = ['latched', 'ready', 'unknown'];
const SOFTWARES: readonly string[] = ['stopped', 'ready'];

/** The snapshot of a `stop-state` message, or null for anything that is not a complete one: a damaged message is ignored, never half-applied. */
export function parseStopState(message: unknown): StopStateSnapshot | null {
  if (!message || typeof message !== 'object') return null;
  const body = message as Record<string, unknown>;
  if (body.type !== 'stop-state') return null;
  const state = body.state;
  if (!state || typeof state !== 'object') return null;
  const s = state as Record<string, unknown>;
  if (typeof s.state !== 'string' || !STATES.includes(s.state)) return null;
  if (typeof s.physical !== 'string' || !PHYSICALS.includes(s.physical)) return null;
  if (typeof s.software !== 'string' || !SOFTWARES.includes(s.software)) return null;
  return {
    state: s.state as StopStateName,
    physical: s.physical as PhysicalStop,
    software: s.software as SoftwareStop,
    physicalLinkOk: typeof s.physicalLinkOk === 'boolean' ? s.physicalLinkOk : null,
    changedAt: typeof s.changedAt === 'number' && Number.isFinite(s.changedAt) ? s.changedAt : 0,
  };
}

/** Reads a WebSocket message; true when it was a complete `stop-state` message (and the state was published). */
export function publishStopStateEvent(message: unknown): boolean {
  const parsed = parseStopState(message);
  if (!parsed) return false;
  current = parsed;
  listeners.forEach((listener) => listener());
  return true;
}

export function subscribeStopState(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The last state the server pushed; null before the first one. The same object until the next push. */
export function stopStateSnapshot(): StopStateSnapshot | null {
  return current;
}

/** For tests and for a logout: forget what was pushed. */
export function resetStopStateFeed(): void {
  current = null;
  listeners.forEach((listener) => listener());
}
