// =============================================================================
// HYDRA-UMC STUDIO - checking files before they are imported: importValidation.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// "Load trajectory" and "Import scene" took any JSON array, put it into the shared state and saved it for every client:
// one malformed file could break the drawing of the robots on every screen. The files are checked here first; what
// is checked is the shape the interface draws from, not every optional field.
// =============================================================================

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const JOINTS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
const OPTIONAL_NUMBERS = ['x', 'y', 'z', 'a', 'b', 'c', 'tx', 'ty', 'trz', 'speed'] as const;

/** A trajectory has at most this many points (a file with more is not a trajectory somebody recorded). */
export const MAX_IMPORTED_POINTS = 5000;
/** A scene holds at most this many robots. */
export const MAX_IMPORTED_ROBOTS = 16;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function validatePoint(point: unknown, label: string): string | null {
  if (!isObject(point)) return `${label} is not an object`;
  for (const joint of JOINTS) {
    if (!isFiniteNumber(point[joint])) return `${label}: ${joint} is not a number`;
  }
  for (const key of OPTIONAL_NUMBERS) {
    if (point[key] !== undefined && !isFiniteNumber(point[key])) return `${label}: ${key} is not a number`;
  }
  if (point.motionType !== undefined && typeof point.motionType !== 'string') return `${label}: motionType is not text`;
  return null;
}

/** The points of a trajectory file: an array of objects with finite j1..j6. */
export function validateTrajectoryPoints(json: unknown): Validation<Record<string, unknown>[]> {
  if (!Array.isArray(json)) return { ok: false, error: 'a trajectory is an array of points' };
  if (json.length === 0) return { ok: false, error: 'the trajectory has no points' };
  if (json.length > MAX_IMPORTED_POINTS) return { ok: false, error: `more than ${MAX_IMPORTED_POINTS} points` };
  for (let index = 0; index < json.length; index += 1) {
    const problem = validatePoint(json[index], `point ${index + 1}`);
    if (problem) return { ok: false, error: problem };
  }
  return { ok: true, value: json as Record<string, unknown>[] };
}

/** The robots of a scene file: objects with an id, a name, joints and a position the interface can draw. */
export function validateSceneRobots(json: unknown): Validation<Record<string, unknown>[]> {
  if (!Array.isArray(json)) return { ok: false, error: 'a scene is an array of robots' };
  if (json.length === 0) return { ok: false, error: 'the scene has no robots' };
  if (json.length > MAX_IMPORTED_ROBOTS) return { ok: false, error: `more than ${MAX_IMPORTED_ROBOTS} robots` };
  const ids = new Set<number>();
  for (let index = 0; index < json.length; index += 1) {
    const robot = json[index];
    const label = `robot ${index + 1}`;
    if (!isObject(robot)) return { ok: false, error: `${label} is not an object` };
    if (!Number.isInteger(robot.id)) return { ok: false, error: `${label}: id is not a whole number` };
    if (ids.has(robot.id as number)) return { ok: false, error: `${label}: id ${String(robot.id)} appears twice` };
    ids.add(robot.id as number);
    if (typeof robot.name !== 'string' || robot.name === '') return { ok: false, error: `${label}: name is missing` };
    if (typeof robot.model !== 'string') return { ok: false, error: `${label}: model is missing` };
    if (!isObject(robot.joints)) return { ok: false, error: `${label}: joints are missing` };
    for (const joint of JOINTS) {
      if (!isFiniteNumber(robot.joints[joint])) return { ok: false, error: `${label}: ${joint} is not a number` };
    }
    if (!isObject(robot.pos)) return { ok: false, error: `${label}: pos is missing` };
    for (const axis of ['x', 'y', 'z'] as const) {
      if (!isFiniteNumber(robot.pos[axis])) return { ok: false, error: `${label}: pos.${axis} is not a number` };
    }
    if (robot.recordedPoints !== undefined) {
      if (!Array.isArray(robot.recordedPoints)) return { ok: false, error: `${label}: recordedPoints is not an array` };
      if (robot.recordedPoints.length > MAX_IMPORTED_POINTS) return { ok: false, error: `${label}: too many points` };
      for (let p = 0; p < robot.recordedPoints.length; p += 1) {
        const problem = validatePoint(robot.recordedPoints[p], `${label}, point ${p + 1}`);
        if (problem) return { ok: false, error: problem };
      }
    }
  }
  return { ok: true, value: json as Record<string, unknown>[] };
}
