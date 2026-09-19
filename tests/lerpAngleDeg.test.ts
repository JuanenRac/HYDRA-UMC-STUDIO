// =============================================================================
// HYDRA-UMC STUDIO - tests/lerpAngleDeg.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';
import { lerpAngleDeg } from '../src/components/3d/RobotArm';

describe('lerpAngleDeg', () => {
  it('takes the short way around a wrap boundary instead of the long way', () => {
    // 350 -> 10 is a real 20deg step the short way, never 340deg the long way.
    const result = lerpAngleDeg(350, 10, 1);
    expect(result).toBeCloseTo(370, 5); // 350 + 20 = 370, equivalent to 10deg
  });

  it('reaches the exact target at t=1 for a simple same-direction case', () => {
    expect(lerpAngleDeg(0, 90, 1)).toBeCloseTo(90, 5);
  });

  it('stays at the current value at t=0', () => {
    expect(lerpAngleDeg(45, 200, 0)).toBeCloseTo(45, 5);
  });

  it('interpolates proportionally for a partial step', () => {
    expect(lerpAngleDeg(0, 100, 0.5)).toBeCloseTo(50, 5);
  });

  it('picks the shorter negative-direction path when that is genuinely shorter', () => {
    // -170 -> 170 is only 20deg apart going through the wrap (the "long" way is 340deg).
    const result = lerpAngleDeg(-170, 170, 1);
    // Equivalent angle to -190 (i.e. 170deg), confirming it moved the short way.
    expect(((result % 360) + 360) % 360).toBeCloseTo(170, 5);
  });
});
