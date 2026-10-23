import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimsSnapshot, lastClaimsEventAt, publishClaimsEvent, resetClaimsFeed, subscribeClaims } from '../src/lib/claimsFeed';

afterEach(() => resetClaimsFeed());

const message = {
  type: 'claims',
  schema: 2,
  claims: [
    { robotId: 1, robotName: 'A1', cellId: 'c1', ownerId: 'u1', ownerUsername: 'ana', controllerId: 'tab-1', claimedAt: 1000, expiresAt: 61_000, jogArmedUntil: 31_000 },
    { robotId: 2, robotName: null, cellId: 'c1', ownerId: 'u2', ownerUsername: 'bob', controllerId: null, claimedAt: 2000, expiresAt: 62_000, jogArmedUntil: null },
  ],
};

describe('the live list of reservations', () => {
  it('starts empty, takes a claims message and tells whoever listens', () => {
    expect(claimsSnapshot()).toBeNull();
    expect(lastClaimsEventAt()).toBe(0);
    const listener = vi.fn();
    const stop = subscribeClaims(listener);
    expect(publishClaimsEvent(message)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const list = claimsSnapshot();
    expect(list?.map((c) => c.robotId)).toEqual([1, 2]);
    expect(list?.[0]).toMatchObject({ ownerUsername: 'ana', controllerId: 'tab-1', jogArmedUntil: 31_000 });
    expect(list?.[1]).toMatchObject({ controllerId: null, jogArmedUntil: null });
    expect(lastClaimsEventAt()).toBeGreaterThan(0);
    stop();
    publishClaimsEvent(message);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the same array until the next push', () => {
    publishClaimsEvent(message);
    expect(claimsSnapshot()).toBe(claimsSnapshot());
  });

  it('ignores every other message', () => {
    expect(publishClaimsEvent({ type: 'delta', schema: 2, robotId: 1, patch: {} })).toBe(false);
    expect(publishClaimsEvent('claims')).toBe(false);
    expect(publishClaimsEvent(null)).toBe(false);
    expect(claimsSnapshot()).toBeNull();
  });

  it('an empty list is a real answer: nobody reserves anything', () => {
    publishClaimsEvent(message);
    publishClaimsEvent({ type: 'claims', schema: 2, claims: [] });
    expect(claimsSnapshot()).toEqual([]);
  });
});
