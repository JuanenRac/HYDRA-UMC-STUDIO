import { describe, expect, it } from 'vitest';
import { jointsToCartesianForModel, resolveTargetJoints } from '../src/examples/robotKinematicsDispatch';
import {
  DEFAULT_REACH_TOLERANCE_MM,
  REACH_TOLERANCE_KEY,
  buildReachReport,
  clampTolerance,
  findReachScale,
  scalePortablePoints,
  loadReachTolerance,
  positionResidualMm,
  reachNeedsConfirmation,
  type Position,
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

  it('lists the points out of reach with their distance, the worst first', () => {
    const report = buildReachReport([0, 12, null, 40, 7], 5);
    expect(report.offenders).toEqual([{ index: 3, mm: 40 }, { index: 1, mm: 12 }, { index: 4, mm: 7 }]);
  });
});

describe('scaling a trajectory to the reach of the model', () => {
  it('finds the largest factor at which every point fits', () => {
    // A point is out of reach by (scale - 0.62) * 1000 mm when scale is above 0.62.
    const residualsAt = (scale: number) => [Math.max(0, (scale - 0.62) * 1000), null];
    const fit = findReachScale(residualsAt, 5);
    expect(fit.fits).toBe(true);
    expect(fit.scale).toBe(0.6);
    expect(fit.remaining).toBe(0);
  });

  it('keeps a trajectory that already fits at 1', () => {
    expect(findReachScale(() => [0, 1, null], 5)).toEqual({ scale: 1, fits: true, remaining: 0 });
  });

  it('reports the best factor when nothing fits', () => {
    const fit = findReachScale((scale) => [scale > 0.5 ? 50 : 30, 50], 5);
    expect(fit.fits).toBe(false);
    expect(fit.remaining).toBe(2);
    const better = findReachScale((scale) => [scale > 0.5 ? 50 : 0, 50], 5);
    expect(better.fits).toBe(false);
    expect(better.remaining).toBe(1);
    expect(better.scale).toBeLessThanOrEqual(0.5);
  });

  it('scales only the points that have a target in space', () => {
    const toCartesian = (p: any) => ({ x: 0, y: 0, z: 0, ...p });
    const scaled = scalePortablePoints([
      { x: 100, y: -200, z: 50, label: 'a' },
      [1, 2, 3],
      { motionType: 'model-joints', j1: 1, j2: 2, j3: 3, j4: 4, j5: 5, j6: 6 },
      { j1: 1 },
    ], 0.5, toCartesian);
    expect(scaled[0]).toEqual({ x: 50, y: -100, z: 25, label: 'a' });
    expect(scaled[1]).toEqual([1, 2, 3]);
    expect(scaled[2]).toEqual({ motionType: 'model-joints', j1: 1, j2: 2, j3: 3, j4: 4, j5: 5, j6: 6 });
    expect(scaled[3]).toEqual({ x: 0, y: 0, z: 0, j1: 1 });
  });

  it('with the real kinematics, scaling a far trajectory toward the base brings its points into reach', () => {
    const model = 'UR3e (6-DOF)';
    const seed = { j1: 0, j2: -90, j3: 90, j4: 0, j5: 90, j6: 0 };
    const pose = jointsToCartesianForModel(model, seed);
    // The pose the arm can take, pushed 1.8 times further from the base: out of reach as drawn.
    const raw = [{ x: pose.x * 1.8, y: pose.y * 1.8, z: pose.z * 1.8 }, { x: pose.x * 1.7, y: pose.y * 1.7, z: pose.z * 1.7 }];
    const measure = (points: Array<{ x: number; y: number; z: number }>) => points.map((p) => {
      const joints = resolveTargetJoints(model, p.x, p.y, p.z, pose.a, pose.b, pose.c, seed);
      return positionResidualMm(p, jointsToCartesianForModel(model, joints) as Position);
    });
    const tolerance = 15;
    const before = buildReachReport(measure(raw), tolerance);
    expect(before.count).toBe(2);
    const fit = findReachScale((scale) => measure(scalePortablePoints(raw, scale, (p) => p) as Array<{ x: number; y: number; z: number }>), tolerance);
    expect(fit.fits).toBe(true);
    expect(fit.scale).toBeLessThan(1);
    expect(fit.scale).toBeGreaterThan(0.4);
  });
});
