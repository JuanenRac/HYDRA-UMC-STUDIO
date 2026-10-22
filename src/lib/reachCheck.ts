// =============================================================================
// HYDRA-UMC STUDIO - warning for trajectories a robot cannot reach: reachCheck.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The inverse kinematics of several models are approximations that never say "unreachable": they
// return the closest pose the arm can take, and the trajectory used to be sent anyway, so the robot
// followed a different path than the one drawn. Each point is now measured (the distance between the
// pose asked for and the pose its joints really give) and, when any point is further than the
// tolerance, the operator is asked to confirm before the trajectory is sent. The tolerance is the
// operator's to set; it is kept in this browser.
// =============================================================================

export const DEFAULT_REACH_TOLERANCE_MM = 5;
export const MIN_REACH_TOLERANCE_MM = 0;
export const MAX_REACH_TOLERANCE_MM = 5000;
export const REACH_TOLERANCE_KEY = 'hydra.reachToleranceMm';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface ReachReport {
  /** How many points are further than the tolerance from what the arm can reach. */
  count: number;
  /** The largest distance, in millimetres. */
  worstMm: number;
  toleranceMm: number;
  /** Indices (0-based) of the points over the tolerance. */
  indices: number[];
}

/** Straight-line distance between the pose asked for and the one the joints give, in millimetres. */
export function positionResidualMm(requested: Position, achieved: Position): number {
  const distance = Math.hypot(requested.x - achieved.x, requested.y - achieved.y, requested.z - achieved.z);
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

export function clampTolerance(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REACH_TOLERANCE_MM;
  return Math.min(MAX_REACH_TOLERANCE_MM, Math.max(MIN_REACH_TOLERANCE_MM, value));
}

/** One residual per point (null for a point whose joints were given directly and need no check). */
export function buildReachReport(residuals: Array<number | null>, toleranceMm: number): ReachReport {
  const tolerance = clampTolerance(toleranceMm);
  const indices: number[] = [];
  let worst = 0;
  residuals.forEach((value, index) => {
    if (value === null) return;
    if (value > worst) worst = value;
    if (value > tolerance) indices.push(index);
  });
  return { count: indices.length, worstMm: worst, toleranceMm: tolerance, indices };
}

export const reachNeedsConfirmation = (report: ReachReport): boolean => report.count > 0;

export function loadReachTolerance(storage: StorageLike | null | undefined): number {
  try {
    const raw = storage?.getItem(REACH_TOLERANCE_KEY);
    if (raw === null || raw === undefined || raw.trim() === '') return DEFAULT_REACH_TOLERANCE_MM;
    return clampTolerance(Number(raw));
  } catch {
    return DEFAULT_REACH_TOLERANCE_MM;
  }
}

export function saveReachTolerance(storage: StorageLike | null | undefined, value: number): number {
  const clean = clampTolerance(value);
  try {
    storage?.setItem(REACH_TOLERANCE_KEY, String(clean));
  } catch {
    /* the setting simply does not persist */
  }
  return clean;
}
