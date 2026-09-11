// =============================================================================
// HYDRA-UMC STUDIO - src/robotCommandTransition.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// The pure state-transition core of store.tsx's own sendRobotCommand(): the
// optimistic mutate + per-robot generation guard + rollback that mirror
// HYDRA-UMC-IOS-CONTROL / HYDRA-UMC-ANDROID-CONTROL / HYDRA-UMC-DSI's own
// atomic-command paths. Kept out of the React store so this behaviour -
// including "cancel an order actually in flight stops the target AND its
// combinedWith sibling immediately" and "a failed cancel rolls both back,
// unless a newer command already moved that robot on" - can be unit-tested
// with plain vitest, no React/jsdom harness.
import type { RobotState } from './store';

export interface RobotCommandMutation {
  /** The robot list with `localMutate` applied to every robot in `ids`. */
  robots: RobotState[];
  /** Pre-mutation copy of each affected robot, for rollback. */
  snapshots: Record<number, RobotState>;
  /** The generation number this command bumped each affected robot to. */
  myGeneration: Record<number, number>;
}

/**
 * Optimistically apply `localMutate` to every robot whose `id` is in `ids`,
 * snapshotting each one first and bumping its generation counter.
 *
 * `generationCounters` is the caller's own live counter map (a React ref's
 * `.current`); it is mutated in place, exactly as the inline version in
 * store.tsx did, so a later command for the same robot observes the bump.
 */
export function applyRobotCommandMutation(
  robots: RobotState[],
  ids: number[],
  localMutate: (robot: RobotState) => Partial<RobotState>,
  generationCounters: Record<number, number>,
): RobotCommandMutation {
  const snapshots: Record<number, RobotState> = {};
  const myGeneration: Record<number, number> = {};
  const next = robots.map((r) => {
    if (!ids.includes(r.id)) return r;
    snapshots[r.id] = r;
    myGeneration[r.id] = generationCounters[r.id] = (generationCounters[r.id] || 0) + 1;
    return { ...r, ...localMutate(r) };
  });
  return { robots: next, snapshots, myGeneration };
}

/**
 * Restore every snapshot after a failed send - but ONLY for a robot whose
 * generation counter still equals what this command bumped it to. A mismatch
 * means a newer command for that same robot already started (and maybe
 * already succeeded) since this one's snapshot was taken, so restoring the
 * stale snapshot now would erase that newer state instead of this failure's.
 */
export function rollbackRobotCommand(
  robots: RobotState[],
  snapshots: Record<number, RobotState>,
  myGeneration: Record<number, number>,
  generationCounters: Record<number, number>,
): RobotState[] {
  return robots.map((r) => {
    if (!(r.id in snapshots)) return r;
    if (generationCounters[r.id] !== myGeneration[r.id]) return r;
    return snapshots[r.id];
  });
}
