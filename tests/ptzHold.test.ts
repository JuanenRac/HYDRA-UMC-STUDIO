// =============================================================================
// HYDRA-UMC STUDIO - tests/ptzHold.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPtzHold } from '../src/lib/ptzHold';

describe('createPtzHold', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sends the move at once and the stop on the release', async () => {
    const hold = createPtzHold();
    const move = vi.fn().mockResolvedValue(true);
    const stop = vi.fn().mockResolvedValue(true);
    hold.start(1, move, stop);
    expect(hold.isHeld(1)).toBe(true);
    expect(move).toHaveBeenCalledTimes(1);
    await hold.release(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(hold.isHeld(1)).toBe(false);
  });

  it('sends nothing when nothing is held, so leaving a button that was not pressed stops nothing', async () => {
    const hold = createPtzHold();
    await hold.release(7);
    const stop = vi.fn().mockResolvedValue(true);
    hold.start(2, vi.fn().mockResolvedValue(true), stop);
    await hold.release(2);
    await hold.release(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('sends a stop that did not arrive once more', async () => {
    const hold = createPtzHold(100);
    const stop = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    hold.start(3, vi.fn().mockResolvedValue(true), stop);
    const done = hold.release(3);
    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('releases every held camera when the release cannot be seen', async () => {
    const hold = createPtzHold();
    const stops = [vi.fn().mockResolvedValue(true), vi.fn().mockResolvedValue(true)];
    hold.start(1, vi.fn().mockResolvedValue(true), stops[0]);
    hold.start(2, vi.fn().mockResolvedValue(true), stops[1]);
    hold.releaseAll();
    await vi.advanceTimersByTimeAsync(0);
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(stops[1]).toHaveBeenCalledTimes(1);
    expect(hold.isHeld(1) || hold.isHeld(2)).toBe(false);
  });
});
