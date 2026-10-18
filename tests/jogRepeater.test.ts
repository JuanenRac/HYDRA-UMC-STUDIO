// =============================================================================
// HYDRA-UMC STUDIO - tests/jogRepeater.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJogRepeater } from '../src/lib/jogRepeater';

describe('createJogRepeater', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('steps once at once and then at the interval', () => {
    const tick = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 150, maxHoldMs: 10_000 });
    repeater.start(tick);
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(450);
    expect(tick).toHaveBeenCalledTimes(4);
    expect(repeater.isRunning()).toBe(true);
  });

  it('stops when told to', () => {
    const tick = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 10_000 });
    repeater.start(tick);
    repeater.stop();
    vi.advanceTimersByTime(5_000);
    expect(tick).toHaveBeenCalledTimes(1);
    expect(repeater.isRunning()).toBe(false);
  });

  it('stops by itself when the release is never delivered', () => {
    const tick = vi.fn();
    const onDeadman = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 1_000, onDeadman });
    repeater.start(tick);
    vi.advanceTimersByTime(60_000);
    expect(tick.mock.calls.length).toBeLessThanOrEqual(11);
    expect(onDeadman).toHaveBeenCalledTimes(1);
    expect(repeater.isRunning()).toBe(false);
  });

  it('restarting replaces the previous repeat instead of doubling it', () => {
    const first = vi.fn();
    const second = vi.fn();
    const repeater = createJogRepeater({ intervalMs: 100, maxHoldMs: 10_000 });
    repeater.start(first);
    repeater.start(second);
    vi.advanceTimersByTime(300);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(4);
  });
});
