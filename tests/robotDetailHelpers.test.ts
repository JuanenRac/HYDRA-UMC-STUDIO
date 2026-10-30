// Characterization tests for the pure helpers that live next to the robot
// detail screen: they pin the current behaviour so the screen can be split
// into smaller modules in small, verifiable steps.
import { describe, expect, it } from 'vitest';
import {
  browserStorage,
  homePoseFor,
  normalizeTrajectoryForRobot,
  pointKeyFor,
  withCartesian,
} from '../src/lib/robotDetailHelpers';
import { PAROL6_HOME_POSE } from '../src/examples/parol6Kinematics';
import { UR5E_HOME_POSE } from '../src/examples/ur5eKinematics';
import { KOCH_HOME_POSE } from '../src/examples/kochKinematics';
import { convertToCartesian } from '../src/examples/utils';
import { jointsToCartesianForModel } from '../src/examples/robotKinematicsDispatch';
import type { RobotModel } from '../src/store';

const GENERIC_HOME = { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0 };

describe('pointKeyFor', () => {
  it('gives the same key to the same object and different keys to different objects', () => {
    const a = {};
    const b = {};
    expect(pointKeyFor(a)).toBe(pointKeyFor(a));
    expect(pointKeyFor(a)).not.toBe(pointKeyFor(b));
  });

  it('keeps the identity of a point after the array is reordered', () => {
    const points = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const keys = points.map(pointKeyFor);
    points.reverse();
    expect(points.map(pointKeyFor)).toEqual([...keys].reverse());
  });

  it('hands out increasing keys', () => {
    const first = pointKeyFor({});
    const second = pointKeyFor({});
    expect(second).toBe(first + 1);
  });
});

describe('homePoseFor', () => {
  it('returns the dedicated pose of a model with its own kinematics, as a copy', () => {
    const pose = homePoseFor('Parol6 (6-DOF)' as RobotModel);
    expect(pose).toEqual(PAROL6_HOME_POSE);
    expect(pose).not.toBe(PAROL6_HOME_POSE);
    expect(homePoseFor('UR5e (6-DOF)' as RobotModel)).toEqual(UR5E_HOME_POSE);
    expect(homePoseFor('Koch v1.1 (5-DOF)' as RobotModel)).toEqual(KOCH_HOME_POSE);
  });

  it('falls back to the generic pose for any other model', () => {
    expect(homePoseFor('Generic (6-DOF)' as RobotModel)).toEqual(GENERIC_HOME);
    expect(homePoseFor('not a model' as RobotModel)).toEqual(GENERIC_HOME);
  });
});

describe('withCartesian', () => {
  it('returns the very same object when it already has a Cartesian x', () => {
    const point = { x: 1, y: 2, z: 3, j1: 9 };
    expect(withCartesian(point)).toBe(point);
  });

  it('stamps the Cartesian pose read through the generic forward kinematics', () => {
    const joints = { j1: 10, j2: -30, j3: 40, j4: 0, j5: 20, j6: 0 };
    const stamped = withCartesian(joints);
    const c = convertToCartesian(joints);
    expect(stamped).toMatchObject({ ...joints, x: c.x, y: c.y, z: c.z, a: c.a, b: c.b, c: c.c });
    expect(stamped).not.toBe(joints);
  });
});

describe('browserStorage', () => {
  it('is null where there is no window', () => {
    expect(browserStorage()).toBeNull();
  });
});

describe('normalizeTrajectoryForRobot', () => {
  const robot = {
    model: 'Parol6 (6-DOF)' as RobotModel,
    joints: { j1: 1, j2: 2, j3: 3, j4: 4, j5: 5, j6: 6 },
  };

  it('rejects an empty or non-array trajectory', () => {
    expect(() => normalizeTrajectoryForRobot([], robot)).toThrow('at least one point');
    expect(() => normalizeTrajectoryForRobot('x', robot)).toThrow('at least one point');
  });

  it('turns a compact triplet into a native point and keeps the other joints of the robot', () => {
    const residuals: Array<number | null> = [];
    const [point] = normalizeTrajectoryForRobot([[10, 20, 30]], robot, residuals);
    expect(point).toMatchObject({ motionType: 'model-joints', j1: 10, j2: 20, j3: 30, j4: 4, j5: 5, j6: 6 });
    expect(point).toMatchObject(
      jointsToCartesianForModel(robot.model, { j1: 10, j2: 20, j3: 30, j4: 4, j5: 5, j6: 6 }),
    );
    expect(residuals).toEqual([null]);
  });

  it('rejects compact points that are too short or not finite', () => {
    expect(() => normalizeTrajectoryForRobot([[1, 2]], robot)).toThrow('Compact trajectory point 1');
    expect(() => normalizeTrajectoryForRobot([[1, 2, Number.NaN]], robot)).toThrow('Compact trajectory point 1');
  });

  it('rejects points that are neither arrays nor objects', () => {
    expect(() => normalizeTrajectoryForRobot([null], robot)).toThrow('Trajectory point 1 must be an object');
    expect(() => normalizeTrajectoryForRobot([5], robot)).toThrow('Trajectory point 1 must be an object');
  });

  it('keeps the metadata of a native point and recomputes its Cartesian pose', () => {
    const residuals: Array<number | null> = [];
    const native = { motionType: 'model-joints', j1: 1, j2: 2, j3: 3, j4: 4, j5: 5, j6: 6, label: 'p1' };
    const [point] = normalizeTrajectoryForRobot([native], robot, residuals);
    expect(point).toMatchObject({ motionType: 'model-joints', label: 'p1', j1: 1, j6: 6 });
    expect(point).toMatchObject(jointsToCartesianForModel(robot.model, native));
    expect(residuals).toEqual([null]);
  });

  it('rejects a native point with missing joints', () => {
    expect(() =>
      normalizeTrajectoryForRobot([{ motionType: 'model-joints', j1: 1, j2: 2, j3: 3 }], robot),
    ).toThrow('Native trajectory point 1');
  });

  it('resolves portable generic data for the target robot and reports how far it lands', () => {
    const residuals: Array<number | null> = [];
    const generic = { j1: 0, j2: -45, j3: 45, j4: 0, j5: 90, j6: 0, label: 'g' };
    const [point] = normalizeTrajectoryForRobot([generic], robot, residuals);
    const cartesian = convertToCartesian(generic);
    expect(point).toMatchObject({ motionType: 'model-joints', label: 'g', x: cartesian.x, y: cartesian.y, z: cartesian.z });
    expect(Object.keys(point as object)).toEqual(expect.arrayContaining(['j1', 'j2', 'j3', 'j4', 'j5', 'j6']));
    expect(residuals).toHaveLength(1);
    expect(typeof residuals[0]).toBe('number');
  });

  it('rejects portable data without a valid Cartesian position', () => {
    expect(() => normalizeTrajectoryForRobot([{ x: Number.NaN, y: 0, z: 0 }], robot)).toThrow('no valid Cartesian');
  });
});
