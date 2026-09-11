// =============================================================================
// HYDRA-UMC STUDIO - tests/robotCommandTransition.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The optimistic-mutate / generation-guard / rollback core of
// sendRobotCommand(), the same behaviour DSI and ANDROID-CONTROL already
// have dedicated coverage for. Plain vitest - no React, no jsdom.
import { describe, expect, it } from 'vitest';

import {
  applyRobotCommandMutation,
  rollbackRobotCommand,
} from '../src/robotCommandTransition';
import type { RobotState } from '../src/store';

// The transition functions only ever read `id` and spread the object, so a
// loosely-shaped fixture is enough - just carry a `playbackState` so the
// "cancel an in-flight order" case is real.
function robot(id: number, isPlaying: boolean): RobotState {
  return {
    id,
    name: `R${id}`,
    playbackState: { isPlaying, activeStep: isPlaying ? 3 : 0, speed: 100 },
  } as unknown as RobotState;
}

describe('applyRobotCommandMutation', () => {
  it('mutates only the robots named in ids, snapshots them, and bumps their generation', () => {
    const robots = [robot(1, false), robot(2, false), robot(3, false)];
    const gen: Record<number, number> = {};

    const { robots: next, snapshots, myGeneration } = applyRobotCommandMutation(
      robots,
      [1, 3],
      () => ({ online: true } as Partial<RobotState>),
      gen,
    );

    expect((next[0] as unknown as { online?: boolean }).online).toBe(true);
    expect((next[1] as unknown as { online?: boolean }).online).toBeUndefined();
    expect((next[2] as unknown as { online?: boolean }).online).toBe(true);
    expect(next[1]).toBe(robots[1]); // untouched robot kept by reference
    expect(Object.keys(snapshots).map(Number).sort()).toEqual([1, 3]);
    expect(snapshots[1]).toBe(robots[0]);
    expect(myGeneration).toEqual({ 1: 1, 3: 1 });
    expect(gen).toEqual({ 1: 1, 3: 1 }); // the caller's live counter map was bumped in place
  });

  it('cancelling an order actually in flight stops the target AND its combinedWith sibling at once', () => {
    const robots = [robot(1, true), robot(2, true), robot(5, true)];
    const gen: Record<number, number> = { 1: 4, 2: 4 };

    const { robots: next, snapshots } = applyRobotCommandMutation(
      robots,
      [1, 2], // robot 1 + its combinedWith sibling 2
      () => ({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } } as Partial<RobotState>),
      gen,
    );

    expect(next[0].playbackState.isPlaying).toBe(false);
    expect(next[1].playbackState.isPlaying).toBe(false);
    expect(next[2].playbackState.isPlaying).toBe(true); // unrelated robot still running
    expect(snapshots[1].playbackState.isPlaying).toBe(true); // pre-cancel state kept for rollback
    expect(gen).toEqual({ 1: 5, 2: 5 });
  });

  it('bumps from an existing generation value, not from zero', () => {
    const gen: Record<number, number> = { 7: 9 };
    const { myGeneration } = applyRobotCommandMutation([robot(7, false)], [7], () => ({}), gen);
    expect(myGeneration[7]).toBe(10);
    expect(gen[7]).toBe(10);
  });
});

describe('rollbackRobotCommand', () => {
  it('restores every snapshot when no newer command moved the robots on', () => {
    const original = [robot(1, true), robot(2, true)];
    const gen: Record<number, number> = {};
    const { robots: mutated, snapshots, myGeneration } = applyRobotCommandMutation(
      original,
      [1, 2],
      () => ({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } } as Partial<RobotState>),
      gen,
    );

    const rolledBack = rollbackRobotCommand(mutated, snapshots, myGeneration, gen);

    expect(rolledBack[0]).toBe(original[0]);
    expect(rolledBack[1]).toBe(original[1]);
    expect(rolledBack[0].playbackState.isPlaying).toBe(true);
  });

  it('does NOT roll a robot back if a newer command already bumped its generation', () => {
    const original = [robot(1, true), robot(2, true)];
    const gen: Record<number, number> = {};
    const { robots: mutated, snapshots, myGeneration } = applyRobotCommandMutation(
      original,
      [1, 2],
      () => ({ playbackState: { isPlaying: false, activeStep: 0, speed: 100 } } as Partial<RobotState>),
      gen,
    );

    // A newer command for robot 1 only starts (and succeeds) before this one's failure lands.
    gen[1] = (gen[1] || 0) + 1;
    const newerState = { ...mutated[0], name: 'R1-newer' } as RobotState;
    const afterNewer = [newerState, mutated[1]];

    const rolledBack = rollbackRobotCommand(afterNewer, snapshots, myGeneration, gen);

    expect(rolledBack[0]).toBe(newerState); // stale rollback for robot 1 is skipped
    expect(rolledBack[0].playbackState.isPlaying).toBe(false); // newer state preserved
    expect(rolledBack[1]).toBe(original[1]); // robot 2 (untouched by a newer command) still rolls back
    expect(rolledBack[1].playbackState.isPlaying).toBe(true);
  });

  it('leaves robots that were never part of this command alone', () => {
    const robots = [robot(1, false), robot(9, true)];
    const gen: Record<number, number> = {};
    const { robots: mutated, snapshots, myGeneration } = applyRobotCommandMutation(
      robots,
      [1],
      () => ({ online: true } as Partial<RobotState>),
      gen,
    );
    const rolledBack = rollbackRobotCommand(mutated, snapshots, myGeneration, gen);
    expect(rolledBack[1]).toBe(robots[1]);
  });
});
