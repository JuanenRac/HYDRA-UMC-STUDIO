import { describe, expect, it } from 'vitest';
import { jointsToCartesianForModel, resolveTargetJoints } from '../src/examples/robotKinematicsDispatch';
import {
  DEFAULT_REACH_TOLERANCE_MM,
  REACH_TOLERANCE_KEY,
  buildReachReport,
  clampTolerance,
  loadReachTolerance,
  positionResidualMm,
  reachNeedsConfirmation,
  saveReachTolerance,
} from '../src/lib/reachCheck';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => { data[key] = value; },
  };
}

describe('trajectories the arm cannot reach', () => {
  it('measures the distance between the pose asked for and the pose the joints give', () => {
    expect(positionResidualMm({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
    expect(positionResidualMm({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })).toBe(0);
    expect(positionResidualMm({ x: 0, y: 0, z: 0 }, { x: Number.NaN, y: 0, z: 0 })).toBe(Number.POSITIVE_INFINITY);
  });

  it('reports the points over the tolerance and the worst one', () => {
    const report = buildReachReport([0, 2, 12.5, null, 40], 5);
    expect(report.indices).toEqual([2, 4]);
    expect(report.count).toBe(2);
    expect(report.worstMm).toBe(40);
    expect(reachNeedsConfirmation(report)).toBe(true);
  });

  it('does not ask when every point is within the tolerance or was given as native joints', () => {
    expect(reachNeedsConfirmation(buildReachReport([0, 4.9, 5, null], 5))).toBe(false);
    expect(reachNeedsConfirmation(buildReachReport([], 5))).toBe(false);
    expect(reachNeedsConfirmation(buildReachReport([null, null], 0))).toBe(false);
  });

  it('a zero tolerance asks for any difference at all', () => {
    expect(reachNeedsConfirmation(buildReachReport([0.01], 0))).toBe(true);
  });

  it('a point that cannot be measured counts as unreachable', () => {
    expect(reachNeedsConfirmation(buildReachReport([Number.POSITIVE_INFINITY], 5))).toBe(true);
  });

  it('keeps the tolerance in the browser and tolerates a broken or missing storage', () => {
    const storage = memoryStorage();
    expect(loadReachTolerance(storage)).toBe(DEFAULT_REACH_TOLERANCE_MM);
    expect(saveReachTolerance(storage, 12)).toBe(12);
    expect(storage.data[REACH_TOLERANCE_KEY]).toBe('12');
    expect(loadReachTolerance(storage)).toBe(12);
    expect(loadReachTolerance(memoryStorage({ [REACH_TOLERANCE_KEY]: 'abc' }))).toBe(DEFAULT_REACH_TOLERANCE_MM);
    expect(loadReachTolerance(null)).toBe(DEFAULT_REACH_TOLERANCE_MM);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadReachTolerance(broken)).toBe(DEFAULT_REACH_TOLERANCE_MM);
    expect(saveReachTolerance(broken, 7)).toBe(7);
  });

  it('limits the tolerance to a sensible range', () => {
    expect(clampTolerance(-3)).toBe(0);
    expect(clampTolerance(99999)).toBe(5000);
    expect(clampTolerance(Number.NaN)).toBe(DEFAULT_REACH_TOLERANCE_MM);
  });

  it('measures with the real inverse and forward kinematics: a pose far outside the envelope is flagged, a pose the arm can take is not', () => {
    const seed = { j1: 0, j2: -90, j3: 90, j4: 0, j5: 90, j6: 0 };
    const reachable = jointsToCartesianForModel('UR3e (6-DOF)', seed);
    const near = resolveTargetJoints('UR3e (6-DOF)', reachable.x, reachable.y, reachable.z, reachable.a, reachable.b, reachable.c, seed);
    const nearBack = jointsToCartesianForModel('UR3e (6-DOF)', near);
    const far = resolveTargetJoints('UR3e (6-DOF)', 5000, 5000, 5000, 0, 0, 0, seed);
    const farBack = jointsToCartesianForModel('UR3e (6-DOF)', far);
    const residuals = [
      positionResidualMm(reachable, nearBack),
      positionResidualMm({ x: 5000, y: 5000, z: 5000 }, farBack),
    ];
    expect(residuals[0]).toBeLessThan(5);
    expect(residuals[1]).toBeGreaterThan(1000);
    const report = buildReachReport(residuals, DEFAULT_REACH_TOLERANCE_MM);
    expect(report.indices).toEqual([1]);
    expect(reachNeedsConfirmation(report)).toBe(true);
  });
});
