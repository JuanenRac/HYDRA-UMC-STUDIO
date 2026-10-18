// =============================================================================
// HYDRA-UMC STUDIO - tests/importValidation.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { MAX_IMPORTED_POINTS, validateSceneRobots, validateTrajectoryPoints } from '../src/lib/importValidation';
import { createDefaultRobots } from '../src/store';
import { clampBedTarget, MAX_BED_TARGET_C } from '../src/lib/heatedBed';

const point = { j1: 0, j2: -10, j3: 20, j4: 0, j5: 0, j6: 0 };

describe('validateTrajectoryPoints', () => {
  it('accepts the points the interface itself records', () => {
    const result = validateTrajectoryPoints([{ ...point, x: 1, y: 2, z: 3, a: 0, b: 0, c: 0, motionType: 'model-joints', name: 'P1' }]);
    expect(result.ok).toBe(true);
  });
  it('refuses what is not a list of points', () => {
    expect(validateTrajectoryPoints({}).ok).toBe(false);
    expect(validateTrajectoryPoints([]).ok).toBe(false);
    expect(validateTrajectoryPoints([1, 2]).ok).toBe(false);
    expect(validateTrajectoryPoints(null).ok).toBe(false);
  });
  it('names the point and the field that is wrong', () => {
    const bad = validateTrajectoryPoints([point, { ...point, j4: 'ninety' }]);
    expect(bad).toEqual({ ok: false, error: 'point 2: j4 is not a number' });
    expect(validateTrajectoryPoints([{ ...point, x: Number.NaN }]).ok).toBe(false);
    expect(validateTrajectoryPoints([{ ...point, motionType: 5 }]).ok).toBe(false);
  });
  it('bounds the length', () => {
    expect(validateTrajectoryPoints(new Array(MAX_IMPORTED_POINTS + 1).fill(point)).ok).toBe(false);
  });
});

describe('validateSceneRobots', () => {
  it('accepts a scene exported from the default robots', () => {
    const exported = JSON.parse(JSON.stringify(createDefaultRobots()));
    expect(validateSceneRobots(exported).ok).toBe(true);
  });
  it('refuses a robot the interface could not draw', () => {
    const robots = JSON.parse(JSON.stringify(createDefaultRobots()));
    delete robots[2].joints;
    expect(validateSceneRobots(robots)).toEqual({ ok: false, error: 'robot 3: joints are missing' });
  });
  it('refuses repeated ids, a missing name and an oversized list', () => {
    const robots = JSON.parse(JSON.stringify(createDefaultRobots()));
    robots[1].id = robots[0].id;
    expect(validateSceneRobots(robots).ok).toBe(false);
    const nameless = JSON.parse(JSON.stringify(createDefaultRobots()));
    nameless[0].name = '';
    expect(validateSceneRobots(nameless).ok).toBe(false);
    expect(validateSceneRobots(new Array(17).fill(robots[0])).ok).toBe(false);
  });
  it('checks the points inside a robot', () => {
    const robots = JSON.parse(JSON.stringify(createDefaultRobots()));
    robots[0].recordedPoints = [{ j1: 'x' }];
    expect(validateSceneRobots(robots).ok).toBe(false);
  });
});

describe('clampBedTarget', () => {
  it('keeps 0, the real value that used to be shown as 60', () => {
    expect(clampBedTarget(0)).toBe(0);
  });
  it('limits to the one maximum and survives garbage', () => {
    expect(clampBedTarget(300)).toBe(MAX_BED_TARGET_C);
    expect(clampBedTarget(-5)).toBe(0);
    expect(clampBedTarget(Number.NaN)).toBe(0);
    expect(clampBedTarget(60.4)).toBe(60);
  });
});
