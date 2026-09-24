// =============================================================================
// HYDRA-UMC STUDIO - src/motionSource.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
// What the pose drawn for a robot actually stands for. The 3D view is always
// drawn from the commanded pose; whether the machine really followed it
// depends on the link. Keeping the two apart lets the UI say "simulated"
// instead of implying the real robot moved.

export type MotionSource = 'offline' | 'simulated' | 'live';

export interface MotionLinkState {
  online: boolean;
  urtcConnected: boolean;
}

/**
 * - offline: the robot is not reachable, the pose is only the last one drawn.
 * - simulated: the server is up but no tool controller is connected, so no
 *   real motion can happen; the pose is visual only.
 * - live: a controller is connected and can carry out the motion.
 */
export function motionSource(robot: MotionLinkState): MotionSource {
  if (!robot.online) return 'offline';
  return robot.urtcConnected ? 'live' : 'simulated';
}

/** Actions that move real hardware are only offered on a live link. */
export function canMoveHardware(robot: MotionLinkState): boolean {
  return motionSource(robot) === 'live';
}
