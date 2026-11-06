// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/trajectoryOrbit.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The fourth view of the path that turns around it, and moving a point to a typed position through the inverse kinematics:
// the projection, the turn, the parsing of the typed numbers, the refusals, and both parts as rendered.
// =============================================================================
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../src/i18n';
import { TrajectoryPreview } from '../src/components/TrajectoryPreview';
import { PointPositionFields } from '../src/components/robotDetail/PointPositionFields';
import { jointsToCartesianForModel } from '../src/examples/robotKinematicsDispatch';
import { ORBIT_SETTINGS, analyzeTrajectory, movePointToPosition, parseMillimetres, projectOrbit, projectPath, turnOrbit } from '../src/lib/trajectoryPreview';

afterEach(cleanup);

const path = [
  { x: 0, y: 0, z: 0 },
  { x: 100, y: 0, z: 0 },
  { x: 100, y: 100, z: 50 },
];

describe('the orbit projection', () => {
  it('with no turn and no pitch looks at the plane x-z, like the front view', () => {
    const orbit = projectOrbit(path, 0, 0);
    const front = projectPath(path, 'front');
    orbit.forEach((p, i) => {
      expect(p.x).toBeCloseTo(front[i].x, 6);
      expect(p.y).toBeCloseTo(front[i].y, 6);
    });
  });

  it('from straight above it is the view from above', () => {
    const orbit = projectOrbit(path, 0, 90);
    const top = projectPath(path, 'top');
    orbit.forEach((p, i) => {
      expect(p.x).toBeCloseTo(top[i].x, 6);
      expect(p.y).toBeCloseTo(top[i].y, 6);
    });
  });

  it('is empty for an empty path and stays inside the view', () => {
    expect(projectOrbit([], 35, 25)).toEqual([]);
    for (const p of projectOrbit(path, 35, 25)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('turning the orbit', () => {
  it('moves by the step and wraps the yaw inside -180..180', () => {
    expect(turnOrbit(0, 0, 1, 0, 15)).toEqual({ yawDeg: 15, pitchDeg: 0 });
    expect(turnOrbit(170, 0, 1, 0, 15).yawDeg).toBe(-175);
    expect(turnOrbit(-170, 0, -1, 0, 15).yawDeg).toBe(175);
  });

  it('keeps the pitch between -85 and 85', () => {
    expect(turnOrbit(0, 80, 0, 1, 15).pitchDeg).toBe(85);
    expect(turnOrbit(0, -80, 0, -1, 15).pitchDeg).toBe(-85);
  });

  it('uses the starting angles and the step of the configuration file', () => {
    expect(ORBIT_SETTINGS).toEqual({ yawDeg: 35, pitchDeg: 25, stepDeg: 15 });
  });
});

describe('parseMillimetres', () => {
  it('accepts a comma as the decimal mark and refuses what is not a number', () => {
    expect(parseMillimetres('12,5')).toBe(12.5);
    expect(parseMillimetres(' -3 ')).toBe(-3);
    expect(parseMillimetres('')).toBeNull();
    expect(parseMillimetres('abc')).toBeNull();
    expect(parseMillimetres('Infinity')).toBeNull();
  });
});

describe('movePointToPosition', () => {
  const model = 'AR4 (6-DOF)' as const;
  const point = { j1: 20, j2: -30, j3: 40, j4: 0, j5: 10, j6: 0 };

  it('moves the tool to a position the arm can reach', () => {
    const here = jointsToCartesianForModel(model, point);
    const target = { x: here.x + 15, y: here.y - 10, z: here.z + 5 };
    const moved = movePointToPosition(model, point, target, 5);
    expect(moved.code).toBe('ok');
    expect(moved.point).not.toBeNull();
    const after = jointsToCartesianForModel(model, moved.point!);
    expect(Math.hypot(after.x - target.x, after.y - target.y, after.z - target.z)).toBeLessThanOrEqual(5);
    expect(moved.point!.x).toBeCloseTo(after.x, 2);
    expect(Object.values(moved.point!).every((v) => v === undefined || typeof v !== 'number' || Number.isFinite(v))).toBe(true);
  });

  it('refuses a position out of reach and leaves the point alone', () => {
    const moved = movePointToPosition(model, point, { x: 5000, y: 5000, z: 5000 }, 5);
    expect(moved.code).toBe('unreachable');
    expect(moved.point).toBeNull();
    expect(moved.missMm).toBeGreaterThan(5);
  });

  it('says so for a model without kinematics and for a target that is not a number', () => {
    expect(movePointToPosition('Generic (6-DOF)', point, { x: 100, y: 0, z: 100 }, 5).code).toBe('no_kinematics');
    expect(movePointToPosition(model, point, { x: Number.NaN, y: 0, z: 0 }, 5).code).toBe('invalid');
  });
});

describe('TrajectoryPreview orbit', () => {
  it('draws a fourth view and turns it with the buttons', () => {
    render(<TrajectoryPreview report={analyzeTrajectory([{ j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x: 0, y: 0, z: 100 }, { j1: 10, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0, x: 50, y: 20, z: 100 }], undefined)} />);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    const caption = () => screen.getByTestId('trajectory-preview-orbit-caption').textContent ?? '';
    const before = caption();
    expect(before).toContain('35');
    fireEvent.click(screen.getByTestId('trajectory-preview-orbit_right'));
    expect(caption()).toContain('50');
    fireEvent.click(screen.getByTestId('trajectory-preview-orbit_up'));
    expect(caption()).toContain('40');
    expect(caption()).not.toBe(before);
  });
});

describe('PointPositionFields', () => {
  const point = { j1: 20, j2: -30, j3: 40, j4: 0, j5: 10, j6: 0 };

  it('hands the moved point to the form, with the reason shown when it cannot', async () => {
    await i18n.changeLanguage('en');
    const t = i18n.t.bind(i18n);
    let moved: unknown = null;
    render(<PointPositionFields model="AR4 (6-DOF)" point={point} onMoved={(p) => { moved = p; }} t={t} />);
    const here = jointsToCartesianForModel('AR4 (6-DOF)', point);
    fireEvent.change(screen.getByTestId('point-position-x'), { target: { value: String(Math.round(here.x) + 10) } });
    fireEvent.click(screen.getByTestId('point-position-apply'));
    expect(moved).not.toBeNull();
    expect(screen.getByTestId('point-position-notice').textContent).toContain('mm');

    moved = null;
    fireEvent.change(screen.getByTestId('point-position-x'), { target: { value: '99999' } });
    fireEvent.click(screen.getByTestId('point-position-apply'));
    expect(moved).toBeNull();
    expect(screen.getByTestId('point-position-notice').textContent).toContain('out of reach');

    fireEvent.change(screen.getByTestId('point-position-x'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByTestId('point-position-apply'));
    expect(screen.getByTestId('point-position-notice').textContent).toContain('three numbers');
  });
});
