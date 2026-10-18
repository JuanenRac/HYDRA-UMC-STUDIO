// =============================================================================
// HYDRA-UMC STUDIO - tests/inputThrottle.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The gamepad and the jog buttons send commands at their own rate; these two
// small helpers decide what is allowed to go out and how many commands are
// still waiting for an answer.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { createInFlightCounter, createRateLimiter } from '../src/lib/inputThrottle';
import { shouldFallBackToQueryToken } from '../src/lib/wsAuth';

describe('createRateLimiter', () => {
  it('lets the first send through and holds the next ones until the interval has passed', () => {
    const limiter = createRateLimiter(100);
    expect(limiter.allow('jog', 1000)).toBe(true);
    expect(limiter.allow('jog', 1050)).toBe(false);
    expect(limiter.allow('jog', 1099)).toBe(false);
    expect(limiter.allow('jog', 1100)).toBe(true);
  });

  it('measures the interval from the last send that went out, not from the ones that were held back', () => {
    const limiter = createRateLimiter(100);
    limiter.allow('jog', 0);
    for (let t = 10; t < 100; t += 10) expect(limiter.allow('jog', t)).toBe(false);
    expect(limiter.allow('jog', 100)).toBe(true);
    expect(limiter.allow('jog', 150)).toBe(false);
  });

  it('keeps each key on its own clock', () => {
    const limiter = createRateLimiter(100);
    expect(limiter.allow('x', 0)).toBe(true);
    expect(limiter.allow('y', 1)).toBe(true);
    expect(limiter.allow('x', 50)).toBe(false);
    expect(limiter.allow('y', 50)).toBe(false);
  });

  it('allows everything when the interval is zero', () => {
    const limiter = createRateLimiter(0);
    expect(limiter.allow('k', 5)).toBe(true);
    expect(limiter.allow('k', 5)).toBe(true);
  });

  it('forgets every key on reset, so the first send after a reconnect is never held', () => {
    const limiter = createRateLimiter(1000);
    limiter.allow('k', 0);
    expect(limiter.allow('k', 1)).toBe(false);
    limiter.reset();
    expect(limiter.allow('k', 2)).toBe(true);
  });

  it('does not treat a clock that went backwards as permission to flood', () => {
    const limiter = createRateLimiter(100);
    limiter.allow('k', 1000);
    expect(limiter.allow('k', 900)).toBe(false);
  });
});

describe('createInFlightCounter', () => {
  it('counts a command until its promise settles, whichever way it settles', async () => {
    const counter = createInFlightCounter();
    let resolve!: () => void;
    let reject!: (e: Error) => void;
    const ok = counter.track(new Promise<void>((r) => { resolve = r; }));
    const bad = counter.track(new Promise<void>((_, r) => { reject = r; }));
    expect(counter.count()).toBe(2);
    resolve();
    await ok;
    await Promise.resolve();
    expect(counter.count()).toBe(1);
    reject(new Error('boom'));
    await expect(bad).rejects.toThrow('boom');
    await Promise.resolve();
    expect(counter.count()).toBe(0);
  });

  it('returns the very promise it was given', () => {
    const counter = createInFlightCounter();
    const promise = Promise.resolve(7);
    expect(counter.track(promise)).toBe(promise);
  });

  it('never goes below zero, even when reset while commands are still pending', async () => {
    const counter = createInFlightCounter();
    let resolve!: () => void;
    const pending = counter.track(new Promise<void>((r) => { resolve = r; }));
    counter.reset();
    expect(counter.count()).toBe(0);
    resolve();
    await pending;
    await Promise.resolve();
    expect(counter.count()).toBe(0);
  });
});

describe('shouldFallBackToQueryToken', () => {
  it('falls back only when the socket never opened although the server answered over HTTP', () => {
    expect(shouldFallBackToQueryToken(false, true)).toBe(true);
    expect(shouldFallBackToQueryToken(true, true)).toBe(false);
    expect(shouldFallBackToQueryToken(false, false)).toBe(false);
    expect(shouldFallBackToQueryToken(true, false)).toBe(false);
  });
});
