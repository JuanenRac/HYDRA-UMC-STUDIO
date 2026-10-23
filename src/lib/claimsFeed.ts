// =============================================================================
// HYDRA-UMC STUDIO - the live list of reservations: claimsFeed.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The server pushes a `claims` message on the WebSocket (to the connections that asked for remoteApiVersion=2) when a
// reservation or an arming changes, with the same list as GET /api/claims. This is where the connection puts it and
// where the access bar reads it, so the bar need not wait for its next poll. A tiny external store: no React here.
// =============================================================================
import { parseClaims, type ClaimEntry } from './claims';

type Listener = () => void;

let current: ClaimEntry[] | null = null;
let receivedAt = 0;
const listeners = new Set<Listener>();

/** Reads a WebSocket message; true when it was a `claims` message (and the list was published). */
export function publishClaimsEvent(message: unknown): boolean {
  if (!message || typeof message !== 'object' || (message as Record<string, unknown>).type !== 'claims') return false;
  current = parseClaims(message);
  receivedAt = Date.now();
  listeners.forEach((listener) => listener());
  return true;
}

export function subscribeClaims(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The last list the server pushed; null before the first one. The same array until the next push. */
export function claimsSnapshot(): ClaimEntry[] | null {
  return current;
}

/** When the last list was pushed (milliseconds since the epoch), 0 before the first one. */
export function lastClaimsEventAt(): number {
  return receivedAt;
}

/** For tests and for a logout: forget what was pushed. */
export function resetClaimsFeed(): void {
  current = null;
  receivedAt = 0;
  listeners.forEach((listener) => listener());
}
