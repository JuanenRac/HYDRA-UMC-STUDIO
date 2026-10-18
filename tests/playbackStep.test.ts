// =============================================================================
// HYDRA-UMC STUDIO - tests/playbackStep.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { currentPlaybackStep, playbackProgressPercent } from '../src/lib/playbackStep';

describe('currentPlaybackStep', () => {
  it('is the point before the one the server announces as next', () => {
    expect(currentPlaybackStep(1)).toBe(0);
    expect(currentPlaybackStep(5)).toBe(4);
  });
  it('is -1 before the first move and when nothing plays', () => {
    expect(currentPlaybackStep(0)).toBe(-1);
    expect(currentPlaybackStep(-1)).toBe(-1);
    expect(currentPlaybackStep(null)).toBe(-1);
    expect(currentPlaybackStep(undefined)).toBe(-1);
    expect(currentPlaybackStep(Number.NaN)).toBe(-1);
  });
});

describe('playbackProgressPercent', () => {
  it('goes from 0 to 100 over the points and never past it', () => {
    // 5 points: the server announces 1..5 as the robot reaches points 0..4
    expect(playbackProgressPercent(0, 5, false)).toBe(0);
    expect(playbackProgressPercent(1, 5, false)).toBe(0);
    expect(playbackProgressPercent(3, 5, false)).toBe(50);
    expect(playbackProgressPercent(5, 5, false)).toBe(100);
    expect(playbackProgressPercent(9, 5, false)).toBe(100);
  });
  it('is 100 once finished and 0 without points', () => {
    expect(playbackProgressPercent(-1, 5, true)).toBe(100);
    expect(playbackProgressPercent(3, 0, false)).toBe(0);
  });
  it('copes with a single point', () => {
    expect(playbackProgressPercent(1, 1, false)).toBe(0);
    expect(playbackProgressPercent(1, 1, true)).toBe(100);
  });
});
