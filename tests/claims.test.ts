import { describe, expect, it } from 'vitest';
import { claimStanding, conflictCodeOf, decodeJwtUsername, isClaimConflictCode, parseClaims, secondsLeft, type ClaimEntry } from '../src/lib/claims';

const entry = (over: Partial<ClaimEntry> = {}): ClaimEntry => ({
  robotId: 1, robotName: 'Arm', cellId: 'cell', ownerId: 'u1', ownerUsername: 'ana', controllerId: 'win-1', claimedAt: 1000, expiresAt: 61_000, ...over,
});

describe('reservations', () => {
  it('reads GET /api/claims and drops what is not a reservation', () => {
    const list = parseClaims({ claims: [
      { robotId: 3, robotName: 'Arm 3', cellId: 'c', ownerId: 'u', ownerUsername: 'ana', controllerId: 'w', claimedAt: 5, expiresAt: 9 },
      { robotId: 'x' }, null, 7, { robotId: 4, ownerUsername: '', controllerId: null },
    ] });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ robotId: 3, ownerUsername: 'ana', controllerId: 'w', expiresAt: 9 });
    expect(list[1]).toMatchObject({ robotId: 4, ownerUsername: '?', controllerId: null });
    expect(parseClaims(null)).toEqual([]);
    expect(parseClaims({ claims: 'no' })).toEqual([]);
  });

  it('reads the date strings of a reservation', () => {
    const [claim] = parseClaims({ claims: [{ robotId: 1, expiresAt: '2030-01-01T00:00:00.000Z' }] });
    expect(claim.expiresAt).toBe(Date.parse('2030-01-01T00:00:00.000Z'));
  });

  it('tells the three refusals apart by their code', () => {
    for (const code of ['other-account', 'other-controller', 'controller-id-required']) {
      expect(isClaimConflictCode(code)).toBe(true);
      expect(conflictCodeOf({ error: 'x', code })).toBe(code);
    }
    expect(conflictCodeOf({ code: 'jog-not-armed' })).toBeNull();
    expect(conflictCodeOf(null)).toBeNull();
    expect(conflictCodeOf('text')).toBeNull();
  });

  it('says where a robot stands for this window', () => {
    expect(claimStanding(undefined, 'win-1', 'ana')).toBe('free');
    expect(claimStanding(entry(), 'win-1', 'ana')).toBe('mine');
    expect(claimStanding(entry(), 'win-2', 'ana')).toBe('other-controller');
    expect(claimStanding(entry(), 'win-2', 'bob')).toBe('other-account');
    expect(claimStanding(entry({ controllerId: null }), 'win-2', 'ana')).toBe('mine');
    expect(claimStanding(entry({ controllerId: null }), 'win-2', 'bob')).toBe('other-account');
    expect(claimStanding(entry(), 'win-2', null)).toBe('other-account');
  });

  it('reads the user name of a token without trusting it', () => {
    const payload = btoa(JSON.stringify({ username: 'ana', role: 'admin' })).replace(/=+$/, '');
    expect(decodeJwtUsername(`h.${payload}.s`)).toBe('ana');
    expect(decodeJwtUsername('broken')).toBeNull();
    expect(decodeJwtUsername(null)).toBeNull();
  });

  it('counts the seconds left, never below zero', () => {
    expect(secondsLeft(entry({ expiresAt: 61_000 }), 1000)).toBe(60);
    expect(secondsLeft(entry({ expiresAt: 500 }), 1000)).toBe(0);
    expect(secondsLeft(entry({ expiresAt: null }), 1000)).toBeNull();
  });
});
