// =============================================================================
// HYDRA-UMC STUDIO - tests/motionSource.test.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
// =============================================================================
import { describe, expect, it } from 'vitest';

import { canMoveHardware, motionSource } from '../src/motionSource';

describe('motionSource', () => {
  it('is offline whenever the robot is not online, whatever the controller flag says', () => {
    expect(motionSource({ online: false, urtcConnected: false })).toBe('offline');
    expect(motionSource({ online: false, urtcConnected: true })).toBe('offline');
  });

  it('is simulated when online without a connected controller', () => {
    expect(motionSource({ online: true, urtcConnected: false })).toBe('simulated');
  });

  it('is live only with both the link and the controller', () => {
    expect(motionSource({ online: true, urtcConnected: true })).toBe('live');
  });

  it('allows hardware motion only when live', () => {
    expect(canMoveHardware({ online: true, urtcConnected: true })).toBe(true);
    expect(canMoveHardware({ online: true, urtcConnected: false })).toBe(false);
    expect(canMoveHardware({ online: false, urtcConnected: true })).toBe(false);
  });
});
