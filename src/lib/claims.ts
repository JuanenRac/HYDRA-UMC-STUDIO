// =============================================================================
// HYDRA-UMC STUDIO - reservations of robots: claims.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Reading of GET /api/claims and of the refusals the server gives when a robot is held by someone else. Pure, so
// it is tested without a server.
// =============================================================================

/** Why the server refused a command, a claim, a release or an arming because of a reservation. */
export type ClaimConflictCode = 'other-account' | 'other-controller' | 'controller-id-required';

export interface ClaimEntry {
  robotId: number;
  robotName: string | null;
  cellId: string | null;
  ownerId: string | null;
  ownerUsername: string;
  /** The controller (window, tab, phone) that holds it; null for a reservation made without one. */
  controllerId: string | null;
  claimedAt: number | null;
  expiresAt: number | null;
}

const CONFLICT_CODES: readonly string[] = ['other-account', 'other-controller', 'controller-id-required'];

export function isClaimConflictCode(value: unknown): value is ClaimConflictCode {
  return typeof value === 'string' && CONFLICT_CODES.includes(value);
}

/** The `code` of an error body when it is one of the reservation refusals, otherwise null. */
export function conflictCodeOf(body: unknown): ClaimConflictCode | null {
  if (!body || typeof body !== 'object') return null;
  const code = (body as Record<string, unknown>).code;
  return isClaimConflictCode(code) ? code : null;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const time = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** The reservations of GET /api/claims; entries that are not objects with a robot id are dropped. */
export function parseClaims(body: unknown): ClaimEntry[] {
  const list = body && typeof body === 'object' ? (body as Record<string, unknown>).claims : null;
  if (!Array.isArray(list)) return [];
  const out: ClaimEntry[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.robotId !== 'number' || !Number.isFinite(e.robotId)) continue;
    out.push({
      robotId: e.robotId,
      robotName: text(e.robotName),
      cellId: text(e.cellId),
      ownerId: text(e.ownerId),
      ownerUsername: text(e.ownerUsername) ?? '?',
      controllerId: text(e.controllerId),
      claimedAt: time(e.claimedAt),
      expiresAt: time(e.expiresAt),
    });
  }
  return out;
}

export type ClaimStanding = 'free' | 'mine' | 'other-controller' | 'other-account';

/**
 * Where a robot stands for this window: free, held by this very window, held by the same account on another
 * controller, or held by another account. A reservation without a controller id is mine when the account is.
 */
export function claimStanding(claim: ClaimEntry | undefined, myControllerId: string, myUsername: string | null): ClaimStanding {
  if (!claim) return 'free';
  if (claim.controllerId !== null) {
    if (claim.controllerId === myControllerId) return 'mine';
    return myUsername !== null && claim.ownerUsername === myUsername ? 'other-controller' : 'other-account';
  }
  return myUsername !== null && claim.ownerUsername === myUsername ? 'mine' : 'other-account';
}

/** The user name inside an access token, read only to label the interface (the server decides everything). */
export function decodeJwtUsername(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.username === 'string' ? decoded.username : null;
  } catch {
    return null;
  }
}

/** Seconds left of a reservation, never negative; null when it has no expiry. */
export function secondsLeft(claim: ClaimEntry, now: number = Date.now()): number | null {
  if (claim.expiresAt === null) return null;
  return Math.max(0, Math.round((claim.expiresAt - now) / 1000));
}
