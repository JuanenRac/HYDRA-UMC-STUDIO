// =============================================================================
// HYDRA-UMC STUDIO - jog safety: jogSafety.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The inverse kinematics of this app solve the base joint as atan2(y, x), which is always in [-180, 180], and then
// clip it to the joint's limits. For a robot whose base can turn further than that (a UR e-series reaches +-360, the
// Parol6 -97.4..187.4) a 1 mm jog next to the +-180 seam jumped the base almost a full turn - on a real robot, a
// sweep through everything around it. Two defences, both pure so they can be tested without a robot:
//
// - continuity: among the angles that point the same way (a, a+360, a-360...) take the one inside the limits that is
//   closest to where the base is now;
// - a ceiling on how far any joint may move in one jog step; a step that would move more is not sent.
// =============================================================================

export type JointName = 'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6';
export const JOINT_NAMES: readonly JointName[] = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'];

/** The largest change of any one joint a single jog step may ask for, in degrees. */
export const MAX_JOG_JOINT_DELTA_DEG = 20;

/**
 * The angle equal to `targetDeg` modulo 360 that lies inside `limits` and is closest to `seedDeg`, or null when no
 * such angle exists (the direction is outside what the joint can reach).
 */
export function nearestEquivalentAngle(targetDeg: number, seedDeg: number, limits: [number, number]): number | null {
  if (!Number.isFinite(targetDeg) || !Number.isFinite(seedDeg)) return null;
  const [min, max] = limits;
  const EPS = 1e-9;
  let best: number | null = null;
  // The turns that can matter: far enough to cover limits of +-720.
  for (let turns = -3; turns <= 3; turns += 1) {
    const candidate = targetDeg + turns * 360;
    if (candidate < min - EPS || candidate > max + EPS) continue;
    if (best === null || Math.abs(candidate - seedDeg) < Math.abs(best - seedDeg)) best = candidate;
  }
  return best;
}

/**
 * Re-aims the base joint of an inverse-kinematics result for continuity. `solved` is what the model's solver
 * returned (its j1 was computed as atan2(y, x) and clipped); the base direction is recomputed here from the target
 * and replaces j1 only when the solver used that convention. Without a seed, or when the direction cannot be reached
 * inside the limits, the solver's own value is kept.
 */
export function withContinuousBase<T extends { j1: number }>(
  solved: T,
  target: { x: number; y: number },
  seedJ1: number | undefined,
  limits: [number, number],
): T {
  if (seedJ1 === undefined || !Number.isFinite(seedJ1)) return solved;
  if (Math.abs(target.x) < 1e-9 && Math.abs(target.y) < 1e-9) return solved; // straight above the base: no direction
  const directionDeg = Math.atan2(target.y, target.x) * (180 / Math.PI);
  const clipped = Math.min(limits[1], Math.max(limits[0], directionDeg));
  const usesBaseDirection = Math.abs(solved.j1 - directionDeg) < 1e-6 || Math.abs(solved.j1 - clipped) < 1e-6;
  if (!usesBaseDirection) return solved;
  const continuous = nearestEquivalentAngle(directionDeg, seedJ1, limits);
  return continuous === null ? solved : { ...solved, j1: continuous };
}

export interface JogJump {
  joint: JointName;
  deltaDeg: number;
}

/** The joint that would move most from `from` to `to`, and by how much (absolute degrees). */
export function largestJointChange(
  from: Partial<Record<JointName, number>>,
  to: Partial<Record<JointName, number>>,
): JogJump {
  let worst: JogJump = { joint: 'j1', deltaDeg: 0 };
  for (const joint of JOINT_NAMES) {
    const delta = Math.abs((to[joint] ?? 0) - (from[joint] ?? 0));
    if (delta > worst.deltaDeg) worst = { joint, deltaDeg: delta };
  }
  return worst;
}

/** null when the step is acceptable; the offending joint and size when it moves any joint more than `maxDeg`. */
export function excessiveJogStep(
  from: Partial<Record<JointName, number>>,
  to: Partial<Record<JointName, number>>,
  maxDeg: number = MAX_JOG_JOINT_DELTA_DEG,
): JogJump | null {
  const worst = largestJointChange(from, to);
  return worst.deltaDeg > maxDeg ? worst : null;
}
