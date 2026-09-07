// =============================================================================
// HYDRA-UMC STUDIO - tests/utils.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Real unit tests for src/examples/utils.ts - found in an ecosystem-wide
// software-improvements audit: this shared generic-arm FK/IK pair and the
// 5 path generators built on it had zero automated test coverage.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  cartesianToJoints,
  convertToCartesian,
  generateCircle,
  generateRaster,
  generateSpiral,
  generateStar,
  generateWave,
  xyTableTaskPoint,
} from '../src/examples/utils';

describe('cartesianToJoints / convertToCartesian round-trip', () => {
  it('recovers the same Cartesian point after converting to joints and back', () => {
    const target = { x: 150, y: 80, z: 30, a: 0, b: 0, c: 45 };
    const joints = cartesianToJoints(target.x, target.y, target.z, target.a, target.b, target.c);
    const back = convertToCartesian(joints);
    expect(back.x).toBeCloseTo(target.x, 5);
    expect(back.y).toBeCloseTo(target.y, 5);
    expect(back.z).toBeCloseTo(target.z, 5);
    expect(back.a).toBeCloseTo(target.a, 5);
    expect(back.c).toBeCloseTo(target.c, 5);
  });

  it('a point straight up the Z axis has j1 fall back to the 0/0 guard rather than NaN', () => {
    // atan2(0, 0) is a real, defined 0 in JS - the `|| 0.001` guard in
    // cartesianToJoints exists for `r` (the radial distance), not atan2
    // itself, so this must stay finite and not throw.
    const joints = cartesianToJoints(0, 0, 400, 0, 0, 0);
    expect(Number.isFinite(joints.j1)).toBe(true);
    expect(Number.isFinite(joints.j2)).toBe(true);
    expect(Number.isFinite(joints.j3)).toBe(true);
  });

  it('an unreachable target (beyond the 160mm+200mm max reach) clamps acos input instead of producing NaN', () => {
    const joints = cartesianToJoints(10000, 0, 195, 0, 0, 0);
    expect(Number.isFinite(joints.j1)).toBe(true);
    expect(Number.isFinite(joints.j2)).toBe(true);
    expect(Number.isFinite(joints.j3)).toBe(true);
  });

  it('j4/j6 are plain pass-throughs of a/c', () => {
    const joints = cartesianToJoints(150, 0, 195, 33, 0, 77);
    expect(joints.j4).toBe(33);
    expect(joints.j6).toBe(77);
  });

  it('the home-ish point (r=200, z=195) computes real revolute angles at j1=0', () => {
    const joints = cartesianToJoints(200, 0, 195, 0, 0, 0);
    expect(joints.j1).toBeCloseTo(0, 5);
  });
});

describe('xyTableTaskPoint', () => {
  it('carries the table X/Y separately from the arm-local joint solve', () => {
    const point = xyTableTaskPoint(500, 250, 150, 0, 195);
    expect(point.tx).toBe(500);
    expect(point.ty).toBe(250);
    // the arm-local joints came from cartesianToJoints(150, 0, 195, 0, 0, 0)
    const expected = cartesianToJoints(150, 0, 195, 0, 0, 0);
    expect(point.j1).toBeCloseTo(expected.j1, 9);
    expect(point.j2).toBeCloseTo(expected.j2, 9);
    expect(point.j3).toBeCloseTo(expected.j3, 9);
  });

  it('defaults a/b/c to 0 when omitted', () => {
    const point = xyTableTaskPoint(0, 0, 150, 0, 195);
    expect(point.j4).toBe(0);
    expect(point.j6).toBe(0);
  });
});

describe('generateCircle', () => {
  it('produces exactly the requested number of points', () => {
    const points = generateCircle(100, 12, 20);
    expect(points).toHaveLength(12);
  });

  it('every point traces a real circle of the given radius around the offset center', () => {
    const radius = 80;
    const xOff = 200;
    const points = generateCircle(radius, 16, 10, xOff, 0);
    for (const p of points) {
      const cart = convertToCartesian(p);
      const dx = cart.x - xOff;
      const dy = cart.y - 0;
      expect(Math.hypot(dx, dy)).toBeCloseTo(radius, 3);
    }
  });
});

describe('generateSpiral', () => {
  it('produces exactly the requested number of points', () => {
    expect(generateSpiral(3, 20, 100, 10, 50)).toHaveLength(20);
  });

  it('radius grows monotonically from ~0 to maxRadius across the spiral', () => {
    const maxRadius = 120;
    const points = generateSpiral(2, 10, maxRadius, 0, 0, 0);
    const radii = points.map((p) => {
      const cart = convertToCartesian(p);
      return Math.hypot(cart.x, cart.y);
    });
    // The very first point lands exactly at the origin (r=0), where
    // cartesianToJoints's own `|| 0.001` divide-by-zero guard (see
    // utils.ts) kicks in - a real, deliberate 0.001mm floor, not a bug -
    // so this checks "effectively zero", not an exact 0.
    expect(radii[0]).toBeLessThan(0.01);
    expect(radii[radii.length - 1]).toBeCloseTo(maxRadius, 2);
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThanOrEqual(radii[i - 1] - 1e-6);
    }
  });
});

describe('generateWave', () => {
  it('produces exactly the requested number of points', () => {
    expect(generateWave(15, 200, 30, 2)).toHaveLength(15);
  });

  it('the first and last points sit at the ends of the given length', () => {
    const length = 200;
    const points = generateWave(11, length, 20, 1, 0);
    const firstY = convertToCartesian(points[0]).y;
    const lastY = convertToCartesian(points[points.length - 1]).y;
    expect(firstY).toBeCloseTo(-length / 2, 3);
    expect(lastY).toBeCloseTo(length / 2, 3);
  });
});

describe('generateStar', () => {
  it('alternates between the outer and inner radius', () => {
    const outer = 100;
    const inner = 40;
    const points = generateStar(outer, inner, 5, 0); // xOff=0 so points are centered at the origin
    // point 0 is on the outer radius, point 1 on the inner, alternating.
    const cart0 = convertToCartesian(points[0]);
    const cart1 = convertToCartesian(points[1]);
    expect(Math.hypot(cart0.x, cart0.y)).toBeCloseTo(outer, 3);
    expect(Math.hypot(cart1.x, cart1.y)).toBeCloseTo(inner, 3);
  });
});

describe('generateRaster', () => {
  it('produces 2 points per line (both ends), for lines+1 rows', () => {
    const points = generateRaster(300, 100, 4);
    expect(points).toHaveLength(2 * (4 + 1));
  });

  it('alternates which end comes first so consecutive lines connect edge-to-edge', () => {
    // Kept within the generic 2-link arm's real reach (160mm+200mm chain) -
    // a wider raster would clamp at the acos() reach limit in
    // cartesianToJoints, which is real and correct but would make this
    // geometry-shape assertion about a DIFFERENT thing (reach clamping,
    // covered separately above) instead of the edge-alternation this test
    // is actually about.
    const width = 100;
    const xOff = 200;
    const points = generateRaster(width, 100, 3, xOff);
    // row 0: first point should be the LEFT edge (xOff - width/2)
    const row0First = convertToCartesian(points[0]);
    expect(row0First.x).toBeCloseTo(xOff - width / 2, 3);
    // row 1 (points[2]/[3]): first point should be the RIGHT edge this time
    const row1First = convertToCartesian(points[2]);
    expect(row1First.x).toBeCloseTo(xOff + width / 2, 3);
  });
});
